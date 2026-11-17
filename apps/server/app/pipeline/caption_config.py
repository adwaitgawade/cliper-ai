"""Caption presets, fonts and limits, shared with the Remotion composition.

The single source of truth is packages/video/src/caption-config.json. The browser
preview and the render worker read the same file, so a preset looks the same in both.
"""

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.config import get_settings

HighlightMode = Literal["word", "karaoke", "none"]
_HEX = re.compile(r"^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$")


class FontSpec(BaseModel):
    family: str
    weights: list[int]


class Preset(BaseModel):
    label: str
    description: str
    font: str
    weight: int
    size: int
    text_color: str
    highlight_color: str
    outline_color: str
    outline_width: float
    shadow: float
    box_color: str | None
    uppercase: bool
    max_words: int
    max_chars: int
    position_y: float
    highlight_mode: HighlightMode
    highlight_scale: float
    emoji: bool = False
    word_box: bool = False
    word_box_color: str | None = None
    glow: bool = False


class HookSpec(BaseModel):
    """Look of the hook title card (its text and duration are per clip overrides)."""

    position_y: float
    size: int
    weight: int
    text_color: str
    box_color: str
    max_chars: int
    default_seconds: float


class Canvas(BaseModel):
    width: int
    height: int
    max_fps: float
    side_margin: int


class CaptionConfig(BaseModel):
    version: int
    default_style: str
    canvas: Canvas
    limits: dict[str, tuple[float, float]]
    fonts: dict[str, FontSpec]
    presets: dict[str, Preset]
    hook: HookSpec
    emoji: dict[str, str]
    profanity: list[str]


def config_path() -> Path:
    configured = get_settings().caption_config_path
    if configured:
        return configured
    # Repository layout: apps/server/app/pipeline/ -> packages/video/src/
    return Path(__file__).resolve().parents[4] / "packages" / "video" / "src" / "caption-config.json"


@lru_cache
def load_config() -> CaptionConfig:
    return CaptionConfig.model_validate(json.loads(config_path().read_text(encoding="utf-8")))


def _limit(name: str) -> tuple[float, float]:
    return load_config().limits[name]


def _hex(v: str | None) -> str | None:
    if v is not None and not _HEX.match(v):
        raise ValueError("must be a hex color like #FFE500 or #00000099")
    return v.upper() if v else v


class CaptionOverrides(BaseModel):
    """Per-clip tweaks on top of a preset. Every field is optional."""

    model_config = ConfigDict(extra="forbid")

    font: str | None = Field(default=None, description="Font key from GET /v1/caption-styles")
    size: float | None = None
    text_color: str | None = None
    highlight_color: str | None = None
    outline_color: str | None = None
    outline_width: float | None = None
    box_color: str | None = Field(default=None, description="Box behind the text; null keeps the preset's")
    uppercase: bool | None = None
    max_words: int | None = None
    position_y: float | None = Field(default=None, description="Vertical center of the captions, 0-1 from the top")
    highlight_mode: HighlightMode | None = None
    emoji: bool | None = Field(default=None, description="Add an emoji after one key word per line")
    word_box: bool | None = Field(default=None, description="Filled pill behind the spoken word")
    word_box_color: str | None = None
    glow: bool | None = Field(default=None, description="Neon glow around the letters")
    hook_text: str | None = Field(
        default=None, max_length=80, description="Title card at the top of the clip; empty for none"
    )
    hook_seconds: float | None = Field(default=None, description="How long the hook title shows")

    @field_validator("font")
    @classmethod
    def _font(cls, v: str | None) -> str | None:
        if v is not None and v not in load_config().fonts:
            raise ValueError(f"unknown font; choose one of {sorted(load_config().fonts)}")
        return v

    @field_validator("text_color", "highlight_color", "outline_color", "box_color", "word_box_color")
    @classmethod
    def _color(cls, v: str | None) -> str | None:
        return _hex(v)

    @field_validator("hook_text")
    @classmethod
    def _hook(cls, v: str | None) -> str | None:
        return hook_text(v)

    @field_validator("size", "outline_width", "max_words", "position_y", "hook_seconds")
    @classmethod
    def _in_range(cls, v: float | None, info: Any) -> float | None:
        if v is None:
            return v
        lo, hi = _limit(info.field_name)
        if not lo <= v <= hi:
            raise ValueError(f"must be between {lo:g} and {hi:g}")
        return v

    def as_dict(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)


def preset_names() -> list[str]:
    return list(load_config().presets)


def default_style() -> str:
    return load_config().default_style


def hook_text(text: str | None) -> str | None:
    """Collapsed whitespace, within the length limit; None when empty (see hookText in style.ts)."""
    t = " ".join((text or "").split())
    return t[: load_config().hook.max_chars] if t else None


def resolve(style_name: str, overrides: dict[str, Any] | None = None) -> Preset:
    """Preset merged with overrides (mirrors resolveStyle in packages/video/src/style.ts).
    Hook overrides are not part of the preset; see resolve_hook."""
    cfg = load_config()
    preset = cfg.presets.get(style_name) or cfg.presets[cfg.default_style]
    fields = Preset.model_fields
    merged = preset.model_copy(update={k: v for k, v in (overrides or {}).items() if v is not None and k in fields})
    if merged.font not in cfg.fonts:
        merged.font = preset.font
    return merged


def resolve_hook(overrides: dict[str, Any] | None) -> tuple[str | None, float]:
    """(hook text or None, seconds on screen), clamped like the composition."""
    o = overrides or {}
    lo, hi = _limit("hook_seconds")
    seconds = o.get("hook_seconds")
    seconds = load_config().hook.default_seconds if seconds is None else seconds
    return hook_text(o.get("hook_text")), min(hi, max(lo, float(seconds)))
