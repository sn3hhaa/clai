# 0005 — Speech providers: local by default, Gradium optional

**Status:** accepted · 2026-11-07

## Context
Gradium has a free plan (45k credits a month: about 1 hour of TTS or 4 hours of STT,
and 1,500 characters per session on the free tier) and an official LiveKit plugin.
Whether signup needs a card wasn't verified. Local options: faster-whisper (MIT) and
Piper (GPL-3.0 code; the voice model's dataset licence varies).

## Decision
Default to **faster-whisper** `base.en` (CPU, or GPU via the CUDA wheels from
`requirements-gpu.txt`) and **Piper** `en_US-lessac-medium`. Gradium is selectable with
`STT_PROVIDER` / `TTS_PROVIDER`. Piper runs as a **separate process in its own virtual
environment** and is reached over HTTP, so its GPL code is never imported into Clai
(MIT).

## Consequences
- Fully local, unlimited voice at no cost.
- Whisper isn't streaming: transcripts arrive after each utterance. That drove two
  decisions: no false-interruption resume, and one-word fragments ask for a repeat.
- Piper synthesises whole requests, so answers are split into short phrases to keep
  time-to-first-audio low.
- Measured: Whisper `base.en` is ≈ 2.5 s on CPU and ≈ 0.15 s on an RTX 3050 for a
  2.6 s question.
