"""Clai voice agent worker (LiveKit Agents).

    python -m livekit.agents download-files     # VAD + turn-detector weights (once)
    python -m app.voice.worker dev              # connect to LIVEKIT_URL and wait for dispatches

The browser's token (POST /voice/token) dispatches this agent by name into a fresh room with
{document_id, conversation_id} metadata. Pipeline per turn:
mic → Silero VAD → STT → turn detector → POST /query (LangGraph RAG) → TTS → speaker.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from livekit import agents
from livekit.agents import Agent, AgentServer, AgentSession, JobContext, JobProcess, inference
from livekit.plugins import silero

from app.config import Settings, get_settings
from app.voice.bridge import ClaiApiClient, ClaiBackendLLM

log = logging.getLogger("clai.voice")

ANSWER_TOPIC = "clai.answer"
INSTRUCTIONS = (
    "You are Clai. You answer questions about one uploaded agreement using Clai's document engine. "
    "Answers come from the engine; never improvise legal advice."
)


def build_stt(settings: Settings) -> Any:
    if settings.stt_provider == "gradium":
        from livekit.plugins import gradium

        return gradium.STT(api_key=settings.gradium_api_key or None)
    from app.voice.local_stt import WhisperSTT

    return WhisperSTT(
        model=settings.whisper_model, device=settings.whisper_device, compute_type=settings.whisper_compute_type
    )


def build_tts(settings: Settings) -> Any:
    if settings.tts_provider == "gradium":
        from livekit.plugins import gradium

        return gradium.TTS(api_key=settings.gradium_api_key or None, voice_id=settings.gradium_voice_id or None)
    from app.voice.local_tts import PiperTTS

    return PiperTTS(base_url=settings.piper_url, voice=settings.piper_voice)


def prewarm(proc: JobProcess) -> None:
    """Load heavy models once per worker process, not once per call."""
    settings = get_settings()
    proc.userdata["vad"] = silero.VAD.load()
    proc.userdata["stt"] = build_stt(settings)


def _export_livekit_env(settings: Settings) -> None:
    # The agents CLI reads these; keep backend/.env the single source of configuration.
    os.environ.setdefault("LIVEKIT_URL", settings.livekit_url)
    os.environ.setdefault("LIVEKIT_API_KEY", settings.livekit_api_key)
    os.environ.setdefault("LIVEKIT_API_SECRET", settings.livekit_api_secret)


# Loading Silero + Whisper can exceed the 10 s default: a cold disk cache, or the one-time CUDA
# kernel compile on a machine's first GPU run.
server = AgentServer(setup_fnc=prewarm, initialize_process_timeout=180.0)


@server.rtc_session(agent_name=get_settings().livekit_agent_name)
async def entrypoint(ctx: JobContext) -> None:
    settings = get_settings()
    meta = json.loads(ctx.job.metadata or "{}")
    document_id, conversation_id = meta.get("document_id"), meta.get("conversation_id")
    if not document_id or not conversation_id:
        log.error("dispatch without document/conversation metadata; leaving room")
        return

    api = ClaiApiClient(settings.api_internal_url)
    await ctx.connect()

    async def publish_answer(answer: dict[str, Any]) -> None:
        await ctx.room.local_participant.send_text(json.dumps(answer), topic=ANSWER_TOPIC)

    session: AgentSession = AgentSession(
        vad=ctx.proc.userdata["vad"],
        stt=ctx.proc.userdata["stt"],
        llm=ClaiBackendLLM(api=api, document_id=document_id, conversation_id=conversation_id, on_answer=publish_answer),
        tts=build_tts(settings),
        turn_handling={
            "turn_detection": inference.TurnDetector(version="v1-mini"),
            # VAD-based barge-in runs locally; "adaptive" needs LiveKit Cloud inference.
            # Non-streaming STT only produces a transcript after the utterance ends, so a real
            # 2-3 s question would exceed the false-interruption timeout and be discarded while the
            # agent resumes. Treat every interruption as real instead.
            "interruption": {"enabled": True, "mode": "vad", "resume_false_interruption": False},
        },
    )

    async def finish() -> None:
        try:
            await api.end(conversation_id)  # persists the session summary
        except Exception:
            log.warning("could not finalise conversation %s", conversation_id)
        await api.aclose()

    @session.on("metrics_collected")
    def _on_metrics(event: Any) -> None:
        agents.metrics.log_metrics(event.metrics, logger=log)

    ctx.add_shutdown_callback(finish)
    await session.start(agent=Agent(instructions=INSTRUCTIONS), room=ctx.room)

    if settings.voice_greeting:
        try:
            doc = await api.document(document_id)
            title = doc["filename"].rsplit(".", 1)[0].replace("_", " ")
        except Exception:
            title = "your agreement"
        session.say(f"Hi, I'm Clai. I've read {title}. What would you like to know?")


if __name__ == "__main__":
    _export_livekit_env(get_settings())
    agents.cli.run_app(server)
