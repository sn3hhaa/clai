from pathlib import Path

from app.ingestion.chunker import chunk_document
from app.ingestion.pdf_parser import extract_pdf
from app.retrieval.retrieval_pipeline import RetrievalPipeline


def test_retrieval_pipeline():
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

    pipeline = RetrievalPipeline(
        chunks=chunks,
        minimum_score=0.0,
    )

    query = "What is the cleaning fee?"

    result = pipeline.search(
        query=query,
        retrieval_top_k=5,
        rerank_top_k=3,
    )

    assert len(result.results) > 0
    assert len(result.results) <= 3

    assert result.assessment.sufficient is True
    assert result.assessment.evidence_count == len(result.results)

    top_chunk, top_score = result.results[0]

    assert top_chunk.document_id == "test-rental-agreement"
    assert top_chunk.page_number >= 1
    assert isinstance(top_score, float)

    assert (
        "clean" in top_chunk.text.lower()
        or "200" in top_chunk.text
    )

    print(f"\nQuery: {query}")
    print("\nFinal retrieval pipeline results:")

    for chunk, score in result.results:
        print(f"\n--- {chunk.chunk_id} ---")
        print(f"Page: {chunk.page_number}")
        print(f"Clause: {chunk.clause}")
        print(f"Section: {chunk.section}")
        print(f"Score: {score:.6f}")
        print(f"Text: {chunk.text[:300]}")

    print("\nEvidence assessment:")
    print(f"Sufficient: {result.assessment.sufficient}")
    print(f"Top score: {result.assessment.top_score:.6f}")
    print(f"Evidence count: {result.assessment.evidence_count}")
    print(f"Reason: {result.assessment.reason}")