import re
import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator

from app.pipeline.caption_config import CaptionOverrides, default_style, preset_names


class ReframeOptions(BaseModel):
    # M1 renders a center crop for every level; A/B/C take effect with M2/M3.
    asd_level: Literal["A", "B", "C"] = "B"


class JobOptions(BaseModel):
    num_clips: int = Field(default=8, ge=1, le=20)
    min_duration: float = Field(default=20, ge=5, le=180, description="Seconds")
    max_duration: float = Field(default=60, ge=5, le=180, description="Seconds")
    instructions: str | None = Field(default=None, max_length=2000, description="Free-text steering for selection")
    caption_style: str = Field(default_factory=default_style, description="Preset name from GET /v1/caption-styles")
    caption_overrides: CaptionOverrides | None = Field(default=None, description="Tweaks applied to every clip")
    reframe: ReframeOptions = Field(default_factory=ReframeOptions)
    language: str = Field(default="auto", description="ISO 639-1 code or 'auto'")
    profanity_filter: bool = False
    webhook_url: HttpUrl | None = None

    @field_validator("caption_style")
    @classmethod
    def _known_style(cls, v: str) -> str:
        if v not in preset_names():
            raise ValueError(f"unknown caption style; choose one of {sorted(preset_names())}")
        return v

    @field_validator("language")
    @classmethod
    def _language(cls, v: str) -> str:
        v = v.lower()
        if v != "auto" and not re.fullmatch(r"[a-z]{2,3}", v):
            raise ValueError("must be an ISO 639 code like 'en' or 'auto'")
        return v

    @model_validator(mode="after")
    def _durations(self) -> "JobOptions":
        if self.min_duration >= self.max_duration:
            raise ValueError("min_duration must be less than max_duration")
        return self


class JobCreate(BaseModel):
    video_id: uuid.UUID
    options: JobOptions = Field(default_factory=JobOptions)


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID
    video_id: uuid.UUID
    state: str
    stage: str | None
    progress: int
    error: dict[str, Any] | None
    options: dict[str, Any]
    attempt: int
    llm_cost_usd: float
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    updated_at: datetime


class JobEvent(BaseModel):
    id: uuid.UUID
    state: str
    stage: str | None
    progress: int
    error: dict[str, Any] | None
