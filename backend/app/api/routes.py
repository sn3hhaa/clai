"""HTTP routes. Sync handlers run in FastAPI's threadpool (model inference is CPU-bound)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Request, Response, UploadFile
from fastapi.responses import FileResponse

from app import __version__
from app.errors import ClaiError, InvalidDocument, NotFound
from app.schemas import (
    AnswerOut,
    ConversationCreate,
    ConversationOut,
    DocumentList,
    DocumentOut,
    ErrorResponse,
    HealthOut,
    QueryRequest,
    SessionSummary,
    VoiceTokenRequest,
    VoiceTokenResponse,
)
from app.services import Clai
from app.voice.tokens import mint_participant_token

ERRORS: dict[int | str, dict[str, object]] = {
    400: {"model": ErrorResponse},
    404: {"model": ErrorResponse},
    409: {"model": ErrorResponse},
    413: {"model": ErrorResponse},
    422: {"model": ErrorResponse},
}

router = APIRouter()


def get_clai(request: Request) -> Clai:
    clai: Clai = request.app.state.clai
    return clai


ClaiDep = Annotated[Clai, Depends(get_clai)]


@router.get("/health", response_model=HealthOut, tags=["system"])
def health(clai: ClaiDep) -> HealthOut:
    s = clai.settings
    return HealthOut(
        status="ok",
        version=__version__,
        llm="configured" if clai.llm else "not_configured",
        llm_model=s.openrouter_model if clai.llm else None,
        qdrant_mode=s.qdrant_mode,
        stt_provider=s.stt_provider,
        tts_provider=s.tts_provider,
    )


@router.post("/documents", response_model=DocumentOut, status_code=201, responses=ERRORS, tags=["documents"])
async def upload_document(clai: ClaiDep, file: Annotated[UploadFile, File(description="PDF agreement")]) -> DocumentOut:
    limit = clai.settings.max_upload_bytes
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise InvalidDocument(
            f"The file is larger than the {clai.settings.max_upload_mb} MB limit.",
            code="file_too_large",
            status_code=413,
        )
    from starlette.concurrency import run_in_threadpool

    return await run_in_threadpool(clai.ingest, file.filename or "agreement.pdf", data)


@router.get("/documents", response_model=DocumentList, tags=["documents"])
def list_documents(clai: ClaiDep) -> DocumentList:
    return DocumentList(documents=clai.list_documents())


@router.get("/documents/{document_id}", response_model=DocumentOut, responses=ERRORS, tags=["documents"])
def get_document(document_id: str, clai: ClaiDep) -> DocumentOut:
    return clai.get_document(document_id)


@router.get("/documents/{document_id}/file", responses=ERRORS, tags=["documents"], response_class=FileResponse)
def get_document_file(document_id: str, clai: ClaiDep) -> FileResponse:
    clai.get_document(document_id)
    try:
        path = clai.files.path(document_id)
    except ValueError as exc:
        raise NotFound("Document not found.") from exc
    if not path.exists():
        raise NotFound("Document file not found.")
    return FileResponse(path, media_type="application/pdf", headers={"Cache-Control": "private, max-age=3600"})


@router.delete("/documents/{document_id}", status_code=204, responses=ERRORS, tags=["documents"])
def delete_document(document_id: str, clai: ClaiDep) -> Response:
    clai.delete_document(document_id)
    return Response(status_code=204)


@router.post("/query", response_model=AnswerOut, responses=ERRORS, tags=["query"])
def query(body: QueryRequest, clai: ClaiDep) -> AnswerOut:
    """Ask one question about a document. Pass `conversation_id` to keep follow-up context."""
    return clai.ask(body.document_id, body.question, body.conversation_id, body.channel)


@router.post(
    "/conversations", response_model=ConversationOut, status_code=201, responses=ERRORS, tags=["conversations"]
)
def create_conversation(body: ConversationCreate, clai: ClaiDep) -> ConversationOut:
    return clai.get_conversation(clai.create_conversation(body.document_id, body.channel))


@router.get(
    "/conversations/{conversation_id}", response_model=ConversationOut, responses=ERRORS, tags=["conversations"]
)
def get_conversation(conversation_id: str, clai: ClaiDep) -> ConversationOut:
    return clai.get_conversation(conversation_id)


@router.post(
    "/conversations/{conversation_id}/end", response_model=SessionSummary, responses=ERRORS, tags=["conversations"]
)
def end_conversation(conversation_id: str, clai: ClaiDep) -> SessionSummary:
    return clai.end_conversation(conversation_id)


@router.get(
    "/conversations/{conversation_id}/summary", response_model=SessionSummary, responses=ERRORS, tags=["conversations"]
)
def conversation_summary(conversation_id: str, clai: ClaiDep) -> SessionSummary:
    return clai.summary(conversation_id)


@router.post("/voice/token", response_model=VoiceTokenResponse, responses=ERRORS, tags=["voice"])
def voice_token(body: VoiceTokenRequest, clai: ClaiDep) -> VoiceTokenResponse:
    """Create (or reuse) a voice conversation and return a LiveKit token that also dispatches the agent."""
    s = clai.settings
    if not (s.livekit_url and s.livekit_api_key and s.livekit_api_secret):
        raise ClaiError("Voice is not configured on this server.", code="voice_not_configured", status_code=503)
    if body.conversation_id:
        conversation = clai.get_conversation(body.conversation_id)
        if conversation.document_id != body.document_id:
            raise NotFound("Conversation not found for this document.")
        conversation_id = conversation.id
    else:
        conversation_id = clai.create_conversation(body.document_id, "voice")
    jwt, room = mint_participant_token(
        api_key=s.livekit_api_key,
        api_secret=s.livekit_api_secret,
        agent_name=s.livekit_agent_name,
        document_id=body.document_id,
        conversation_id=conversation_id,
        ttl_s=s.livekit_token_ttl_s,
    )
    return VoiceTokenResponse(
        server_url=s.livekit_url,
        participant_token=jwt,
        room_name=room,
        conversation_id=conversation_id,
        expires_in=s.livekit_token_ttl_s,
    )
