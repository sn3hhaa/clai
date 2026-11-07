#!/usr/bin/env bash
# Runs every automated check.   ./scripts/check.sh [--skip-e2e]
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="$ROOT/backend/.venv/bin/python"
FAILED=()
run() { local name=$1 dir=$2; shift 2; echo; echo "== $name"; (cd "$dir" && "$@") || FAILED+=("$name"); }

run ruff "$ROOT/backend" bash -c "'$PY' -m ruff check app tests scripts && '$PY' -m ruff format --check app tests scripts"
run mypy "$ROOT/backend" "$PY" -m mypy app
run pytest "$ROOT/backend" "$PY" -m pytest
run eslint "$ROOT/frontend" npx eslint .
run tsc "$ROOT/frontend" npx tsc --noEmit
run vitest "$ROOT/frontend" npx vitest run
[[ "${1:-}" == "--skip-e2e" ]] || run playwright "$ROOT/frontend" npx playwright test

if (( ${#FAILED[@]} )); then echo; echo "FAILED: ${FAILED[*]}"; exit 1; fi
echo; echo "All checks passed."
