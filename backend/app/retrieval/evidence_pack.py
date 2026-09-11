from dataclasses import dataclass

from ..ingestion.models import DocumentChunk
from .evidence_grader import EvidenceAssessment


@dataclass
class EvidenceItem:
    """
    A single piece of retrieved evidence with provenance.
    """

    chunk_id: str
    document_id: str
    page_number: int
    section: str | None
    clause: str | None
    text: str
    relevance_score: float


@dataclass
class EvidencePack:
    """
    Structured evidence passed from retrieval toward reasoning.

    This object preserves document provenance so downstream answer
    generation can produce grounded responses and citations.
    """

    query: str
    evidence: list[EvidenceItem]
    sufficient: bool
    top_score: float
    evidence_count: int
    assessment_reason: str

    @classmethod
    def from_results(
        cls,
        query: str,
        results: list[tuple[DocumentChunk, float]],
        assessment: EvidenceAssessment,
    ) -> "EvidencePack":
        """
        Build an EvidencePack from reranked retrieval results
        and their evidence assessment.
        """

        evidence = [
            EvidenceItem(
                chunk_id=chunk.chunk_id,
                document_id=chunk.document_id,
                page_number=chunk.page_number,
                section=chunk.section,
                clause=chunk.clause,
                text=chunk.text,
                relevance_score=float(score),
            )
            for chunk, score in results
        ]

        return cls(
            query=query,
            evidence=evidence,
            sufficient=assessment.sufficient,
            top_score=assessment.top_score,
            evidence_count=assessment.evidence_count,
            assessment_reason=assessment.reason,
        )