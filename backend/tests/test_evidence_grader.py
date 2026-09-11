from app.ingestion.models import DocumentChunk
from app.retrieval.evidence_grader import EvidenceGrader


def make_chunk(chunk_id: str, text: str) -> DocumentChunk:
    return DocumentChunk(
        chunk_id=chunk_id,
        document_id="test-document",
        page_number=1,
        section="TEST",
        clause="1",
        text=text,
    )


def test_evidence_is_sufficient():
    chunk = make_chunk(
        chunk_id="chunk-1",
        text="The cleaning fee is $200.",
    )

    grader = EvidenceGrader(minimum_score=0.0)

    assessment = grader.assess(
        results=[
            (chunk, 0.75),
        ]
    )

    assert assessment.sufficient is True
    assert assessment.top_score == 0.75
    assert assessment.evidence_count == 1
    assert "passed" in assessment.reason.lower()


def test_evidence_is_insufficient():
    chunk = make_chunk(
        chunk_id="chunk-2",
        text="This clause discusses unrelated information.",
    )

    grader = EvidenceGrader(minimum_score=0.5)

    assessment = grader.assess(
        results=[
            (chunk, 0.2),
        ]
    )

    assert assessment.sufficient is False
    assert assessment.top_score == 0.2
    assert assessment.evidence_count == 1
    assert "threshold" in assessment.reason.lower()


def test_no_evidence_is_insufficient():
    grader = EvidenceGrader(minimum_score=0.5)

    assessment = grader.assess([])

    assert assessment.sufficient is False
    assert assessment.top_score == 0.0
    assert assessment.evidence_count == 0
    assert "no evidence" in assessment.reason.lower()