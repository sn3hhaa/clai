import time

from sentence_transformers import CrossEncoder

from ..ingestion.models import DocumentChunk


class Reranker:
    """
    Rerank retrieved document chunks using a cross-encoder model.

    The cross-encoder scores each query/chunk pair jointly,
    allowing deeper relevance comparison than embedding similarity.
    """

    def __init__(
        self,
        model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
    ) -> None:
        self.model_name = model_name
        self.model = CrossEncoder(model_name)

    def rerank(
        self,
        query: str,
        results: list[tuple[DocumentChunk, float]],
        top_k: int = 5,
    ) -> list[tuple[DocumentChunk, float]]:
        """
        Rerank retrieved chunks according to cross-encoder relevance.
        """

        if not results:
            return []

        pairs = [
            (query, chunk.text)
            for chunk, _ in results
        ]

        start = time.perf_counter()

        scores = self.model.predict(pairs)

        elapsed = time.perf_counter() - start

        print(f"Reranker latency: {elapsed:.3f}s")

        reranked = [
            (chunk, float(score))
            for (chunk, _), score in zip(results, scores)
        ]

        reranked.sort(
            key=lambda item: item[1],
            reverse=True,
        )

        return reranked[:top_k]