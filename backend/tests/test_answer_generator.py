from types import SimpleNamespace

from app.answer_generator import AnswerGenerator
from app.ingestion.models import DocumentChunk
from app.retrieval.evidence_grader import EvidenceAssessment
from app.retrieval.evidence_pack import EvidencePack


def make_evidence_pack(sufficient: bool = True) -> EvidencePack:
    evidence = []

    if sufficient:
        chunk = DocumentChunk(
            chunk_id="chunk-1",
            document_id="test-document",
            page_number=3,
            section="FEES",
            clause="5",
            text="The cleaning fee is $200.",
        )

        evidence.append(
            (
                chunk,
                0.85,
            )
        )

    assessment = EvidenceAssessment(
        sufficient=sufficient,
        top_score=0.85 if sufficient else 0.0,
        evidence_count=len(evidence),
        reason=(
            "Top-ranked evidence passed the relevance threshold."
            if sufficient
            else "No evidence was retrieved."
        ),
    )

    return EvidencePack.from_results(
        query="What is the cleaning fee?",
        results=evidence,
        assessment=assessment,
    )


def test_insufficient_evidence_does_not_call_llm():
    generator = AnswerGenerator(api_key="test-key")

    evidence_pack = make_evidence_pack(sufficient=False)

    answer = generator.generate(evidence_pack)

    assert "sufficient evidence" in answer.lower()


def test_answer_generator_uses_evidence():
    generator = AnswerGenerator(api_key="test-key")

    fake_response = SimpleNamespace(
        output_text="The cleaning fee is $200. [Evidence 1]"
    )

    generator.client.responses.create = lambda **kwargs: fake_response

    evidence_pack = make_evidence_pack(sufficient=True)

    answer = generator.generate(evidence_pack)

    assert answer == "The cleaning fee is $200. [Evidence 1]"