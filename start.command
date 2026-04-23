#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate

python -m pip install --quiet --disable-pip-version-check -r requirements.txt

HOST="0.0.0.0"
PORT="8000"
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"

echo ""
echo "Offline Subtitle Studio"
echo "Starting server at http://127.0.0.1:${PORT}"
if [ -n "$LAN_IP" ]; then
  echo "LAN access        http://${LAN_IP}:${PORT}"
fi
echo ""

open "http://127.0.0.1:${PORT}"
exec python -m uvicorn app:app --host "$HOST" --port "$PORT"
