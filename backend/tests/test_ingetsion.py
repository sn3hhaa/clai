from pathlib import Path

from app.ingestion.pdf_parser import extract_pdf


def test_extract_pdf():
    project_root = Path(__file__).resolve().parents[2]
    pdf_path = project_root / "backend" / "test_documents" / "sample_rental_agreement.pdf"

    document = extract_pdf(
        pdf_path=pdf_path,
        document_id="test-rental-agreement",
    )

    assert document.filename == "sample_rental_agreement.pdf"
    assert document.page_count > 0
    assert len(document.pages) == document.page_count

    for page in document.pages:
        assert page.page_number >= 1
        assert isinstance(page.text, str)

    print(f"\nDocument: {document.filename}")
    print(f"Pages: {document.page_count}")

    for page in document.pages[:2]:
        print(f"\n--- Page {page.page_number} ---")
        print(page.text[:500])