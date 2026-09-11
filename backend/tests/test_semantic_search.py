from pathlib import Path

from app.ingestion.chunker import chunk_document
from app.ingestion.pdf_parser import extract_pdf
from app.retrieval.semantic_search import SemanticSearch


def test_semantic_search():
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

    search = SemanticSearch()

    results = search.search(
        chunks=chunks,
        query="What is the cleaning fee?",
        top_k=3,
    )

    assert len(results) == 3

    top_chunk, top_score = results[0]

    assert top_score > 0
    assert "clean" in top_chunk.text.lower() or "200" in top_chunk.text

    print(f"\nQuery: What is the cleaning fee?")
    print("\nTop semantic results:")

    for chunk, score in results:
        print(f"\n--- {chunk.chunk_id} ---")
        print(f"Page: {chunk.page_number}")
        print(f"Clause: {chunk.clause}")
        print(f"Section: {chunk.section}")
        print(f"Score: {score:.4f}")
        print(f"Text: {chunk.text[:300]}")