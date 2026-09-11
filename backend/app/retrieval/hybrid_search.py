from ..ingestion.models import DocumentChunk
from .bm25_search import BM25Search
from .embeddings import EmbeddingModel
from .rrf import reciprocal_rank_fusion
from .semantic_search import SemanticSearch


class HybridSearch:
    """
    Combine semantic and lexical retrieval using Reciprocal Rank Fusion.
    """

    def __init__(
        self,
        chunks: list[DocumentChunk],
        embedding_model: EmbeddingModel | None = None,
    ) -> None:
        self.chunks = chunks

        self.semantic_search = SemanticSearch(
            embedding_model=embedding_model,
        )

        self.bm25_search = BM25Search(chunks)

    def search(
        self,
        query: str,
        top_k: int = 5,
    ) -> list[tuple[DocumentChunk, float]]:
        """
        Retrieve relevant chunks using semantic search + BM25,
        then fuse the ranked results with Reciprocal Rank Fusion.
        """

        semantic_results = self.semantic_search.search(
            chunks=self.chunks,
            query=query,
            top_k=top_k,
        )

        bm25_results = self.bm25_search.search(
            query=query,
            top_k=top_k,
        )

        return reciprocal_rank_fusion(
            result_lists=[
                semantic_results,
                bm25_results,
            ],
            top_k=top_k,
        )