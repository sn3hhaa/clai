# 0006 — Zero-budget deployment: static site, local app

**Status:** accepted · 2026-11-07

## Context
The budget is ₹0. GitHub Pages is free but static. On 2026-11-07, Hugging Face Spaces
required a paid plan for non-static Spaces, Koyeb listed no free compute, Fly.io
offered only a trial, and Render's free tier (512 MB, sleeps when idle) can't hold the
models or keep a voice worker connected.

## Decision
Publish the **website and docs on GitHub Pages** (`/clai/`, `/clai/docs/`). Run the
**API, voice worker, LiveKit and Qdrant locally**, with one-command setup and dev
scripts.

## Consequences
- No public live demo of the voice agent. The site says so plainly rather than faking it.
- The hosted `/talk` page checks for a backend and explains how to run one.
- If a free host with enough memory appears, the backend can move without code
  changes; it's configured entirely through environment variables.
