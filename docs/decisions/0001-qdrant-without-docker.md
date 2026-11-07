# 0001 — Qdrant without Docker

**Status:** accepted · 2026-11-07

## Context
Clai needs vector search with metadata filtering and no Docker. Options:
`qdrant-client` local mode (embedded, on disk), the native Qdrant server binary
(Windows/Linux/macOS releases exist), or Qdrant Cloud's free tier (1 GB).

## Decision
Use **local mode by default** (`QDRANT_MODE=local`). Support a server or Cloud through
`QDRANT_MODE=remote` with `QDRANT_URL`. Tests use `memory`.

## Consequences
- Zero setup and nothing to run. The cost is that **only one process may open the
  store**, so the API process owns all storage and the voice worker calls the API.
- Local mode doesn't build payload indexes. Filtering by `document_id` is a scan,
  which is fine for personal-scale collections.
- Moving to a server needs only configuration changes.
