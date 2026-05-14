from __future__ import annotations

from pathlib import Path

from huggingface_hub import snapshot_download


MODEL_REPO = "Systran/faster-whisper-large-v3"
MODEL_DIR = Path(__file__).resolve().parents[1] / "models"


def main() -> None:
    local_dir = MODEL_DIR / MODEL_REPO.split("/")[-1]
    local_dir.mkdir(parents=True, exist_ok=True)
    # local_dir avoids the HF cache blob+symlink layout, which fails on
    # Windows without SeCreateSymbolicLinkPrivilege (WinError 1314).
    snapshot_download(
        repo_id=MODEL_REPO,
        local_dir=str(local_dir),
        local_files_only=False,
    )
    print(f"large-v3 model ready under {local_dir}")


if __name__ == "__main__":
    main()
