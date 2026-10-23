#!/usr/bin/env python3
"""Keep CI diagnostics local; allow only bounded short-lived installer transfers."""

from pathlib import Path
import re

root = Path(__file__).resolve().parents[2]
errors = []
for path in sorted((root / ".github").rglob("*")):
    if path.suffix not in {".yml", ".yaml"}:
        continue
    text = path.read_text()
    if re.search(r"uses:\s*actions/(?:upload-artifact|upload-pages-artifact)@", text):
        if (
            path.relative_to(root).as_posix()
            != ".github/actions/bounded-transfer/action.yml"
        ):
            errors.append(
                f"{path.relative_to(root)}: direct GitHub artifact upload is forbidden"
            )
        elif "retention-days: 1" not in text or "check-transfer.py" not in text:
            errors.append("Installer transfer must enforce size and one-day retention")
if errors:
    raise SystemExit("\n".join(errors))
print("Evidence policy passed: local diagnostics and bounded installer transfer only")
