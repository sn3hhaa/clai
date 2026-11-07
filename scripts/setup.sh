#!/usr/bin/env bash
# One-time setup on macOS / Linux. Safe to re-run.
#   ./scripts/setup.sh [--no-voice]
# Requires: git, uv (https://docs.astral.sh/uv/), Node.js 20+. No Docker.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NO_VOICE=0; [[ "${1:-}" == "--no-voice" ]] && NO_VOICE=1
need() { command -v "$1" >/dev/null || { echo "$1 not found. $2" >&2; exit 1; }; }
need git "Install git."
need uv "Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh"
need node "Install Node.js 20 or newer."

echo "== Backend: Python 3.12 venv + pinned dependencies"
cd "$ROOT/backend"
uv python install 3.12
[[ -d .venv ]] || uv venv .venv --python 3.12
uv pip sync requirements-dev.txt --python .venv/bin/python
if command -v nvidia-smi >/dev/null && [[ "$(uname)" == "Linux" ]]; then
  echo "NVIDIA GPU detected: installing CUDA runtime wheels for faster-whisper"
  uv pip install -r requirements-gpu.txt --python .venv/bin/python
fi
[[ -f .env ]] || { cp .env.example .env; echo "Created backend/.env"; }
echo "== Backend: pre-downloading local models"
.venv/bin/python -c "from sentence_transformers import SentenceTransformer, CrossEncoder; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2'); CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2'); from faster_whisper import WhisperModel; WhisperModel('base.en', device='cpu', compute_type='int8'); print('models cached')"
[[ $NO_VOICE == 1 ]] || .venv/bin/python -m livekit.agents download-files

echo "== Frontend: npm dependencies"
cd "$ROOT/frontend"
npm ci
[[ -f .env.local ]] || { cp .env.example .env.local; echo "Created frontend/.env.local"; }

[[ $NO_VOICE == 1 ]] || "$ROOT/scripts/install-voice-tools.sh"
echo; echo "Setup complete. Optional: add OPENROUTER_API_KEY to backend/.env. Then run ./scripts/dev.sh"
