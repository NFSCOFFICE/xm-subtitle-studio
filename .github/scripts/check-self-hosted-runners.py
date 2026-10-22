"""Reject hosted compute, unknown execution zones, and unsupported native builds."""

import json
from pathlib import Path
import yaml

root = Path(__file__).resolve().parents[2]
policy = json.loads((root / ".github/runner-policy.json").read_text())
errors = []
count = 0
for path in sorted((root / ".github/workflows").glob("*.y*ml")):
    workflow = yaml.load(path.read_text(), Loader=yaml.BaseLoader)
    for name, job in workflow.get("jobs", {}).items():
        count += 1
        where = f"{path.name}:{name}"
        if "uses" in job:
            if not job["uses"].startswith("./.github/workflows/"):
                errors.append(
                    f"{where}: external workflow has no verified runner policy"
                )
            continue
        labels = job.get("runs-on")
        if not isinstance(labels, list) or len(labels) != 4:
            errors.append(
                f"{where}: an explicit self-hosted OS/architecture/zone is required"
            )
            continue
        if (
            labels[0] != "self-hosted"
            or labels[2] != "X64"
            or labels[3] not in (policy["ci_label"], policy["deploy_label"])
        ):
            errors.append(f"{where}: unapproved runner labels {labels}")
        if labels[1] in ("macOS", "Windows"):
            flag = (
                "SELF_HOSTED_MACOS_ENABLED"
                if labels[1] == "macOS"
                else "SELF_HOSTED_WINDOWS_ENABLED"
            )
            if f"vars.{flag} == 'true'" not in job.get("if", ""):
                errors.append(
                    f"{where}: native builds must remain paused until matching runners exist"
                )
        elif labels[1] != "Linux":
            errors.append(f"{where}: unapproved OS {labels[1]}")
        if (
            labels[3] == policy["deploy_label"]
            and labels[1] == "Linux"
            and "github.ref == 'refs/heads/main'" not in job.get("if", "")
        ):
            errors.append(
                f"{where}: deployment credentials require the trusted main branch"
            )
if errors:
    raise SystemExit("\n".join(errors))
print(f"Verified {count} jobs: self-hosted only; unsupported native builds paused")
