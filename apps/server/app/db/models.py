"""SQLAlchemy models.

All tables live in the `app` schema, which is not exposed through the Supabase
Data API. The backend connects as the `postgres` role. RLS is enabled with no
policies (deny-all for `anon`/`authenticated`) as defense in depth, and tenant
isolation is enforced by scoping every query to a workspace (see `app.api.deps`).
"""

import enum
import uuid
from datetime import datetime
from typing import Any, ClassVar

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.ids import uuid7

SCHEMA = "app"

NAMING_CONVENTION = {
    "ix": "%(table_name)s_%(column_0_N_name)s_idx",
    "uq": "%(table_name)s_%(column_0_N_name)s_key",
    "ck": "%(table_name)s_%(constraint_name)s_check",
    "fk": "%(table_name)s_%(column_0_name)s_fkey",
    "pk": "%(table_name)s_pkey",
}


class Base(DeclarativeBase):
    metadata = MetaData(schema=SCHEMA, naming_convention=NAMING_CONVENTION)
    type_annotation_map: ClassVar[dict[Any, Any]] = {dict[str, Any]: JSONB, uuid.UUID: UUID(as_uuid=True)}


def _enum_check(column: str, enum_cls: type[enum.StrEnum]) -> CheckConstraint:
    values = ", ".join(f"'{v.value}'" for v in enum_cls)
    return CheckConstraint(f"{column} in ({values})", name=f"{column}_valid")


class WorkspaceRole(enum.StrEnum):
    owner = "owner"
    admin = "admin"
    member = "member"


class VideoStatus(enum.StrEnum):
    pending_upload = "pending_upload"
    uploaded = "uploaded"
    pending_download = "pending_download"
    ready = "ready"
    invalid = "invalid"


class VideoSource(enum.StrEnum):
    upload = "upload"
    url = "url"


class JobState(enum.StrEnum):
    queued = "queued"
    ingesting = "ingesting"
    transcribing = "transcribing"
    analyzing = "analyzing"
    reframing = "reframing"
    rendering = "rendering"
    completed = "completed"
    failed = "failed"
    canceled = "canceled"

    @property
    def is_terminal(self) -> bool:
        return self in TERMINAL_JOB_STATES


TERMINAL_JOB_STATES = frozenset({JobState.completed, JobState.failed, JobState.canceled})


class ArtifactKind(enum.StrEnum):
    audio = "audio"
    transcript = "transcript"
    scenes = "scenes"
    candidates = "candidates"
    scores = "scores"
    crop_path = "crop_path"


class ClipStatus(enum.StrEnum):
    pending = "pending"
    rendering = "rendering"
    ready = "ready"
    failed = "failed"


class RenderStatus(enum.StrEnum):
    queued = "queued"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class User(TimestampMixin, Base):
    """Mirror of `auth.users`, provisioned on first authenticated request.

    The migration adds a foreign key to `auth.users(id) on delete cascade`, so deleting
    the Supabase user removes all of their workspaces' data (delete-on-request).
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    email: Mapped[str | None] = mapped_column(Text)


class Workspace(TimestampMixin, Base):
    __tablename__ = "workspaces"
    __table_args__ = (
        Index(
            "workspaces_one_personal_per_user_idx",
            "created_by",
            unique=True,
            postgresql_where=text("is_personal"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    name: Mapped[str] = mapped_column(Text)
    is_personal: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="cascade"), index=True)


class WorkspaceMember(TimestampMixin, Base):
    __tablename__ = "workspace_members"
    __table_args__ = (_enum_check("role", WorkspaceRole),)

    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="cascade"), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="cascade"), primary_key=True, index=True)
    role: Mapped[str] = mapped_column(Text, default=WorkspaceRole.member)


class ApiKey(TimestampMixin, Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="cascade"), index=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="cascade"), index=True)
    name: Mapped[str] = mapped_column(Text)
    prefix: Mapped[str] = mapped_column(String(16), unique=True)
    key_hash: Mapped[str] = mapped_column(String(64))
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Video(TimestampMixin, Base):
    __tablename__ = "videos"
    __table_args__ = (
        _enum_check("status", VideoStatus),
        _enum_check("source", VideoSource),
        Index("videos_workspace_id_created_at_idx", "workspace_id", text("created_at desc")),
        Index("videos_expires_at_idx", "expires_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="cascade"))
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="cascade"), index=True)
    status: Mapped[str] = mapped_column(Text, default=VideoStatus.pending_upload)
    source: Mapped[str] = mapped_column(Text, default=VideoSource.upload)
    source_url: Mapped[str | None] = mapped_column(Text)
    # Title reported by the source site for URL ingests.
    title: Mapped[str | None] = mapped_column(Text)
    filename: Mapped[str | None] = mapped_column(Text)
    content_type: Mapped[str | None] = mapped_column(Text)
    size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    storage_key: Mapped[str] = mapped_column(Text)
    duration: Mapped[float | None] = mapped_column(Float)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    fps: Mapped[float | None] = mapped_column(Float)
    probe: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    thumbnail_key: Mapped[str | None] = mapped_column(Text)
    error: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    rights_attested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Job(TimestampMixin, Base):
    __tablename__ = "jobs"
    __table_args__ = (
        _enum_check("state", JobState),
        CheckConstraint("progress between 0 and 100", name="progress_range"),
        Index("jobs_workspace_id_created_at_idx", "workspace_id", text("created_at desc")),
        # Used by the stale-job reaper.
        Index(
            "jobs_active_heartbeat_idx",
            "heartbeat_at",
            postgresql_where=text("state not in ('completed', 'failed', 'canceled')"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="cascade"))
    video_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("videos.id", ondelete="cascade"), index=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="cascade"), index=True)
    options: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    state: Mapped[str] = mapped_column(Text, default=JobState.queued)
    # Last stage that started; kept on failure so the failure records its stage.
    stage: Mapped[str | None] = mapped_column(Text)
    progress: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    error: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    # Incremented on every (re)enqueue; tasks carrying an older attempt exit early.
    attempt: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    llm_cost_usd: Mapped[float] = mapped_column(Numeric(12, 6), default=0, server_default=text("0"))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    heartbeat_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Artifact(TimestampMixin, Base):
    __tablename__ = "artifacts"
    __table_args__ = (
        _enum_check("kind", ArtifactKind),
        UniqueConstraint("job_id", "kind", "clip_id", postgresql_nulls_not_distinct=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("jobs.id", ondelete="cascade"))
    clip_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("clips.id", ondelete="cascade"), index=True)
    kind: Mapped[str] = mapped_column(Text)
    storage_key: Mapped[str] = mapped_column(Text)
    meta: Mapped[dict[str, Any] | None] = mapped_column(JSONB)


class Clip(TimestampMixin, Base):
    __tablename__ = "clips"
    __table_args__ = (
        _enum_check("status", ClipStatus),
        CheckConstraint("end_s > start_s", name="time_order"),
        Index("clips_job_id_rank_idx", "job_id", "rank"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("jobs.id", ondelete="cascade"))
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="cascade"), index=True)
    rank: Mapped[int] = mapped_column(Integer)
    candidate_id: Mapped[int | None] = mapped_column(Integer)
    start_s: Mapped[float] = mapped_column(Float)
    end_s: Mapped[float] = mapped_column(Float)
    score: Mapped[float | None] = mapped_column(Float)
    scores: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    title: Mapped[str | None] = mapped_column(Text)
    hook: Mapped[str | None] = mapped_column(Text)
    reason: Mapped[str | None] = mapped_column(Text)
    hashtags: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, server_default=text("'{}'"))
    layout: Mapped[str] = mapped_column(Text, default="auto")
    caption_style: Mapped[str] = mapped_column(Text)
    # Per-clip tweaks on top of the preset (see app/pipeline/caption_config.py).
    caption_overrides: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default=text("'{}'::jsonb"))
    status: Mapped[str] = mapped_column(Text, default=ClipStatus.pending)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Render(TimestampMixin, Base):
    __tablename__ = "renders"
    __table_args__ = (
        _enum_check("status", RenderStatus),
        Index("renders_clip_id_created_at_idx", "clip_id", text("created_at desc")),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    clip_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clips.id", ondelete="cascade"))
    status: Mapped[str] = mapped_column(Text, default=RenderStatus.queued)
    storage_key: Mapped[str | None] = mapped_column(Text)
    thumbnail_key: Mapped[str | None] = mapped_column(Text)
    # Caption sidecars and render parameters.
    meta: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    error: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class LlmRun(TimestampMixin, Base):
    __tablename__ = "llm_runs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    job_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("jobs.id", ondelete="cascade"), index=True)
    chain: Mapped[str] = mapped_column(Text)
    model: Mapped[str] = mapped_column(Text)
    prompt_version: Mapped[str] = mapped_column(Text)
    tokens_in: Mapped[int] = mapped_column(Integer, default=0)
    tokens_out: Mapped[int] = mapped_column(Integer, default=0)
    cost: Mapped[float] = mapped_column(Numeric(12, 6), default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    cached: Mapped[bool] = mapped_column(Boolean, default=False)
    error: Mapped[str | None] = mapped_column(Text)
