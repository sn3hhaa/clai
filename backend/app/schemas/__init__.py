"""Pydantic models shared by the API, agent and storage layers (source of the OpenAPI schema)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

DocumentStatus = Literal["processing", "ready", "failed"]
Intent = Literal[
    "termination",
    "payment",
    "duration",
    "confidentiality",
    "liability",
    "obligations",
    "rights",
    "dispute",
    "definition",
    "summary",
    "general",
]
Grounding = Literal["grounded", "partially_grounded", "insufficient"]
Channel = Literal["text", "voice"]


class Chunk(BaseModel):
    """A retrievable passage with its provenance in the original PDF."""

    document_id: str
    chunk_id: str
    order: int
    page_number: int = Field(description="1-based page where the passage starts")
    page_end: int = Field(description="1-based page where the passage ends")
    section: str | None = Field(default=None, description="Detected section label, null if none")
    clause: str | None = Field(default=None, description="Detected clause number, null if none")
    heading: str | None = None
    text: str


class OutlineItem(BaseModel):
    label: str
    clause: str | None = None
    page_number: int
    level: int = 1


class DocumentOut(BaseModel):
    id: str
    filename: str
    status: DocumentStatus
    error: str | None = None
    size_bytes: int
    page_count: int = 0
    chunk_count: int = 0
    created_at: datetime
    outline: list[OutlineItem] = []


class DocumentList(BaseModel):
    documents: list[DocumentOut]


class Evidence(BaseModel):
    chunk_id: str
    page_number: int
    page_end: int
    section: str | None
    clause: str | None
    heading: str | None
    text: str
    score: float = Field(description="Reranker (or fused) relevance score")
    cited: bool = False


class Claim(BaseModel):
    text: str
    chunk_ids: list[str]
    supported: bool
    support_score: float


class QueryRequest(BaseModel):
    document_id: str
    question: str = Field(min_length=1, max_length=1000)
    conversation_id: str | None = None
    channel: Channel = "text"


class AnswerOut(BaseModel):
    conversation_id: str
    message_id: str
    question: str
    resolved_question: str
    intent: Intent
    answer: str
    spoken_answer: str
    key_points: list[str]
    citations: list[str]
    evidence: list[Evidence]
    claims: list[Claim]
    grounding: Grounding
    sufficient: bool
    generation: Literal["llm", "extractive"]
    retrieval_rounds: int
    timings_ms: dict[str, float]


class Message(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime
    citations: list[str] = []
    grounding: Grounding | None = None


class SourceRef(BaseModel):
    chunk_id: str
    page_number: int
    section: str | None
    clause: str | None


class SessionSummary(BaseModel):
    conversation_id: str
    document_id: str
    channel: Channel
    started_at: datetime
    ended_at: datetime | None
    questions: list[str]
    key_points: list[str]
    sources: list[SourceRef]
    unresolved: list[str]
    transcript: list[Message]


class ConversationCreate(BaseModel):
    document_id: str
    channel: Channel = "text"


class ConversationOut(BaseModel):
    id: str
    document_id: str
    channel: Channel
    created_at: datetime
    ended_at: datetime | None
    messages: list[Message]


class VoiceTokenRequest(BaseModel):
    document_id: str
    conversation_id: str | None = None


class VoiceTokenResponse(BaseModel):
    server_url: str
    participant_token: str
    room_name: str
    conversation_id: str
    expires_in: int


class HealthOut(BaseModel):
    status: Literal["ok"]
    version: str
    llm: Literal["configured", "not_configured"]
    llm_model: str | None
    qdrant_mode: str
    stt_provider: str
    tts_provider: str


class ErrorBody(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorBody
