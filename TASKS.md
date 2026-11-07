# Clai — Tasks

Status key: **Pending** · **In progress** · **Blocked** · **Completed** (built, not yet
proven) · **Verified** (a test or a documented manual check passed).

## Phase 1 — Foundation

| Task | Status | Evidence |
|---|---|---|
| Inspect laptop & install toolchain (Python 3.12 via uv, gh CLI) | Verified | `python 3.12.16`, `gh 2.103.3` |
| Safe reset of earlier local attempt (checkpoint zip outside repo) | Verified | `Desktop/clai-checkpoints/clai-pre-reset-20261107-130700.zip` |
| Root `.gitignore`, `.gitattributes`, `.editorconfig`, LICENSE | Completed | |
| Project memory: CLAUDE, RULES, PRD, ARCHITECTURE, PLAN, TASKS | Completed | |
| GitHub CLI authentication | Blocked | Needs `gh auth login` by the owner |

## Phase 2 — Backend foundation

| Task | Status | Evidence |
|---|---|---|
| Pinned requirements, venv | In progress | |
| Config, SQLite storage, file store | Pending | |
| PDF validation, extraction, structure/clause detection, chunking | Pending | |
| Documents API | Pending | |

## Phase 3 — Document intelligence

| Task | Status | Evidence |
|---|---|---|
| Embeddings + Qdrant (local mode) | Pending | |
| BM25, RRF, cross-encoder rerank, document isolation | Pending | |

## Phase 4 — Agent

| Task | Status | Evidence |
|---|---|---|
| LangGraph graph with grading + corrective retrieval | Pending | |
| OpenRouter client + extractive fallback | Pending | |
| Claim + citation validation | Pending | |
| Conversations, follow-ups, summaries | Pending | |

## Phase 5–6 — Frontend

| Task | Status | Evidence |
|---|---|---|
| Brand system & assets | Pending | |
| Homepage, `/technology` | Pending | |
| `/talk` workspace (upload, PDF viewer, evidence, text Q&A) | Pending | |

## Phase 7 — Voice

| Task | Status | Evidence |
|---|---|---|
| Local LiveKit server (no Docker) | Pending | |
| Token endpoint | Pending | |
| Worker with VAD/turns/barge-in, STT/TTS adapters | Pending | |
| Aura bound to real agent state | Pending | |
| **Real mic → speaker acceptance test** | Pending | Must be run by a human with a microphone |

## Phase 8 — Release

| Task | Status | Evidence |
|---|---|---|
| Docs site, README, community files | Pending | |
| CI workflows, Pages deploy | Pending | |
| Repo metadata, social preview | Pending | |

## Pending configuration (owner input)

- LinkedIn URL, X handle, contact email: not provided, so omitted from the UI.
- `OPENROUTER_API_KEY`, optional `GRADIUM_API_KEY`, optional LiveKit Cloud keys.
