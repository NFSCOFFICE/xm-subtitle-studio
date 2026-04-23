@echo off
setlocal enabledelayedexpansion
cd /d %~dp0

set "FFMPEG_DIR=%CD%\vendor\ffmpeg"
set "FFMPEG_BIN=%FFMPEG_DIR%\bin"
set "FFMPEG_EXE=%FFMPEG_BIN%\ffmpeg.exe"
set "FFPROBE_EXE=%FFMPEG_BIN%\ffprobe.exe"
set "FFMPEG_ZIP=%TEMP%\xm-ffmpeg.zip"
set "FFMPEG_URL=https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"

where py >nul 2>nul
if errorlevel 1 (
  echo Python launcher "py" was not found. Please install Python 3.10+ first.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Creating Python virtual environment...
  py -m venv .venv
)

call .venv\Scripts\activate.bat

echo Installing Python dependencies...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

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
      pause
      exit /b 1
    )
  )
)

if exist "%FFMPEG_BIN%" (
  set "PATH=%FFMPEG_BIN%;%PATH%"
)

where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo FFmpeg is still unavailable. Please install FFmpeg and add it to PATH.
  pause
  exit /b 1
)

where ffprobe >nul 2>nul
if errorlevel 1 (
  echo FFprobe is still unavailable. Please install FFmpeg and add it to PATH.
  pause
  exit /b 1
)

echo.
echo XM Subtitle Studio is starting...
echo Open http://127.0.0.1:8000 if the browser does not open automatically.
echo.

start "" http://127.0.0.1:8000
python -m uvicorn app:app --host 127.0.0.1 --port 8000
