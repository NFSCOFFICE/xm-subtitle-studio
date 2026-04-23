@echo off
setlocal
cd /d %~dp0

py -m venv .venv-desktop
call .venv-desktop\Scripts\activate.bat
python -m pip install --upgrade pip
python -m pip install -r requirements-desktop.txt
python -m pip uninstall -y typing
pyinstaller --noconfirm desktop_app.spec

echo.
echo Windows desktop build ready:
echo dist\XM Subtitle Studio\
