"""Hybrid retrieval: dense (Qdrant) + lexical (BM25) → RRF → cross-encoder rerank.

Every stage is scoped to a single document_id.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.embeddings import Embedder
from app.ingestion.structure import search_text
from app.retrieval.fusion import reciprocal_rank_fusion
from app.retrieval.lexical import LexicalIndex
from app.retrieval.rerank import Reranker
from app.schemas import Chunk
from app.storage.db import Database
from app.vector_db import VectorStore


@dataclass
class Candidate:
    chunk: Chunk
    fused_score: float
    rerank_score: float | None = None
    dense_rank: int | None = None
    lexical_rank: int | None = None

    @property
    def score(self) -> float:
        return self.rerank_score if self.rerank_score is not None else self.fused_score


class HybridRetriever:
    def __init__(
        self,
        *,
        db: Database,
        embedder: Embedder,
        vectors: VectorStore,
        lexical: LexicalIndex,
        reranker: Reranker | None,
        top_k: int = 12,
        rrf_k: int = 60,
    ):
        self.db = db
        self.embedder = embedder
        self.vectors = vectors
        self.lexical = lexical
        self.reranker = reranker
        self.top_k = top_k
        self.rrf_k = rrf_k

    def index(self, chunks: list[Chunk]) -> None:
        if not chunks:
            return
        texts = [search_text(c) for c in chunks]
        self.vectors.upsert(chunks, self.embedder.embed(texts))
        self.lexical.build(chunks[0].document_id, [c.chunk_id for c in chunks], texts)

    def delete(self, document_id: str) -> None:
        self.vectors.delete_document(document_id)
        self.lexical.delete(document_id)

    def retrieve(self, document_id: str, queries: list[str]) -> list[Candidate]:
        """Run dense + BM25 for each query variant and fuse all rankings with RRF."""
        rankings: list[list[str]] = []
        dense_rank: dict[str, int] = {}
        lexical_rank: dict[str, int] = {}
        vectors = self.embedder.embed(queries)
        for query, vector in zip(queries, vectors, strict=True):
            dense = [h.chunk_id for h in self.vectors.search(document_id, vector, self.top_k)]
            lexical = [cid for cid, _ in self.lexical.search(document_id, query, self.top_k)]
            for rank, cid in enumerate(dense, 1):
                dense_rank.setdefault(cid, rank)
            for rank, cid in enumerate(lexical, 1):
                lexical_rank.setdefault(cid, rank)
            rankings.extend(r for r in (dense, lexical) if r)

        fused = reciprocal_rank_fusion(rankings, k=self.rrf_k)[: self.top_k]
        chunks = self.db.get_chunks_by_id([cid for cid, _ in fused])
        return [
            Candidate(
                chunk=chunks[cid],
                fused_score=score,
                dense_rank=dense_rank.get(cid),
                lexical_rank=lexical_rank.get(cid),
            )
            for cid, score in fused
            # Defence in depth: never return a chunk from another document.
            if cid in chunks and chunks[cid].document_id == document_id
        ]

    def rerank(self, query: str, candidates: list[Candidate], top_n: int) -> list[Candidate]:
        if not candidates:
            return []
        if self.reranker is None:
            return candidates[:top_n]
        scores = self.reranker.score(query, [search_text(c.chunk) for c in candidates])
        for candidate, score in zip(candidates, scores, strict=True):
            candidate.rerank_score = score
        return sorted(candidates, key=lambda c: c.score, reverse=True)[:top_n]
