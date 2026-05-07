@echo off
setlocal enabledelayedexpansion
cd /d %~dp0

set "APP_EXE=%CD%\dist\XM Subtitle Studio\XM Subtitle Studio.exe"
set "FFMPEG_DIR=%CD%\vendor\ffmpeg"
set "FFMPEG_BIN=%FFMPEG_DIR%\bin"
set "FFMPEG_EXE=%FFMPEG_BIN%\ffmpeg.exe"
set "FFPROBE_EXE=%FFMPEG_BIN%\ffprobe.exe"
set "FFMPEG_ZIP=%TEMP%\xm-ffmpeg.zip"
set "FFMPEG_URL=https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
set "FFMPEG_FALLBACK_URL=https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"

where py >nul 2>nul
if errorlevel 1 (
  echo Python launcher "py" was not found. Please install Python 3.10+ first.
  pause
  exit /b 1
)

py -c "import sys; raise SystemExit(0 if (3, 10) <= sys.version_info[:2] <= (3, 12) else 1)"
if errorlevel 1 (
  echo Python 3.10, 3.11, or 3.12 is required. Python 3.13 or newer is not supported by the current local AI stack.
  pause
  exit /b 1
)

if exist "%APP_EXE%" (
  echo Starting XM Subtitle Studio desktop app...
  start "" "%APP_EXE%"
  exit /b 0
)

if not exist ".venv\Scripts\python.exe" (
  echo Creating Python virtual environment...
  py -m venv .venv
)

call .venv\Scripts\activate.bat
python -c "import sys; raise SystemExit(0 if (3, 10) <= sys.version_info[:2] <= (3, 12) else 1)"
if errorlevel 1 (
  echo The existing .venv uses an unsupported Python version. Delete .venv and rerun this script with Python 3.10, 3.11, or 3.12.
  pause
  exit /b 1
)

echo Installing Python dependencies...
python -m pip install --upgrade pip
if errorlevel 1 (
  echo Failed to upgrade pip.
  pause
  exit /b 1
)
python -m pip install -r requirements-desktop-win.txt
if errorlevel 1 (
  echo Failed to install Python dependencies. Keep this window open and send the error above.
  pause
  exit /b 1
)

where ffmpeg >nul 2>nul
set "HAS_SYSTEM_FFMPEG=%ERRORLEVEL%"
where ffprobe >nul 2>nul
set "HAS_SYSTEM_FFPROBE=%ERRORLEVEL%"

if not exist "%FFMPEG_EXE%" (
  if not "%HAS_SYSTEM_FFMPEG%"=="0" (
    echo FFmpeg not found. Downloading local FFmpeg package...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$ErrorActionPreference='Stop';" ^
      "$urls=@('%FFMPEG_URL%','%FFMPEG_FALLBACK_URL%');" ^
      "$ok=$false;" ^
      "foreach($url in $urls){try{Write-Host ('Downloading FFmpeg from ' + $url); Invoke-WebRequest -Uri $url -OutFile '%FFMPEG_ZIP%' -UseBasicParsing; $ok=$true; break}catch{Write-Host ('Download failed: ' + $_.Exception.Message)}};" ^
      "if(-not $ok){throw 'Unable to download FFmpeg from all mirrors.'};" ^
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
echo XM Subtitle Studio desktop app is starting...
echo This command opens the native desktop window, not the browser page.
echo.

python desktop_app.py
if errorlevel 1 (
  echo.
  echo XM Subtitle Studio failed to start. Keep this window open and send the error above.
  pause
  exit /b 1
)
