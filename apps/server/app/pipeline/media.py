"""ffprobe/ffmpeg helpers: probing, validation (FR-ING-3) and audio extraction (FR-ING-4)."""

import json
import subprocess
from dataclasses import asdict, dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.errors import PipelineError

ALLOWED_FORMATS = {"mov", "mp4", "m4a", "3gp", "3g2", "mj2", "matroska", "webm"}


@dataclass
class ProbeResult:
    duration: float
    width: int
    height: int
    fps: float
    video_codec: str
    audio_codec: str | None
    has_audio: bool
    format_name: str
    rotation: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def run(cmd: list[str], *, timeout: float, cwd: Path | None = None, code: str = "ffmpeg_failed") -> str:
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=cwd, check=False)
    except subprocess.TimeoutExpired as e:
        raise PipelineError(f"{code}_timeout", f"{Path(cmd[0]).name} timed out", retryable=True) from e
    except FileNotFoundError as e:
        raise PipelineError("tool_missing", f"{cmd[0]} is not installed") from e
    if proc.returncode != 0:
        raise PipelineError(code, f"{Path(cmd[0]).name} exited with {proc.returncode}", details=proc.stderr[-2000:])
    return proc.stdout


def _parse_rate(rate: str | None) -> float:
    if not rate or rate in ("0/0", "0"):
        return 0.0
    num, _, den = rate.partition("/")
    return float(num) / float(den or 1) if float(den or 1) else 0.0


def _rotation(stream: dict[str, Any]) -> int:
    for side in stream.get("side_data_list", []) or []:
        if "rotation" in side:
            return int(side["rotation"]) % 360
    tag = (stream.get("tags") or {}).get("rotate")
    return int(tag) % 360 if tag else 0


def probe(path: Path, *, ffprobe: str = "ffprobe", timeout: float = 120) -> ProbeResult:
    out = run(
        [ffprobe, "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
        timeout=timeout,
        code="invalid_media",
    )
    data = json.loads(out or "{}")
    streams = data.get("streams", [])
    video = next(
        (s for s in streams if s.get("codec_type") == "video" and not (s.get("disposition") or {}).get("attached_pic")),
        None,
    )
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    if video is None:
        raise PipelineError("no_video_stream", "The file has no video stream")
    fmt = data.get("format", {})
    duration = float(fmt.get("duration") or video.get("duration") or 0)
    width, height = int(video.get("width") or 0), int(video.get("height") or 0)
    rotation = _rotation(video)
    if rotation in (90, 270):  # ffmpeg auto-rotates on decode, so use display dimensions.
        width, height = height, width
    return ProbeResult(
        duration=duration,
        width=width,
        height=height,
        fps=_parse_rate(video.get("avg_frame_rate")) or _parse_rate(video.get("r_frame_rate")),
        video_codec=str(video.get("codec_name")),
        audio_codec=str(audio.get("codec_name")) if audio else None,
        has_audio=audio is not None,
        format_name=str(fmt.get("format_name", "")),
        rotation=rotation,
    )


def validate(result: ProbeResult, *, max_duration: float) -> None:
    if not set(result.format_name.split(",")) & ALLOWED_FORMATS:
        raise PipelineError("unsupported_format", f"Unsupported container '{result.format_name}'")
    if not result.has_audio:
        raise PipelineError("no_audio_stream", "The video has no audio stream")
    if result.duration <= 0:
        raise PipelineError("invalid_media", "Could not determine the video duration")
    if result.duration > max_duration:
        raise PipelineError(
            "duration_too_long",
            f"Video is {result.duration / 60:.0f} minutes; the limit is {max_duration / 60:.0f} minutes",
        )
    if result.width < 2 or result.height < 2 or result.fps <= 0:
        raise PipelineError("invalid_media", "Could not read the video dimensions or frame rate")


def extract_audio(src: Path, dst: Path, *, ffmpeg: str = "ffmpeg", timeout: float = 3600) -> Path:
    """16 kHz mono PCM WAV for speech recognition. The original is never modified."""
    tmp = dst.with_suffix(".part.wav")
    run(
        [
            ffmpeg,
            "-hide_banner",
            "-nostdin",
            "-y",
            "-i",
            str(src),
            "-vn",
            "-ac",
            "1",
            "-ar",
            "16000",
            "-c:a",
            "pcm_s16le",
            str(tmp),
        ],
        timeout=timeout,
    )
    tmp.replace(dst)
    return dst


@lru_cache
def has_filter(name: str, ffmpeg: str = "ffmpeg") -> bool:
    try:
        out = subprocess.run([ffmpeg, "-hide_banner", "-filters"], capture_output=True, text=True, timeout=30).stdout
    except (OSError, subprocess.SubprocessError):
        return False
    return any(line.split()[1:2] == [name] for line in out.splitlines() if line.strip())
