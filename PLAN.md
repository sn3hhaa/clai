# Clai — Implementation Plan

Last updated: 2026-11-08

## Verified provider facts (checked 2026-11-07)

| Provider | Free terms | Decision |
|---|---|---|
| OpenRouter | `:free` models; 20 req/min, **50 req/day** without a $10 credit purchase | LLM gateway. One call per question; extractive fallback when unavailable. Default model `nvidia/nemotron-3.5-super-vl:free` (supports structured outputs) |
| LiveKit Cloud | Build plan, no card, hard caps (1,000 agent-min, 5,000 WebRTC-min/month) | Supported via env. Default dev path is the local `livekit-server --dev` binary (no account needed) |
| Gradium | Free plan, 45k credits/month (≈1 h TTS or ≈4 h STT), 1,500 chars/session | Optional primary STT/TTS via `livekit-plugins-gradium` |
| faster-whisper | MIT, Windows CPU wheels | Local STT fallback |
| Piper (`piper-tts`) | GPL-3.0 code; voice-model licences vary | Local TTS fallback, run as a **separate process** and not bundled. See ADR 0005 |
| Qdrant | `qdrant-client` local mode; native Windows server binary; Cloud free 1 GB | Local mode by default; `QDRANT_URL` for server/Cloud |
| Hosting | HF Spaces and Koyeb no longer free for compute; Fly has a trial only; Render free is 512 MB and sleeps | Public static site on GitHub Pages; full app runs locally |

## Phases

1. Safe reset and foundation
2. Backend foundation: config, SQLite, ingestion, API skeleton
3. Document intelligence: embeddings, Qdrant, BM25, RRF, reranker
4. Agentic reasoning: LangGraph, LLM, validation, conversations
5. Branding and frontend: logo, favicon, tokens, homepage, `/technology`
6. Agreement workspace: upload, PDF viewer, evidence panel, text Q&A
7. Voice: LiveKit server, worker, STT/TTS adapters, token API, Aura, end-to-end test
8. Release: tests, evaluation, docs (MkDocs), README, CI/CD, Pages, repo metadata

## Current focus

Phases 1–7 are built and tested locally. Phase 8 (release) is mostly done; what's left:

1. **Push**: needs `gh auth login` by the owner.
2. **Enable GitHub Pages** (Source: GitHub Actions), then check that CI and Pages go green
   and the site loads at https://sn3hhaa.github.io/clai/.
3. **Repository metadata**: description, topics, website URL, social preview image.
4. **Human voice acceptance test**, then mark voice Verified.
5. Optional: LLM-mode evaluation with an OpenRouter key.

## Design direction

The owner's reference for the website is **sort.to**, followed closely (see CLAUDE.md →
Design principles).
