from pathlib import Path

from app.ingestion.chunker import chunk_document
from app.ingestion.pdf_parser import extract_pdf
from app.retrieval.bm25_search import BM25Search
from app.retrieval.rrf import reciprocal_rank_fusion
from app.retrieval.semantic_search import SemanticSearch


def test_reciprocal_rank_fusion():
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

    semantic_search = SemanticSearch()
    bm25_search = BM25Search(chunks)

    query = "What is the cleaning fee?"

    semantic_results = semantic_search.search(
        chunks=chunks,
        query=query,
        top_k=5,
    )

    bm25_results = bm25_search.search(
        query=query,
        top_k=5,
    )

    fused_results = reciprocal_rank_fusion(
        result_lists=[
            semantic_results,
            bm25_results,
        ],
        top_k=5,
    )

    assert len(fused_results) > 0
    assert len(fused_results) <= 5

    for chunk, score in fused_results:
        assert chunk.document_id == "test-rental-agreement"
        assert chunk.page_number >= 1
        assert score > 0

    top_chunk, top_score = fused_results[0]

    assert "clean" in top_chunk.text.lower() or "200" in top_chunk.text

    print(f"\nQuery: {query}")
    print("\nRRF hybrid results:")

    for chunk, score in fused_results:
        print(f"\n--- {chunk.chunk_id} ---")
        print(f"Page: {chunk.page_number}")
        print(f"Clause: {chunk.clause}")
        print(f"Section: {chunk.section}")
        print(f"RRF score: {score:.6f}")
        print(f"Text: {chunk.text[:300]}")