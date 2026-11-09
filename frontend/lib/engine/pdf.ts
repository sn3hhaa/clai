// PDF validation and line extraction with pdf.js, in the browser (or Node for tests).
// Produces lines with page and font size for the structure detector.

import { normalise } from "./text";

export interface Line {
  page: number; // 1-based
  text: string;
  size: number;
}

export interface ExtractedPdf {
  pageCount: number;
  lines: Line[];
  bodySize: number;
}

export class DocumentError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "DocumentError";
  }
}

export const MAX_BYTES = 20 * 1024 * 1024;
export const MAX_PAGES = 300;
const MIN_CHARS_PER_PAGE = 25;
const PAGE_NUMBER = /^(page\s*)?\d+(\s*(of|\/)\s*\d+)?$/i;

/** Minimal surface of pdf.js that the engine uses, so tests can pass the legacy Node build. */
export interface PdfJs {
  getDocument(src: { data: Uint8Array; isEvalSupported?: boolean; disableFontFace?: boolean }): {
    promise: Promise<PdfDocument>;
    destroy(): Promise<void>;
  };
}
interface PdfDocument {
  numPages: number;
  getPage(n: number): Promise<{
    getTextContent(): Promise<{ items: unknown[] }>;
    getOperatorList(): Promise<{ fnArray: number[] }>;
  }>;
}
interface TextItem {
  str: string;
  transform: number[];
  hasEOL?: boolean;
}

export function validateBytes(bytes: Uint8Array): void {
  if (bytes.byteLength === 0) throw new DocumentError("The file is empty.", "empty_file");
  if (bytes.byteLength > MAX_BYTES) throw new DocumentError("The file is larger than the 20 MB limit.", "file_too_large");
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  if (!head.includes("%PDF-")) throw new DocumentError("This file is not a PDF.", "not_a_pdf");
}

export async function extractPdf(pdfjs: PdfJs, bytes: Uint8Array): Promise<ExtractedPdf> {
  validateBytes(bytes);
  let doc: PdfDocument;
  // pdf.js may transfer (detach) the buffer it's given, so hand it a copy.
  const task = pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false });
  try {
    doc = await task.promise;
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === "PasswordException") {
      throw new DocumentError("This PDF is password-protected. Remove the password and add it again.", "encrypted_pdf");
    }
    await task.destroy().catch(() => undefined);
    throw new DocumentError("The PDF could not be read; it may be damaged.", "corrupt_pdf");
  }
  try {
    if (doc.numPages === 0) throw new DocumentError("The PDF has no pages.", "empty_pdf");
    if (doc.numPages > MAX_PAGES) throw new DocumentError(`The PDF has more than ${MAX_PAGES} pages.`, "too_many_pages");

    const raw: Line[] = [];
    let imagePages = 0;
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      raw.push(...linesOf(content.items as TextItem[], p));
      if (raw.filter((l) => l.page === p).length === 0) {
        const ops = await page.getOperatorList();
        // 85 = paintImageXObject, 82 = paintJpegXObject (pdf.js OPS); presence means an image-only page.
        if (ops.fnArray.some((fn) => fn === 85 || fn === 82 || fn === 83 || fn === 86)) imagePages += 1;
      }
    }

    const totalChars = raw.reduce((n, l) => n + l.text.length, 0);
    if (totalChars < MIN_CHARS_PER_PAGE * doc.numPages) {
      if (imagePages) {
        throw new DocumentError(
          "This PDF looks scanned (images of text). Clai needs selectable text; scanned documents aren't supported yet.",
          "scanned_pdf",
        );
      }
      throw new DocumentError("The PDF contains no readable text.", "no_text");
    }

    const lines = dropFurniture(raw, doc.numPages);
    const sizeWeight = new Map<number, number>();
    for (const l of lines) sizeWeight.set(l.size, (sizeWeight.get(l.size) ?? 0) + l.text.length);
    const bodySize = [...sizeWeight.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 11;
    return { pageCount: doc.numPages, lines, bodySize };
  } finally {
    await task.destroy();
  }
}

/** Group pdf.js text items into visual lines (same baseline), left to right. */
function linesOf(items: TextItem[], page: number): Line[] {
  const rows: { y: number; parts: { x: number; s: string; size: number }[] }[] = [];
  for (const item of items) {
    if (!item.str || !item.str.trim()) continue;
    const [a, b, , , x, y] = item.transform;
    const size = Math.round(Math.hypot(a, b) * 10) / 10;
    let row = rows.find((r) => Math.abs(r.y - y) < Math.max(2, size * 0.4));
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push({ x, s: item.str, size });
  }
  rows.sort((r1, r2) => r2.y - r1.y);
  return rows
    .map((row) => {
      row.parts.sort((p1, p2) => p1.x - p2.x);
      const text = normalise(row.parts.map((p) => p.s).join(" "));
      return { page, text, size: Math.max(...row.parts.map((p) => p.size)) };
    })
    .filter((l) => l.text.length > 0);
}

/** Remove page numbers and lines repeated on most pages (running headers/footers). */
function dropFurniture(lines: Line[], pageCount: number): Line[] {
  const kept = lines.filter((l) => !PAGE_NUMBER.test(l.text));
  if (pageCount < 3) return kept;
  const pages = new Map<string, Set<number>>();
  for (const l of kept) {
    const key = l.text.toLowerCase();
    if (!pages.has(key)) pages.set(key, new Set());
    pages.get(key)!.add(l.page);
  }
  const threshold = Math.max(3, Math.floor(pageCount * 0.6));
  return kept.filter((l) => {
    const seen = pages.get(l.text.toLowerCase())!;
    return !(seen.size >= threshold && l.text.length < 120);
  });
}
