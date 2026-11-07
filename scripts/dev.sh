#!/usr/bin/env bash
# Starts the full local stack in the background, logging to ./logs; Ctrl+C stops everything.
#   ./scripts/dev.sh [--no-voice]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NO_VOICE=0; [[ "${1:-}" == "--no-voice" ]] && NO_VOICE=1
PY="$ROOT/backend/.venv/bin/python"
[[ -x "$PY" ]] || { echo "Backend venv missing. Run ./scripts/setup.sh first." >&2; exit 1; }
mkdir -p "$ROOT/logs"
PIDS=()
cleanup() { echo; echo "stopping..."; kill "${PIDS[@]}" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
launch() { # name dir command...
  local name=$1 dir=$2; shift 2
  (cd "$dir" && exec "$@") >"$ROOT/logs/$name.log" 2>&1 &
  PIDS+=($!); echo "started $name (logs/$name.log)"
}

if [[ $NO_VOICE == 0 ]]; then
  [[ -x "$ROOT/tools/livekit/livekit-server" && -x "$ROOT/tools/piper/.venv/bin/python" ]] \
    || { echo "Voice tools missing. Run ./scripts/install-voice-tools.sh (or dev.sh --no-voice)." >&2; exit 1; }
  launch livekit "$ROOT" "$ROOT/tools/livekit/livekit-server" --dev --bind 127.0.0.1
  launch piper "$ROOT" "$ROOT/tools/piper/.venv/bin/python" -m piper.http_server --host 127.0.0.1 --port 5000 \
    -m "$ROOT/tools/piper/voices/en_US-lessac-medium.onnx"
fi
launch api "$ROOT/backend" "$PY" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
echo "waiting for the API (first start loads models)..."
for _ in $(seq 180); do curl -fs http://127.0.0.1:8000/health >/dev/null && break; sleep 1; done
[[ $NO_VOICE == 1 ]] || launch worker "$ROOT/backend" "$PY" -m app.voice.worker dev
launch frontend "$ROOT/frontend" npm run dev
echo; echo "Clai: http://localhost:3000/talk   API docs: http://127.0.0.1:8000/docs   (Ctrl+C to stop)"
wait
