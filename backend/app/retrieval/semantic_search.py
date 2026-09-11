from .embeddings import EmbeddingModel
from ..ingestion.models import DocumentChunk


class SemanticSearch:
    """Rank document chunks by semantic similarity to a user query."""

    def __init__(self, embedding_model: EmbeddingModel | None = None) -> None:
        self.embedding_model = embedding_model or EmbeddingModel()

    def search(
        self,
        chunks: list[DocumentChunk],
        query: str,
        top_k: int = 5,
    ) -> list[tuple[DocumentChunk, float]]:
        """Return the most semantically relevant chunks with similarity scores."""

        if not chunks:
            return []

        texts = [chunk.text for chunk in chunks]

        document_embeddings = self.embedding_model.embed_documents(texts)
        query_embedding = self.embedding_model.embed_query(query)

        scored_chunks: list[tuple[DocumentChunk, float]] = []

        for chunk, embedding in zip(chunks, document_embeddings):
            similarity = sum(
                query_value * document_value
                for query_value, document_value in zip(
                    query_embedding,
                    embedding,
                )
            )

            scored_chunks.append((chunk, similarity))

        scored_chunks.sort(key=lambda item: item[1], reverse=True)

        return scored_chunks[:top_k]