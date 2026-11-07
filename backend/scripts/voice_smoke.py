"""Automated voice loop check: a synthetic caller *speaks* into a LiveKit room and the agent's
spoken reply is recorded and transcribed.

Exercises the real pipeline (LiveKit transport → VAD → STT → turn detection → LangGraph RAG →
TTS → LiveKit audio back) with no mocks. It is not a substitute for the human
microphone-to-speaker acceptance test in docs/guides/acceptance-test.md.

Prerequisites: livekit-server --dev, Piper HTTP server, API and voice worker running.
    python -m scripts.voice_smoke [--api http://127.0.0.1:8000] [--piper http://127.0.0.1:5000]
"""

from __future__ import annotations

import argparse
import asyncio
import io
import json
import sys
import time
import wave
from pathlib import Path
from typing import Any

import httpx
import numpy as np
from livekit import rtc

FIXTURE = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "services_agreement.pdf"
RATE = 48_000
FRAME = RATE // 100  # 10 ms


def speak(piper: str, text: str) -> np.ndarray:
    """Render the caller's question with Piper and resample to 48 kHz int16."""
    wav_bytes = httpx.post(f"{piper}/synthesize", json={"text": text}, timeout=60).content
    with wave.open(io.BytesIO(wav_bytes)) as wav:
        rate = wav.getframerate()
        pcm = np.frombuffer(wav.readframes(wav.getnframes()), dtype=np.int16)
    frame = rtc.AudioFrame(pcm.tobytes(), rate, 1, len(pcm))
    resampler = rtc.AudioResampler(rate, RATE)
    out = resampler.push(frame) + resampler.flush()
    return np.concatenate([np.frombuffer(f.data, dtype=np.int16) for f in out])


async def play(source: rtc.AudioSource, samples: np.ndarray, trailing_silence_s: float = 1.5) -> None:
    samples = np.concatenate([samples, np.zeros(int(RATE * trailing_silence_s), dtype=np.int16)])
    for start in range(0, len(samples) - FRAME + 1, FRAME):
        chunk = samples[start : start + FRAME]
        await source.capture_frame(rtc.AudioFrame(chunk.tobytes(), RATE, 1, FRAME))


def transcribe(samples: np.ndarray) -> str:
    from faster_whisper import WhisperModel

    if samples.size == 0:
        return ""
    model = WhisperModel("base.en", device="cpu", compute_type="int8")
    pcm16k = samples[::3].astype(np.float32) / 32768.0  # 48k → 16k (adequate for a check)
    segments, _ = model.transcribe(pcm16k, language="en", beam_size=1)
    return " ".join(s.text.strip() for s in segments)


class Caller:
    def __init__(self) -> None:
        self.room = rtc.Room()
        self.recorded: list[np.ndarray] = []
        self.recording = False
        self.answers: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self.agent: rtc.RemoteParticipant | None = None
        self._tasks: set[asyncio.Future[None]] = set()

    def _spawn(self, coro: Any) -> None:
        task = asyncio.ensure_future(coro)
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    def agent_state(self) -> str:
        return self.agent.attributes.get("lk.agent.state", "") if self.agent else ""

    async def wait_state(self, state: str, timeout: float) -> None:
        deadline = time.monotonic() + timeout
        while self.agent_state() != state:
            if time.monotonic() > deadline:
                raise TimeoutError(f"agent never reached '{state}' (now '{self.agent_state()}')")
            await asyncio.sleep(0.1)

    async def connect(self, url: str, token: str) -> rtc.AudioSource:
        def on_track(track: rtc.Track, _pub: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant) -> None:
            if track.kind == rtc.TrackKind.KIND_AUDIO:
                self.agent = participant
                self._spawn(self._record(track))

        def on_answer(reader: rtc.TextStreamReader, _identity: str) -> None:
            async def read() -> None:
                await self.answers.put(json.loads(await reader.read_all()))

            self._spawn(read())

        self.room.on("track_subscribed", on_track)
        self.room.register_text_stream_handler("clai.answer", on_answer)
        await self.room.connect(url, token)
        source = rtc.AudioSource(RATE, 1)
        track = rtc.LocalAudioTrack.create_audio_track("microphone", source)
        await self.room.local_participant.publish_track(
            track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
        )
        return source

    async def _record(self, track: rtc.Track) -> None:
        async for event in rtc.AudioStream(track, sample_rate=RATE, num_channels=1):
            if self.recording:
                self.recorded.append(np.frombuffer(event.frame.data, dtype=np.int16).copy())

    async def ask(self, source: rtc.AudioSource, audio: np.ndarray) -> tuple[dict[str, Any], str, float]:
        await self.wait_state("listening", 60)
        self.recorded.clear()
        await play(source, audio, trailing_silence_s=0.0)
        spoken_end = time.monotonic()
        silence = asyncio.ensure_future(play(source, np.zeros(0, dtype=np.int16), trailing_silence_s=3.0))
        answer = await asyncio.wait_for(self.answers.get(), 120)
        answered = time.monotonic() - spoken_end
        self.recording = True
        await self.wait_state("speaking", 60)
        first_audio = time.monotonic() - spoken_end
        await silence
        print(
            f"  timings: end of speech → answer {answered:.1f}s (server {answer.get('timings_ms', {}).get('total', 0) / 1000:.1f}s) → speaking {first_audio:.1f}s"
        )
        await self.wait_state("listening", 120)
        self.recording = False
        heard = transcribe(np.concatenate(self.recorded) if self.recorded else np.zeros(0, np.int16))
        return answer, heard, first_audio


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", default="http://127.0.0.1:8000")
    parser.add_argument("--piper", default="http://127.0.0.1:5000")
    args = parser.parse_args()

    api = httpx.Client(base_url=args.api, timeout=120)
    doc = api.post("/documents", files={"file": (FIXTURE.name, FIXTURE.read_bytes(), "application/pdf")}).json()
    print(f"uploaded {doc['filename']}: {doc['status']}, {doc['chunk_count']} chunks")
    token = api.post("/voice/token", json={"document_id": doc["id"]}).json()

    caller = Caller()
    source = await caller.connect(token["server_url"], token["participant_token"])
    print("joined", token["room_name"])
    # Let the greeting finish before the caller speaks (the agent is briefly "listening" before it).
    await caller.wait_state("speaking", 60)
    await caller.wait_state("listening", 60)
    ok = True
    turns = [
        ("What is the termination notice period?", ["30"], "8.1"),
        ("And what if the other party breaches it?", ["10"], "8.2"),
    ]
    for question, expect_words, expect_clause in turns:
        answer, heard, latency = await caller.ask(source, speak(args.piper, question))
        cited = [e for e in answer.get("evidence", []) if e.get("cited")]
        print(f"\nQ (spoken):      {question}")
        print(f"STT heard:       {answer.get('question')}")
        print(f"Spoken answer:   {answer.get('spoken_answer')}")
        print(f"Caller heard:    {heard}")
        print(
            f"Cited:           {[(e['clause'], e['page_number']) for e in cited]}  grounding={answer.get('grounding')}"
        )
        print(f"End of question → agent speaking: {latency:.1f}s")
        turn_ok = (
            all(w in heard for w in expect_words)
            and bool(cited)
            and cited[0]["clause"] == expect_clause
            and answer.get("grounding") == "grounded"
        )
        print("RESULT:", "PASS" if turn_ok else "FAIL")
        ok &= turn_ok

    conversation_id = token["conversation_id"]
    await caller.room.disconnect()
    for _ in range(30):  # the worker finalises the conversation when the room empties
        summary = api.get(f"/conversations/{conversation_id}/summary").json()
        if summary.get("ended_at"):
            break
        await asyncio.sleep(1)
    print(f"\nsummary: ended={bool(summary.get('ended_at'))} questions={summary.get('questions')}")
    ok &= bool(summary.get("ended_at")) and len(summary.get("questions", [])) == 2
    api.delete(f"/documents/{doc['id']}")
    print("\nOVERALL:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
