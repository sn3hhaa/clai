"""Piper text-to-speech for LiveKit Agents via Piper's HTTP server.

Piper (GPL-3.0) runs as a separate process in its own virtual environment
(`scripts/install-voice-tools.ps1`); Clai only exchanges text and WAV bytes with it over HTTP.

Piper synthesises a whole request before returning, so long sentences are split into short
phrases and played as each one is ready, which keeps time-to-first-audio low.
"""

from __future__ import annotations

import io
import re
import wave

import httpx
from livekit.agents import APIConnectionError, APIConnectOptions, APIStatusError, tts, utils
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS

PIPER_SAMPLE_RATE = 22_050  # en_US-*-medium voices
MAX_PHRASE_WORDS = 14


def wav_to_pcm(data: bytes) -> tuple[bytes, int, int]:
    with wave.open(io.BytesIO(data), "rb") as wav:
        if wav.getsampwidth() != 2:
            raise ValueError("expected 16-bit PCM WAV")
        return wav.readframes(wav.getnframes()), wav.getframerate(), wav.getnchannels()


def split_phrases(text: str, max_words: int = MAX_PHRASE_WORDS) -> list[str]:
    """Split at commas/semicolons/colons, then at conjunctions, keeping phrases short to speak."""
    phrases: list[str] = []
    for part in re.split(r"(?<=[,;:])\s+", text.strip()):
        words = part.split()
        while len(words) > max_words:
            cut = next(
                (
                    i
                    for i in range(max_words, 3, -1)
                    if words[i].lower() in {"if", "and", "or", "unless", "within", "by", "to", "that", "which"}
                ),
                max_words,
            )
            phrases.append(" ".join(words[:cut]))
            words = words[cut:]
        if words:
            phrases.append(" ".join(words))
    return phrases


class PiperTTS(tts.TTS):
    def __init__(self, *, base_url: str, voice: str, sample_rate: int = PIPER_SAMPLE_RATE):
        super().__init__(capabilities=tts.TTSCapabilities(streaming=False), sample_rate=sample_rate, num_channels=1)
        self._base_url = base_url.rstrip("/")
        self._voice = voice

    @property
    def model(self) -> str:
        return self._voice

    @property
    def provider(self) -> str:
        return "piper"

    def synthesize(
        self, text: str, *, conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS
    ) -> tts.ChunkedStream:
        return _PiperStream(tts=self, input_text=text, conn_options=conn_options)


class _PiperStream(tts.ChunkedStream):
    def __init__(self, *, tts: PiperTTS, input_text: str, conn_options: APIConnectOptions):
        super().__init__(tts=tts, input_text=input_text, conn_options=conn_options)
        self._piper = tts

    async def _run(self, output_emitter: tts.AudioEmitter) -> None:
        initialised = False
        async with httpx.AsyncClient(timeout=self._conn_options.timeout) as client:
            for phrase in split_phrases(self.input_text):
                try:
                    response = await client.post(
                        f"{self._piper._base_url}/synthesize", json={"text": phrase, "voice": self._piper._voice}
                    )
                except httpx.HTTPError as exc:
                    raise APIConnectionError(f"Piper server unreachable at {self._piper._base_url}") from exc
                if response.status_code != 200:
                    raise APIStatusError(
                        "Piper synthesis failed", status_code=response.status_code, body=response.text[:200]
                    )
                pcm, rate, channels = wav_to_pcm(response.content)
                if not initialised:
                    output_emitter.initialize(
                        request_id=utils.shortuuid(), sample_rate=rate, num_channels=channels, mime_type="audio/pcm"
                    )
                    initialised = True
                output_emitter.push(pcm)
        if initialised:
            output_emitter.flush()
