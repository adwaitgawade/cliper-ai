import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.pipeline.ai_edit import ClipDraft


class AiEditCreate(BaseModel):
    instruction: str = Field(min_length=1, max_length=500, description="What to change, in plain language")
    base: ClipDraft | None = Field(
        default=None, description="The editor's current draft, including unsaved edits; defaults to the saved clip"
    )


class AiEditOut(BaseModel):
    id: uuid.UUID
    clip_id: uuid.UUID
    status: str = Field(description="queued, running, succeeded or failed")
    instruction: str
    summary: str | None = None
    proposal: ClipDraft | None = Field(
        default=None, description="The draft with the edit applied. Not saved: load it as unsaved changes"
    )
    applied: list[str] = Field(default_factory=list, description="What changed")
    ignored: list[str] = Field(default_factory=list, description="Requested changes that could not be applied")
    error: dict[str, Any] | None = None
    created_at: datetime
    finished_at: datetime | None = None
