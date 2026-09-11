from pathlib import Path

from app.agent.graph import ClaiAgent
from app.ingestion.chunker import chunk_document
from app.ingestion.pdf_parser import extract_pdf


def test_clai_agent_graph():
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
    )

    query = "What is the cleaning fee?"

    state = agent.invoke(query)

    assert state["query"] == query

    assert "evidence_pack" in state
    assert state["evidence_pack"].sufficient is True

    assert len(state["evidence_pack"].evidence) > 0

    assert "queries_used" in state
    assert len(state["queries_used"]) >= 1

    first_evidence = state["evidence_pack"].evidence[0]

    assert first_evidence.document_id == "test-rental-agreement"
    assert first_evidence.page_number >= 1

    assert (
        "clean" in first_evidence.text.lower()
        or "200" in first_evidence.text
    )

    print(f"\nQuery: {query}")
    print("\nLangGraph EvidencePack:")

    for evidence in state["evidence_pack"].evidence:
        print(f"\n--- {evidence.chunk_id} ---")
        print(f"Page: {evidence.page_number}")
        print(f"Clause: {evidence.clause}")
        print(f"Section: {evidence.section}")
        print(f"Score: {evidence.relevance_score:.6f}")
        print(f"Text: {evidence.text[:300]}")

    print("\nGraph state:")
    print(f"Queries used: {state['queries_used']}")
    print(f"Correction attempted: {state['correction_attempted']}")