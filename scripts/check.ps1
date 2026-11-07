# Runs every automated check (what CI runs, plus Playwright with local Chrome).
#   .\scripts\check.ps1 [-SkipE2E]
param([switch]$SkipE2E)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$failed = @()
function Run($name, $dir, [scriptblock]$block) {
    Write-Host "`n== $name" -ForegroundColor Cyan
    Push-Location $dir
    try { & $block; if ($LASTEXITCODE -ne 0) { $script:failed += $name } } catch { $script:failed += $name; Write-Host $_ -ForegroundColor Red }
    finally { Pop-Location }
}

$be = Join-Path $Root "backend"; $py = Join-Path $be ".venv\Scripts\python.exe"
$fe = Join-Path $Root "frontend"
Run "ruff" $be { & $py -m ruff check app tests scripts; if ($LASTEXITCODE -eq 0) { & $py -m ruff format --check app tests scripts } }
Run "mypy" $be { & $py -m mypy app }
Run "pytest" $be { & $py -m pytest }
Run "eslint" $fe { npx eslint . }
Run "tsc" $fe { npx tsc --noEmit }
Run "vitest" $fe { npx vitest run }
if (-not $SkipE2E) { Run "playwright" $fe { npx playwright test } }

if ($failed.Count) { Write-Host "`nFAILED: $($failed -join ', ')" -ForegroundColor Red; exit 1 }
Write-Host "`nAll checks passed." -ForegroundColor Green
