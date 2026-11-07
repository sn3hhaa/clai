"""Voice adapter unit tests (no LiveKit server, no audio devices, no network)."""

from __future__ import annotations

import asyncio
import io
import json
import wave
from typing import Any

import httpx
import numpy as np
from livekit import rtc
from livekit.agents import llm

from app.voice.bridge import ERROR_REPLY, ClaiApiClient, ClaiBackendLLM, is_fragment, last_user_text
from app.voice.local_stt import WHISPER_RATE, to_whisper_input
from app.voice.local_tts import split_phrases, wav_to_pcm


def test_split_phrases_keeps_text_and_bounds_length() -> None:
    text = (
        "According to clause 8.2, either party may terminate this Agreement immediately by written notice "
        "if the other party commits a material breach and fails to remedy it within 10 days of being notified."
    )
    phrases = split_phrases(text)
    assert " ".join(phrases).split() == text.split(), "no words lost or reordered"
    assert phrases[0] == "According to clause 8.2,"
    assert all(len(p.split()) <= 14 for p in phrases)


def test_wav_to_pcm_roundtrip() -> None:
    pcm = (np.sin(np.linspace(0, 100, 2205)) * 10_000).astype(np.int16).tobytes()
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(22_050)
        wav.writeframes(pcm)
    assert wav_to_pcm(buffer.getvalue()) == (pcm, 22_050, 1)


def test_whisper_input_resamples_stereo_48k_to_mono_16k() -> None:
    samples = np.full(48_000 * 2, 16_384, dtype=np.int16)  # 1 s of stereo at 48 kHz
    frames = [rtc.AudioFrame(samples[i : i + 960].tobytes(), 48_000, 2, 480) for i in range(0, len(samples), 960)]
    audio = to_whisper_input(frames)
    assert audio.dtype == np.float32
    assert abs(len(audio) - WHISPER_RATE) < 400
    assert 0.45 < float(np.median(audio)) < 0.55


def test_last_user_text_picks_latest_user_message() -> None:
    ctx = llm.ChatContext.empty()
    ctx.add_message(role="assistant", content="Hi, I'm Clai.")
    ctx.add_message(role="user", content="What is the notice period?")
    ctx.add_message(role="assistant", content="30 days.")
    ctx.add_message(role="user", content="  And for cause?  ")
    assert last_user_text(ctx) == "And for cause?"


def _bridge(handler: Any) -> tuple[ClaiBackendLLM, list[dict[str, Any]]]:
    api = ClaiApiClient("http://clai.test")
    api._client = httpx.AsyncClient(base_url="http://clai.test", transport=httpx.MockTransport(handler))
    published: list[dict[str, Any]] = []

    async def on_answer(answer: dict[str, Any]) -> None:
        published.append(answer)

    return ClaiBackendLLM(api=api, document_id="doc", conversation_id="conv", on_answer=on_answer), published


async def _collect(bridge: ClaiBackendLLM, question: str) -> str:
    ctx = llm.ChatContext.empty()
    ctx.add_message(role="user", content=question)
    text = ""
    async with bridge.chat(chat_ctx=ctx) as stream:
        async for chunk in stream:
            if chunk.delta and chunk.delta.content:
                text += chunk.delta.content
    return text


def test_bridge_speaks_spoken_answer_and_publishes_evidence() -> None:
    seen: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen.update(json.loads(request.content))
        return httpx.Response(
            200, json={"spoken_answer": "Thirty days.", "answer": "30 days.", "evidence": [{"clause": "8.1"}]}
        )

    bridge, published = _bridge(handler)
    assert asyncio.run(_collect(bridge, "What is the notice period?")) == "Thirty days."
    assert seen == {
        "document_id": "doc",
        "conversation_id": "conv",
        "question": "What is the notice period?",
        "channel": "voice",
    }
    assert published[0]["evidence"][0]["clause"] == "8.1"


def test_bridge_asks_to_repeat_fragments_without_querying() -> None:
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json={"spoken_answer": "should not be used"})

    bridge, published = _bridge(handler)
    reply = asyncio.run(_collect(bridge, "Period."))
    assert reply == "Sorry, I only caught “Period”. Could you ask the whole question again?"
    assert calls == [] and published == []
    assert not is_fragment("Termination notice?")


def test_bridge_degrades_gracefully_when_api_is_down() -> None:
    bridge, published = _bridge(lambda _req: httpx.Response(503))
    assert asyncio.run(_collect(bridge, "Anything about termination?")) == ERROR_REPLY
    assert published[0]["error"] == "backend_unavailable"
