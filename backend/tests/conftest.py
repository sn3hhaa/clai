"""Shared fixtures. Real local models (MiniLM embedder + cross-encoder) and an in-memory Qdrant;
the only faked component is the network LLM."""

from __future__ import annotations

import json
import re
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.embeddings import SentenceTransformerEmbedder
from app.llm import LLMUnavailable
from app.main import create_app
from app.retrieval.rerank import CrossEncoderReranker
from app.services import Clai

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="session")
def services_pdf() -> bytes:
    return (FIXTURES / "services_agreement.pdf").read_bytes()


@pytest.fixture(scope="session")
def nda_pdf() -> bytes:
    return (FIXTURES / "mutual_nda.pdf").read_bytes()


@pytest.fixture(scope="session")
def embedder() -> SentenceTransformerEmbedder:
    return SentenceTransformerEmbedder("sentence-transformers/all-MiniLM-L6-v2", 384)


@pytest.fixture(scope="session")
def reranker() -> CrossEncoderReranker:
    return CrossEncoderReranker("cross-encoder/ms-marco-MiniLM-L-6-v2")


def make_settings(tmp: Path, **overrides: Any) -> Settings:
    return Settings(
        _env_file=None,  # type: ignore[call-arg]
        app_env="test",
        data_dir=tmp,
        qdrant_mode="memory",
        openrouter_api_key="",
        **overrides,
    )


class FakeLLM:
    """Answers from the sources it is given, like a well-behaved model; records calls."""

    name = "fake-llm"

    def __init__(self, fail: bool = False):
        self.calls: list[str] = []
        self.fail = fail

    def complete_json(self, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]:
        self.calls.append(user)
        if self.fail:
            raise LLMUnavailable("simulated outage")
        sources = re.findall(r"\[(S\d+)\] \(([^)]*)\) (.+)", user)
        label, where, text = sources[0]
        first_sentence = re.split(r"(?<=[.!?])\s", text)[0]
        return json.loads(
            json.dumps(
                {
                    "answer": first_sentence,
                    "spoken_answer": f"Per {where.split(',')[1].strip() if ',' in where else where}, {first_sentence}",
                    "key_points": [first_sentence],
                    "citations": [label],
                    "sufficient": True,
                }
            )
        )


@pytest.fixture
def clai(tmp_path: Path, embedder: SentenceTransformerEmbedder, reranker: CrossEncoderReranker) -> Iterator[Clai]:
    service = Clai(make_settings(tmp_path), embedder=embedder, reranker=reranker)
    yield service
    service.close()


@pytest.fixture
def client(clai: Clai) -> Iterator[TestClient]:
    app = create_app(clai.settings, clai=clai)
    with TestClient(app) as c:
        yield c
