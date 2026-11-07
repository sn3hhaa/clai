"""PDF validation and line-level text extraction with PyMuPDF.

Produces `Line` records (page, text, font size, bold) that the structure detector
consumes. Repeated headers/footers and page-number lines are removed.
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass

import pymupdf

from app.errors import InvalidDocument

_PAGE_NUMBER = re.compile(r"^(page\s*)?\d+(\s*(of|/)\s*\d+)?$", re.IGNORECASE)
_BOLD_FLAG = 1 << 4
# Fewer extractable characters per page than this, with images present, means a scan.
_MIN_CHARS_PER_PAGE = 25


@dataclass(frozen=True)
class Line:
    page: int  # 1-based
    text: str
    size: float
    bold: bool


@dataclass(frozen=True)
class ExtractedPdf:
    page_count: int
    lines: list[Line]
    body_size: float


def validate_and_open(data: bytes, *, max_bytes: int, max_pages: int) -> pymupdf.Document:
    """Open a PDF from bytes, rejecting anything Clai can't process faithfully."""
    if not data:
        raise InvalidDocument("The file is empty.", code="empty_file")
    if len(data) > max_bytes:
        raise InvalidDocument(
            f"The file is larger than the {max_bytes // (1024 * 1024)} MB limit.",
            code="file_too_large",
            status_code=413,
        )
    if b"%PDF-" not in data[:1024]:
        raise InvalidDocument("This file is not a PDF.", code="not_a_pdf")
    try:
        doc = pymupdf.open(stream=data, filetype="pdf")
    except Exception as exc:  # PyMuPDF raises several exception types for corrupt files
        raise InvalidDocument("The PDF could not be read; it may be corrupted.", code="corrupt_pdf") from exc
    if doc.needs_pass or doc.is_encrypted:
        doc.close()
        raise InvalidDocument(
            "This PDF is password-protected. Remove the password and upload it again.",
            code="encrypted_pdf",
        )
    if doc.page_count == 0:
        doc.close()
        raise InvalidDocument("The PDF has no pages.", code="empty_pdf")
    if doc.page_count > max_pages:
        doc.close()
        raise InvalidDocument(f"The PDF has more than {max_pages} pages.", code="too_many_pages")
    return doc


def extract_lines(doc: pymupdf.Document) -> ExtractedPdf:
    raw: list[Line] = []
    image_pages = 0
    for index in range(doc.page_count):
        page = doc[index]
        if page.get_images(full=False):
            image_pages += 1
        content = page.get_text("dict", sort=True)
        for block in content.get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                spans = [s for s in line.get("spans", []) if s.get("text", "").strip()]
                if not spans:
                    continue
                text = _normalise("".join(s["text"] for s in line["spans"]))
                if not text:
                    continue
                size = max(s["size"] for s in spans)
                bold = all((s["flags"] & _BOLD_FLAG) or "bold" in s["font"].lower() for s in spans)
                raw.append(Line(page=index + 1, text=text, size=round(size, 1), bold=bold))

    total_chars = sum(len(line.text) for line in raw)
    if total_chars < _MIN_CHARS_PER_PAGE * doc.page_count:
        if image_pages:
            raise InvalidDocument(
                "This PDF looks scanned (image-only). Clai needs selectable text; OCR is not supported yet.",
                code="scanned_pdf",
            )
        raise InvalidDocument("The PDF contains no extractable text.", code="no_text")

    lines = _drop_repeated_furniture(raw, doc.page_count)
    sizes = Counter(line.size for line in lines for _ in range(len(line.text)))
    body_size = sizes.most_common(1)[0][0] if sizes else 11.0
    return ExtractedPdf(page_count=doc.page_count, lines=lines, body_size=body_size)


def _normalise(text: str) -> str:
    text = text.replace("Â ", " ").replace("â€™", "'").replace("â€˜", "'")
    text = text.replace("â€œ", '"').replace("â€", '"')
    return re.sub(r"\s+", " ", text).strip()


def _drop_repeated_furniture(lines: list[Line], page_count: int) -> list[Line]:
    """Remove page numbers and lines repeated on most pages (running headers/footers)."""
    kept = [line for line in lines if not _PAGE_NUMBER.match(line.text)]
    if page_count < 3:
        return kept
    pages_per_text: dict[str, set[int]] = {}
    for line in kept:
        pages_per_text.setdefault(line.text.lower(), set()).add(line.page)
    threshold = max(3, int(page_count * 0.6))
    furniture = {t for t, pages in pages_per_text.items() if len(pages) >= threshold and len(t) < 120}
    return [line for line in kept if line.text.lower() not in furniture]
