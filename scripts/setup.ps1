# One-time setup on Windows. Safe to re-run.
#   .\scripts\setup.ps1 [-NoVoice] [-NoGpu]
# Requires: git, uv (https://docs.astral.sh/uv/), Node.js 20+. No Docker.
param([switch]$NoVoice, [switch]$NoGpu)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
function Step($msg) { Write-Host "`n== $msg" -ForegroundColor Cyan }
function Need($cmd, $hint) { if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { throw "$cmd not found. $hint" } }

Need git "Install Git for Windows."
Need uv "Install uv: winget install astral-sh.uv"
Need node "Install Node.js 20 or newer: winget install OpenJS.NodeJS.LTS"

Step "Backend: Python 3.12 virtual environment + pinned dependencies"
Push-Location (Join-Path $Root "backend")
uv python install 3.12
if (-not (Test-Path ".venv")) { uv venv .venv --python 3.12 }
uv pip sync requirements-dev.txt --python .venv\Scripts\python.exe
$hasNvidia = $null -ne (Get-Command nvidia-smi -ErrorAction SilentlyContinue)
if ($hasNvidia -and -not $NoGpu) {
    Write-Host "NVIDIA GPU detected: installing CUDA runtime wheels for faster-whisper"
    uv pip install -r requirements-gpu.txt --python .venv\Scripts\python.exe
}
if (-not (Test-Path ".env")) { Copy-Item .env.example .env; Write-Host "Created backend\.env from .env.example" }
Step "Backend: pre-downloading local models (embeddings, reranker, Whisper)"
.venv\Scripts\python.exe -c "from sentence_transformers import SentenceTransformer, CrossEncoder; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2'); CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2'); from faster_whisper import WhisperModel; WhisperModel('base.en', device='cpu', compute_type='int8'); print('models cached')"
if (-not $NoVoice) { .venv\Scripts\python.exe -m livekit.agents download-files }
Pop-Location

Step "Frontend: npm dependencies"
Push-Location (Join-Path $Root "frontend")
npm ci
if (-not (Test-Path ".env.local")) { Copy-Item .env.example .env.local; Write-Host "Created frontend\.env.local" }
Pop-Location

if (-not $NoVoice) {
    Step "Voice tools: livekit-server + Piper (into tools/, git-ignored)"
    & (Join-Path $PSScriptRoot "install-voice-tools.ps1")
}

Write-Host "`nSetup complete. Optional: add OPENROUTER_API_KEY to backend\.env. Then run .\scripts\dev.ps1" -ForegroundColor Green
