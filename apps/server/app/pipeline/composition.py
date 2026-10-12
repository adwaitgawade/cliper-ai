"""Input props for the Remotion Clip composition (packages/video/src/schema.ts).

Built by one function for both the editor preview (GET /v1/clips/{id}/composition)
and the render task, so what the user previews is exactly what gets rendered.
"""

from typing import Any

from app.pipeline import caption_config
from app.pipeline.reframe.crop import CropPath
from app.pipeline.types import Word

PROPS_VERSION = 1


def output_fps(source_fps: float) -> float:
    return round(min(source_fps or 30.0, caption_config.load_config().canvas.max_fps), 3)


def build_clip_props(
    *,
    src: str,
    source_width: int,
    source_height: int,
    source_fps: float,
    start: float,
    end: float,
    crop: CropPath,
    words: list[Word],
    caption_style: str,
    caption_overrides: dict[str, Any] | None,
    profanity_filter: bool,
    captions_enabled: bool = True,
) -> dict[str, Any]:
    names = caption_config.preset_names()
    return {
        "version": PROPS_VERSION,
        "src": src,
        "source": {"width": source_width, "height": source_height, "fps": source_fps},
        "start": start,
        "end": end,
        "fps": output_fps(source_fps),
        "crop": {
            "crop_width": crop.crop_width,
            "crop_height": crop.crop_height,
            "x_offsets": crop.x_offsets,
            "segments": [s.model_dump() for s in crop.segments],
        },
        "words": [
            {"word": w.word, "start": w.start, "end": w.end, "speaker": w.speaker}
            for w in words
            if w.end > start and w.start < end
        ],
        "captions": {
            "enabled": captions_enabled,
            "style": caption_style if caption_style in names else caption_config.default_style(),
            "overrides": {k: v for k, v in (caption_overrides or {}).items() if v is not None},
            "profanity_filter": profanity_filter,
        },
    }
