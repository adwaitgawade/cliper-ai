import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.pipeline.captions import PRESETS


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
    status: str
    created_at: datetime
    updated_at: datetime
    latest_render: RenderOut | None = None


class ClipPatch(BaseModel):
    """Edits apply on the next render (POST /v1/clips/{id}/render)."""

    start: float | None = Field(default=None, ge=0, description="Snapped to the nearest word boundary")
    end: float | None = Field(default=None, gt=0, description="Snapped to the nearest word boundary")
    caption_style: str | None = None
    layout: Literal["auto", "crop", "wide"] | None = None
    title: str | None = Field(default=None, max_length=200)

    @field_validator("caption_style")
    @classmethod
    def _known_style(cls, v: str | None) -> str | None:
        if v is not None and v not in PRESETS:
            raise ValueError(f"unknown caption style; choose one of {sorted(PRESETS)}")
        return v

    @model_validator(mode="after")
    def _order(self) -> "ClipPatch":
        if self.start is not None and self.end is not None and self.start >= self.end:
            raise ValueError("start must be before end")
        return self
