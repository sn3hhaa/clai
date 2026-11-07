# 0004 — LiveKit for real-time voice

**Status:** accepted · 2026-11-07

## Context
Voice needs WebRTC transport, VAD, turn detection, barge-in and STT/TTS plumbing, at
₹0 and without Docker.

## Decision
**LiveKit Agents** (Python, 1.8) with the open-source **livekit-server** binary in dev
mode by default. The LiveKit Cloud Build plan (free, no card, hard caps) is supported by
configuration. The browser uses `livekit-client` and `@livekit/components-react`.
Clai's engine is plugged in as a custom `llm.LLM` (`ClaiBackendLLM`) that calls
`POST /query`.

## Consequences
- Real WebRTC with echo cancellation, interruption handling and transcripts, with no
  hand-written audio transport.
- LiveKit's `llm_node` alone isn't enough: a session with no LLM refuses to reply.
  Hence the custom LLM class.
- On Windows, LiveKit runs jobs in threads by default, so CPU-heavy work in the worker
  competes with audio. STT runs on the GPU when available.
- The agent's Aura is original code, not LiveKit's Agents UI component.
