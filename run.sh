#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
