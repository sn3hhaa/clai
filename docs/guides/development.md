# Development workflow

1. `.\scripts\dev.ps1` starts everything. Each service gets its own window, and its log
   goes to `logs/`.
2. Backend code reloads only if you run uvicorn with `--reload` yourself:
   `cd backend; .venv\Scripts\python -m uvicorn app.main:app --reload`.
3. The voice worker in `dev` mode reloads on file changes.
4. The frontend hot-reloads.

## Branches and commits

Work on a branch, use conventional commits, and run `scripts/check` before opening a
PR. If retrieval or answering changed, include before/after numbers from
`python -m scripts.evaluate`.

## Regenerating assets

| What | Command |
|---|---|
| Fixture PDFs | `cd backend; python -m tests.fixtures.generate` |
| Brand exports, favicons, social previews | `cd frontend; npm run brand` |
| Product screenshot | `node scripts/voice-browser-check.mjs <dir>` (stack running), then export `talk-voice.png` |

## Dependencies

Backend dependencies are compiled with uv from `requirements*.in`:

```bash
uv pip compile requirements.in -o requirements.txt --python-version 3.12 --universal
uv pip compile requirements-dev.in -o requirements-dev.txt --python-version 3.12 --universal
uv pip compile requirements-dev.in -o requirements-ci.txt --python-version 3.12 \
  --python-platform x86_64-unknown-linux-gnu --torch-backend cpu
```
