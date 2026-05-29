#!/usr/bin/env bash
# Yomi-Subs v2 — Universal launcher (macOS / Linux / WSL)
# Double-click on macOS (if not using the .app) or run: bash start.sh

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$DIR/yomi-subs-backend"
VENV_DIR="$BACKEND_DIR/venv"

echo ""
echo "  字 Yomi-Subs v2 — starting local backend"
echo "  ─────────────────────────────────────────"

# ── Python check ──────────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "  ✗ python3 not found. Install Python 3.9+ and try again."
  exit 1
fi

PY_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "  ✓ Python $PY_VERSION"

# ── Virtualenv setup ──────────────────────────────────────────────────────────
if [ ! -d "$VENV_DIR" ]; then
  echo "  → Creating virtual environment…"
  python3 -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

# Install or upgrade deps if requirements.txt changed
echo "  → Checking dependencies…"
pip install -q -r "$BACKEND_DIR/requirements.txt"
echo "  ✓ Dependencies ready"

# ── Launch server ─────────────────────────────────────────────────────────────
echo "  → Launching server (ws://localhost:8765)…"
echo ""
python3 "$BACKEND_DIR/server.py"
