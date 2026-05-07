#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

python3 - <<'PY'
import sys

if not ((3, 10) <= sys.version_info[:2] <= (3, 12)):
    raise SystemExit("Python 3.10, 3.11, or 3.12 is required. Python 3.13 or newer is not supported by the current local AI stack.")
PY

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
python - <<'PY'
import sys

if not ((3, 10) <= sys.version_info[:2] <= (3, 12)):
    raise SystemExit("The existing .venv uses an unsupported Python version. Delete .venv and rerun this script with Python 3.10, 3.11, or 3.12.")
PY

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
