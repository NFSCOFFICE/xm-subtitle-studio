# XM Subtitle Studio

本地离线媒体转字幕工具，带前端拖拽界面。

## 功能

- 拖入音频或视频文件生成 `.srt`
- 支持 `mp3`、`wav`、`m4a`、`aac`、`flac`、`ogg`、`mp4`、`mov`、`mkv`、`webm`、`m4v`、`avi`
- Whisper 离线识别
- 自动识别语言，也可手动指定
- 支持批量转写
- 输出 `srt / vtt / txt / json`
- 逐字稿导出 `Markdown / DOCX`
- 可选双语字幕导出
- 可选说话人分离（实验性）
- 可选字幕断句优化（推荐开启）
- 可直接编辑时间轴并保存

## 启动

```bash
python3 -m pip install -r requirements.txt
chmod +x run.sh
./run.sh
```

浏览器打开：

```text
http://127.0.0.1:8000
```

同一局域网设备也可以访问：

```text
http://你的本机局域网IP:8000
```

例如当前机器可用：

```text
http://192.168.1.111:8000
```

## 说明

- 第一次运行会下载 Whisper 模型到 `models/`，之后可离线使用。
- 如果开启双语导出，第一次也会下载本地翻译模型。
- 如果开启说话人分离，第一次也会初始化本地说话人嵌入模型。
- 上传的媒体文件保存在 `uploads/`
- 生成的字幕保存在 `outputs/`
- 如需局域网访问，请确保 macOS 防火墙允许 Python 接收传入连接
- 默认使用 `large-v3`，准确率更高，但首次下载和转写都会更慢
- 如果你更在意速度，也可以在界面里切回 `small` 或 `medium`

## 桌面客户端

这个项目已经补了桌面封装入口，可打包成 macOS 和 Windows 客户端，用户可以直接下载后双击使用。

### 自动生成下载包

GitHub Actions 已配置跨平台构建：

- 手动运行 `Build Desktop Clients` workflow，可下载 macOS / Windows artifacts
- 推送 `v*` 标签时会自动创建 GitHub Release
- macOS 产物：`XM-Subtitle-Studio-macOS.dmg` / `.zip`
- Windows 产物：`XM-Subtitle-Studio-Windows.zip`

发布新版本示例：

```bash
git tag v0.1.0
git push origin v0.1.0
```

### macOS 打包

```bash
chmod +x build-mac.command
./build-mac.command
```

产物目录：

```text
dist/XM Subtitle Studio.app
```

### Windows 打包

在 Windows 机器上执行：

```bat
build-win.bat
```

产物目录：

```text
dist\XM Subtitle Studio\
```

### 说明

- 桌面端使用 `pywebview + FastAPI + PyInstaller`
- macOS 包建议在 macOS 上构建，Windows 包建议在 Windows 上构建
- 如果你要放到 GitHub Releases，最直接的方式就是把 `dist/` 里的产物压缩后上传
- 首次运行仍然会在本地下载模型到 `models/`
- 用户数据、上传文件、输出文件会保存在客户端目录旁边的 `data/`、`uploads/`、`outputs/`

## 开源协议

本项目使用 [MIT License](./LICENSE)。
