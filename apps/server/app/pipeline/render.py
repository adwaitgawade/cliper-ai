"""Clip rendering (FR-RND-1, FR-RND-3, FR-RND-4, FR-RND-6).

Output: 1080x1920 H.264/AAC MP4, yuv420p, faststart, source frame rate capped at
30 fps, loudness normalized to -14 LUFS, captions burned in during the same pass.

Static crop paths (M1) render through an ffmpeg filter graph. Moving paths (M2+) will
use the OpenCV frame pipe described in FR-RND-2, reading the same crop_path.json.
"""

from pathlib import Path

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


def make_thumbnail(*, ffmpeg: str, video: Path, at: float, output: Path, timeout: float = 60) -> Path:
    """Representative frame. M4 replaces this with the best active-speaker frame."""
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
            "-q:v",
            "3",
            str(output),
        ],
        timeout=timeout,
        code="thumbnail_failed",
    )
    return output
