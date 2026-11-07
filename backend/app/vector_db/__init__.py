"""Qdrant adapter. Local mode is an embedded store owned by the API process (no server, no Docker);
remote mode targets a native Qdrant server or Qdrant Cloud. Every query is filtered by document_id."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from qdrant_client import QdrantClient, models

from app.schemas import Chunk


@dataclass(frozen=True)
class VectorHit:
    chunk_id: str
    score: float


def point_id(chunk_id: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"clai:{chunk_id}"))


class VectorStore:
    def __init__(
        self,
        *,
        mode: str,
        collection: str,
        dim: int,
        path: Path | None = None,
        url: str = "",
        api_key: str = "",
    ):
        if mode == "remote":
            if not url:
                raise ValueError("QDRANT_MODE=remote requires QDRANT_URL")
            self.client = QdrantClient(url=url, api_key=api_key or None, timeout=30)
        elif mode == "memory":
            self.client = QdrantClient(location=":memory:")
        else:
            assert path is not None
            path.mkdir(parents=True, exist_ok=True)
            self.client = QdrantClient(path=str(path))
        self.mode = mode
        self.collection = collection
        self.dim = dim
        self._ensure_collection()

    def _ensure_collection(self) -> None:
        if not self.client.collection_exists(self.collection):
            self.client.create_collection(
                self.collection,
                vectors_config=models.VectorParams(size=self.dim, distance=models.Distance.COSINE),
            )
            if self.mode == "remote":  # payload indexes are a server feature; local mode ignores them
                self.client.create_payload_index(self.collection, "document_id", models.PayloadSchemaType.KEYWORD)

    def upsert(self, chunks: list[Chunk], vectors: np.ndarray) -> None:
        points = [
            models.PointStruct(
                id=point_id(chunk.chunk_id),
                vector=vector.tolist(),
                payload={
                    "document_id": chunk.document_id,
                    "chunk_id": chunk.chunk_id,
                    "page_number": chunk.page_number,
                    "section": chunk.section,
                    "clause": chunk.clause,
                },
            )
            for chunk, vector in zip(chunks, vectors, strict=True)
        ]
        for start in range(0, len(points), 128):
            self.client.upsert(self.collection, points=points[start : start + 128], wait=True)

    def search(self, document_id: str, vector: np.ndarray, limit: int) -> list[VectorHit]:
        result = self.client.query_points(
            self.collection,
            query=vector.tolist(),
            query_filter=_doc_filter(document_id),
            limit=limit,
            with_payload=["chunk_id"],
        )
        return [
            VectorHit(chunk_id=str(p.payload["chunk_id"]), score=float(p.score)) for p in result.points if p.payload
        ]

    def delete_document(self, document_id: str) -> None:
        self.client.delete(
            self.collection, points_selector=models.FilterSelector(filter=_doc_filter(document_id)), wait=True
        )

    def count(self, document_id: str) -> int:
        return self.client.count(self.collection, count_filter=_doc_filter(document_id), exact=True).count

    def close(self) -> None:
        self.client.close()


def _doc_filter(document_id: str) -> models.Filter:
    return models.Filter(must=[models.FieldCondition(key="document_id", match=models.MatchValue(value=document_id))])
