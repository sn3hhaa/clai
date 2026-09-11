from dataclasses import dataclass

from ..ingestion.models import DocumentChunk


@dataclass
class EvidenceAssessment:
    """
    Result of evaluating whether retrieved evidence is strong enough
    to continue toward answer generation.

    This is a retrieval heuristic, not a probability of factual or
    legal correctness.
    """

    sufficient: bool
    top_score: float
    evidence_count: int
    reason: str


class EvidenceGrader:
    """
    Evaluate reranked retrieval results using a configurable score threshold.
    """

    def __init__(self, minimum_score: float = 0.0) -> None:
        self.minimum_score = minimum_score

    def assess(
        self,
        results: list[tuple[DocumentChunk, float]],
    ) -> EvidenceAssessment:
        """
        Determine whether the strongest retrieved evidence passes
        the configured relevance threshold.
        """

        if not results:
            return EvidenceAssessment(
                sufficient=False,
                top_score=0.0,
                evidence_count=0,
                reason="No evidence was retrieved.",
            )

        top_score = float(results[0][1])

        if top_score >= self.minimum_score:
            return EvidenceAssessment(
                sufficient=True,
                top_score=top_score,
                evidence_count=len(results),
                reason="Top-ranked evidence passed the relevance threshold.",
            )

        return EvidenceAssessment(
            sufficient=False,
            top_score=top_score,
            evidence_count=len(results),
            reason="Top-ranked evidence did not pass the relevance threshold.",
        )