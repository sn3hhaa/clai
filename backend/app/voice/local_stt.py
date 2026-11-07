"""faster-whisper speech-to-text for LiveKit Agents (local, MIT-licensed).

Non-streaming: the AgentSession wraps it in a VAD-driven StreamAdapter, so each detected
utterance is transcribed once it ends. `device="auto"` uses an NVIDIA GPU when the optional
CUDA runtime wheels (requirements-gpu.txt) are installed, and falls back to CPU otherwise.
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

import numpy as np
from livekit import rtc
from livekit.agents import APIConnectOptions, stt, utils
from livekit.agents.language import LanguageCode
from livekit.agents.types import NOT_GIVEN, NotGivenOr

log = logging.getLogger("clai.voice")
WHISPER_RATE = 16_000


def to_whisper_input(buffer: utils.AudioBuffer) -> np.ndarray:
    """Combine frames, downmix/resample to 16 kHz mono, return float32 in [-1, 1]."""
    frame = rtc.combine_audio_frames(buffer) if isinstance(buffer, list) else buffer
    samples = np.frombuffer(frame.data, dtype=np.int16)
    if frame.num_channels > 1:
        samples = samples.reshape(-1, frame.num_channels).mean(axis=1).astype(np.int16)
        frame = rtc.AudioFrame(samples.tobytes(), frame.sample_rate, 1, len(samples))
    if frame.sample_rate != WHISPER_RATE:
        resampler = rtc.AudioResampler(frame.sample_rate, WHISPER_RATE, num_channels=1)
        out = resampler.push(frame) + resampler.flush()
        samples = np.concatenate([np.frombuffer(f.data, dtype=np.int16) for f in out]) if out else samples[:0]
    return samples.astype(np.float32) / 32768.0


def _enable_cuda_runtime() -> bool:
    """Expose pip-installed cuBLAS/cuDNN DLLs (nvidia-*-cu12 wheels) and report whether a GPU is usable."""
    try:
        import ctranslate2

        if ctranslate2.get_cuda_device_count() < 1:
            return False
        import nvidia.cublas
        import nvidia.cudnn
    except ImportError:
        return False
    for package in (nvidia.cublas, nvidia.cudnn):
        for root in package.__path__:
            for sub in ("bin", "lib"):
                path = os.path.join(root, sub)
                if os.path.isdir(path):
                    os.environ["PATH"] = path + os.pathsep + os.environ.get("PATH", "")
                    if hasattr(os, "add_dll_directory"):
                        os.add_dll_directory(path)
    return True


def load_whisper(model: str, device: str, compute_type: str) -> tuple[Any, str]:
    from faster_whisper import WhisperModel

    if device in ("auto", "cuda") and _enable_cuda_runtime():
        try:
            whisper = WhisperModel(model, device="cuda", compute_type="float16")
            whisper.transcribe(np.zeros(WHISPER_RATE, dtype=np.float32), language="en")  # warm up CUDA kernels
            return whisper, "cuda"
        except Exception as exc:  # missing/incompatible driver: fall back rather than fail the call
            if device == "cuda":
                raise
            log.warning("CUDA unavailable for Whisper (%s); using CPU", type(exc).__name__)
    return WhisperModel(model, device="cpu", compute_type=compute_type), "cpu"


class WhisperSTT(stt.STT):
    def __init__(
        self, *, model: str = "base.en", device: str = "auto", compute_type: str = "int8", language: str = "en"
    ):
        super().__init__(capabilities=stt.STTCapabilities(streaming=False, interim_results=False))
        self._model_name = model
        self._language = language
        self._whisper, self.device = load_whisper(model, device, compute_type)
        log.info("faster-whisper %s on %s", model, self.device)

    @property
    def model(self) -> str:
        return self._model_name

    @property
    def provider(self) -> str:
        return "faster-whisper"

    def _transcribe(self, audio: np.ndarray) -> str:
        segments, _ = self._whisper.transcribe(
            audio,
            language=self._language,
            beam_size=1,
            vad_filter=False,
            without_timestamps=True,
            condition_on_previous_text=False,
        )
        return " ".join(s.text.strip() for s in segments).strip()

    async def _recognize_impl(
        self,
        buffer: utils.AudioBuffer,
        *,
        language: NotGivenOr[str] = NOT_GIVEN,
        conn_options: APIConnectOptions,
    ) -> stt.SpeechEvent:
        audio = to_whisper_input(buffer)
        text = await asyncio.to_thread(self._transcribe, audio) if audio.size else ""
        return stt.SpeechEvent(
            type=stt.SpeechEventType.FINAL_TRANSCRIPT,
            alternatives=[stt.SpeechData(language=LanguageCode(self._language), text=text)],
        )
