# CLAUDE.md — instructions for Claude Code sessions on Clai

Clai is a voice-first agreement-intelligence app. Users upload a PDF agreement, ask
questions by voice or text, and get answers grounded in the document with page,
section and clause citations. Read [PRD.md](PRD.md) for the product and
[ARCHITECTURE.md](ARCHITECTURE.md) for the system.

## Start of every session

1. Read this file, [RULES.md](RULES.md), [PLAN.md](PLAN.md) and [TASKS.md](TASKS.md).
2. `git status`, `git log --oneline -10`, `git fetch origin`, and check divergence.
3. Run the checks for the area you'll touch (see Commands).
4. Continue from the last **Verified** milestone in TASKS.md. Don't restart work.
5. Before ending a session or when context is short, update PLAN.md and TASKS.md.

## Layout

| Path | What |
|---|---|
| `backend/app/` | FastAPI app, ingestion, retrieval, LangGraph agent, LLM, voice worker |
| `backend/tests/` | pytest; `fixtures/` holds fictional agreement PDFs |
| `frontend/` | Next.js App Router (TypeScript, Tailwind CSS 4, GSAP, pdf.js, LiveKit) |
| `docs/` | MkDocs site: guides, architecture, ADRs (`docs/decisions/`) |
| `scripts/` | `setup`, `dev`, `check` for PowerShell and bash |
| `assets/branding/` | Source logo SVGs and brand guidelines |
| `evaluations/` | Retrieval and answer evaluation sets and runner |

## Commands

Windows (PowerShell) and Unix equivalents live in `scripts/`.

```powershell
.\scripts\setup.ps1          # venv + pip deps, npm ci, model + binary downloads
.\scripts\dev.ps1            # livekit-server (dev), backend, voice worker, frontend
.\scripts\check.ps1          # ruff, mypy, pytest, eslint, tsc, vitest
```

Backend only:

```powershell
cd backend
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
.venv\Scripts\python -m app.voice.worker dev
.venv\Scripts\python -m pytest -q
```

Frontend only: `cd frontend; npm run dev | npm test | npm run build`.

## Conventions

- Python 3.12, type hints everywhere, `ruff` + `mypy`. Pydantic models for every API
  shape. No global mutable singletons except through `app.state` / dependency
  functions.
- TypeScript strict. API types live in `frontend/lib/api/types.ts` and mirror
  `backend/app/schemas`.
- Keep the LLM out of deterministic steps. At most one LLM call per question.
- Every external call has a timeout and bounded retries, and fails into a documented
  fallback.
- Tests use fictional agreements and mock network providers. Real-provider checks
  live in `docs/guides/acceptance-test.md` and are run manually.

## Git

- Branch: `main` (solo project). Conventional commits (`feat(retrieval): …`).
- Review `git status` and `git diff --cached` before every commit, and confirm that no
  `.env`, PDFs (except fixtures), databases, audio or model files are staged.
- Commit and push after each tested milestone. Never force-push.

## Security & privacy

- Secrets only in `backend/.env` (ignored). The frontend gets only `NEXT_PUBLIC_*`
  values, which must not be secret.
- LiveKit tokens are minted server-side with a short TTL.
- Logs never contain document text or transcripts.
- Data sent externally: question + evidence passages to OpenRouter (when configured);
  audio to Gradium (when configured). Documented in `docs/security.md`.

## Design principles (frontend)

Clai has its own **dark editorial identity**. sort.to is a quality benchmark only; never copy
its layout or assets. Tokens live in `frontend/app/globals.css` (near-black `#0C0E0D`, warm
off-white text, sage `#B8D9C6` used sparingly). Newsreader for display, Geist for body, Geist Mono
for clause references. Vary section layouts; no generic AI aesthetics (orbs, gradients,
glassmorphism, 3-card grids, fake stats). Customer pages describe outcomes; stack details belong
on /technology and in the docs. The public /talk must work with the browser engine alone.
Brand rules: `assets/branding/README.md`.

## Voice-agent constraints

- The voice worker never reads Qdrant or SQLite directly. It calls the API.
- The Aura must reflect real LiveKit agent states and real audio levels in `/talk`.
- Don't mark voice verified until a real microphone-to-speaker test passes
  (`docs/guides/acceptance-test.md`).

## Budget

₹0. Verify free tiers before adding providers. Never enable billing. No Docker.
