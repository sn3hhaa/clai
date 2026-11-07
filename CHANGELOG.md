# Changelog

All notable changes to Clai. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- PDF ingestion with validation (empty, non-PDF, corrupt, encrypted, scanned, size and
  page limits) and conservative section/clause detection with page provenance.
- Hybrid retrieval: MiniLM embeddings in Qdrant (local, remote or in-memory), BM25,
  Reciprocal Rank Fusion and a local cross-encoder, scoped to one document.
- LangGraph agent with intent classification, query planning, evidence grading, one
  bounded corrective search, at most one LLM call (OpenRouter) with an extractive
  fallback, and claim/citation validation.
- SQLite persistence for documents, conversations, messages and session summaries.
- FastAPI endpoints for documents, questions, conversations and LiveKit voice tokens.
- Real-time voice agent on LiveKit Agents: Silero VAD, local turn detection, barge-in,
  faster-whisper speech-to-text (GPU when available) and Piper text-to-speech, with
  optional Gradium. Voice turns call the same `/query` engine as text.
- Website in the sort.to style, `/technology`, and the `/talk` workspace (upload, PDF
  viewer with evidence highlighting, voice panel with Aura, evidence panel, session
  summary), plus a static GitHub Pages export.
- Original Clai brand: mark, wordmark, icons and social previews.
- Evaluation set and runner, setup/dev/check scripts for Windows and Unix.

### Fixed

- Blank `QDRANT_PATH` no longer puts the vector store in the working directory.
- Voice questions spoken during a greeting are no longer discarded as false
  interruptions.
- One-word voice transcripts ask for a repeat instead of being answered.
- Paraphrased questions are no longer falsely abstained after corrective search.
