# Yomi-Subs v2 — Windows PowerShell launcher
# Run with: Right-click → "Run with PowerShell"
# Or compile to .exe using build-exe.bat

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BackendDir = Join-Path $ScriptDir "yomi-subs-backend"
$VenvDir    = Join-Path $BackendDir "venv"
$PythonExe  = Join-Path $VenvDir "Scripts\python.exe"
$ServerPy   = Join-Path $BackendDir "server.py"
$ReqTxt     = Join-Path $BackendDir "requirements.txt"

Write-Host ""
Write-Host "  字 Yomi-Subs v2 — starting local backend" -ForegroundColor Red
Write-Host "  ─────────────────────────────────────────"

# ── Python check ──────────────────────────────────────────────────────────────
$PyCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $PyCmd) {
    Write-Host "  ✗ Python not found. Install Python 3.9+ from https://python.org" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

$PyVersion = & python --version 2>&1
Write-Host "  ✓ $PyVersion"

# ── Virtualenv setup ──────────────────────────────────────────────────────────
if (-not (Test-Path $VenvDir)) {
    Write-Host "  → Creating virtual environment…"
    & python -m venv $VenvDir
}

Write-Host "  → Checking dependencies…"
& $PythonExe -m pip install -q -r $ReqTxt
Write-Host "  ✓ Dependencies ready"

# ── Launch server ─────────────────────────────────────────────────────────────
Write-Host "  → Launching server (ws://localhost:8765)…"
Write-Host ""
& $PythonExe $ServerPy
