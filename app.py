from __future__ import annotations

import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import tempfile
import uuid
import zipfile
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass, field, fields
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Dict, List, Optional

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from faster_whisper import WhisperModel
from docx import Document
from resemblyzer import VoiceEncoder, preprocess_wav
from sklearn.cluster import AgglomerativeClustering
from transformers import pipeline


SOURCE_DIR = Path(__file__).resolve().parent
if getattr(sys, "frozen", False):
    APP_DIR = Path(sys.executable).resolve().parent
    RESOURCE_DIR = Path(getattr(sys, "_MEIPASS", APP_DIR))
else:
    APP_DIR = SOURCE_DIR
    RESOURCE_DIR = SOURCE_DIR

STATIC_DIR = RESOURCE_DIR / "static"
UPLOAD_DIR = APP_DIR / "uploads"
OUTPUT_DIR = APP_DIR / "outputs"
MODEL_DIR = APP_DIR / "models"
DATA_DIR = APP_DIR / "data"
JOB_STORE_PATH = DATA_DIR / "jobs.json"
VENDOR_FFMPEG_BIN = APP_DIR / "vendor" / "ffmpeg" / "bin"
ALLOWED_SUFFIXES = {
    ".mp3",
    ".wav",
    ".m4a",
    ".aac",
    ".flac",
    ".ogg",
    ".mp4",
    ".mov",
    ".mkv",
    ".webm",
    ".m4v",
    ".avi",
}
VIDEO_SUFFIXES = {".mp4", ".mov", ".mkv", ".webm", ".m4v", ".avi"}
SUPPORTED_MEDIA_LABEL = ", ".join(sorted(suffix.lstrip(".") for suffix in ALLOWED_SUFFIXES))

for directory in (STATIC_DIR, UPLOAD_DIR, OUTPUT_DIR, MODEL_DIR, DATA_DIR):
    directory.mkdir(parents=True, exist_ok=True)

if VENDOR_FFMPEG_BIN.exists():
    os_path = str(VENDOR_FFMPEG_BIN)
    path_parts = os.environ.get("PATH", "").split(os.pathsep)
    if os_path not in path_parts:
        os.environ["PATH"] = os_path + os.pathsep + os.environ.get("PATH", "")


@dataclass
class JobState:
    job_id: str
    filename: str
    original_name: str
    language: str
    model_size: str
    translate_to: str
    diarization: bool
    speaker_count: str
    smart_split: bool
    ass_style: str
    status: str = "queued"
    progress: float = 0.0
    message: str = "Waiting to start"
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    detected_language: Optional[str] = None
    srt_path: Optional[str] = None
    outputs: Dict[str, str] = field(default_factory=dict)
    segments: List[dict] = field(default_factory=list)
    draft_segments: List[dict] = field(default_factory=list)
    draft_updated_at: Optional[str] = None
    error: Optional[str] = None


app = FastAPI(title="Offline Subtitle Studio")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

jobs: Dict[str, JobState] = {}
jobs_lock = Lock()
executor = ThreadPoolExecutor(max_workers=1)
_model_cache: Dict[str, WhisperModel] = {}
_model_lock = Lock()
_translator_cache: Dict[str, object] = {}
_translator_lock = Lock()
_speaker_encoder: Optional[VoiceEncoder] = None
_speaker_encoder_lock = Lock()

TRANSLATION_MODELS = {
    ("zh", "en"): "Helsinki-NLP/opus-mt-zh-en",
    ("en", "zh"): "Helsinki-NLP/opus-mt-en-zh",
    ("ja", "en"): "Helsinki-NLP/opus-mt-ja-en",
    ("ko", "en"): "Helsinki-NLP/opus-mt-ko-en",
    ("fr", "en"): "Helsinki-NLP/opus-mt-fr-en",
    ("de", "en"): "Helsinki-NLP/opus-mt-de-en",
    ("es", "en"): "Helsinki-NLP/opus-mt-es-en",
    ("ru", "en"): "Helsinki-NLP/opus-mt-ru-en",
    ("it", "en"): "Helsinki-NLP/opus-mt-it-en",
}
PUNCTUATION_SPLIT_RE = re.compile(r"(?<=[。！？!?；;：:,，])\s*")


def serialize_job(job: JobState) -> Dict[str, object]:
    data = asdict(job)
    media_path = UPLOAD_DIR / job.filename
    data["has_draft"] = bool(job.draft_segments)
    data["is_video"] = media_path.suffix.lower() in VIDEO_SUFFIXES
    if media_path.exists():
        data["media_preview_url"] = f"/api/jobs/{job.job_id}/media"
    if job.outputs:
        data["download_urls"] = {
            format_name: f"/api/jobs/{job.job_id}/download/{format_name}"
            for format_name in job.outputs
        }
        if "srt" in job.outputs:
            data["download_url"] = data["download_urls"]["srt"]
    return data


def persist_jobs(snapshot: Optional[List[Dict[str, object]]] = None) -> None:
    if snapshot is None:
        with jobs_lock:
            snapshot = [asdict(job) for job in jobs.values()]
    JOB_STORE_PATH.write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_jobs_from_disk() -> Dict[str, JobState]:
    if not JOB_STORE_PATH.exists():
        return {}

    try:
        payload = json.loads(JOB_STORE_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}

    job_fields = {item.name for item in fields(JobState)}
    restored: Dict[str, JobState] = {}
    for record in payload if isinstance(payload, list) else []:
        if not isinstance(record, dict):
            continue
        job_data = {key: value for key, value in record.items() if key in job_fields}
        if not job_data.get("job_id"):
            continue
        job = JobState(**job_data)
        if job.status in {"queued", "running"}:
            job.status = "failed"
            job.message = "Service restarted. Unfinished jobs were converted to drafts. Please submit again."
            job.error = "Interrupted by server restart."
        restored[job.job_id] = job
    return restored


jobs.update(load_jobs_from_disk())
if jobs:
    persist_jobs([asdict(job) for job in jobs.values()])


def update_job(job_id: str, **updates: object) -> None:
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")
        for key, value in updates.items():
            setattr(job, key, value)
        snapshot = [asdict(item) for item in jobs.values()]
    persist_jobs(snapshot)


def utc_now() -> str:
    return datetime.utcnow().isoformat() + "Z"


def get_audio_duration(file_path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            str(file_path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(result.stdout or "{}")
    duration = payload.get("format", {}).get("duration", 0)
    return float(duration or 0)


def format_timestamp(seconds: float) -> str:
    milliseconds = max(0, int(round(seconds * 1000)))
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1_000)
    return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"


def format_vtt_timestamp(seconds: float) -> str:
    return format_timestamp(seconds).replace(",", ".")


def sanitize_segments(segments: List[dict]) -> List[dict]:
    cleaned: List[dict] = []
    for segment in segments:
        start = max(0.0, float(segment["start"]))
        end = max(start, float(segment["end"]))
        text = str(segment["text"]).strip()
        if not text:
            continue
        item = {"start": start, "end": end, "text": text}
        if segment.get("speaker"):
            item["speaker"] = str(segment["speaker"]).strip()
        if segment.get("translation"):
            item["translation"] = str(segment["translation"]).strip()
        cleaned.append(item)
    return cleaned


def split_text_for_subtitles(text: str, max_chars: int = 26) -> List[str]:
    normalized = re.sub(r"\s+", " ", text).strip()
    if not normalized:
        return []

    chunks: List[str] = []
    sentence_parts = [part.strip() for part in PUNCTUATION_SPLIT_RE.split(normalized) if part.strip()]
    if not sentence_parts:
        sentence_parts = [normalized]

    for part in sentence_parts:
        if len(part) <= max_chars:
            chunks.append(part)
            continue

        words = part.split(" ")
        if len(words) == 1:
            start = 0
            while start < len(part):
                chunks.append(part[start : start + max_chars].strip())
                start += max_chars
            continue

        current = ""
        for word in words:
            candidate = f"{current} {word}".strip()
            if current and len(candidate) > max_chars:
                chunks.append(current)
                current = word
            else:
                current = candidate
        if current:
            chunks.append(current)

    return [chunk for chunk in chunks if chunk]


def optimize_subtitle_segments(segments: List[dict]) -> List[dict]:
    optimized: List[dict] = []
    for segment in segments:
        parts = split_text_for_subtitles(segment["text"])
        if len(parts) <= 1:
            optimized.append(segment)
            continue

        duration = max(0.2, segment["end"] - segment["start"])
        total_chars = sum(max(1, len(part)) for part in parts)
        cursor = segment["start"]

        for index, part in enumerate(parts):
            weight = max(1, len(part)) / total_chars
            piece_duration = duration * weight
            end = segment["end"] if index == len(parts) - 1 else min(segment["end"], cursor + piece_duration)
            item = {
                "start": round(cursor, 3),
                "end": round(max(cursor + 0.2, end), 3),
                "text": part,
            }
            if segment.get("speaker"):
                item["speaker"] = segment["speaker"]
            optimized.append(item)
            cursor = item["end"]

    return sanitize_segments(optimized)


def render_segment_text(segment: dict, bilingual: bool = False) -> str:
    text = segment["text"].strip()
    translation = str(segment.get("translation", "")).strip()
    speaker = str(segment.get("speaker", "")).strip()
    if speaker:
        text = f"[{speaker}] {text}"
    if bilingual and translation:
        return f"{text}\n{translation}"
    return text


def write_srt(segments: List[dict], output_path: Path, bilingual: bool = False) -> None:
    lines: List[str] = []
    for index, segment in enumerate(segments, start=1):
        lines.append(str(index))
        lines.append(
            f"{format_timestamp(segment['start'])} --> {format_timestamp(segment['end'])}"
        )
        lines.append(render_segment_text(segment, bilingual=bilingual))
        lines.append("")
    output_path.write_text("\n".join(lines), encoding="utf-8")


def write_vtt(segments: List[dict], output_path: Path, bilingual: bool = False) -> None:
    lines: List[str] = ["WEBVTT", ""]
    for segment in segments:
        lines.append(
            f"{format_vtt_timestamp(segment['start'])} --> {format_vtt_timestamp(segment['end'])}"
        )
        lines.append(render_segment_text(segment, bilingual=bilingual))
        lines.append("")
    output_path.write_text("\n".join(lines), encoding="utf-8")


def write_txt(segments: List[dict], output_path: Path, bilingual: bool = False) -> None:
    lines = [
        render_segment_text(segment, bilingual=bilingual)
        for segment in segments
        if segment["text"].strip()
    ]
    output_path.write_text("\n".join(lines), encoding="utf-8")


def write_json_transcript(
    segments: List[dict], output_path: Path, bilingual: bool = False
) -> None:
    output_path.write_text(
        json.dumps({"bilingual": bilingual, "segments": segments}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def write_markdown_transcript(
    segments: List[dict], output_path: Path, bilingual: bool = False
) -> None:
    lines: List[str] = ["# Transcript", ""]
    for segment in segments:
        start = format_timestamp(segment["start"])
        end = format_timestamp(segment["end"])
        speaker = str(segment.get("speaker", "")).strip()
        label = f"**[{start} - {end}]**"
        if speaker:
            label += f" **{speaker}**"
        lines.append(label)
        lines.append("")
        lines.append(segment["text"].strip())
        if bilingual and segment.get("translation"):
            lines.append("")
            lines.append(f"> {str(segment['translation']).strip()}")
        lines.append("")
    output_path.write_text("\n".join(lines), encoding="utf-8")


def write_docx_transcript(
    segments: List[dict], output_path: Path, bilingual: bool = False
) -> None:
    document = Document()
    document.add_heading("Transcript", level=1)
    for segment in segments:
        heading = f"{format_timestamp(segment['start'])} - {format_timestamp(segment['end'])}"
        if segment.get("speaker"):
            heading += f"  {segment['speaker']}"
        document.add_paragraph(heading, style="Heading 3")
        document.add_paragraph(segment["text"].strip())
        if bilingual and segment.get("translation"):
            document.add_paragraph(str(segment["translation"]).strip())
    document.save(output_path)


def format_ass_timestamp(seconds: float) -> str:
    total = max(0, int(round(seconds * 100)))
    hours, remainder = divmod(total, 360000)
    minutes, remainder = divmod(remainder, 6000)
    secs, centis = divmod(remainder, 100)
    return f"{hours}:{minutes:02}:{secs:02}.{centis:02}"


def ass_style_block(style_name: str) -> str:
    styles = {
        "variety": "Style: Main,Microsoft YaHei,26,&H00FFFFFF,&H0000E6FF,&H0010182A,&H8010182A,-1,0,0,0,100,100,0,0,1,3,0,2,28,28,24,1",
        "punch": "Style: Main,Arial Black,30,&H00FFFFFF,&H0000A5FF,&H00000000,&H64000000,-1,0,0,0,108,100,0,0,1,4,2,2,28,28,26,1",
        "neon": "Style: Main,Avenir Next,28,&H00F8FEFF,&H00FF8A3D,&H0006121D,&H6406121D,-1,0,0,0,100,100,0,0,1,2.5,0,2,28,28,22,1",
    }
    return styles.get(style_name, styles["variety"])


def write_ass_subtitles(
    segments: List[dict], output_path: Path, style_name: str, bilingual: bool = False
) -> None:
    header = "\n".join(
        [
            "[Script Info]",
            "Title: Offline Subtitle Studio",
            "ScriptType: v4.00+",
            "WrapStyle: 2",
            "ScaledBorderAndShadow: yes",
            "",
            "[V4+ Styles]",
            "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding",
            ass_style_block(style_name),
            "",
            "[Events]",
            "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text",
        ]
    )

    lines = [header]
    for segment in segments:
        text = render_segment_text(segment, bilingual=bilingual).replace("\n", r"\N")
        lines.append(
            f"Dialogue: 0,{format_ass_timestamp(segment['start'])},{format_ass_timestamp(segment['end'])},Main,,0,0,0,,{text}"
        )
    output_path.write_text("\n".join(lines), encoding="utf-8")


def load_model(model_size: str) -> WhisperModel:
    with _model_lock:
        if model_size not in _model_cache:
            _model_cache[model_size] = WhisperModel(
                model_size,
                device="cpu",
                compute_type="int8",
                download_root=str(MODEL_DIR),
            )
        return _model_cache[model_size]


def load_speaker_encoder() -> VoiceEncoder:
    global _speaker_encoder
    with _speaker_encoder_lock:
        if _speaker_encoder is None:
            _speaker_encoder = VoiceEncoder()
        return _speaker_encoder


def get_translation_pipeline(source_language: str, target_language: str):
    model_name = TRANSLATION_MODELS.get((source_language, target_language))
    if not model_name:
        return None

    cache_key = f"{source_language}:{target_language}"
    with _translator_lock:
        if cache_key not in _translator_cache:
            _translator_cache[cache_key] = pipeline(
                "translation",
                model=model_name,
                tokenizer=model_name,
                device=-1,
            )
        return _translator_cache[cache_key]


def translate_segments(
    segments: List[dict], source_language: str, target_language: str
) -> List[dict]:
    if not target_language or target_language == "none" or source_language == target_language:
        return segments

    translator = get_translation_pipeline(source_language, target_language)
    if translator is None:
        return segments

    texts = [segment["text"] for segment in segments]
    translations = translator(texts, batch_size=8, max_length=512)
    translated_segments: List[dict] = []
    for segment, translated in zip(segments, translations):
        item = dict(segment)
        item["translation"] = translated["translation_text"].strip()
        translated_segments.append(item)
    return translated_segments


def convert_audio_for_diarization(audio_path: Path) -> Path:
    temp_dir = Path(tempfile.mkdtemp(prefix="subtitle-diarize-"))
    wav_path = temp_dir / f"{audio_path.stem}.wav"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(audio_path),
            "-ac",
            "1",
            "-ar",
            "16000",
            str(wav_path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return wav_path


def apply_speaker_diarization(
    segments: List[dict], audio_path: Path, speaker_count: str
) -> List[dict]:
    usable_segments = [segment for segment in segments if (segment["end"] - segment["start"]) >= 0.8]
    if len(usable_segments) < 2:
        return segments

    wav_path = convert_audio_for_diarization(audio_path)
    try:
        wav = preprocess_wav(str(wav_path))
        sample_rate = 16000
        encoder = load_speaker_encoder()

        embeddings = []
        usable_indexes = []
        for index, segment in enumerate(segments):
            start_frame = int(segment["start"] * sample_rate)
            end_frame = int(segment["end"] * sample_rate)
            if end_frame - start_frame < int(0.8 * sample_rate):
                continue
            clip = wav[start_frame:end_frame]
            if clip.size < int(0.8 * sample_rate):
                continue
            embeddings.append(encoder.embed_utterance(clip))
            usable_indexes.append(index)

        if len(embeddings) < 2:
            return segments

        n_clusters = int(speaker_count) if speaker_count.isdigit() else min(2, len(embeddings))
        n_clusters = max(2, min(n_clusters, len(embeddings)))
        clustering = AgglomerativeClustering(n_clusters=n_clusters)
        labels = clustering.fit_predict(np.vstack(embeddings))

        speaker_map = {index: f"SPK {label + 1}" for index, label in zip(usable_indexes, labels)}
        diarized_segments = []
        last_speaker = "SPK 1"
        for index, segment in enumerate(segments):
            speaker = speaker_map.get(index, last_speaker)
            item = dict(segment)
            item["speaker"] = speaker
            diarized_segments.append(item)
            last_speaker = speaker
        return diarized_segments
    finally:
        shutil.rmtree(wav_path.parent, ignore_errors=True)


def build_output_filename(original_name: str) -> str:
    original_stem = Path(original_name).stem.strip() or "subtitle"
    safe_stem = re.sub(r'[<>:"/\\|?*\x00-\x1f]+', "-", original_stem)
    safe_stem = re.sub(r"\s+", " ", safe_stem).strip(" .") or "subtitle"
    return f"{safe_stem}.srt"


def reserve_output_paths(original_name: str) -> Dict[str, Path]:
    base_name = build_output_filename(original_name)
    stem = Path(base_name).stem
    candidate = stem
    counter = 1

    while True:
        paths = {
            "srt": OUTPUT_DIR / f"{candidate}.srt",
            "vtt": OUTPUT_DIR / f"{candidate}.vtt",
            "txt": OUTPUT_DIR / f"{candidate}.txt",
            "json": OUTPUT_DIR / f"{candidate}.json",
            "md": OUTPUT_DIR / f"{candidate}.md",
            "docx": OUTPUT_DIR / f"{candidate}.docx",
            "ass": OUTPUT_DIR / f"{candidate}.ass",
            "srt_bilingual": OUTPUT_DIR / f"{candidate}.bilingual.srt",
            "vtt_bilingual": OUTPUT_DIR / f"{candidate}.bilingual.vtt",
            "txt_bilingual": OUTPUT_DIR / f"{candidate}.bilingual.txt",
            "json_bilingual": OUTPUT_DIR / f"{candidate}.bilingual.json",
            "md_bilingual": OUTPUT_DIR / f"{candidate}.bilingual.md",
            "docx_bilingual": OUTPUT_DIR / f"{candidate}.bilingual.docx",
            "ass_bilingual": OUTPUT_DIR / f"{candidate}.bilingual.ass",
        }
        if not any(path.exists() for path in paths.values()):
            return paths
        candidate = f"{stem}-{counter}"
        counter += 1


def write_all_outputs(segments: List[dict], output_paths: Dict[str, Path], ass_style: str) -> None:
    write_srt(segments, output_paths["srt"])
    write_vtt(segments, output_paths["vtt"])
    write_txt(segments, output_paths["txt"])
    write_json_transcript(segments, output_paths["json"])
    write_markdown_transcript(segments, output_paths["md"])
    write_docx_transcript(segments, output_paths["docx"])
    write_ass_subtitles(segments, output_paths["ass"], ass_style)
    if any(segment.get("translation") for segment in segments):
        write_srt(segments, output_paths["srt_bilingual"], bilingual=True)
        write_vtt(segments, output_paths["vtt_bilingual"], bilingual=True)
        write_txt(segments, output_paths["txt_bilingual"], bilingual=True)
        write_json_transcript(segments, output_paths["json_bilingual"], bilingual=True)
        write_markdown_transcript(segments, output_paths["md_bilingual"], bilingual=True)
        write_docx_transcript(segments, output_paths["docx_bilingual"], bilingual=True)
        write_ass_subtitles(segments, output_paths["ass_bilingual"], ass_style, bilingual=True)


def existing_output_map(output_paths: Dict[str, Path]) -> Dict[str, str]:
    return {name: str(path) for name, path in output_paths.items() if path.exists()}


def build_bundle_zip(job: JobState) -> Path:
    bundle_path = OUTPUT_DIR / f"{Path(build_output_filename(job.original_name)).stem}.bundle.zip"
    counter = 1
    while bundle_path.exists():
        bundle_path = OUTPUT_DIR / f"{Path(build_output_filename(job.original_name)).stem}-{counter}.bundle.zip"
        counter += 1

    with zipfile.ZipFile(bundle_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(Path(file_path) for file_path in job.outputs.values() if Path(file_path).exists()):
            archive.write(path, arcname=path.name)
    return bundle_path


def transcribe_job(
    job_id: str,
    audio_path: Path,
    language: str,
    model_size: str,
    translate_to: str,
    diarization: bool,
    speaker_count: str,
    smart_split: bool,
    ass_style: str,
) -> None:
    try:
        update_job(job_id, status="running", progress=0.05, message="Loading model")
        model = load_model(model_size)

        total_duration = get_audio_duration(audio_path)
        task_language = None if language == "auto" else language

        update_job(job_id, progress=0.15, message="Running offline transcription")
        segments_iter, info = model.transcribe(
            str(audio_path),
            language=task_language,
            vad_filter=True,
            beam_size=5,
            word_timestamps=False,
        )

        segments: List[dict] = []
        detected_language = getattr(info, "language", None)
        update_job(
            job_id,
            detected_language=detected_language,
            message="Building subtitle timeline",
        )

        for segment in segments_iter:
            item = {
                "start": float(segment.start),
                "end": float(segment.end),
                "text": segment.text.strip(),
            }
            if item["text"]:
                segments.append(item)
            if total_duration > 0:
                progress = min(0.95, 0.15 + (item["end"] / total_duration) * 0.75)
                update_job(job_id, progress=progress)

        if not segments:
            raise RuntimeError("No speech was detected in the uploaded audio.")

        segments = sanitize_segments(segments)
        if smart_split:
            update_job(job_id, progress=0.78, message="Optimizing subtitle breaks")
            segments = optimize_subtitle_segments(segments)
        if diarization:
            update_job(job_id, progress=0.82, message="Detecting speakers")
            segments = apply_speaker_diarization(segments, audio_path, speaker_count)
        source_language = detected_language or (language if language != "auto" else "")
        update_job(job_id, progress=0.9, message="Preparing exports")
        translated_segments = translate_segments(segments, source_language, translate_to)
        with jobs_lock:
            job = jobs[job_id]
            output_paths = reserve_output_paths(job.original_name)

        update_job(job_id, progress=0.97, message="Writing subtitle files")
        write_all_outputs(translated_segments, output_paths, ass_style)

        update_job(
            job_id,
            status="completed",
            progress=1.0,
            message="Subtitle file is ready",
            srt_path=str(output_paths["srt"]),
            outputs=existing_output_map(output_paths),
            segments=translated_segments,
        )
    except Exception as exc:  # noqa: BLE001
        update_job(
            job_id,
            status="failed",
            message="Transcription failed",
            error=str(exc),
        )


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/jobs")
def list_jobs() -> List[Dict[str, object]]:
    with jobs_lock:
        return [
            serialize_job(job)
            for job in sorted(
                jobs.values(),
                key=lambda item: item.created_at,
                reverse=True,
            )
        ]


@app.post("/api/jobs")
async def create_job(
    file: UploadFile = File(...),
    language: str = Form("auto"),
    model_size: str = Form("large-v3"),
    translate_to: str = Form("none"),
    diarization: bool = Form(False),
    speaker_count: str = Form("2"),
    smart_split: bool = Form(True),
    ass_style: str = Form("variety"),
) -> Dict[str, object]:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported media format. Supported: {SUPPORTED_MEDIA_LABEL}.",
        )

    job_id = uuid.uuid4().hex
    safe_name = f"{job_id}{suffix}"
    audio_path = UPLOAD_DIR / safe_name

    with audio_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    job = JobState(
        job_id=job_id,
        filename=safe_name,
        original_name=file.filename or safe_name,
        language=language,
        model_size=model_size,
        translate_to=translate_to,
        diarization=diarization,
        speaker_count=speaker_count,
        smart_split=smart_split,
        ass_style=ass_style,
    )

    with jobs_lock:
        jobs[job_id] = job
        snapshot = [asdict(item) for item in jobs.values()]
    persist_jobs(snapshot)

    executor.submit(
        transcribe_job,
        job_id,
        audio_path,
        language,
        model_size,
        translate_to,
        diarization,
        speaker_count,
        smart_split,
        ass_style,
    )
    return serialize_job(job)


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str) -> Dict[str, object]:
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")
        return serialize_job(job)


@app.put("/api/jobs/{job_id}/draft")
def save_draft(job_id: str, payload: Dict[str, List[dict]]) -> Dict[str, object]:
    cleaned_segments = sanitize_segments(payload.get("segments", []))
    if not cleaned_segments:
        raise HTTPException(status_code=400, detail="Draft segments cannot be empty.")

    update_job(
        job_id,
        draft_segments=cleaned_segments,
        draft_updated_at=utc_now(),
        message="Draft auto-saved",
    )

    with jobs_lock:
        return serialize_job(jobs[job_id])


@app.put("/api/jobs/{job_id}/segments")
def update_segments(job_id: str, payload: Dict[str, List[dict]]) -> Dict[str, object]:
    incoming_segments = payload.get("segments", [])
    cleaned_segments = sanitize_segments(incoming_segments)
    if not cleaned_segments:
        raise HTTPException(status_code=400, detail="Segments cannot be empty.")

    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")
        if not job.outputs:
            raise HTTPException(status_code=400, detail="Subtitle files are not ready yet.")
        source_language = job.detected_language or job.language
        translate_to = job.translate_to
        ass_style = job.ass_style
        output_paths = {name: Path(path) for name, path in job.outputs.items()}

    translated_segments = translate_segments(cleaned_segments, source_language, translate_to)
    write_all_outputs(translated_segments, output_paths, ass_style)
    update_job(
        job_id,
        segments=translated_segments,
        draft_segments=[],
        draft_updated_at=None,
        message="Subtitle timeline updated",
    )

    with jobs_lock:
        return serialize_job(jobs[job_id])


@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: str) -> Dict[str, bool]:
    with jobs_lock:
        job = jobs.pop(job_id, None)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")
        snapshot = [asdict(item) for item in jobs.values()]
    persist_jobs(snapshot)

    paths_to_remove = {UPLOAD_DIR / job.filename}
    paths_to_remove.update(Path(path) for path in job.outputs.values())

    for path in paths_to_remove:
        try:
            path.unlink(missing_ok=True)
        except OSError:
            continue

    return {"ok": True}


@app.get("/api/jobs/{job_id}/media")
def get_job_media(job_id: str) -> FileResponse:
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")
        media_path = UPLOAD_DIR / job.filename

    if not media_path.exists():
        raise HTTPException(status_code=404, detail="Source media not found.")

    media_type = mimetypes.guess_type(media_path.name)[0] or "application/octet-stream"
    return FileResponse(
        media_path,
        media_type=media_type,
        filename=job.original_name,
    )


@app.get("/api/jobs/{job_id}/download/{format_name}")
def download_output(job_id: str, format_name: str) -> FileResponse:
    with jobs_lock:
        job = jobs.get(job_id)
        if not job or not job.outputs:
            raise HTTPException(status_code=404, detail="Subtitle file not found.")
        if format_name not in job.outputs:
            raise HTTPException(status_code=404, detail="Requested format not found.")
        output_path = Path(job.outputs[format_name])

    media_types = {
        "srt": "application/x-subrip",
        "vtt": "text/vtt",
        "txt": "text/plain",
        "json": "application/json",
        "md": "text/markdown",
        "ass": "text/plain",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }

    return FileResponse(
        output_path,
        media_type=media_types.get(format_name, "application/octet-stream"),
        filename=output_path.name,
    )


@app.get("/api/jobs/{job_id}/download-all")
def download_bundle(job_id: str) -> FileResponse:
    with jobs_lock:
        job = jobs.get(job_id)
        if not job or not job.outputs:
            raise HTTPException(status_code=404, detail="Subtitle bundle not found.")
        bundle_path = build_bundle_zip(job)

    return FileResponse(
        bundle_path,
        media_type="application/zip",
        filename=bundle_path.name,
    )
