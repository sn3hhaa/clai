from dataclasses import dataclass

from ..ingestion.models import DocumentChunk
from .evidence_grader import EvidenceAssessment, EvidenceGrader
from .hybrid_search import HybridSearch
from .reranker import Reranker


@dataclass
class RetrievalResult:
    """
    Complete result of the retrieval pipeline.

    Contains the reranked evidence together with an assessment of
    whether the evidence is sufficient to continue toward answer generation.
    """

    results: list[tuple[DocumentChunk, float]]
    assessment: EvidenceAssessment


class RetrievalPipeline:
    """
    End-to-end retrieval pipeline:

    Hybrid retrieval → reranking → evidence sufficiency assessment.
    """

    def __init__(
        self,
        chunks: list[DocumentChunk],
        minimum_score: float = 0.0,
    ) -> None:
        self.hybrid_search = HybridSearch(chunks)
        self.reranker = Reranker()
        self.evidence_grader = EvidenceGrader(
            minimum_score=minimum_score,
        )

    def search(
        self,
        query: str,
        retrieval_top_k: int = 5,
        rerank_top_k: int = 3,
    ) -> RetrievalResult:
        """
        Run the complete retrieval pipeline for a user query.
        """

        hybrid_results = self.hybrid_search.search(
            query=query,
            top_k=retrieval_top_k,
        )

        reranked_results = self.reranker.rerank(
            query=query,
            results=hybrid_results,
            top_k=rerank_top_k,
        )

        assessment = self.evidence_grader.assess(
            reranked_results,
        )

        return RetrievalResult(
            results=reranked_results,
            assessment=assessment,
        )