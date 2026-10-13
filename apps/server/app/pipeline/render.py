"""Clip rendering (FR-RND-1, FR-RND-3, FR-RND-4, FR-RND-6).

Output: 1080x1920 H.264/AAC MP4, yuv420p, faststart, source frame rate capped at
30 fps, loudness normalized to -14 LUFS.

The default renderer is Remotion: packages/video/scripts/render.mjs draws the crop
path (static or moving), the layout and the captions with the same React composition
the web editor previews, then ffmpeg normalizes loudness in a second pass that copies
the video stream. The ffmpeg filter-graph renderer with ASS captions is kept as a
fallback for static crop paths.
"""

import json
import subprocess
import threading
from collections.abc import Callable
from pathlib import Path
from typing import Any

from app.core.errors import PipelineError
from app.pipeline.media import run
from app.pipeline.reframe.crop import OUTPUT_HEIGHT, OUTPUT_WIDTH, CropPath

MAX_FPS = 30.0
TARGET_LUFS = -14

_ENCODER_ARGS = {
    "libx264": ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-profile:v", "high"],
    "h264_nvenc": ["-c:v", "h264_nvenc", "-preset", "p5", "-rc", "vbr", "-cq", "21", "-b:v", "0"],
    "h264_videotoolbox": ["-c:v", "h264_videotoolbox", "-b:v", "8M"],
}


def video_filter(crop: CropPath, *, fps: float, ass_file: str | None) -> str:
    if not crop.is_static:
        raise PipelineError("crop_path_unsupported", "Moving crop paths need the OpenCV renderer (M2)")
    layout = crop.segments[0].layout if crop.segments else "crop"
    W, H = OUTPUT_WIDTH, OUTPUT_HEIGHT
    if layout == "wide":
        # Full frame fitted to width over a blurred, zoomed copy of itself (FR-RFM-8).
        graph = (
            f"[0:v]split=2[bg][fg];"
            f"[bg]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=20:2[bgb];"
            f"[fg]scale={W}:{H}:force_original_aspect_ratio=decrease:flags=lanczos[fgs];"
            f"[bgb][fgs]overlay=(W-w)/2:(H-h)/2,setsar=1"
        )
    else:
        x = crop.x_offsets[0] if crop.x_offsets else 0
        graph = f"[0:v]crop={crop.crop_width}:{crop.crop_height}:{x}:0,scale={W}:{H}:flags=lanczos,setsar=1"
    if fps > MAX_FPS:
        graph += f",fps={MAX_FPS:g}"
    if ass_file:
        graph += f",ass={ass_file}"
    return graph + ",format=yuv420p[v]"


def build_render_command(
    *,
    ffmpeg: str,
    source: Path,
    start: float,
    end: float,
    crop: CropPath,
    fps: float,
    output: Path,
    ass_file: str | None,
    encoder: str = "libx264",
) -> list[str]:
    duration = round(end - start, 3)
    return [
        ffmpeg,
        "-hide_banner",
        "-nostdin",
        "-y",
        "-ss",
        f"{start:.3f}",
        "-i",
        str(source),
        "-t",
        f"{duration:.3f}",
        "-filter_complex",
        video_filter(crop, fps=fps, ass_file=ass_file),
        "-map",
        "[v]",
        "-map",
        "0:a:0",
        *_ENCODER_ARGS[encoder],
        "-af",
        f"loudnorm=I={TARGET_LUFS}:TP=-1.5:LRA=11,aresample=48000",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-movflags",
        "+faststart",
        str(output),
    ]


def render_clip(
    *,
    ffmpeg: str,
    source: Path,
    start: float,
    end: float,
    crop: CropPath,
    fps: float,
    output: Path,
    ass_path: Path | None,
    encoder: str,
    timeout: float,
) -> Path:
    # Run inside the captions' directory so the ass filter gets a bare filename and
    # no path escaping is needed.
    workdir = ass_path.parent if ass_path else output.parent
    cmd = build_render_command(
        ffmpeg=ffmpeg,
        source=source.resolve(),
        start=start,
        end=end,
        crop=crop,
        fps=fps,
        output=output.resolve(),
        ass_file=ass_path.name if ass_path else None,
        encoder=encoder,
    )
    run(cmd, timeout=timeout, cwd=workdir, code="render_failed")
    return output


def make_thumbnail(
    *, ffmpeg: str, video: Path, at: float, output: Path, width: int | None = None, timeout: float = 60
) -> Path:
    """Representative frame. M4 replaces this with the best active-speaker frame."""
    scale = ["-vf", f"scale={width}:-2"] if width else []
    run(
        [
            ffmpeg,
            "-hide_banner",
            "-nostdin",
            "-y",
            "-ss",
            f"{at:.3f}",
            "-i",
            str(video),
            "-frames:v",
            "1",
            *scale,
            "-q:v",
            "3",
            str(output),
        ],
        timeout=timeout,
        code="thumbnail_failed",
    )
    return output


# --- Remotion ----------------------------------------------------------------------------


def default_video_package_dir() -> Path:
    # Repository layout: apps/server/app/pipeline/ -> packages/video/
    return Path(__file__).resolve().parents[4] / "packages" / "video"


def build_remotion_command(
    *,
    node: str,
    package_dir: Path,
    props_file: Path,
    output: Path,
    bundle_dir: Path | None = None,
    concurrency: int | None = None,
) -> list[str]:
    cmd = [node, str(package_dir / "scripts" / "render.mjs"), "--props", str(props_file), "--out", str(output)]
    if bundle_dir:
        cmd += ["--bundle", str(bundle_dir)]
    if concurrency:
        cmd += ["--concurrency", str(concurrency)]
    return cmd


def render_with_remotion(
    *,
    node: str,
    package_dir: Path,
    props: dict[str, Any],
    output: Path,
    timeout: float,
    bundle_dir: Path | None = None,
    concurrency: int | None = None,
    on_progress: Callable[[float], None] | None = None,
) -> Path:
    """Render the Clip composition with the given props. Reports progress 0..1."""
    props_file = output.with_suffix(".props.json")
    props_file.write_text(json.dumps(props), encoding="utf-8")
    cmd = build_remotion_command(
        node=node,
        package_dir=package_dir,
        props_file=props_file,
        output=output,
        bundle_dir=bundle_dir,
        concurrency=concurrency,
    )
    log_file = output.with_suffix(".log")

    def _read_progress(stream: Any) -> None:
        for line in stream:
            try:
                msg = json.loads(line)
            except ValueError:
                continue
            if on_progress and isinstance(msg, dict) and "progress" in msg:
                on_progress(float(msg["progress"]))

    with log_file.open("w", encoding="utf-8") as err:
        try:
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=err, text=True, cwd=package_dir)
        except FileNotFoundError as e:
            raise PipelineError("tool_missing", f"{node} is not installed (needed by the Remotion renderer)") from e
        reader = threading.Thread(target=_read_progress, args=(proc.stdout,), daemon=True)
        reader.start()
        try:
            proc.wait(timeout=timeout)
        except subprocess.TimeoutExpired as e:
            proc.kill()
            proc.wait()
            raise PipelineError("render_failed_timeout", "Remotion render timed out", retryable=True) from e
        reader.join(timeout=5)
    stderr = log_file.read_text(encoding="utf-8", errors="replace")
    if proc.returncode != 0 or not output.exists():
        raise PipelineError("render_failed", f"Remotion exited with {proc.returncode}", details=stderr[-2000:])
    log_file.unlink(missing_ok=True)
    props_file.unlink(missing_ok=True)
    return output


def build_loudnorm_command(*, ffmpeg: str, source: Path, output: Path) -> list[str]:
    """Normalize loudness and add faststart; the video stream is copied, not re-encoded."""
    return [
        ffmpeg,
        "-hide_banner",
        "-nostdin",
        "-y",
        "-i",
        str(source),
        "-map",
        "0:v:0",
        "-map",
        "0:a:0?",
        "-c:v",
        "copy",
        "-af",
        f"loudnorm=I={TARGET_LUFS}:TP=-1.5:LRA=11,aresample=48000",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-movflags",
        "+faststart",
        str(output),
    ]


def normalize_loudness(*, ffmpeg: str, source: Path, output: Path, timeout: float) -> Path:
    run(build_loudnorm_command(ffmpeg=ffmpeg, source=source, output=output), timeout=timeout, code="render_failed")
    return output
