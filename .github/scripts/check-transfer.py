#!/usr/bin/env python3
"""Validate installer transfers before contacting GitHub artifact storage."""

import os
from pathlib import Path

MAX_BYTES = 128 * 1024 * 1024
workspace = Path(os.environ["GITHUB_WORKSPACE"]).resolve()
files = set()
for pattern in os.environ["TRANSFER_PATHS"].splitlines():
    pattern = pattern.strip()
    if (
        not pattern
        or Path(pattern).is_absolute()
        or ".." in Path(pattern).parts
        or pattern.startswith("!")
    ):
        raise SystemExit("Installer patterns must stay within the workspace")
    for p in workspace.glob(pattern):
        if (
            p.is_symlink()
            or p.resolve() != p
            or not p.is_file()
            or p.suffix.lower() not in {".ipa", ".apk", ".aab", ".dmg", ".zip"}
        ):
            raise SystemExit("Only regular installer files may be transferred")
        files.add(p)
if not files or len(files) > 4 or sum(p.stat().st_size for p in files) > MAX_BYTES:
    raise SystemExit("Installer transfer requires 1-4 files and at most 128 MiB total")
print(f"Installer transfer validated: {len(files)} files; one-day retention")
