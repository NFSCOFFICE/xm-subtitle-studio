#!/usr/bin/env python3
"""Bounded, private CI diagnostics. Never consumed as release authorization.

The administrator provisions the persistent root. Jobs publish archives with write-once identities
under a lock; an unprivileged maintenance service applies TTL and disk budgets.
GitHub's job summary records the archive hash, not the report contents.
"""

from __future__ import annotations

import argparse
import contextlib
import fcntl
import hashlib
import itertools
import json
import os
import re
import shutil
import stat
import tempfile
import time
import zipfile
from pathlib import Path

MAX_BYTES = 32 * 1024 * 1024
MAX_FILES = 202  # Existing B2B producer: 200 diagnostics plus two metadata files.
MAX_STORE_BYTES = 1 * 1024 * 1024 * 1024
MIN_FREE_BYTES = 40 * 1024 * 1024 * 1024
SAFE = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,199}\Z")


def component(value: str) -> str:
    if not SAFE.fullmatch(value) or value in {".", ".."}:
        raise ValueError("Unsafe evidence identity")
    return value


def checked_root(root: Path) -> Path:
    if not root.is_absolute() or root.is_symlink() or not root.is_dir():
        raise ValueError(
            "Evidence root must be an existing absolute directory provisioned by the administrator"
        )
    if root != root.resolve():
        raise ValueError("Evidence root must not contain symlink components")
    if root.stat().st_uid != os.geteuid():
        raise ValueError("Evidence root must belong to the unprivileged CI account")
    if root.stat().st_mode & 0o077:
        raise ValueError("Evidence root must be private (mode 0700)")
    return root


@contextlib.contextmanager
def locked(root: Path):
    fd = os.open(root / ".lock", os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        yield
    finally:
        os.close(fd)


def select_files(
    workspace: Path, patterns: str, runner_temp: Path | None = None
) -> list[Path]:
    workspace = workspace.resolve()
    roots = [workspace] + ([runner_temp.resolve()] if runner_temp is not None else [])
    selected: set[Path] = set()
    for pattern in patterns.splitlines():
        pattern = pattern.strip()
        if not pattern:
            continue
        p = Path(pattern)
        if ".." in p.parts or pattern.startswith("!"):
            raise ValueError(
                "Evidence inputs must remain within the workspace or runner temp"
            )
        base = workspace
        if p.is_absolute():
            matches = [r for r in roots if p.is_relative_to(r)]
            if not matches:
                raise ValueError("Evidence input is outside allowed roots")
            base = max(matches, key=lambda r: len(r.parts))
            pattern = str(p.relative_to(base))
        for candidate in base.glob(pattern):
            candidates = (
                itertools.chain([candidate], candidate.rglob("*"))
                if candidate.is_dir()
                else [candidate]
            )
            for item in candidates:
                relative = item.relative_to(base)
                if any(part.startswith(".") for part in relative.parts):
                    raise ValueError("Hidden evidence input is not allowed")
                if (
                    item.is_symlink()
                    or item.resolve() != item
                    or not item.resolve().is_relative_to(base)
                ):
                    raise ValueError("Symlink evidence input is not allowed")
                mode = item.lstat().st_mode
                if stat.S_ISDIR(mode):
                    continue
                if not stat.S_ISREG(mode):
                    raise ValueError("Evidence must contain regular files only")
                selected.add(item)
                if len(selected) > MAX_FILES:
                    raise ValueError("Evidence file count exceeds limit")
    return sorted(selected)


def open_source(path: Path):
    # Walk every component with openat/O_NOFOLLOW, including parents, to close
    # the validation/open symlink-swap race. No root privileges are involved.
    parent = os.open("/", os.O_RDONLY | os.O_DIRECTORY)
    try:
        for part in path.parts[1:-1]:
            child = os.open(
                part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=parent
            )
            os.close(parent)
            parent = child
        return os.open(
            path.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent
        )
    finally:
        os.close(parent)


def record_dirs(root: Path):
    # Flat, strictly named records; never follow a job-created symlink.
    for path in sorted(root.iterdir()):
        if not re.fullmatch(r"e-[a-f0-9]{64}", path.name):
            continue
        if path.is_symlink() or not path.is_dir():
            raise ValueError("Unsafe evidence record")
        yield path


def prune(root: Path, now: float, max_bytes: int = MAX_STORE_BYTES) -> dict[str, int]:
    # Caller holds the global lock: no conforming publisher can own a pending
    # stage now, so these are leftovers from interrupted jobs.
    for pending in root.iterdir():
        if not re.fullmatch(r"\.pending-[a-z0-9_]{8}", pending.name):
            continue
        if pending.is_symlink() or not pending.is_dir():
            raise ValueError("Unsafe pending evidence stage")
        if any(
            p.is_symlink()
            or not p.is_file()
            or p.name not in {"archive.zip", "receipt.json"}
            for p in pending.iterdir()
        ):
            raise ValueError("Unexpected pending evidence contents")
        shutil.rmtree(pending)
    rows = []
    for path in record_dirs(root):
        children = list(path.iterdir())
        if {p.name for p in children} != {"archive.zip", "receipt.json"}:
            raise ValueError("Unexpected evidence record contents")
        if any(p.is_symlink() or not p.is_file() for p in children):
            raise ValueError("Unsafe evidence record contents")
        if (path / "receipt.json").stat().st_size > 256 * 1024:
            raise ValueError("Evidence receipt exceeds limit")
        receipt = json.loads((path / "receipt.json").read_text())
        days = receipt["retention_days"]
        created = receipt["created_at"]
        if (
            type(days) is not int
            or not 1 <= days <= 7
            or not isinstance(created, (int, float))
            or not 0 < created <= now
        ):
            raise ValueError("Invalid evidence retention metadata")
        rows.append(
            (
                created,
                created + days * 86400,
                sum(p.stat().st_size for p in children),
                path,
            )
        )
    total = sum(row[2] for row in rows)
    removed = 0
    for _, expiry, size, path in sorted(rows):
        if expiry <= now or total > max_bytes:
            # Root is private to the unprivileged CI account. No privileged cleanup.
            shutil.rmtree(path)
            total -= size
            removed += 1
    return {"removed": removed, "retained_bytes": total}


def publish(root: Path, workspace: Path, env: dict[str, str]) -> dict:
    checked_root(root)
    identity = {
        key: env[key]
        for key in (
            "GITHUB_REPOSITORY",
            "GITHUB_RUN_ID",
            "GITHUB_RUN_ATTEMPT",
            "GITHUB_JOB",
            "GITHUB_SHA",
            "RUNNER_NAME",
            "EVIDENCE_NAME",
        )
    }
    for key, value in identity.items():
        if key == "GITHUB_REPOSITORY":
            parts = value.split("/")
            if len(parts) != 2:
                raise ValueError("Invalid repository")
            for part in parts:
                component(part)
        else:
            component(value)
    days = int(env["EVIDENCE_RETENTION_DAYS"])
    if not 1 <= days <= 7:
        raise ValueError("Retention must be between 1 and 7 days")
    runner_temp = Path(env["RUNNER_TEMP"]) if env.get("RUNNER_TEMP") else None
    files = select_files(workspace, env["EVIDENCE_PATHS"], runner_temp)
    if not files:
        if env.get("EVIDENCE_MISSING") == "warn":
            return {"missing": True}
        raise ValueError("Required evidence is missing")
    key = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
    destination = root / ("e-" + key)
    workspace = workspace.resolve()
    with locked(root):
        if destination.exists() or destination.is_symlink():
            raise ValueError("Evidence identity already exists; refusing overwrite")
        prune(root, time.time(), max_bytes=MAX_STORE_BYTES - MAX_BYTES - 1024 * 1024)
        total = sum(p.stat().st_size for d in record_dirs(root) for p in d.iterdir())
        if (
            total + MAX_BYTES + 1024 * 1024 > MAX_STORE_BYTES
            or shutil.disk_usage(root).free < MIN_FREE_BYTES + MAX_BYTES
        ):
            raise ValueError("Insufficient evidence disk budget or free space")
        stage = Path(tempfile.mkdtemp(prefix=".pending-", dir=root))
        try:
            entries = []
            count = 0
            archive = stage / "archive.zip"
            with zipfile.ZipFile(
                archive, "x", compression=zipfile.ZIP_DEFLATED
            ) as output:
                for path in files:
                    fd = open_source(path)
                    with os.fdopen(fd, "rb") as source:
                        info = os.fstat(source.fileno())
                        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
                            raise ValueError(
                                "Evidence must be a regular file without hard links"
                            )
                        content = source.read(MAX_BYTES - count + 1)
                    count += len(content)
                    if count > MAX_BYTES:
                        raise ValueError("Evidence size exceeds limit")
                    relative = (
                        "workspace/" + path.relative_to(workspace).as_posix()
                        if path.is_relative_to(workspace)
                        else "runner-temp/"
                        + path.relative_to(runner_temp.resolve()).as_posix()
                    )
                    output.writestr(relative, content)
                    entries.append(
                        {
                            "path": relative,
                            "bytes": len(content),
                            "sha256": hashlib.sha256(content).hexdigest(),
                        }
                    )
            os.chmod(archive, 0o600)
            receipt = {
                "version": 1,
                "identity": identity,
                "created_at": time.time(),
                "retention_days": days,
                "sha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
                "files": entries,
            }
            (stage / "receipt.json").write_text(
                json.dumps(receipt, sort_keys=True, indent=2) + "\n"
            )
            os.chmod(stage / "receipt.json", 0o600)
            for child in stage.iterdir():
                with child.open("rb") as handle:
                    os.fsync(handle.fileno())
            stage.rename(destination)
            parent_fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY)
            try:
                os.fsync(parent_fd)
            finally:
                os.close(parent_fd)
        finally:
            if stage.exists():
                shutil.rmtree(stage)
    return {
        "archive": str(destination / "archive.zip"),
        "sha256": receipt["sha256"],
        "files": len(entries),
        "bytes": count,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("publish", "prune"))
    args = parser.parse_args()
    root = checked_root(
        Path(
            os.environ.get(
                "CI_EVIDENCE_ROOT", "/var/lib/gha-evidence/xm-subtitle-studio"
            )
        )
    )
    if args.command == "prune":
        with locked(root):
            print(json.dumps(prune(root, time.time())))
        return 0
    result = publish(root, Path(os.environ["GITHUB_WORKSPACE"]), dict(os.environ))
    if result.get("missing"):
        print("::warning::No optional evidence files found")
        return 0
    with open(os.environ["GITHUB_OUTPUT"], "a") as handle:
        handle.write(f"archive={result['archive']}\nsha256={result['sha256']}\n")
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as handle:
        handle.write("\n### Evidence saved on the CI host\n\n")
        handle.write(f"Runner: `{component(os.environ['RUNNER_NAME'])}`\n\n")
        handle.write(
            f"Archive: `{result['archive']}`\n\nSHA256: `{result['sha256']}`\n\n"
        )
        handle.write(
            f"Files: {result['files']}; uncompressed bytes: {result['bytes']}. Retrieve through administrator SSH; verify this hash before inspection.\n"
        )
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
