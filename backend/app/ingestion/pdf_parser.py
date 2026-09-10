from pathlib import Path

import pymupdf

from .models import DocumentContent, PageContent


def extract_pdf(
    pdf_path: str | Path,
    document_id: str,
) -> DocumentContent:
    """
    Extract text from a PDF while preserving page-level provenance.
    """

    path = Path(pdf_path)

    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")

    if path.suffix.lower() != ".pdf":
        raise ValueError(f"Expected a PDF file, got: {path.suffix}")

    pages: list[PageContent] = []

    with pymupdf.open(path) as document:
        for page_index, page in enumerate(document):
            text = page.get_text("text").strip()

            pages.append(
                PageContent(
                    page_number=page_index + 1,
                    text=text,
                )
            )

        page_count = len(document)

    return DocumentContent(
        document_id=document_id,
        filename=path.name,
        pages=pages,
        page_count=page_count,
    )