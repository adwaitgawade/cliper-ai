"""Celery tasks: one per pipeline stage, plus fan-out, finalize and maintenance."""

import shutil
import threading
import uuid
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog
from botocore.exceptions import BotoCoreError, ClientError
from celery import Task, chain
from celery.exceptions import Ignore, SoftTimeLimitExceeded
from sqlalchemy import func, select, update
from sqlalchemy.exc import OperationalError

from app.core.config import get_settings
from app.core.errors import PipelineError
from app.db.models import TERMINAL_JOB_STATES, Clip, Job, JobState, Render, RenderStatus, Video
from app.db.session import sync_session
from app.storage.s3 import get_storage, job_prefix, video_prefix
from app.workers import stages
from app.workers.celery_app import celery_app
from app.workers.context import JobContext, StopJob
from app.workers.webhooks import send_webhook

log = structlog.get_logger()
settings = get_settings()

MAX_STAGE_RETRIES = 3
MAX_RENDER_RETRIES = 2
MAX_AUTO_ATTEMPTS = 5
TRANSIENT = (BotoCoreError, ClientError, OperationalError, ConnectionError, TimeoutError)
_LIVE_STATES = [s.value for s in JobState if s not in TERMINAL_JOB_STATES]


# --- enqueue helpers (used by the API) -----------------------------------------------------


def enqueue_pipeline(job_id: uuid.UUID, attempt: int) -> None:
    jid = str(job_id)
    chain(
        ingest_task.si(jid, attempt),
        transcribe_task.si(jid, attempt),
        analyze_task.si(jid, attempt),
        fanout_task.si(jid, attempt),
    ).apply_async()


def enqueue_render(clip_id: uuid.UUID, render_id: uuid.UUID) -> None:
    render_clip_task.si(None, None, str(clip_id), str(render_id)).apply_async()


# --- job state helpers ----------------------------------------------------------------------


def _notify(job_id: uuid.UUID) -> None:
    with sync_session() as db:
        job = db.get(Job, job_id)
        if job is None or not (job.options or {}).get("webhook_url"):
            return
        clips = list(db.execute(select(Clip).where(Clip.job_id == job_id).order_by(Clip.rank)).scalars())
    send_webhook(
        job.options["webhook_url"],
        stages.webhook_payload(job, clips),
        secret=settings.webhook_signing_secret,
        timeout=settings.webhook_timeout_seconds,
    )


def fail_job(job_id: uuid.UUID | str, attempt: int | None, error: dict[str, Any]) -> None:
    jid = uuid.UUID(str(job_id))
    conditions = [Job.id == jid, Job.state.in_(_LIVE_STATES)]
    if attempt is not None:
        conditions.append(Job.attempt == attempt)
    with sync_session() as db:
        result = db.execute(
            update(Job).where(*conditions).values(state=JobState.failed, error=error, finished_at=datetime.now(UTC))
        )
        db.commit()
    if result.rowcount:  # type: ignore[attr-defined]
        log.warning("job_failed", code=error.get("code"), stage=error.get("stage"))
        _notify(jid)


@contextmanager
def heartbeat(job_id: uuid.UUID | str, attempt: int, interval: float = 60.0) -> Iterator[None]:
    """Touch the job's heartbeat while a long blocking call (download, encode) runs, so the
    stale-job reaper only resumes jobs whose worker actually died."""
    stop = threading.Event()

    def _beat() -> None:
        while not stop.wait(interval):
            try:
                with sync_session() as db:
                    db.execute(
                        update(Job)
                        .where(Job.id == uuid.UUID(str(job_id)), Job.attempt == attempt, Job.state.in_(_LIVE_STATES))
                        .values(heartbeat_at=datetime.now(UTC))
                    )
                    db.commit()
            except Exception:
                log.warning("heartbeat_failed")

    thread = threading.Thread(target=_beat, daemon=True)
    thread.start()
    try:
        yield
    finally:
        stop.set()


def _run_stage(task: Task, job_id: str, attempt: int, stage: JobState, fn: Callable[[JobContext], None]) -> None:
    try:
        with heartbeat(job_id, attempt):
            fn(JobContext(job_id, attempt))
    except StopJob as e:
        log.info("stage_skipped", stage=str(stage), reason=str(e))
        raise Ignore() from e
    except SoftTimeLimitExceeded as e:
        fail_job(job_id, attempt, PipelineError("stage_timeout", f"{stage} timed out", retryable=True).to_dict(stage))
        raise Ignore() from e
    except PipelineError as e:
        if e.retryable and task.request.retries < MAX_STAGE_RETRIES:
            raise task.retry(exc=e, countdown=30 * 2**task.request.retries) from e
        fail_job(job_id, attempt, e.to_dict(stage))
        raise Ignore() from e
    except TRANSIENT as e:
        if task.request.retries < MAX_STAGE_RETRIES:
            raise task.retry(exc=e, countdown=30 * 2**task.request.retries) from e
        fail_job(job_id, attempt, PipelineError("transient_error", str(e)[:300], retryable=True).to_dict(stage))
        raise Ignore() from e
    except Exception as e:
        log.exception("stage_crashed", stage=str(stage))
        fail_job(job_id, attempt, PipelineError("internal_error", f"{type(e).__name__}", retryable=True).to_dict(stage))
        raise Ignore() from e


_STAGE_LIMITS = {"soft_time_limit": settings.stage_timeout_seconds, "time_limit": settings.stage_timeout_seconds + 120}


@celery_app.task(name="pipeline.ingest", bind=True, max_retries=MAX_STAGE_RETRIES, **_STAGE_LIMITS)
def ingest_task(self: Task, job_id: str, attempt: int) -> None:
    _run_stage(self, job_id, attempt, JobState.ingesting, stages.ingest)


@celery_app.task(name="pipeline.transcribe", bind=True, max_retries=MAX_STAGE_RETRIES, **_STAGE_LIMITS)
def transcribe_task(self: Task, job_id: str, attempt: int) -> None:
    _run_stage(self, job_id, attempt, JobState.transcribing, stages.transcribe)


@celery_app.task(name="pipeline.analyze", bind=True, max_retries=MAX_STAGE_RETRIES, **_STAGE_LIMITS)
def analyze_task(self: Task, job_id: str, attempt: int) -> None:
    _run_stage(self, job_id, attempt, JobState.analyzing, stages.analyze)


def _fanout(ctx: JobContext) -> None:
    stages.prepare_clips(ctx)
    finalize_task.si(str(ctx.job_id), ctx.attempt).apply_async()


@celery_app.task(name="pipeline.fanout", bind=True, max_retries=MAX_STAGE_RETRIES)
def fanout_task(self: Task, job_id: str, attempt: int) -> None:
    _run_stage(self, job_id, attempt, JobState.reframing, _fanout)


@celery_app.task(
    name="pipeline.render_clip",
    bind=True,
    max_retries=MAX_RENDER_RETRIES,
    soft_time_limit=settings.render_timeout_seconds,
    time_limit=settings.render_timeout_seconds + 60,
)
def render_clip_task(self: Task, job_id: str | None, attempt: int | None, clip_id: str, render_id: str) -> str:
    """Render one clip on demand. `job_id` and `attempt` are unused: they remain so
    messages queued by the old per-job fan-out still deserialize. Never raises at the
    end; failures are recorded on the render and clip instead."""
    cid, rid = uuid.UUID(clip_id), uuid.UUID(render_id)
    status = "succeeded"
    try:
        stages.render_clip(cid, rid, storage=get_storage(), workdir_root=settings.work_dir)
    except StopJob:
        status = "skipped"
    except (PipelineError, *TRANSIENT, SoftTimeLimitExceeded) as e:
        retryable = isinstance(e, TRANSIENT) or (isinstance(e, PipelineError) and e.retryable)
        if retryable and self.request.retries < MAX_RENDER_RETRIES:
            raise self.retry(exc=e, countdown=15 * 2**self.request.retries) from e
        err = e if isinstance(e, PipelineError) else PipelineError("render_failed", str(e)[:300], retryable=True)
        stages.mark_render_failed(cid, rid, err.to_dict("rendering"))
        status = "failed"
    except Exception as e:
        log.exception("render_crashed", clip_id=clip_id)
        stages.mark_render_failed(cid, rid, PipelineError("internal_error", type(e).__name__).to_dict("rendering"))
        status = "failed"
    return status


@celery_app.task(name="pipeline.finalize", bind=True)
def finalize_task(self: Task, job_id: str, attempt: int, *_results: Any) -> None:
    """Complete the job once its clips are picked, then pre-render the top-ranked ones
    in the background. Every other clip renders when someone downloads it."""
    jid = uuid.UUID(job_id)
    prerender: list[tuple[uuid.UUID, uuid.UUID]] = []
    with sync_session() as db:
        clip_ids = list(db.execute(select(Clip.id).where(Clip.job_id == jid).order_by(Clip.rank)).scalars())
        if not clip_ids:
            completed = False
        else:
            result = db.execute(
                update(Job)
                .where(Job.id == jid, Job.attempt == attempt, Job.state.in_(_LIVE_STATES))
                .values(state=JobState.completed, progress=100, error=None, finished_at=datetime.now(UTC))
            )
            completed = bool(result.rowcount)  # type: ignore[attr-defined]
            if completed:
                # Created with the state change, so clients that see "completed" also see
                # the queued renders and keep polling.
                prerender = [
                    (cid, stages.add_render(db, cid))
                    for cid in _unrendered(db, clip_ids[: max(settings.prerender_top_clips, 0)])
                ]
        db.commit()
    if not clip_ids:
        fail_job(jid, attempt, PipelineError("no_clips_found", "No clips were selected").to_dict("reframing"))
        return
    # Before enqueueing: renders write under the job's work dir too.
    shutil.rmtree(settings.work_dir / "jobs" / job_id, ignore_errors=True)
    if not completed:
        return
    for cid, rid in prerender:
        enqueue_render(cid, rid)
    log.info("job_completed", clips=len(clip_ids), prerender=len(prerender))
    _notify(jid)


def _unrendered(db: Any, clip_ids: list[uuid.UUID]) -> list[uuid.UUID]:
    """Clips with no finished or in-flight render (a resumed job may already have some)."""
    done = set(
        db.execute(
            select(Render.clip_id).where(
                Render.clip_id.in_(clip_ids),
                Render.status.in_([RenderStatus.queued, RenderStatus.running, RenderStatus.succeeded]),
            )
        ).scalars()
    )
    return [c for c in clip_ids if c not in done]


# --- maintenance ---------------------------------------------------------------------------


@celery_app.task(name="maintenance.requeue_stale_jobs")
def requeue_stale_jobs() -> int:
    """Resume jobs whose worker died (no heartbeat for STALE_JOB_SECONDS). Each resume
    bumps `attempt`, so any zombie task from the old attempt exits on its next check."""
    cutoff = datetime.now(UTC) - timedelta(seconds=settings.stale_job_seconds)
    resumed = 0
    with sync_session() as db:
        stale = list(
            db.execute(
                select(Job.id, Job.attempt)
                .where(Job.state.in_(_LIVE_STATES), func.coalesce(Job.heartbeat_at, Job.created_at) < cutoff)
                .limit(100)
            ).all()
        )
    for job_id, attempt in stale:
        if attempt >= MAX_AUTO_ATTEMPTS:
            fail_job(job_id, attempt, PipelineError("stalled", "Job stalled repeatedly", retryable=True).to_dict())
            continue
        with sync_session() as db:
            result = db.execute(
                update(Job)
                .where(Job.id == job_id, Job.attempt == attempt, Job.state.in_(_LIVE_STATES))
                .values(attempt=attempt + 1, heartbeat_at=datetime.now(UTC))
            )
            db.commit()
        if result.rowcount:  # type: ignore[attr-defined]
            log.warning("job_resumed", job_id=str(job_id), attempt=attempt + 1)
            enqueue_pipeline(job_id, attempt + 1)
            resumed += 1
    return resumed


def purge_video_media(video: Video, job_ids: list[uuid.UUID]) -> None:
    storage = get_storage()
    storage.delete_prefix(video_prefix(video.workspace_id, video.id))
    for jid in job_ids:
        storage.delete_prefix(job_prefix(video.workspace_id, jid))


@celery_app.task(name="maintenance.purge_expired_videos")
def purge_expired_videos() -> int:
    """Retention: delete videos past `expires_at` with all their jobs and media."""
    purged = 0
    with sync_session() as db:
        videos = list(db.execute(select(Video).where(Video.expires_at < datetime.now(UTC)).limit(100)).scalars())
        for video in videos:
            job_ids = list(db.execute(select(Job.id).where(Job.video_id == video.id)).scalars())
            purge_video_media(video, job_ids)
            db.delete(video)
            db.commit()
            purged += 1
    return purged


@celery_app.task(name="maintenance.purge_prefixes")
def purge_prefixes(prefixes: list[str]) -> int:
    storage = get_storage()
    return sum(storage.delete_prefix(p) for p in prefixes)
