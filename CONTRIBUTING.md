# Contributing to Clai

Thanks for helping. Clai is a small project with firm rules, so please read
[RULES.md](RULES.md) first. In short: no fake integrations, no invented citations, no
paid services, no Docker, no secrets or real agreements in Git.

## Set up

```powershell
.\scripts\setup.ps1      # Windows
./scripts/setup.sh       # macOS / Linux
```

This creates `backend/.venv` (Python 3.12), installs pinned dependencies, caches the
local models, runs `npm ci`, and installs the local voice tools into `tools/`. See
[docs/installation.md](docs/installation.md).

## Make a change

1. Create a branch from `main`.
2. Keep the change focused. One concern per pull request.
3. Add or update tests:
   - backend: `backend/tests/` (pytest, fictional fixtures only)
   - frontend: `frontend/tests/unit` (Vitest) and `frontend/tests/e2e` (Playwright)
4. Run the checks: `.\scripts\check.ps1` or `./scripts/check.sh`.
5. If retrieval or answering changed, run the evaluation and include the before/after
   numbers in the PR: `cd backend; python -m scripts.evaluate`.
6. Update the docs that describe the behaviour you changed.

## Commits

Conventional commits: `feat(retrieval): …`, `fix(voice): …`, `docs: …`, `test: …`,
`chore: …`. Write the *why* in the body.

## Test data

Only fictional agreements. Never commit a real contract, even a redacted one. The
fixture generator is `backend/tests/fixtures/generate.py`.

## Providers

A new external provider must have a verified free tier, be optional, and fail into a
documented fallback. Record the decision in `docs/decisions/`.
