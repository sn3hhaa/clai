"""Connects LiveKit Agents to Clai's reasoning engine.

`ClaiBackendLLM` is a LiveKit `llm.LLM` whose "completion" is a call to the Clai API's
`POST /query`, the same LangGraph agent the text interface uses. The spoken answer streams
to TTS; the full answer and its evidence are handed to `on_answer` so the worker can publish
them to the browser's Evidence panel.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from typing import Any

import httpx
from livekit.agents import APIConnectOptions, llm, utils
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS, NOT_GIVEN, NotGivenOr

log = logging.getLogger("clai.voice")

ERROR_REPLY = "Sorry, I couldn't reach the document service just now. Please try again in a moment."


class ClaiApiClient:
    def __init__(self, base_url: str, timeout_s: float = 60.0):
        self._client = httpx.AsyncClient(base_url=base_url.rstrip("/"), timeout=timeout_s)

    async def ask(self, document_id: str, conversation_id: str, question: str) -> dict[str, Any]:
        response = await self._client.post(
            "/query",
            json={
                "document_id": document_id,
                "conversation_id": conversation_id,
                "question": question,
                "channel": "voice",
            },
        )
        response.raise_for_status()
        result: dict[str, Any] = response.json()
        return result

    async def document(self, document_id: str) -> dict[str, Any]:
        response = await self._client.get(f"/documents/{document_id}")
        response.raise_for_status()
        result: dict[str, Any] = response.json()
        return result

    async def end(self, conversation_id: str) -> dict[str, Any]:
        response = await self._client.post(f"/conversations/{conversation_id}/end")
        response.raise_for_status()
        result: dict[str, Any] = response.json()
        return result

    async def aclose(self) -> None:
        await self._client.aclose()


def last_user_text(chat_ctx: llm.ChatContext) -> str:
    for item in reversed(chat_ctx.items):
        if isinstance(item, llm.ChatMessage) and item.role == "user":
            return (item.text_content or "").strip()
    return ""


AnswerCallback = Callable[[dict[str, Any]], Awaitable[None]]


class ClaiBackendLLM(llm.LLM):
    def __init__(self, *, api: ClaiApiClient, document_id: str, conversation_id: str, on_answer: AnswerCallback):
        super().__init__()
        self.api = api
        self.document_id = document_id
        self.conversation_id = conversation_id
        self.on_answer = on_answer

    @property
    def model(self) -> str:
        return "clai-langgraph"

    @property
    def provider(self) -> str:
        return "clai"

    def chat(
        self,
        *,
        chat_ctx: llm.ChatContext,
        tools: list[llm.Tool] | None = None,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
        parallel_tool_calls: NotGivenOr[bool] = NOT_GIVEN,
        tool_choice: NotGivenOr[llm.ToolChoice] = NOT_GIVEN,
        extra_kwargs: NotGivenOr[dict[str, Any]] = NOT_GIVEN,
    ) -> llm.LLMStream:
        return _ClaiStream(self, chat_ctx=chat_ctx, tools=tools or [], conn_options=conn_options)


class _ClaiStream(llm.LLMStream):
    def __init__(
        self,
        owner: ClaiBackendLLM,
        *,
        chat_ctx: llm.ChatContext,
        tools: list[llm.Tool],
        conn_options: APIConnectOptions,
    ):
        super().__init__(owner, chat_ctx=chat_ctx, tools=tools, conn_options=conn_options)
        self._owner = owner

    async def _run(self) -> None:
        question = last_user_text(self._chat_ctx)
        request_id = utils.shortuuid()
        if not question:
            return
        try:
            answer = await self._owner.api.ask(self._owner.document_id, self._owner.conversation_id, question)
            spoken = answer.get("spoken_answer") or answer.get("answer") or ""
        except httpx.HTTPError as exc:
            log.warning("query failed: %s", type(exc).__name__)
            answer, spoken = {"error": "backend_unavailable", "question": question}, ERROR_REPLY
        try:
            await self._owner.on_answer(answer)
        except Exception:  # the evidence panel must never break the spoken reply
            log.exception("publishing answer failed")
        self._event_ch.send_nowait(
            llm.ChatChunk(id=request_id, delta=llm.ChoiceDelta(role="assistant", content=spoken))
        )
