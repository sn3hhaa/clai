"""Detect sections and numbered clauses from extracted lines, then build provenance-aware chunks.

Rules are conservative: a line only starts a clause when it matches an explicit numbering
pattern ("7.", "7.2", "Section 7", "Article IV", "(a)") *at a sentence boundary*, or is
clearly a heading (ALL CAPS, or bold/large and short). When nothing is detected,
section/clause stay null; they are never guessed.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.ingestion.pdf import ExtractedPdf, Line
from app.schemas import Chunk, OutlineItem

_ARTICLE = re.compile(
    r"^(article|section|clause)\s+([ivxlc]+|\d{1,2}(?:\.\d{1,2}){0,3})\b[.:)\-–—]?\s*(.*)$",
    re.IGNORECASE,
)
# "7. Title", "7) Title", "7.2 Text", "7.2. Text". Single-level numbers need "." or ")"
# so wrapped lines such as "30 days' written notice" are not mistaken for clause 30.
_NUMBERED = re.compile(r"^(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(\S.*)$|^(\d{1,2})[.)]\s+(\S.*)$")
_SUB = re.compile(r"^\(([a-z]|[ivx]{1,4}|\d{1,2})\)\s+(\S.*)$")
# Sentence boundary: terminal punctuation (optionally closed by a quote/bracket) then whitespace.
_BOUNDARY = re.compile(r"(?<=[.!?;])\s+|(?<=[.!?;][\"')\]])\s+")

MAX_CHUNK_CHARS = 900


@dataclass
class _Unit:
    section: str | None
    clause: str | None
    heading: str | None
    level: int
    page: int
    own_title: bool = False
    parts: list[tuple[int, str]] = field(default_factory=list)  # (page, text)


def _is_caps_heading(text: str) -> bool:
    letters = [c for c in text if c.isalpha()]
    return (
        len(letters) >= 3
        and len(text) <= 70
        and sum(c.isupper() for c in letters) / len(letters) > 0.9
        and not text.endswith((".", ",", ";"))
    )


def _is_styled_heading(line: Line, body_size: float) -> bool:
    return (
        len(line.text) <= 80
        and not line.text.endswith((".", ",", ";", ":"))
        and (line.bold or line.size >= body_size + 1.0)
        and line.text[:1].isupper()
    )


def _split_title(rest: str) -> tuple[str | None, str]:
    """Split "Termination. Either party may..." into ("Termination", "Either party may...")."""
    match = re.match(r"^([A-Z][A-Za-z'&/\- ]{1,60}?)[.:]\s+(\S.*)$", rest)
    if match and len(match.group(1).split()) <= 6:
        return match.group(1).strip(), match.group(2)
    if len(rest) <= 70 and not rest.endswith((".", ";", ",")) and rest[:1].isupper():
        return rest.strip(), ""
    return None, rest


def detect_units(pdf: ExtractedPdf) -> list[_Unit]:
    units: list[_Unit] = []
    section: str | None = None
    section_title: str | None = None
    current_clause: str | None = None
    first = pdf.lines[0].page if pdf.lines else 1
    unit = _Unit(section=None, clause=None, heading=None, level=0, page=first)

    def start(new: _Unit) -> None:
        nonlocal unit
        if unit.parts or unit.own_title:
            units.append(unit)
        unit = new

    for line in pdf.lines:
        text = line.text
        # A numbering pattern only starts a clause at a sentence boundary (or on a heading-styled
        # line); otherwise it's a wrapped continuation such as "(12) months ..." or "Section 5 ...".
        prev = unit.parts[-1][1] if unit.parts else ""
        at_boundary = not prev or prev.endswith((".", ":", ";")) or line.bold

        article = _ARTICLE.match(text) if at_boundary else None
        numbered = _NUMBERED.match(text) if at_boundary else None
        sub = _SUB.match(text) if at_boundary else None

        if article:
            number = article.group(2)
            title, body = _split_title(article.group(3)) if article.group(3) else (None, "")
            label = f"{article.group(1).title()} {number}"
            section, section_title = (f"{label}. {title}" if title else label), title
            current_clause = number
            start(_Unit(section, number, title, 1, line.page, own_title=bool(title)))
            if body:
                unit.parts.append((line.page, body))
            continue

        if numbered:
            number = numbered.group(1) or numbered.group(3)
            rest = numbered.group(2) or numbered.group(4)
            title, body = _split_title(rest)
            is_top = "." not in number
            if is_top:
                section = f"{number}. {title}" if title else f"{number}."
                section_title = title
            current_clause = number
            start(_Unit(section, number, title or section_title, 1 if is_top else 2, line.page, own_title=bool(title)))
            if body:
                unit.parts.append((line.page, body))
            continue

        if sub and current_clause:
            label = f"{current_clause.split('(')[0]}({sub.group(1)})"
            start(_Unit(section, label, unit.heading, 3, line.page))
            unit.parts.append((line.page, sub.group(2)))
            continue

        if _is_caps_heading(text) or (_is_styled_heading(line, pdf.body_size) and not unit.parts):
            title = text.title() if text.isupper() else text
            if units or unit.parts:  # a heading after content starts a section; the first is the doc title
                section, section_title = title, title
                current_clause = None
            start(_Unit(section, None, title, 1, line.page, own_title=True))
            continue

        unit.parts.append((line.page, text))

    if unit.parts or unit.own_title:
        units.append(unit)
    return units


def _join(parts: list[tuple[int, str]]) -> tuple[str, list[tuple[int, int]]]:
    """Join line texts, returning the text and (char_offset, page) markers."""
    text = ""
    markers: list[tuple[int, int]] = []
    for page, part in parts:
        if text.endswith("-") and part[:1].islower():
            text = text[:-1]
        elif text:
            text += " "
        markers.append((len(text), page))
        text += part
    return text, markers


def _page_at(markers: list[tuple[int, int]], offset: int) -> int:
    page = markers[0][1]
    for start, p in markers:
        if start > offset:
            break
        page = p
    return page


def _sentences(text: str) -> list[tuple[int, str]]:
    out: list[tuple[int, str]] = []
    start = 0
    for match in _BOUNDARY.finditer(text):
        piece = text[start : match.start()]
        if piece.strip():
            out.append((start, piece))
        start = match.end()
    if text[start:].strip():
        out.append((start, text[start:]))
    return out


def build_chunks(document_id: str, pdf: ExtractedPdf) -> tuple[list[Chunk], list[OutlineItem]]:
    units = detect_units(pdf)
    chunks: list[Chunk] = []
    outline: list[OutlineItem] = []

    for unit in units:
        if unit.level in (1, 2) and (unit.clause or unit.own_title):
            if unit.own_title and unit.heading:
                label = f"{unit.clause} {unit.heading}" if unit.clause else unit.heading
            elif unit.parts:
                snippet = unit.parts[0][1]
                label = f"{unit.clause} {snippet[:48].rstrip()}{'…' if len(snippet) > 48 else ''}"
            else:
                label = unit.clause or ""
            outline.append(
                OutlineItem(label=label.strip(), clause=unit.clause, page_number=unit.page, level=unit.level)
            )
        if not unit.parts:
            continue

        text, markers = _join(unit.parts)
        groups: list[list[tuple[int, str]]] = [[]]
        for start, sentence in _sentences(text):
            size = sum(len(s) + 1 for _, s in groups[-1])
            if groups[-1] and size + len(sentence) > MAX_CHUNK_CHARS:
                groups.append([])
            groups[-1].append((start, sentence))

        for group in groups:
            if not group:
                continue
            start_offset = group[0][0]
            end_offset = group[-1][0] + max(len(group[-1][1]) - 1, 0)
            order = len(chunks)
            chunks.append(
                Chunk(
                    document_id=document_id,
                    chunk_id=f"{document_id}-c{order:04d}",
                    order=order,
                    page_number=_page_at(markers, start_offset),
                    page_end=_page_at(markers, end_offset),
                    section=unit.section,
                    clause=unit.clause,
                    heading=unit.heading,
                    text=text[start_offset : end_offset + 1].strip(),
                )
            )
    return chunks, outline


def search_text(chunk: Chunk) -> str:
    """Text used for embedding and BM25: provenance labels give context to short clauses."""
    prefix = " ".join(dict.fromkeys(p for p in (chunk.section, chunk.heading) if p))
    return f"{prefix}. {chunk.text}" if prefix else chunk.text
