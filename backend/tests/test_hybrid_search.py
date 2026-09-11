from pathlib import Path

from app.ingestion.chunker import chunk_document
from app.ingestion.pdf_parser import extract_pdf
from app.retrieval.hybrid_search import HybridSearch


def test_hybrid_search():
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

    hybrid_search = HybridSearch(chunks)

    query = "What is the cleaning fee?"

    results = hybrid_search.search(
        query=query,
        top_k=5,
    )

    assert len(results) > 0
    assert len(results) <= 5

    for chunk, score in results:
        assert chunk.document_id == "test-rental-agreement"
        assert chunk.page_number >= 1
        assert score > 0

    top_chunk, top_score = results[0]

    assert (
        "clean" in top_chunk.text.lower()
        or "200" in top_chunk.text
    )

    print(f"\nQuery: {query}")
    print("\nHybrid retrieval results:")

    for chunk, score in results:
        print(f"\n--- {chunk.chunk_id} ---")
        print(f"Page: {chunk.page_number}")
        print(f"Clause: {chunk.clause}")
        print(f"Section: {chunk.section}")
        print(f"RRF score: {score:.6f}")
        print(f"Text: {chunk.text[:300]}")