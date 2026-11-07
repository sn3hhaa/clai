"""BM25 lexical retrieval, one index per document, persisted as tokenised JSON."""

from __future__ import annotations

import json
import re
import threading
from pathlib import Path

from rank_bm25 import BM25Okapi

STOPWORDS = frozenset(
    [
        "a",
        "an",
        "and",
        "are",
        "as",
        "at",
        "be",
        "by",
        "can",
        "could",
        "do",
        "does",
        "for",
        "from",
        "had",
        "has",
        "have",
        "how",
        "i",
        "if",
        "in",
        "into",
        "is",
        "it",
        "its",
        "me",
        "my",
        "of",
        "on",
        "or",
        "our",
        "shall",
        "should",
        "so",
        "than",
        "that",
        "the",
        "their",
        "them",
        "then",
        "there",
        "these",
        "they",
        "this",
        "those",
        "to",
        "under",
        "upon",
        "was",
        "we",
        "were",
        "what",
        "when",
        "where",
        "which",
        "who",
        "whom",
        "why",
        "will",
        "with",
        "would",
        "you",
        "your",
        "about",
        "any",
        "agreement",
        "party",
        "parties",
    ]
)
# Longest first. Light stemming so terminate/termination/terminated and pay/payment/payable meet.
_SUFFIXES = (
    "ations",
    "ation",
    "ating",
    "ated",
    "ates",
    "ings",
    "ment",
    "ments",
    "able",
    "ing",
    "ate",
    "ed",
    "es",
    "ly",
    "s",
    "e",
)
_TOKEN = re.compile(r"[a-z0-9]+(?:[.,][0-9]+)*")


def stem(word: str) -> str:
    if word.isdigit() or len(word) <= 3:
        return word
    for suffix in _SUFFIXES:
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            return word[: -len(suffix)]
    return word


def tokenize(text: str) -> list[str]:
    return [stem(t) for t in _TOKEN.findall(text.lower()) if t not in STOPWORDS]


class LexicalIndex:
    """Holds BM25 indexes in memory and on disk (`<root>/<document_id>.json`)."""

    def __init__(self, root: Path):
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)
        self._cache: dict[str, tuple[list[str], BM25Okapi]] = {}
        self._lock = threading.Lock()

    def _file(self, document_id: str) -> Path:
        return self.root / f"{document_id}.json"

    def build(self, document_id: str, chunk_ids: list[str], texts: list[str]) -> None:
        tokens = [tokenize(t) for t in texts]
        self._file(document_id).write_text(json.dumps({"ids": chunk_ids, "tokens": tokens}), encoding="utf-8")
        with self._lock:
            self._cache[document_id] = (chunk_ids, BM25Okapi(tokens))

    def _load(self, document_id: str) -> tuple[list[str], BM25Okapi] | None:
        with self._lock:
            if document_id in self._cache:
                return self._cache[document_id]
            path = self._file(document_id)
            if not path.exists():
                return None
            data = json.loads(path.read_text(encoding="utf-8"))
            entry = (data["ids"], BM25Okapi(data["tokens"]))
            self._cache[document_id] = entry
            return entry

    def search(self, document_id: str, query: str, limit: int) -> list[tuple[str, float]]:
        entry = self._load(document_id)
        terms = tokenize(query)
        if entry is None or not terms:
            return []
        ids, bm25 = entry
        scores = bm25.get_scores(terms)
        ranked = sorted(zip(ids, scores, strict=True), key=lambda x: x[1], reverse=True)
        return [(cid, float(s)) for cid, s in ranked[:limit] if s > 0]

    def delete(self, document_id: str) -> None:
        with self._lock:
            self._cache.pop(document_id, None)
        self._file(document_id).unlink(missing_ok=True)
