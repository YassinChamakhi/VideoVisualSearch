#!/usr/bin/env bash
# start.sh — convenience script to launch both backend and frontend
# Usage: ./start.sh

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "╔════════════════════════════════════════╗"
echo "║     Video Visual Search  v1.0.0        ║"
echo "╚════════════════════════════════════════╝"
echo ""

# ── Backend ──────────────────────────────────────────────────────────────────
echo "▶  Starting backend (FastAPI on :8000)…"
cd "$ROOT/backend"

if [ ! -d ".venv" ]; then
  echo "   Creating Python virtual environment…"
  python3 -m venv .venv
fi

source .venv/bin/activate

echo "   Installing Python dependencies…"
pip install -q -r requirements.txt

echo "   Launching uvicorn…"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# ── Frontend ─────────────────────────────────────────────────────────────────
echo ""
echo "▶  Starting frontend (React on :3000)…"
cd "$ROOT/frontend"

if [ ! -d "node_modules" ]; then
  echo "   Installing Node dependencies…"
  npm install --silent
fi

echo "   Launching React dev server…"
npm start &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# ── Cleanup on exit ───────────────────────────────────────────────────────────
trap "echo ''; echo 'Shutting down…'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

echo ""
echo "════════════════════════════════════════════"
echo "  Backend  → http://localhost:8000"
echo "  Frontend → http://localhost:3000"
echo "  API docs → http://localhost:8000/docs"
echo "  Press Ctrl+C to stop both servers"
echo "════════════════════════════════════════════"
echo ""

wait
