#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

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
python scripts/ensure_large_v3_model.py
pyinstaller --noconfirm desktop_app.spec

echo ""
echo "macOS desktop build ready:"
echo "dist/XM Subtitle Studio/"
