"""Application services: document ingestion, question answering, conversations and summaries."""

from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Any

from app.agent.graph import build_graph
from app.config import Settings
from app.embeddings import Embedder, SentenceTransformerEmbedder
from app.errors import DocumentNotReady, InvalidDocument, NotFound
from app.ingestion.pdf import extract_lines, validate_and_open
from app.ingestion.structure import build_chunks
from app.llm import LLM, OpenRouterLLM
from app.retrieval.hybrid import HybridRetriever
from app.retrieval.lexical import LexicalIndex
from app.retrieval.rerank import CrossEncoderReranker, Reranker
from app.schemas import (
    AnswerOut,
    ConversationOut,
    DocumentOut,
    Evidence,
    Message,
    OutlineItem,
    SessionSummary,
    SourceRef,
)
from app.storage.db import Database, new_id
from app.storage.files import FileStore
from app.vector_db import VectorStore

log = logging.getLogger("clai.services")


class Clai:
    """Owns every stateful component. Created once per process (FastAPI lifespan)."""

    def __init__(
        self,
        settings: Settings,
        *,
        embedder: Embedder | None = None,
        reranker: Reranker | None = None,
        llm: LLM | None = None,
        db: Database | None = None,
        vectors: VectorStore | None = None,
    ):
        self.settings = settings
        data = settings.data_dir
        self.db = db or Database(data / "clai.sqlite3")
        self.files = FileStore(data / "files")
        self.embedder = embedder or SentenceTransformerEmbedder(settings.embedding_model, settings.embedding_dim)
        if reranker is None and settings.reranker_enabled:
            reranker = CrossEncoderReranker(settings.reranker_model)
        self.vectors = vectors or VectorStore(
            mode=settings.qdrant_mode,
            collection=settings.qdrant_collection,
            dim=settings.embedding_dim,
            path=settings.resolved_qdrant_path,
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
        )
        self.retriever = HybridRetriever(
            db=self.db,
            embedder=self.embedder,
            vectors=self.vectors,
            lexical=LexicalIndex(data / "bm25"),
            reranker=reranker,
            top_k=settings.retrieval_top_k,
            rrf_k=settings.rrf_k,
        )
        if llm is None and settings.llm_configured:
            llm = OpenRouterLLM(
                api_key=settings.openrouter_api_key,
                model=settings.openrouter_model,
                base_url=settings.openrouter_base_url,
                timeout_s=settings.llm_timeout_s,
                max_retries=settings.llm_max_retries,
            )
        self.llm = llm
        self.graph = build_graph(
            self.retriever, llm, top_n=settings.rerank_top_n, max_retries=settings.agent_max_retries
        )

    def close(self) -> None:
        self.vectors.close()
        self.db.close()

    # â”€â”€ documents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    def ingest(self, filename: str, data: bytes) -> DocumentOut:
        """Validate, parse, chunk and index a PDF synchronously (small agreements take seconds)."""
        doc = validate_and_open(data, max_bytes=self.settings.max_upload_bytes, max_pages=self.settings.max_pages)
        document_id = new_id()
        safe_name = (filename or "agreement.pdf").replace("\\", "/").split("/")[-1][:200]
        self.db.create_document(document_id, safe_name, len(data))
        try:
            pdf = extract_lines(doc)
            chunks, outline = build_chunks(document_id, pdf)
            if not chunks:
                raise InvalidDocument("No readable text passages were found in this PDF.", code="no_text")
            self.files.save(document_id, data)
            self.retriever.index(chunks)
            self.db.mark_ready(document_id, pdf.page_count, chunks, outline)
        except InvalidDocument as exc:
            self._purge(document_id)
            raise exc
        except Exception:
            log.exception("ingestion failed for document %s", document_id)
            self.db.mark_failed(document_id, "Processing failed unexpectedly.")
            self.retriever.delete(document_id)
            self.files.delete(document_id)
            raise
        finally:
            doc.close()
        return self.get_document(document_id)

    def get_document(self, document_id: str) -> DocumentOut:
        row = self.db.get_document(document_id)
        if not row:
            raise NotFound("Document not found.")
        return DocumentOut(
            id=row["id"],
            filename=row["filename"],
            status=row["status"],
            error=row["error"],
            size_bytes=row["size_bytes"],
            page_count=row["page_count"],
            chunk_count=row["chunk_count"],
            created_at=datetime.fromisoformat(row["created_at"]),
            outline=[OutlineItem(**o) for o in row["outline"]],
        )

    def list_documents(self) -> list[DocumentOut]:
        return [self.get_document(r["id"]) for r in self.db.list_documents()]

    def delete_document(self, document_id: str) -> None:
        if not self.db.get_document(document_id):
            raise NotFound("Document not found.")
        self._purge(document_id)

    def _purge(self, document_id: str) -> None:
        self.retriever.delete(document_id)
        self.files.delete(document_id)
        self.db.delete_document(document_id)  # cascades to chunks, conversations, messages

    def _require_ready(self, document_id: str) -> None:
        row = self.db.get_document(document_id)
        if not row:
            raise NotFound("Document not found.")
        if row["status"] != "ready":
            raise DocumentNotReady(f"Document is {row['status']}.")

    # â”€â”€ conversations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    def create_conversation(self, document_id: str, channel: str) -> str:
        self._require_ready(document_id)
        return self.db.create_conversation(document_id, channel)

    def _conversation(self, conversation_id: str) -> dict[str, Any]:
        conv = self.db.get_conversation(conversation_id)
        if not conv:
            raise NotFound("Conversation not found.")
        return conv

    def get_conversation(self, conversation_id: str) -> ConversationOut:
        conv = self._conversation(conversation_id)
        return ConversationOut(
            id=conv["id"],
            document_id=conv["document_id"],
            channel=conv["channel"],
            created_at=datetime.fromisoformat(conv["created_at"]),
            ended_at=datetime.fromisoformat(conv["ended_at"]) if conv["ended_at"] else None,
            messages=[_message(m) for m in self.db.get_messages(conversation_id)],
        )

    def _history(self, conversation_id: str) -> list[tuple[str, str]]:
        messages = self.db.get_messages(conversation_id)
        pairs: list[tuple[str, str]] = []
        pending: str | None = None
        for m in messages:
            if m["role"] == "user":
                pending = m["resolved_question"] or m["content"]
            elif pending is not None:
                pairs.append((pending, m["content"]))
                pending = None
        return pairs[-self.settings.history_turns :] if self.settings.history_turns else []

    def ask(
        self, document_id: str, question: str, conversation_id: str | None = None, channel: str = "text"
    ) -> AnswerOut:
        self._require_ready(document_id)
        if conversation_id:
            conv = self._conversation(conversation_id)
            if conv["document_id"] != document_id:
                raise NotFound("Conversation not found for this document.")
        else:
            conversation_id = self.db.create_conversation(document_id, channel)

        started = time.perf_counter()
        state = self.graph.invoke(
            {"document_id": document_id, "question": question.strip(), "history": self._history(conversation_id)}
        )
        draft = state["draft"]
        cited = set(state["citations"])
        evidence = [
            Evidence(
                chunk_id=c.chunk.chunk_id,
                page_number=c.chunk.page_number,
                page_end=c.chunk.page_end,
                section=c.chunk.section,
                clause=c.chunk.clause,
                heading=c.chunk.heading,
                text=c.chunk.text,
                score=round(c.score, 4),
                cited=c.chunk.chunk_id in cited,
            )
            for c in state["evidence"]
        ]
        timings = dict(state.get("timings_ms", {}))
        timings["total"] = round((time.perf_counter() - started) * 1000, 1)

        self.db.add_message(
            conversation_id,
            "user",
            question.strip(),
            resolved_question=state["resolved_question"],
            intent=state["intent"],
        )
        message_id = self.db.add_message(
            conversation_id,
            "assistant",
            draft.answer,
            citations=state["citations"],
            key_points=draft.key_points,
            grounding=state["grounding"],
        )
        return AnswerOut(
            conversation_id=conversation_id,
            message_id=message_id,
            question=question.strip(),
            resolved_question=state["resolved_question"],
            intent=state["intent"],
            answer=draft.answer,
            spoken_answer=draft.spoken_answer,
            key_points=draft.key_points,
            citations=state["citations"],
            evidence=evidence,
            claims=state["claims"],
            grounding=state["grounding"],
            sufficient=state["grounding"] != "insufficient",
            generation="llm" if draft.generation == "llm" else "extractive",
            retrieval_rounds=state["rounds"],
            timings_ms=timings,
        )

    def end_conversation(self, conversation_id: str) -> SessionSummary:
        conv = self._conversation(conversation_id)
        summary = self._summarise(conv)
        self.db.end_conversation(conversation_id, summary.model_dump(mode="json"))
        return self._summarise(self._conversation(conversation_id))

    def summary(self, conversation_id: str) -> SessionSummary:
        return self._summarise(self._conversation(conversation_id))

    def _summarise(self, conv: dict[str, Any]) -> SessionSummary:
        messages = self.db.get_messages(conv["id"])
        questions: list[str] = []
        unresolved: list[str] = []
        key_points: list[str] = []
        cited_ids: list[str] = []
        last_question = ""
        for m in messages:
            if m["role"] == "user":
                last_question = m["content"]
                questions.append(last_question)
            else:
                if m["grounding"] == "insufficient":
                    unresolved.append(last_question)
                for point in m["key_points"]:
                    if point not in key_points:
                        key_points.append(point)
                cited_ids.extend(cid for cid in m["citations"] if cid not in cited_ids)
        chunks = self.db.get_chunks_by_id(cited_ids)
        sources = [
            SourceRef(
                chunk_id=cid,
                page_number=chunks[cid].page_number,
                section=chunks[cid].section,
                clause=chunks[cid].clause,
            )
            for cid in cited_ids
            if cid in chunks
        ]
        return SessionSummary(
            conversation_id=conv["id"],
            document_id=conv["document_id"],
            channel=conv["channel"],
            started_at=datetime.fromisoformat(conv["created_at"]),
            ended_at=datetime.fromisoformat(conv["ended_at"]) if conv["ended_at"] else None,
            questions=questions,
            key_points=key_points[:8],
            sources=sources,
            unresolved=unresolved,
            transcript=[_message(m) for m in messages],
        )


def _message(m: dict[str, Any]) -> Message:
    return Message(
        id=m["id"],
        role=m["role"],
        content=m["content"],
        created_at=datetime.fromisoformat(m["created_at"]),
        citations=m["citations"],
        grounding=m["grounding"],
    )
