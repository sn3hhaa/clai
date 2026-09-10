import re

from .models import DocumentChunk, DocumentContent


def chunk_document(document: DocumentContent) -> list[DocumentChunk]:
    """
    Convert page-level document content into provenance-aware chunks.

    The first version uses clause/heading-like lines as boundaries while
    preserving the original page number for every chunk.
    """

    chunks: list[DocumentChunk] = []
    chunk_counter = 1

    for page in document.pages:
        lines = [line.strip() for line in page.text.splitlines() if line.strip()]

        current_section: str | None = None
        current_clause: str | None = None
        current_text: list[str] = []

        for line in lines:
            clause_match = re.match(
                r"^(\d+(?:\.\d+)*\.?)\s+(.+)$",
                line,
            )

            if clause_match:
                if current_text:
                    chunks.append(
                        DocumentChunk(
                            chunk_id=f"{document.document_id}-chunk-{chunk_counter:04d}",
                            document_id=document.document_id,
                            page_number=page.page_number,
                            section=current_section,
                            clause=current_clause,
                            text=" ".join(current_text),
                        )
                    )
                    chunk_counter += 1

                current_clause = clause_match.group(1).rstrip(".")
                current_section = clause_match.group(2).strip()
                current_text = [line]
            else:
                current_text.append(line)

        if current_text:
            chunks.append(
                DocumentChunk(
                    chunk_id=f"{document.document_id}-chunk-{chunk_counter:04d}",
                    document_id=document.document_id,
                    page_number=page.page_number,
                    section=current_section,
                    clause=current_clause,
                    text=" ".join(current_text),
                )
            )
            chunk_counter += 1

    return chunks