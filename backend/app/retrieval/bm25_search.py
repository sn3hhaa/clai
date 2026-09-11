import re

from rank_bm25 import BM25Okapi

from ..ingestion.models import DocumentChunk


def tokenize(text: str) -> list[str]:
    """Tokenize text for BM25 lexical retrieval."""
    return re.findall(r"\b\w+\b", text.lower())


class BM25Search:
    """Rank document chunks using BM25 lexical matching."""

    def __init__(self, chunks: list[DocumentChunk]) -> None:
        self.chunks = chunks
        self.tokenized_chunks = [
            tokenize(chunk.text)
            for chunk in chunks
        ]
        self.index = BM25Okapi(self.tokenized_chunks)

    def search(
        self,
        query: str,
        top_k: int = 5,
    ) -> list[tuple[DocumentChunk, float]]:
        """Return the highest-scoring lexical matches."""

        if not self.chunks:
            return []

        query_tokens = tokenize(query)
        scores = self.index.get_scores(query_tokens)

        ranked = sorted(
            zip(self.chunks, scores),
            key=lambda item: item[1],
            reverse=True,
        )

        return ranked[:top_k]