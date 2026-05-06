from __future__ import annotations

import multiprocessing
import os
import socket
import sys
import threading
import time
from pathlib import Path

import uvicorn
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


def wait_for_server(port: int, timeout: float = 15.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.5):
                return
        except OSError:
            time.sleep(0.1)
    raise RuntimeError("Desktop server failed to start in time.")


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
    webview.start()
    lock_file.close()


if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()
