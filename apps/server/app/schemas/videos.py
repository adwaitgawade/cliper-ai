import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

ALLOWED_CONTENT_TYPES = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
    ".webm": "video/webm",
}


class VideoCreate(BaseModel):
    filename: str = Field(min_length=1, max_length=255, examples=["episode-42.mp4"])
    size_bytes: int = Field(gt=0, description="Exact file size; the upload is checked against it")
    content_type: str | None = Field(default=None, description="Defaults from the file extension")
    rights_attested: Literal[True] = Field(description="You own or have rights to process this content")


class VideoFromUrl(BaseModel):
    url: HttpUrl
    rights_attested: Literal[True] = Field(description="You own or have rights to process this content")


class UploadTarget(BaseModel):
    method: Literal["PUT"] = "PUT"
    url: str
    headers: dict[str, str]
    expires_in: int


class VideoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID
    status: str
    source: str
    source_url: str | None
    title: str | None
    filename: str | None
    content_type: str | None
    size_bytes: int | None
    duration: float | None
    width: int | None
    height: int | None
    fps: float | None
    thumbnail_url: str | None = None
    error: dict[str, Any] | None
    rights_attested_at: datetime
    expires_at: datetime | None
    created_at: datetime


class VideoCreated(BaseModel):
    video: VideoOut
    upload: UploadTarget | None = None
