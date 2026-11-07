# Installs the local voice tooling into ./tools (git-ignored). No Docker, no accounts.
#   - livekit-server (official native binary, Apache-2.0), checksum-verified
#   - Piper TTS (GPL-3.0) in its OWN virtual environment, run as a separate HTTP process
#   - one Piper English voice model
# Usage: .\scripts\install-voice-tools.ps1 [-LiveKitVersion 1.13.11] [-Voice en_US-lessac-medium]
param(
    [string]$LiveKitVersion = "1.13.11",
    [string]$Voice = "en_US-lessac-medium",
    [string]$PiperVersion = "1.8.0"
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Tools = Join-Path $Root "tools"
New-Item -ItemType Directory -Force $Tools | Out-Null

# ── livekit-server ────────────────────────────────────────────────────
$lkDir = Join-Path $Tools "livekit"
$lkExe = Join-Path $lkDir "livekit-server.exe"
if (-not (Test-Path $lkExe)) {
    $arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "amd64" }
    $name = "livekit_${LiveKitVersion}_windows_${arch}.zip"
    $base = "https://github.com/livekit/livekit/releases/download/v$LiveKitVersion"
    $zip = Join-Path $Tools $name
    Write-Host "Downloading $name"
    Invoke-WebRequest "$base/$name" -OutFile $zip -UseBasicParsing
    $raw = (Invoke-WebRequest "$base/checksums.txt" -UseBasicParsing).Content
    # Windows PowerShell returns octet-stream bodies as byte[]; decode before parsing.
    $sums = if ($raw -is [byte[]]) { [Text.Encoding]::UTF8.GetString($raw) } else { $raw }
    $expected = ($sums -split "`n" | Where-Object { $_ -match [regex]::Escape($name) }) -split "\s+" | Select-Object -First 1
    $actual = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
    if (-not $expected -or $expected.ToLower() -ne $actual) { Remove-Item $zip; throw "Checksum mismatch for $name" }
    Write-Host "Checksum OK ($actual)"
    Expand-Archive $zip -DestinationPath $lkDir -Force
    Remove-Item $zip
}
& $lkExe --version

# ── Piper (isolated venv) ─────────────────────────────────────────────
$piperDir = Join-Path $Tools "piper"
$piperPy = Join-Path $piperDir ".venv\Scripts\python.exe"
if (-not (Test-Path $piperPy)) {
    uv venv (Join-Path $piperDir ".venv") --python 3.12
    uv pip install --python $piperPy "piper-tts[http]==$PiperVersion"
}
$voiceDir = Join-Path $piperDir "voices"
New-Item -ItemType Directory -Force $voiceDir | Out-Null
if (-not (Test-Path (Join-Path $voiceDir "$Voice.onnx"))) {
    & $piperPy -m piper.download_voices --data-dir $voiceDir $Voice
}
Write-Host "Voice tools ready in $Tools"
