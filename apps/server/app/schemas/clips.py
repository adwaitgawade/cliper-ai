import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.pipeline.caption_config import CaptionOverrides, preset_names


class RenderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    error: dict[str, Any] | None
    created_at: datetime
    finished_at: datetime | None
    download_url: str | None = None
    thumbnail_url: str | None = None
    captions: dict[str, str] | None = Field(default=None, description="Signed URLs for ass/srt/vtt")


class ClipOut(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    rank: int
    start: float
    end: float
    duration: float
    score: float | None
    scores: dict[str, Any] | None
    title: str | None
    hook: str | None
    reason: str | None
    hashtags: list[str]
    layout: str
    caption_style: str
    caption_overrides: dict[str, Any]
    status: str
    created_at: datetime
    updated_at: datetime
    latest_render: RenderOut | None = None
    render_outdated: bool = Field(
        default=False, description="The latest finished render was made before the clip's current edits"
    )


class ClipPatch(BaseModel):
    """Edits apply on the next render (POST /v1/clips/{id}/render)."""

    start: float | None = Field(default=None, ge=0, description="Snapped to the nearest word boundary")
    end: float | None = Field(default=None, gt=0, description="Snapped to the nearest word boundary")
    caption_style: str | None = None
    caption_overrides: CaptionOverrides | None = Field(
        default=None, description="Replaces the clip's overrides; {} resets to the preset"
    )
    layout: Literal["auto", "crop", "wide"] | None = None
    title: str | None = Field(default=None, max_length=200)

    @field_validator("caption_style")
    @classmethod
    def _known_style(cls, v: str | None) -> str | None:
        if v is not None and v not in preset_names():
            raise ValueError(f"unknown caption style; choose one of {sorted(preset_names())}")
        return v

    @model_validator(mode="after")
    def _order(self) -> "ClipPatch":
        if self.start is not None and self.end is not None and self.start >= self.end:
            raise ValueError("start must be before end")
        return self


# --- Remotion composition props (mirror of packages/video/src/schema.ts) -----------------


class CompositionSource(BaseModel):
    width: int
    height: int
    fps: float


class CompositionSegment(BaseModel):
    start: float
    end: float
    layout: Literal["crop", "wide"]


class CompositionCrop(BaseModel):
    crop_width: int
    crop_height: int
    x_offsets: list[int] = Field(description="Horizontal offset per output frame from the clip start")
    segments: list[CompositionSegment]


class CompositionWord(BaseModel):
    word: str
    start: float
    end: float
    speaker: str | None = None


class CompositionCaptions(BaseModel):
    enabled: bool
    style: str
    overrides: dict[str, Any]
    profanity_filter: bool


class ClipComposition(BaseModel):
    """Input props for the Remotion `Clip` composition; the render task uses the same props."""

    version: int
    src: str = Field(description="Signed source video URL")
    source: CompositionSource
    start: float
    end: float
    fps: float
    crop: CompositionCrop
    words: list[CompositionWord]
    captions: CompositionCaptions
