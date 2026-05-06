from __future__ import annotations

from pathlib import Path

from huggingface_hub import snapshot_download


MODEL_REPO = "Systran/faster-whisper-large-v3"
MODEL_DIR = Path(__file__).resolve().parents[1] / "models"


def main() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    snapshot_download(
        repo_id=MODEL_REPO,
        cache_dir=str(MODEL_DIR),
        local_files_only=False,
    )
    print(f"large-v3 model ready under {MODEL_DIR}")


if __name__ == "__main__":
    main()
