from pathlib import Path

from app.agent.graph import ClaiAgent
from app.ingestion.chunker import chunk_document
from app.ingestion.pdf_parser import extract_pdf


class FakeAnswerGenerator:
    """Test double that avoids making a real LLM API request."""

    def generate(self, evidence_pack):
        assert evidence_pack.sufficient is True
        assert len(evidence_pack.evidence) > 0

        return (
            "The agreement states that the cleaning fee is $200. "
            "[Evidence 1]"
        )


def test_clai_agent_graph_with_answer_generation():
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

    agent = ClaiAgent(
        chunks=chunks,
        minimum_score=0.0,
        answer_generator=FakeAnswerGenerator(),
    )

    query = "What is the cleaning fee?"

    state = agent.invoke(query)

    assert state["query"] == query

    assert "evidence_pack" in state
    assert state["evidence_pack"].sufficient is True
    assert len(state["evidence_pack"].evidence) > 0

    assert "answer" in state
    assert state["answer"]

    assert "$200" in state["answer"]
    assert "[Evidence 1]" in state["answer"]

    first_evidence = state["evidence_pack"].evidence[0]

    assert first_evidence.document_id == "test-rental-agreement"
    assert first_evidence.page_number >= 1

    print(f"\nQuery: {query}")
    print(f"Answer: {state['answer']}")

    print("\nEvidence used:")

    for evidence in state["evidence_pack"].evidence:
        print(f"\n--- {evidence.chunk_id} ---")
        print(f"Page: {evidence.page_number}")
        print(f"Clause: {evidence.clause}")
        print(f"Section: {evidence.section}")
        print(f"Score: {evidence.relevance_score:.6f}")
        print(f"Text: {evidence.text[:300]}")