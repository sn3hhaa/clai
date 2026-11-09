## Two engines

Clai has two engines that return the same answer format, so the interface works with either.

| | Browser engine | Server engine |
|---|---|---|
| Runs | In the browser tab | Python server you run |
| Used by | The public website | `/talk` when a server is detected |
| Parsing | pdf.js (Web Worker) | PyMuPDF |
| Structure | Same clause rules (ported) | Same clause rules |
| Retrieval | BM25 + intent expansion + RRF | Qdrant vectors (MiniLM) + BM25 + RRF |
| Ranking | IDF-weighted term coverage | Local cross-encoder |
| Reasoning | Grade → one corrective round → quote or decline | LangGraph: understand, classify, plan, retrieve, rerank, grade, correct, answer, validate |
| Answers | Quoted | Quoted, or written by an optional free LLM |
| Voice | Web Speech API | LiveKit WebRTC, Silero VAD, Whisper, Piper, barge-in |
| Storage | Memory only | SQLite + Qdrant + files |

## Browser engine pipeline

1. **Read**: pdf.js extracts text items; Clai groups them into lines with page and font size, and drops page numbers and running headers.
2. **Structure**: numbering patterns at sentence boundaries, and heading-sized lines, mark sections and clauses.
3. **Chunk**: passages never cross a clause, are split at sentences under 900 characters, and keep `page`, `section`, `clause` and `heading`.
4. **Index**: BM25 (k1 1.5, b 0.75) over each passage with its section and heading.
5. **Retrieve**: the question and an intent expansion are ranked separately and fused with Reciprocal Rank Fusion (k = 60).
6. **Grade**: each question term (with its agreement synonyms) is weighted by inverse document frequency. A passage is sufficient when at least half the weighted terms appear in it. If most of the weighted terms appear nowhere in the document, Clai declines and names them.
7. **Answer**: quote the clause (whole if short, otherwise the best sentence) with its citation.

## Evaluation

Measured on fictional agreements in the repository (`evaluations/`):

| Set | Browser engine | Server engine |
|---|---|---|
| Development set, 23 questions (tuned on) | 100% on every metric | hit@1 94.7%, citation 94.7%, answer 100% |
| Held-out, 12 questions (not tuned on) | 8/12 correct; 4 declined with the right clause listed; 0 wrong citations | not yet run |

These are small, fictional sets: evidence that the pipeline works end to end, not a benchmark.

## Running the full version

You need Git, Node.js 20+ and [uv](https://docs.astral.sh/uv/). No Docker.

```bash
git clone https://github.com/sn3hhaa/clai.git
cd clai
./scripts/setup.sh        # Windows: .\scripts\setup.ps1
./scripts/dev.sh          # Windows: .\scripts\dev.ps1
```

Then open `http://localhost:3000/talk`. It detects the server and offers it as the engine. Setup installs Python 3.12, pinned dependencies, local models, a local LiveKit server and Piper. Configuration lives in `backend/.env`; every option is documented in the repository's [configuration guide](https://github.com/sn3hhaa/clai/blob/main/docs/configuration.md).

## Repository

| Path | What |
|---|---|
| `frontend/` | This website and the app (Next.js, static export) |
| `frontend/lib/engine/` | The browser engine |
| `backend/app/` | The server engine (FastAPI, LangGraph, voice worker) |
| `evaluations/` | Question sets and results |
| `docs/` | Developer documentation and design decisions |

Developer documentation (API reference, architecture, decisions) is published at [sn3hhaa.github.io/clai/reference](https://sn3hhaa.github.io/clai/reference/) and lives in the [repository](https://github.com/sn3hhaa/clai).
