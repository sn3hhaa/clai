// Section and clause detection plus provenance-aware chunking.
// A port of backend/app/ingestion/structure.py: same patterns, same sentence-boundary rule,
// and section/clause stay null when not detected (never guessed).

import type { Evidence, OutlineItem } from "@/lib/api/types";
import type { ExtractedPdf, Line } from "./pdf";
import { sentences } from "./text";

const ARTICLE = /^(article|section|clause)\s+([ivxlc]+|\d{1,2}(?:\.\d{1,2}){0,3})\b[.:)\-–—]?\s*(.*)$/i;
// "7. Title", "7) Title", "7.2 Text". Single-level numbers need "." or ")" so wrapped lines
// such as "30 days' written notice" aren't read as clause 30.
const NUMBERED = /^(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(\S.*)$|^(\d{1,2})[.)]\s+(\S.*)$/;
const SUB = /^\(([a-z]|[ivx]{1,4}|\d{1,2})\)\s+(\S.*)$/;
export const MAX_CHUNK_CHARS = 900;

export interface Chunk {
  chunkId: string;
  order: number;
  pageNumber: number;
  pageEnd: number;
  section: string | null;
  clause: string | null;
  heading: string | null;
  text: string;
}

interface Unit {
  section: string | null;
  clause: string | null;
  heading: string | null;
  level: number;
  page: number;
  ownTitle: boolean;
  parts: { page: number; text: string }[];
}

function isCapsHeading(text: string): boolean {
  const letters = [...text].filter((c) => /[a-z]/i.test(c));
  return (
    letters.length >= 3 &&
    text.length <= 70 &&
    letters.filter((c) => c === c.toUpperCase()).length / letters.length > 0.9 &&
    !/[.,;]$/.test(text)
  );
}

function isStyledHeading(line: Line, bodySize: number): boolean {
  return line.text.length <= 80 && !/[.,;:]$/.test(line.text) && line.size >= bodySize + 1 && /^[A-Z]/.test(line.text);
}

function splitTitle(rest: string): [string | null, string] {
  const m = rest.match(/^([A-Z][A-Za-z'&/\- ]{1,60}?)[.:]\s+(\S.*)$/);
  if (m && m[1].split(/\s+/).length <= 6) return [m[1].trim(), m[2]];
  if (rest.length <= 70 && !/[.;,]$/.test(rest) && /^[A-Z]/.test(rest)) return [rest.trim(), ""];
  return [null, rest];
}

const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export function detectUnits(pdf: ExtractedPdf): Unit[] {
  const units: Unit[] = [];
  let section: string | null = null;
  let sectionTitle: string | null = null;
  let currentClause: string | null = null;
  let unit: Unit = { section: null, clause: null, heading: null, level: 0, page: pdf.lines[0]?.page ?? 1, ownTitle: false, parts: [] };

  const start = (next: Unit) => {
    if (unit.parts.length || unit.ownTitle) units.push(unit);
    unit = next;
  };

  for (const line of pdf.lines) {
    const text = line.text;
    const prev = unit.parts.at(-1)?.text ?? "";
    // Numbering only starts a clause at a sentence boundary (or on a heading-sized line).
    const atBoundary = !prev || /[.:;]$/.test(prev) || line.size >= pdf.bodySize + 1;
    const article = atBoundary ? text.match(ARTICLE) : null;
    const numbered = atBoundary ? text.match(NUMBERED) : null;
    const sub = atBoundary ? text.match(SUB) : null;

    if (article) {
      const number = article[2];
      const [title, body] = article[3] ? splitTitle(article[3]) : [null, ""];
      const label = `${titleCase(article[1])} ${number}`;
      section = title ? `${label}. ${title}` : label;
      sectionTitle = title;
      currentClause = number;
      start({ section, clause: number, heading: title, level: 1, page: line.page, ownTitle: !!title, parts: [] });
      if (body) unit.parts.push({ page: line.page, text: body });
      continue;
    }
    if (numbered) {
      const number = numbered[1] ?? numbered[3];
      const [title, body] = splitTitle(numbered[2] ?? numbered[4]);
      const isTop = !number.includes(".");
      if (isTop) {
        section = title ? `${number}. ${title}` : `${number}.`;
        sectionTitle = title;
      }
      currentClause = number;
      start({ section, clause: number, heading: title ?? sectionTitle, level: isTop ? 1 : 2, page: line.page, ownTitle: !!title, parts: [] });
      if (body) unit.parts.push({ page: line.page, text: body });
      continue;
    }
    if (sub && currentClause) {
      start({ section, clause: `${currentClause.split("(")[0]}(${sub[1]})`, heading: unit.heading, level: 3, page: line.page, ownTitle: false, parts: [] });
      unit.parts.push({ page: line.page, text: sub[2] });
      continue;
    }
    if (isCapsHeading(text) || (isStyledHeading(line, pdf.bodySize) && !unit.parts.length)) {
      const title = text === text.toUpperCase() ? titleCase(text) : text;
      if (units.length || unit.parts.length) {
        section = title;
        sectionTitle = title;
        currentClause = null;
      }
      start({ section, clause: null, heading: title, level: 1, page: line.page, ownTitle: true, parts: [] });
      continue;
    }
    unit.parts.push({ page: line.page, text });
  }
  if (unit.parts.length || unit.ownTitle) units.push(unit);
  return units;
}

function join(parts: { page: number; text: string }[]): { text: string; markers: [number, number][] } {
  let text = "";
  const markers: [number, number][] = [];
  for (const { page, text: part } of parts) {
    if (text.endsWith("-") && /^[a-z]/.test(part)) text = text.slice(0, -1);
    else if (text) text += " ";
    markers.push([text.length, page]);
    text += part;
  }
  return { text, markers };
}

function pageAt(markers: [number, number][], offset: number): number {
  let page = markers[0][1];
  for (const [start, p] of markers) {
    if (start > offset) break;
    page = p;
  }
  return page;
}

export function buildChunks(documentId: string, pdf: ExtractedPdf): { chunks: Chunk[]; outline: OutlineItem[] } {
  const chunks: Chunk[] = [];
  const outline: OutlineItem[] = [];
  for (const unit of detectUnits(pdf)) {
    if ((unit.level === 1 || unit.level === 2) && (unit.clause || unit.ownTitle)) {
      let label: string;
      if (unit.ownTitle && unit.heading) label = unit.clause ? `${unit.clause} ${unit.heading}` : unit.heading;
      else if (unit.parts.length) {
        const snippet = unit.parts[0].text;
        label = `${unit.clause} ${snippet.slice(0, 48).trimEnd()}${snippet.length > 48 ? "…" : ""}`;
      } else label = unit.clause ?? "";
      outline.push({ label: label.trim(), clause: unit.clause, page_number: unit.page, level: unit.level });
    }
    if (!unit.parts.length) continue;

    const { text, markers } = join(unit.parts);
    const groups: { start: number; text: string }[][] = [[]];
    for (const s of sentences(text)) {
      const size = groups.at(-1)!.reduce((n, g) => n + g.text.length + 1, 0);
      if (groups.at(-1)!.length && size + s.text.length > MAX_CHUNK_CHARS) groups.push([]);
      groups.at(-1)!.push(s);
    }
    for (const group of groups) {
      if (!group.length) continue;
      const startOffset = group[0].start;
      const last = group.at(-1)!;
      const endOffset = last.start + Math.max(last.text.length - 1, 0);
      const order = chunks.length;
      chunks.push({
        chunkId: `${documentId}-c${String(order).padStart(4, "0")}`,
        order,
        pageNumber: pageAt(markers, startOffset),
        pageEnd: pageAt(markers, endOffset),
        section: unit.section,
        clause: unit.clause,
        heading: unit.heading,
        text: text.slice(startOffset, endOffset + 1).trim(),
      });
    }
  }
  return { chunks, outline };
}

/** Text used for search: provenance labels give short clauses context. */
export function searchText(c: Pick<Chunk, "section" | "heading" | "text">): string {
  const prefix = [...new Set([c.section, c.heading].filter(Boolean))].join(" ");
  return prefix ? `${prefix}. ${c.text}` : c.text;
}

export function toEvidence(c: Chunk, score: number, cited: boolean): Evidence {
  return {
    chunk_id: c.chunkId,
    page_number: c.pageNumber,
    page_end: c.pageEnd,
    section: c.section,
    clause: c.clause,
    heading: c.heading,
    text: c.text,
    score: Math.round(score * 1000) / 1000,
    cited,
  };
}
