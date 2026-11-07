# Starts the full local stack, each service in its own window:
#   livekit-server (dev mode) · Piper TTS · Clai API · voice worker · Next.js
#   .\scripts\dev.ps1 [-NoVoice]      # -NoVoice: API + frontend only (text Q&A)
# Close a window to stop that service.
param([switch]$NoVoice)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Py = Join-Path $Backend ".venv\Scripts\python.exe"
if (-not (Test-Path $Py)) { throw "Backend venv missing. Run .\scripts\setup.ps1 first." }

$Logs = Join-Path $Root "logs"
New-Item -ItemType Directory -Force $Logs | Out-Null

function Launch($title, $dir, $command) {
    # Output goes to the window and to logs/<service>.log (git-ignored).
    $log = Join-Path $Logs (($title -replace '\s', '-') + ".log")
    $script = "`$Host.UI.RawUI.WindowTitle = 'clai: $title'; `$env:PYTHONUNBUFFERED = '1'; Set-Location '$dir'; $command 2>&1 | Tee-Object -FilePath '$log'"
    Start-Process powershell -ArgumentList "-NoExit", "-NoProfile", "-Command", $script | Out-Null
    Write-Host "started $title"
}

function Wait-Http($url, $seconds) {
    for ($i = 0; $i -lt $seconds; $i++) {
        try { Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 2 | Out-Null; return $true } catch { Start-Sleep 1 }
    }
    return $false
}

if (-not $NoVoice) {
    $lk = Join-Path $Root "tools\livekit\livekit-server.exe"
    $piper = Join-Path $Root "tools\piper\.venv\Scripts\python.exe"
    if (-not (Test-Path $lk) -or -not (Test-Path $piper)) { throw "Voice tools missing. Run .\scripts\install-voice-tools.ps1 (or dev.ps1 -NoVoice)." }
    Launch "livekit" $Root "& '$lk' --dev --bind 127.0.0.1"
    Launch "piper" $Root "& '$piper' -m piper.http_server --host 127.0.0.1 --port 5000 -m tools\piper\voices\en_US-lessac-medium.onnx"
}

Launch "api" $Backend "& '$Py' -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
Write-Host "waiting for the API (first start loads models)..."
if (-not (Wait-Http "http://127.0.0.1:8000/health" 180)) { Write-Warning "API not ready yet; check its window." }

if (-not $NoVoice) { Launch "voice worker" $Backend "& '$Py' -m app.voice.worker dev" }
Launch "frontend" $Frontend "npm run dev"

Write-Host "`nClai: http://localhost:3000/talk   API docs: http://127.0.0.1:8000/docs" -ForegroundColor Green
