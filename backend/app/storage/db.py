"""SQLite persistence for documents, chunks, conversations, messages and summaries.

One connection guarded by a lock: FastAPI runs sync endpoints in a threadpool, and the
workload is small (one local user). WAL mode keeps readers from blocking the writer.
"""

from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.schemas import Chunk, OutlineItem

SCHEMA = """
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    size_bytes INTEGER NOT NULL,
    page_count INTEGER NOT NULL DEFAULT 0,
    chunk_count INTEGER NOT NULL DEFAULT 0,
    outline TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chunks (
    chunk_id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    ord INTEGER NOT NULL,
    page_number INTEGER NOT NULL,
    page_end INTEGER NOT NULL,
    section TEXT,
    clause TEXT,
    heading TEXT,
    text TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks(document_id, ord);
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    created_at TEXT NOT NULL,
    ended_at TEXT,
    summary TEXT
);
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    resolved_question TEXT,
    intent TEXT,
    citations TEXT NOT NULL DEFAULT '[]',
    key_points TEXT NOT NULL DEFAULT '[]',
    grounding TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
"""


def now() -> datetime:
    return datetime.now(UTC)


def new_id() -> str:
    return uuid.uuid4().hex


class Database:
    def __init__(self, path: Path | str):
        if isinstance(path, Path):
            path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._lock = threading.RLock()
        with self._lock:
            self._conn.execute("PRAGMA foreign_keys = ON")
            if str(path) != ":memory:":
                self._conn.execute("PRAGMA journal_mode = WAL")
            self._conn.executescript(SCHEMA)

    @contextmanager
    def tx(self) -> Iterator[sqlite3.Connection]:
        with self._lock:
            try:
                yield self._conn
                self._conn.commit()
            except Exception:
                self._conn.rollback()
                raise

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    # ── documents ────────────────────────────────────────────────────
    def create_document(self, document_id: str, filename: str, size_bytes: int) -> None:
        with self.tx() as c:
            c.execute(
                "INSERT INTO documents (id, filename, status, size_bytes, created_at) VALUES (?, ?, 'processing', ?, ?)",
                (document_id, filename, size_bytes, now().isoformat()),
            )

    def mark_ready(self, document_id: str, page_count: int, chunks: list[Chunk], outline: list[OutlineItem]) -> None:
        with self.tx() as c:
            c.execute("DELETE FROM chunks WHERE document_id = ?", (document_id,))
            c.executemany(
                "INSERT INTO chunks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    (
                        ch.chunk_id,
                        ch.document_id,
                        ch.order,
                        ch.page_number,
                        ch.page_end,
                        ch.section,
                        ch.clause,
                        ch.heading,
                        ch.text,
                    )
                    for ch in chunks
                ],
            )
            c.execute(
                "UPDATE documents SET status='ready', error=NULL, page_count=?, chunk_count=?, outline=? WHERE id=?",
                (page_count, len(chunks), json.dumps([o.model_dump() for o in outline]), document_id),
            )

    def mark_failed(self, document_id: str, error: str) -> None:
        with self.tx() as c:
            c.execute("UPDATE documents SET status='failed', error=? WHERE id=?", (error, document_id))

    def get_document(self, document_id: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._conn.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
        return _document(row) if row else None

    def list_documents(self) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute("SELECT * FROM documents ORDER BY created_at DESC").fetchall()
        return [_document(r) for r in rows]

    def delete_document(self, document_id: str) -> bool:
        with self.tx() as c:
            return c.execute("DELETE FROM documents WHERE id = ?", (document_id,)).rowcount > 0

    def get_chunks(self, document_id: str) -> list[Chunk]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM chunks WHERE document_id = ? ORDER BY ord", (document_id,)
            ).fetchall()
        return [_chunk(r) for r in rows]

    def get_chunks_by_id(self, chunk_ids: list[str]) -> dict[str, Chunk]:
        if not chunk_ids:
            return {}
        marks = ",".join("?" * len(chunk_ids))
        with self._lock:
            rows = self._conn.execute(f"SELECT * FROM chunks WHERE chunk_id IN ({marks})", chunk_ids).fetchall()
        return {r["chunk_id"]: _chunk(r) for r in rows}

    # ── conversations ────────────────────────────────────────────────
    def create_conversation(self, document_id: str, channel: str) -> str:
        conversation_id = new_id()
        with self.tx() as c:
            c.execute(
                "INSERT INTO conversations (id, document_id, channel, created_at) VALUES (?, ?, ?, ?)",
                (conversation_id, document_id, channel, now().isoformat()),
            )
        return conversation_id

    def get_conversation(self, conversation_id: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._conn.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,)).fetchone()
        if not row:
            return None
        data = dict(row)
        data["summary"] = json.loads(data["summary"]) if data["summary"] else None
        return data

    def end_conversation(self, conversation_id: str, summary: dict[str, Any]) -> None:
        with self.tx() as c:
            c.execute(
                "UPDATE conversations SET ended_at = COALESCE(ended_at, ?), summary = ? WHERE id = ?",
                (now().isoformat(), json.dumps(summary, default=str), conversation_id),
            )

    def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        *,
        resolved_question: str | None = None,
        intent: str | None = None,
        citations: list[str] | None = None,
        key_points: list[str] | None = None,
        grounding: str | None = None,
    ) -> str:
        message_id = new_id()
        with self.tx() as c:
            c.execute(
                "INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    message_id,
                    conversation_id,
                    role,
                    content,
                    resolved_question,
                    intent,
                    json.dumps(citations or []),
                    json.dumps(key_points or []),
                    grounding,
                    now().isoformat(),
                ),
            )
        return message_id

    def get_messages(self, conversation_id: str) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at, rowid", (conversation_id,)
            ).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d["citations"] = json.loads(d["citations"])
            d["key_points"] = json.loads(d["key_points"])
            out.append(d)
        return out


def _document(row: sqlite3.Row) -> dict[str, Any]:
    data = dict(row)
    data["outline"] = json.loads(data["outline"])
    return data


def _chunk(row: sqlite3.Row) -> Chunk:
    return Chunk(
        document_id=row["document_id"],
        chunk_id=row["chunk_id"],
        order=row["ord"],
        page_number=row["page_number"],
        page_end=row["page_end"],
        section=row["section"],
        clause=row["clause"],
        heading=row["heading"],
        text=row["text"],
    )
