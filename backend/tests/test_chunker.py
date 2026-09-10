from pathlib import Path

from app.ingestion.chunker import chunk_document
from app.ingestion.pdf_parser import extract_pdf


def test_chunk_document():
    project_root = Path(__file__).resolve().parents[2]

    pdf_path = (
        project_root
        / "backend"
        / "test_documents"
        / "sample_rental_agreement.pdf"
    )

    document = extract_pdf(
        pdf_path=pdf_path,
        document_id="test-rental-agreement",
    )

    chunks = chunk_document(document)

    assert len(chunks) > 0

    for chunk in chunks:
        assert chunk.chunk_id
        assert chunk.document_id == "test-rental-agreement"
        assert chunk.page_number >= 1
        assert chunk.text.strip()

    print(f"\nTotal chunks: {len(chunks)}")

    for chunk in chunks:
        print(f"\n--- {chunk.chunk_id} ---")
        print(f"Page: {chunk.page_number}")
        print(f"Section: {chunk.section}")
        print(f"Clause: {chunk.clause}")
        print(f"Text: {chunk.text[:300]}")