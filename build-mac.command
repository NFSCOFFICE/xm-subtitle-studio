#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

python3 - <<'PY'
import sys

if not ((3, 10) <= sys.version_info[:2] <= (3, 12)):
    raise SystemExit("Python 3.10, 3.11, or 3.12 is required. Python 3.13 or newer is not supported by the current local AI stack.")
PY

if command -v ffmpeg >/dev/null 2>&1 && command -v ffprobe >/dev/null 2>&1; then
  mkdir -p vendor/ffmpeg/bin
  cp -fL "$(command -v ffmpeg)" vendor/ffmpeg/bin/ffmpeg
  cp -fL "$(command -v ffprobe)" vendor/ffmpeg/bin/ffprobe
  chmod +x vendor/ffmpeg/bin/ffmpeg vendor/ffmpeg/bin/ffprobe
fi

python3 -m venv .venv-desktop
source .venv-desktop/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-desktop.txt
python -m pip uninstall -y typing || true
pyinstaller --noconfirm desktop_app.spec

echo ""
echo "macOS desktop build ready:"
echo "dist/XM Subtitle Studio/"
