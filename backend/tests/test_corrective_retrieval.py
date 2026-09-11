from pathlib import Path

from app.ingestion.chunker import chunk_document
from app.ingestion.pdf_parser import extract_pdf
from app.retrieval.corrective_retrieval import CorrectiveRetrieval


def test_corrective_retrieval_normal_path():
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

    retrieval = CorrectiveRetrieval(
        chunks=chunks,
        minimum_score=0.0,
    )

    query = "What is the cleaning fee?"

    result = retrieval.search(
        query=query,
        retrieval_top_k=5,
        rerank_top_k=3,
    )

    assert len(result.results) > 0
    assert result.assessment.sufficient is True
    assert result.correction_attempted is False
    assert result.queries_used == [query]

    top_chunk, top_score = result.results[0]

    assert top_chunk.document_id == "test-rental-agreement"
    assert top_chunk.page_number >= 1
    assert isinstance(top_score, float)

    assert (
        "clean" in top_chunk.text.lower()
        or "200" in top_chunk.text
    )


def test_corrective_retrieval_attempts_correction():
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

    # A deliberately very high threshold forces the initial
    # evidence assessment to fail, allowing us to test the
    # corrective-retrieval branch.
    retrieval = CorrectiveRetrieval(
        chunks=chunks,
        minimum_score=100.0,
    )

    query = "What is the cleaning fee?"

    result = retrieval.search(
        query=query,
        retrieval_top_k=5,
        rerank_top_k=3,
    )

    assert result.correction_attempted is True
    assert len(result.queries_used) == 2
    assert result.queries_used[0] == query
    assert result.queries_used[1] != query