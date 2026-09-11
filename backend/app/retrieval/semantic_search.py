import time

from ..ingestion.models import DocumentChunk
from .embeddings import EmbeddingModel


class SemanticSearch:
    """
    Rank document chunks by semantic similarity to a user query.

    Document embeddings are generated once and reused for subsequent
    queries over the same chunk collection.
    """

    def __init__(
        self,
        embedding_model: EmbeddingModel | None = None,
    ) -> None:
        self.embedding_model = embedding_model or EmbeddingModel()

        self.chunks: list[DocumentChunk] = []
        self.document_embeddings: list[list[float]] = []

    def _ensure_index(
        self,
        chunks: list[DocumentChunk],
    ) -> None:
        """
        Build the document embedding index once for the current chunks.
        """

        if not chunks:
            self.chunks = []
            self.document_embeddings = []
            return

        chunk_ids = [chunk.chunk_id for chunk in chunks]
        indexed_chunk_ids = [chunk.chunk_id for chunk in self.chunks]

        if chunk_ids == indexed_chunk_ids:
            return

        self.chunks = chunks

        self.document_embeddings = self.embedding_model.embed_documents(
            [chunk.text for chunk in chunks]
        )

    def search(
        self,
        chunks: list[DocumentChunk],
        query: str,
        top_k: int = 5,
    ) -> list[tuple[DocumentChunk, float]]:
        """
        Return the most semantically relevant chunks.

        Document embeddings are generated only when the chunk collection
        changes. Subsequent queries reuse the existing embeddings.
        """

        self._ensure_index(chunks)

        if not self.chunks:
            return []

        start = time.perf_counter()

        query_embedding = self.embedding_model.embed_query(query)

        elapsed = time.perf_counter() - start

        print(f"Query embedding latency: {elapsed:.3f}s")

        scored_chunks: list[tuple[DocumentChunk, float]] = []

        for chunk, embedding in zip(
            self.chunks,
            self.document_embeddings,
        ):
            similarity = sum(
                query_value * document_value
                for query_value, document_value in zip(
                    query_embedding,
                    embedding,
                )
            )

            scored_chunks.append((chunk, similarity))

        scored_chunks.sort(
            key=lambda item: item[1],
            reverse=True,
        )

        return scored_chunks[:top_k]