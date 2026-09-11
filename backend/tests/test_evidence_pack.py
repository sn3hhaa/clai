from pathlib import Path

from app.ingestion.chunker import chunk_document
from app.ingestion.pdf_parser import extract_pdf
from app.retrieval.corrective_retrieval import CorrectiveRetrieval
from app.retrieval.evidence_pack import EvidencePack


def test_evidence_pack():
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

    retrieval_result = retrieval.search(
        query=query,
        retrieval_top_k=5,
        rerank_top_k=3,
    )

    evidence_pack = EvidencePack.from_results(
        query=query,
        results=retrieval_result.results,
        assessment=retrieval_result.assessment,
    )

    assert evidence_pack.query == query
    assert evidence_pack.sufficient is True
    assert evidence_pack.evidence_count > 0
    assert len(evidence_pack.evidence) == evidence_pack.evidence_count

    first_evidence = evidence_pack.evidence[0]

    assert first_evidence.chunk_id
    assert first_evidence.document_id == "test-rental-agreement"
    assert first_evidence.page_number >= 1
    assert first_evidence.text
    assert isinstance(first_evidence.relevance_score, float)

    assert (
        "clean" in first_evidence.text.lower()
        or "200" in first_evidence.text
    )

    print(f"\nQuery: {evidence_pack.query}")
    print("\nEvidencePack:")

    for item in evidence_pack.evidence:
        print(f"\n--- {item.chunk_id} ---")
        print(f"Page: {item.page_number}")
        print(f"Clause: {item.clause}")
        print(f"Section: {item.section}")
        print(f"Score: {item.relevance_score:.6f}")
        print(f"Text: {item.text[:300]}")

    print("\nAssessment:")
    print(f"Sufficient: {evidence_pack.sufficient}")
    print(f"Evidence count: {evidence_pack.evidence_count}")
    print(f"Reason: {evidence_pack.assessment_reason}")