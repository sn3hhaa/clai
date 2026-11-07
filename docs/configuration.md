# Configuration

The backend reads `backend/.env` (template: `backend/.env.example`) through Pydantic
Settings and refuses to start on invalid values. Blank values mean "use the default".
The frontend reads only public `NEXT_PUBLIC_*` values from `frontend/.env.local`.
**Never put a secret in a `NEXT_PUBLIC_` variable.**

## Backend

| Variable | Default | Purpose |
|---|---|---|
| `APP_HOST` / `APP_PORT` | `127.0.0.1` / `8000` | API bind address |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | CORS allow-list, comma-separated |
| `DATA_DIR` | `./data` | SQLite, PDFs, BM25 indexes, local Qdrant |
| `MAX_UPLOAD_MB` / `MAX_PAGES` | `20` / `300` | upload limits |
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | 384-d embeddings |
| `RERANKER_MODEL` | `cross-encoder/ms-marco-MiniLM-L-6-v2` | reranker (`RERANKER_ENABLED=false` to skip) |
| `QDRANT_MODE` | `local` | `local` (embedded), `remote` (server/Cloud) or `memory` |
| `QDRANT_PATH` | `DATA_DIR/qdrant` | local store location |
| `QDRANT_URL` / `QDRANT_API_KEY` | — | for `remote` |
| `RETRIEVAL_TOP_K` / `RERANK_TOP_N` | `12` / `5` | candidates fused / passages kept |
| `AGENT_MAX_RETRIES` | `1` | corrective searches per question |
| `OPENROUTER_API_KEY` | — | enables LLM-written answers |
| `OPENROUTER_MODEL` | `nvidia/nemotron-3.5-super-vl:free` | any OpenRouter model id |
| `LLM_TIMEOUT_S` | `30` | per request |
| `LIVEKIT_URL` | `ws://127.0.0.1:7880` | LiveKit server (or `wss://…livekit.cloud`) |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | `devkey` / `secret` | match `livekit-server --dev` |
| `STT_PROVIDER` | `whisper` | `whisper` (local) or `gradium` |
| `TTS_PROVIDER` | `piper` | `piper` (local) or `gradium` |
| `WHISPER_MODEL` / `WHISPER_DEVICE` | `base.en` / `auto` | `auto` uses an NVIDIA GPU if available |
| `PIPER_URL` / `PIPER_VOICE` | `http://127.0.0.1:5000` / `en_US-lessac-medium` | Piper HTTP server |
| `GRADIUM_API_KEY` / `GRADIUM_VOICE_ID` | — | Gradium free plan (≈1 h TTS or ≈4 h STT a month) |
| `VOICE_GREETING` | `true` | agent greets when a call starts |
| `API_INTERNAL_URL` | `http://127.0.0.1:8000` | where the voice worker reaches the API |

## Frontend

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://127.0.0.1:8000` | Clai API |
| `NEXT_PUBLIC_BASE_PATH` | empty | `/clai` for the GitHub Pages build only |

## Using LiveKit Cloud instead of the local server

Create a project on the free Build plan (no card required, hard monthly caps), then set
`LIVEKIT_URL=wss://<project>.livekit.cloud`, `LIVEKIT_API_KEY` and
`LIVEKIT_API_SECRET` in `backend/.env`. The worker still runs on your machine.
