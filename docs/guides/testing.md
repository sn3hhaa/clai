# Testing

Run everything with `.\scripts\check.ps1` or `./scripts/check.sh`. CI runs the same
checks on Ubuntu without any API keys.

| Suite | Command | What it covers |
|---|---|---|
| Backend unit + integration | `cd backend; python -m pytest` | PDF validation (empty, corrupt, encrypted, scanned, limits), clause detection and provenance, chunking, BM25, RRF, reranking, cross-document isolation, deletion across stores, agent routing, corrective search, abstention, follow-ups, citation validation, summaries, the API and its error schema, LiveKit token claims, config, voice adapters |
| Frontend unit | `cd frontend; npx vitest run` | Aura state mapping and rendering, PDF highlight matching, upload validation, evidence panel, social links |
| End-to-end | `cd frontend; npx playwright test` | homepage, navigation, upload rejection, upload → ask → evidence → PDF highlight, desktop and mobile (API mocked at the network layer) |
| Static export | `npm run export:pages` then `node scripts/check-static.mjs` | every page, client navigation and asset under `/clai/` |
| Evaluation | `cd backend; python -m scripts.evaluate` | retrieval and answer quality (see [Evaluation](../evaluation.md)) |

## Real-provider checks (run manually, not in CI)

| Check | Needs | Command |
|---|---|---|
| Voice loop, synthetic caller | full stack running | `cd backend; python -m scripts.voice_smoke` |
| Voice in the real `/talk` page | full stack + Chrome | `cd frontend; node scripts/voice-browser-check.mjs` |
| Real microphone and speakers | a person | [acceptance test](acceptance-test.md) |

Tests use real local models (MiniLM, the cross-encoder) and an in-memory Qdrant. Only
the network LLM is faked. All agreements are fictional.
