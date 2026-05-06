# XM Subtitle Studio

本地离线字幕识别与交付工作台。拖入音频或视频，使用 Whisper large-v3 在本机完成转写，生成带时间码的字幕、文稿和可继续精修的时间轴草稿。

![License](https://img.shields.io/badge/license-MIT-7dd3fc)
![Whisper](https://img.shields.io/badge/Whisper-large--v3-60a5fa)
![Offline](https://img.shields.io/badge/runtime-local%20offline-34d399)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-94a3b8)

Repository: [github.com/NFSCOFFICE/xm-subtitle-studio](https://github.com/NFSCOFFICE/xm-subtitle-studio)

## Why

XM Subtitle Studio 面向需要稳定交付字幕的人，而不是普通上传页。

- 本地离线处理：媒体文件不需要上传到云端。
- 音频视频统一入口：MP3、WAV、M4A、MP4、MOV、MKV 等文件走同一套流程。
- 默认 high accuracy：默认使用 Whisper large-v3，优先保证识别质量。
- 声音锁定时间轴：用 VAD/波形检测把字幕开始和结束压回真实有声区间，减少静音时仍显示字幕。
- 交付友好：输出 SRT、VTT、TXT、JSON、ASS、Markdown、DOCX。
- 时间轴可编辑：识别完成后可直接精修字幕片段、时间码和内容。
- 任务可恢复：支持草稿、历史任务、产物下载和刷新后的任务恢复。

## Features

| Area | Capability |
| --- | --- |
| Recognition | Whisper 离线识别、自动语言检测、手动语言选择 |
| Media | 支持音频和视频导入，视频可进入实时预览 |
| Timeline | VAD 声音锁定、行内编辑、增删段、合并、拆分、区间播放 |
| Delivery | SRT、VTT、TXT、JSON、ASS、Markdown、DOCX、ZIP 一键保存到 Downloads |
| Quality Check | 扫描空字幕、时间重叠、过短过长、行长超限、可疑文本 |
| Enhancement | 双语字幕、说话人标记、断句优化 |
| Workflow | 批量转写、暂停轮询、任务筛选、ZIP 下载全部产物 |
| Desktop | macOS / Windows 桌面客户端封装 |

## Supported Formats

```text
Audio: MP3 / WAV / M4A / AAC / FLAC / OGG
Video: MP4 / MOV / MKV / WEBM / M4V / AVI
Export: SRT / VTT / TXT / JSON / ASS / Markdown / DOCX
```

## Quick Start

Clone the public repository:

```bash
git clone https://github.com/NFSCOFFICE/xm-subtitle-studio.git
cd xm-subtitle-studio
```

Run the web app on macOS / Linux:

```bash
python3 -m pip install -r requirements.txt
chmod +x run.sh
./run.sh
```

Windows one-command desktop start:

```bat
git clone https://github.com/NFSCOFFICE/xm-subtitle-studio.git
cd xm-subtitle-studio
start-win.bat
```

`start-win.bat` starts the desktop app directly. If `dist\XM Subtitle Studio\XM Subtitle Studio.exe` already exists, it launches that app. Otherwise it creates `.venv`, installs desktop dependencies, checks FFmpeg, downloads a local FFmpeg build into `vendor\ffmpeg` when needed, then opens the pywebview desktop window from source. The first recognition may download the selected Whisper model into `models\`.

For the web app, open:

```text
http://127.0.0.1:8000
```

The web startup script listens on `0.0.0.0`, so devices on the same local network can access:

```text
http://your-local-ip:8000
```

Allow Python through macOS or Windows Firewall if the system prompts you. The packaged desktop client still binds to `127.0.0.1` only.

## Desktop App

The desktop client wraps the FastAPI backend and the web UI with `pywebview`, then packages it with PyInstaller.

When release assets are available, users can download ready-to-use builds from:

[github.com/NFSCOFFICE/xm-subtitle-studio/releases](https://github.com/NFSCOFFICE/xm-subtitle-studio/releases)

### macOS

```bash
chmod +x build-mac.command
./build-mac.command
```

The macOS build script installs desktop dependencies, copies local FFmpeg / FFprobe into the app package, downloads `faster-whisper-large-v3` into `models/`, and packages the model with the app.

Output:

```text
dist/XM Subtitle Studio.app
release/XM-Subtitle-Studio-macOS.dmg
release/XM-Subtitle-Studio-macOS.zip
```

### Windows

Run on a Windows machine:

```bat
git clone https://github.com/NFSCOFFICE/xm-subtitle-studio.git
cd xm-subtitle-studio
build-win.bat
```

The Windows build script installs desktop dependencies, downloads FFmpeg / FFprobe when needed, downloads `faster-whisper-large-v3` into `models\`, and packages the model with the app.

Output:

```text
dist\XM Subtitle Studio\
release\XM-Subtitle-Studio-Windows.zip
```

## GitHub Release Builds

This repository includes a cross-platform workflow:

```text
.github/workflows/build-desktop.yml
```

Use it in either mode:

- Run `Build Desktop Clients` manually from GitHub Actions.
- Push a version tag such as `v0.1.0` to build and publish a GitHub Release.

```bash
git tag v0.1.0
git push origin v0.1.0
```

Artifacts:

- `XM-Subtitle-Studio-macOS.dmg`
- `XM-Subtitle-Studio-macOS.zip`
- `XM-Subtitle-Studio-Windows.zip`

Note: PyInstaller builds are platform-specific. Build macOS packages on macOS and Windows packages on Windows, or use GitHub Actions to generate both.

## Updates

Current desktop builds use manual updates:

1. Download the latest release package.
2. Replace the old app with the new version.
3. Existing local models, uploads, outputs, drafts, and history remain on the local machine.

Automatic update checks can be added later through GitHub Releases or a public `version.json` manifest.

## Download Behavior

- In a normal browser, download links keep working through the `/api/jobs/{id}/download/...` endpoints.
- In the packaged desktop app, download buttons call local save endpoints and copy files directly to the system Downloads folder.
- ZIP, SRT, VTT, TXT, JSON, ASS, Markdown, DOCX, and bilingual outputs use the original media filename as the export stem.
- If a file with the same name already exists in Downloads, the app appends `-1`, `-2`, etc. instead of overwriting.

## Offline Model Notes

- Source startup scripts download Whisper models into `models/` on first use.
- Desktop build scripts pre-download `faster-whisper-large-v3` and include it in the packaged app.
- Windows startup/build scripts can download FFmpeg into `vendor\ffmpeg` automatically if FFmpeg is not already installed.
- After models are downloaded, recognition can run offline.
- Translation and speaker features may download additional local models on first use.
- `large-v3` gives better accuracy, but first download and transcription are slower.
- Use a smaller model in the UI if speed matters more than accuracy.
- To protect first words, transcription adds a temporary `0.35s` lead-in silence and subtracts it from generated subtitle timecodes. Exports stay aligned to the original media.
- After Whisper returns timestamps, a VAD / waveform pass locks subtitle boundaries back to detected speech ranges so subtitles are less likely to appear over silence.

## Project Structure

```text
.
├── app.py                  # FastAPI backend and transcription pipeline
├── static/                 # Frontend UI
├── desktop_app.py          # Desktop wrapper entry
├── desktop_app.spec        # PyInstaller configuration
├── build-mac.command       # macOS desktop build script
├── build-win.bat           # Windows desktop build script
├── start-win.bat           # Windows one-command desktop startup script
├── scripts/                # Build helpers, including model preparation
├── requirements.txt        # Runtime dependencies
├── requirements-desktop.txt
├── uploads/                # Local imported media, ignored by git
├── outputs/                # Generated subtitles/docs, ignored by git
├── models/                 # Local model cache, ignored by git
├── vendor/                 # Optional local FFmpeg on Windows
└── data/                   # Local task drafts/history
```

## Privacy

XM Subtitle Studio is designed as a local-first tool. Imported media, generated subtitles, drafts, and model files stay on the local machine unless you manually upload or share them.

## License

[MIT License](./LICENSE)
