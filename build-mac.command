#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

python3 -m venv .venv-desktop
source .venv-desktop/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-desktop.txt
pyinstaller --noconfirm desktop_app.spec

echo ""
echo "macOS desktop build ready:"
echo "dist/XM Subtitle Studio/"
