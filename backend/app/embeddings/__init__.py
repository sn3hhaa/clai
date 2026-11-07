"""Sentence-transformer embeddings (default all-MiniLM-L6-v2, 384 dimensions, runs on CPU)."""

from __future__ import annotations

import threading
from typing import Protocol

import numpy as np


class Embedder(Protocol):
    dim: int

    def embed(self, texts: list[str]) -> np.ndarray: ...


class SentenceTransformerEmbedder:
    def __init__(self, model_name: str, expected_dim: int):
        from sentence_transformers import SentenceTransformer

        self.model = SentenceTransformer(model_name, device="cpu")
        dim = self.model.get_sentence_embedding_dimension()
        if dim != expected_dim:
            raise ValueError(f"{model_name} produces {dim}-d vectors, configuration expects {expected_dim}")
        self.dim = expected_dim
        self._lock = threading.Lock()

    def embed(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.dim), dtype=np.float32)
        with self._lock:
            vectors = self.model.encode(
                texts, batch_size=32, normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=False
            )
        return np.asarray(vectors, dtype=np.float32)
