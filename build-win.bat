@echo off
setlocal enabledelayedexpansion
cd /d %~dp0

set "FFMPEG_DIR=%CD%\vendor\ffmpeg"
set "FFMPEG_BIN=%FFMPEG_DIR%\bin"
set "FFMPEG_EXE=%FFMPEG_BIN%\ffmpeg.exe"
set "FFPROBE_EXE=%FFMPEG_BIN%\ffprobe.exe"
set "FFMPEG_ZIP=%TEMP%\xm-ffmpeg.zip"
set "FFMPEG_URL=https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"

python -m venv .venv-desktop
call .venv-desktop\Scripts\activate.bat
python -m pip install --upgrade pip
python -m pip install -r requirements-desktop.txt
python -m pip uninstall -y typing

where ffmpeg >nul 2>nul
set "HAS_SYSTEM_FFMPEG=%ERRORLEVEL%"
where ffprobe >nul 2>nul
set "HAS_SYSTEM_FFPROBE=%ERRORLEVEL%"

if not exist "%FFMPEG_EXE%" (
  if not "%HAS_SYSTEM_FFMPEG%"=="0" (
    echo FFmpeg not found. Downloading local FFmpeg package...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$ErrorActionPreference='Stop';" ^
      "Invoke-WebRequest -Uri '%FFMPEG_URL%' -OutFile '%FFMPEG_ZIP%';" ^
      "New-Item -ItemType Directory -Force -Path '%FFMPEG_DIR%' | Out-Null;" ^
      "$tmp = Join-Path $env:TEMP ('xm-ffmpeg-' + [guid]::NewGuid());" ^
      "Expand-Archive -Path '%FFMPEG_ZIP%' -DestinationPath $tmp -Force;" ^
      "$root = Get-ChildItem -Path $tmp -Directory | Select-Object -First 1;" ^
      "Copy-Item -Path (Join-Path $root.FullName '*') -Destination '%FFMPEG_DIR%' -Recurse -Force;" ^
      "Remove-Item -Path $tmp -Recurse -Force;"
    if errorlevel 1 (
      echo Failed to download FFmpeg. Install FFmpeg manually or check your network.
      exit /b 1
    )
  )
)

if exist "%FFMPEG_BIN%" (
  set "PATH=%FFMPEG_BIN%;%PATH%"
)

where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo FFmpeg is unavailable. Please install FFmpeg and add it to PATH.
  exit /b 1
)

where ffprobe >nul 2>nul
if errorlevel 1 (
  echo FFprobe is unavailable. Please install FFmpeg and add it to PATH.
  exit /b 1
)

python scripts\ensure_large_v3_model.py
pyinstaller --noconfirm desktop_app.spec

echo.
echo Windows desktop build ready:
echo dist\XM Subtitle Studio\
