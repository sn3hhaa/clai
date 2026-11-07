# Clai — Tasks

Status key: **Pending** · **In progress** · **Blocked** · **Completed** (built, not yet
proven) · **Verified** (a test or documented check passed). Last updated 2026-11-08.

## Foundation

| Task | Status | Evidence |
|---|---|---|
| Toolchain: Python 3.12 (uv), gh CLI, Node 26 | Verified | `setup.ps1` ran end to end on Windows 11 |
| Safe reset of the earlier local attempt | Verified | `Desktop/clai-checkpoints/clai-pre-reset-20261107-130700.zip` |
| Project memory: CLAUDE, RULES, PRD, ARCHITECTURE, PLAN, TASKS | Completed | |
| GitHub CLI authentication | **Blocked** | owner must run `gh auth login --web` and `gh auth setup-git` |
| Push to `origin/main` | **Blocked** | waiting on auth; all work is in local commits |

## Backend

| Task | Status | Evidence |
|---|---|---|
| PDF validation, extraction, clause detection, provenance chunking | Verified | `tests/test_ingestion.py` |
| Embeddings, Qdrant (local/remote/memory), BM25, RRF, cross-encoder | Verified | `tests/test_retrieval.py` |
| Cross-document isolation; deletion across stores | Verified | `test_cross_document_isolation`, `test_vectors_and_lexical_removed_on_delete` |
| LangGraph agent: grading, corrective search, abstention, follow-ups | Verified | `tests/test_agent.py` |
| OpenRouter client + extractive fallback | Verified (mocked) | `test_llm_answer_is_grounded…`, `test_llm_outage_falls_back…` |
| Claim and citation validation | Verified | `test_number_mismatch…`, `test_citations_outside_evidence…` |
| Conversations, summaries, SQLite | Verified | `test_conversation_summary`, `test_api.py` |
| API + error schema + OpenAPI | Verified | `tests/test_api.py` |
| Config: blank paths unset | Verified | `tests/test_config.py` |
| Evaluation set + runner | Verified | `evaluations/results/latest.json` (extractive) |
| Evaluation in LLM mode | Pending | needs `OPENROUTER_API_KEY` |

## Voice

| Task | Status | Evidence |
|---|---|---|
| Local LiveKit server (no Docker), Piper in an isolated venv | Verified | `install-voice-tools.ps1`, checksum-verified |
| Token endpoint with agent dispatch | Verified | `test_voice_token_dispatches_agent_with_metadata` |
| Worker: VAD, turn detection, barge-in, Whisper (GPU/CPU), Piper, bridge to `/query` | Verified (automated) | `scripts/voice_smoke.py` 2/2 turns PASS; `voice-browser-check.mjs` PASS |
| Fragment guard, no false-interruption resume | Verified | `tests/test_voice.py` |
| Aura bound to real agent state and audio levels | Verified (automated) | browser check saw connecting → listening → thinking → speaking → ended |
| **Real microphone → speaker acceptance test** | **Pending** | must be run by a person: `docs/guides/acceptance-test.md` |
| Gradium STT/TTS | Completed (untested) | needs `GRADIUM_API_KEY` |

## Frontend

| Task | Status | Evidence |
|---|---|---|
| Brand system and assets | Verified | rendered and inspected; `assets/branding/README.md` |
| Homepage in the sort.to style, `/technology` | Verified | Playwright `site.spec.ts`, screenshots |
| `/talk`: upload, PDF viewer + highlight, evidence, text Q&A, summary, mobile tabs | Verified | Playwright desktop + mobile, 12/12 three runs in a row |
| Backend-unreachable notice on `/talk` | Verified | `explains when no backend is reachable` |
| Static export under `/clai/` | Verified | `scripts/check-static.mjs` |

## Release

| Task | Status | Evidence |
|---|---|---|
| Docs site (MkDocs), ADRs, README, community files, templates | Completed | `mkdocs build --strict` passes locally |
| CI and Pages workflows | Completed | not yet run on GitHub (no push yet) |
| GitHub Pages enabled + deployed | Pending | after push: Settings → Pages → Source: GitHub Actions |
| Repo description, topics, website URL, social preview | Pending | needs gh auth; preview image upload is manual in Settings |
| `setup.sh` / `dev.sh` / `check.sh` run on Linux/macOS | Pending | syntax-checked only; CI exercises Linux installs |

## Pending configuration (owner input)

- LinkedIn URL, X handle, contact email: not provided, so omitted from the UI
  (`frontend/lib/site.ts`).
- Optional keys: `OPENROUTER_API_KEY`, `GRADIUM_API_KEY`, LiveKit Cloud.
