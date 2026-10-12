"""Per-job execution context shared by pipeline stages."""

import shutil
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import structlog
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.config import Settings, get_settings
from app.core.ids import uuid7
from app.db.models import TERMINAL_JOB_STATES, Artifact, ArtifactKind, Job, JobState, Video
from app.db.session import sync_session
from app.pipeline.types import Transcript
from app.storage.s3 import Storage, get_storage

log = structlog.get_logger()

# Progress band [start, end] per state.
PROGRESS = {
    JobState.ingesting: (0, 10),
    JobState.transcribing: (10, 45),
    JobState.analyzing: (45, 60),
    JobState.reframing: (60, 65),
    JobState.rendering: (65, 99),
}


class StopJob(Exception):
    """The job was canceled, failed elsewhere, or superseded by a newer attempt."""


class JobContext:
    def __init__(self, job_id: uuid.UUID | str, attempt: int, *, storage: Storage | None = None) -> None:
        self.job_id = uuid.UUID(str(job_id))
        self.attempt = attempt
        self.settings: Settings = get_settings()
        self.storage = storage or get_storage()
        self._last_progress_write = 0.0
        self.job, self.video = self._load()
        self.workdir = Path(self.settings.work_dir) / "jobs" / str(self.job_id)
        self.workdir.mkdir(parents=True, exist_ok=True)
        structlog.contextvars.bind_contextvars(job_id=str(self.job_id), attempt=attempt)

    # --- state -------------------------------------------------------------------------
    def _load(self) -> tuple[Job, Video]:
        with sync_session() as db:
            row = db.execute(
                select(Job, Video).join(Video, Video.id == Job.video_id).where(Job.id == self.job_id)
            ).first()
        if row is None:
            raise StopJob("job no longer exists")
        job, video = row
        self._check(job)
        return job, video

    def _check(self, job: Job) -> None:
        if job.attempt != self.attempt:
            raise StopJob(f"superseded by attempt {job.attempt}")
        if job.state in TERMINAL_JOB_STATES:
            raise StopJob(f"job is {job.state}")

    def refresh(self) -> None:
        self.job, self.video = self._load()

    @property
    def options(self) -> dict[str, Any]:
        return self.job.options or {}

    def _update_job(self, **values: Any) -> None:
        """Conditional update: only applies while this attempt still owns a live job."""
        with sync_session() as db:
            result = db.execute(
                update(Job)
                .where(
                    Job.id == self.job_id,
                    Job.attempt == self.attempt,
                    Job.state.not_in([s.value for s in TERMINAL_JOB_STATES]),
                )
                .values(heartbeat_at=datetime.now(UTC), **values)
            )
            db.commit()
        if result.rowcount == 0:  # type: ignore[attr-defined]
            raise StopJob("job is no longer active for this attempt")

    def enter(self, state: JobState) -> None:
        values: dict[str, Any] = {"state": state, "stage": state, "progress": PROGRESS[state][0], "error": None}
        if self.job.started_at is None:
            values["started_at"] = datetime.now(UTC)
            self.job.started_at = values["started_at"]
        self._update_job(**values)
        self.job.state = state
        log.info("stage_started", stage=str(state))

    def progress(self, state: JobState, fraction: float, *, force: bool = False) -> None:
        """Report progress within a stage. Throttled; doubles as heartbeat and cancel check."""
        now = time.monotonic()
        if not force and now - self._last_progress_write < 2.0:
            return
        self._last_progress_write = now
        lo, hi = PROGRESS[state]
        self._update_job(progress=int(lo + (hi - lo) * max(0.0, min(1.0, fraction))))

    # --- artifacts ---------------------------------------------------------------------
    def artifact_key(self, kind: ArtifactKind, clip_id: uuid.UUID | None = None) -> str | None:
        with sync_session() as db:
            return db.execute(
                select(Artifact.storage_key).where(
                    Artifact.job_id == self.job_id,
                    Artifact.kind == kind,
                    Artifact.clip_id.is_(None) if clip_id is None else Artifact.clip_id == clip_id,
                )
            ).scalar_one_or_none()

    def save_artifact(
        self, kind: ArtifactKind, key: str, *, meta: dict[str, Any] | None = None, clip_id: uuid.UUID | None = None
    ) -> None:
        save_artifact(self.job_id, kind, key, meta=meta, clip_id=clip_id)

    # --- local files ---------------------------------------------------------------------
    def source_path(self) -> Path:
        key = self.video.storage_key
        local = self.workdir / ("source" + Path(key).suffix)
        if not local.exists():
            self.storage.download_file(key, local)
        return local

    def local_artifact(self, kind: ArtifactKind, filename: str) -> Path:
        local = self.workdir / filename
        if not local.exists():
            key = self.artifact_key(kind)
            if key is None:
                raise StopJob(f"missing {kind} artifact")
            self.storage.download_file(key, local)
        return local

    def transcript(self) -> Transcript:
        return Transcript.model_validate_json(
            self.local_artifact(ArtifactKind.transcript, "transcript.json").read_text()
        )

    def cleanup(self) -> None:
        shutil.rmtree(self.workdir, ignore_errors=True)


def save_artifact(
    job_id: uuid.UUID,
    kind: ArtifactKind,
    key: str,
    *,
    meta: dict[str, Any] | None = None,
    clip_id: uuid.UUID | None = None,
) -> None:
    with sync_session() as db:
        db.execute(
            pg_insert(Artifact)
            .values(id=uuid7(), job_id=job_id, kind=kind, storage_key=key, meta=meta, clip_id=clip_id)
            .on_conflict_do_update(
                index_elements=[Artifact.job_id, Artifact.kind, Artifact.clip_id],
                set_={"storage_key": key, "meta": meta},
            )
        )
        db.commit()
