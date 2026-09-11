from dataclasses import dataclass

from ..ingestion.models import DocumentChunk
from .evidence_grader import EvidenceAssessment, EvidenceGrader
from .hybrid_search import HybridSearch
from .query_rewriter import QueryRewriter
from .reranker import Reranker


@dataclass
class CorrectiveRetrievalResult:
    """
    Result of bounded corrective retrieval.

    The pipeline performs an initial search and, when evidence is
    insufficient, makes one corrective retrieval attempt.
    """

    query: str
    results: list[tuple[DocumentChunk, float]]
    assessment: EvidenceAssessment
    queries_used: list[str]
    correction_attempted: bool


class CorrectiveRetrieval:
    """
    Retrieval pipeline with one bounded corrective search.

    Flow:

    Hybrid retrieval
        ↓
    Reranking
        ↓
    Evidence assessment
        ↓
    If insufficient:
        query rewriting
        ↓
        second retrieval
        ↓
        reranking
        ↓
        final assessment
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
        self.query_rewriter = QueryRewriter()

    def _retrieve(
        self,
        query: str,
        retrieval_top_k: int,
        rerank_top_k: int,
    ) -> tuple[
        list[tuple[DocumentChunk, float]],
        EvidenceAssessment,
    ]:
        """
        Run hybrid retrieval, reranking, and evidence assessment
        for a single query.
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

        return reranked_results, assessment

    def search(
        self,
        query: str,
        retrieval_top_k: int = 5,
        rerank_top_k: int = 3,
    ) -> CorrectiveRetrievalResult:
        """
        Perform initial retrieval and at most one corrective search.
        """

        queries_used = [query]

        results, assessment = self._retrieve(
            query=query,
            retrieval_top_k=retrieval_top_k,
            rerank_top_k=rerank_top_k,
        )

        if assessment.sufficient:
            return CorrectiveRetrievalResult(
                query=query,
                results=results,
                assessment=assessment,
                queries_used=queries_used,
                correction_attempted=False,
            )

        rewritten_queries = self.query_rewriter.rewrite(query)

        # The first rewritten query is the original query, so skip it.
        corrective_queries = [
            rewritten_query
            for rewritten_query in rewritten_queries
            if rewritten_query != query
        ]

        if not corrective_queries:
            return CorrectiveRetrievalResult(
                query=query,
                results=results,
                assessment=assessment,
                queries_used=queries_used,
                correction_attempted=False,
            )

        corrective_query = corrective_queries[0]
        queries_used.append(corrective_query)

        corrected_results, corrected_assessment = self._retrieve(
            query=corrective_query,
            retrieval_top_k=retrieval_top_k,
            rerank_top_k=rerank_top_k,
        )

        return CorrectiveRetrievalResult(
            query=query,
            results=corrected_results,
            assessment=corrected_assessment,
            queries_used=queries_used,
            correction_attempted=True,
        )