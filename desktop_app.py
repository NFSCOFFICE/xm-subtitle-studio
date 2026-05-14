from __future__ import annotations

import multiprocessing
import os
import socket
import sys
import threading
import time
from pathlib import Path

import uvicorn

SERVER_ERROR: Exception | None = None


def configure_windows_rendering() -> None:
    if not sys.platform.startswith("win"):
        return

    # Qt WebEngine can flicker on some Windows GPU/driver combinations when a
    # page uses gradients, blur and video layers. Force a conservative rendering
    # path before pywebview imports Qt.
    os.environ.setdefault("QT_OPENGL", "software")
    os.environ.setdefault("QT_ANGLE_PLATFORM", "warp")
    os.environ.setdefault("QTWEBENGINE_DISABLE_GPU", "1")

    flags = [
        "--disable-gpu",
        "--disable-gpu-compositing",
        "--disable-features=CalculateNativeWinOcclusion",
    ]
    existing = os.environ.get("QTWEBENGINE_CHROMIUM_FLAGS", "").strip()
    merged = " ".join([existing, *flags]).strip()
    os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = merged


configure_windows_rendering()

import webview


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        sock.listen(1)
        return int(sock.getsockname()[1])


def app_support_dir() -> Path:
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / "XM Subtitle Studio"
    if sys.platform.startswith("win"):
        root = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
        if root:
            return Path(root) / "XM Subtitle Studio"
    return Path.home() / ".xm-subtitle-studio"


def acquire_single_instance_lock():
    lock_dir = app_support_dir()
    lock_dir.mkdir(parents=True, exist_ok=True)
    lock_file = (lock_dir / "app.lock").open("w")
    if sys.platform.startswith("win"):
        import msvcrt

        try:
            msvcrt.locking(lock_file.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError:
            return None
    else:
        import fcntl

        try:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return None
    lock_file.write(str(os.getpid()))
    lock_file.flush()
    return lock_file


def run_server(port: int) -> None:
    global SERVER_ERROR
    try:
        from app import app

        config = uvicorn.Config(
            app,
            host="127.0.0.1",
            port=port,
            log_level="warning",
            access_log=False,
        )
        server = uvicorn.Server(config)
        server.run()
    except Exception as exc:
        SERVER_ERROR = exc
        raise


def wait_for_server(port: int, timeout: float = 60.0) -> None:
    started = time.time()
    deadline = started + timeout
    while time.time() < deadline:
        if SERVER_ERROR is not None:
            raise RuntimeError(f"Desktop server failed to start: {SERVER_ERROR}") from SERVER_ERROR
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.5):
                return
        except OSError:
            time.sleep(0.1)
    elapsed = time.time() - started
    raise RuntimeError(
        f"Desktop server failed to start in time (waited {elapsed:.1f}s, timeout {timeout:.0f}s)."
    )


def main() -> None:
    lock_file = acquire_single_instance_lock()
    if lock_file is None:
        return

    port = find_free_port()
    thread = threading.Thread(target=run_server, args=(port,), daemon=True)
    thread.start()
    wait_for_server(port)

    webview.create_window(
        "XM Subtitle Studio",
        f"http://127.0.0.1:{port}",
        min_size=(1280, 820),
        text_select=True,
    )
    if sys.platform.startswith("win"):
        if getattr(sys, "frozen", False):
            # Frozen Windows builds: pythonnet-backed backends can fail to
            # resolve Python.Runtime.dll after PyInstaller collection. Qt is
            # self-contained through PySide6.
            webview.start(gui="qt")
        else:
            # Source runs: prefer Edge WebView2. PySide6's QtWebEngine pip
            # wheel ships without proprietary codecs, so H.264/MP4 preview
            # comes back as a black frame under the qt backend.
            webview.start(gui="edgechromium")
    else:
        webview.start()
    lock_file.close()


if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()
