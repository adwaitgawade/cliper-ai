"""Jobs: start the pipeline, track progress (poll or SSE), read results."""

import asyncio
import time
import uuid
from collections.abc import AsyncIterable
from datetime import UTC, datetime
from typing import Annotated, Any

import structlog
from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.sse import EventSourceResponse, ServerSentEvent
from sqlalchemy import select, update
from starlette.concurrency import run_in_threadpool

from app.api.deps import DB, CurrentPrincipal, get_scoped, rate_limit, rate_limit_jobs
from app.api.dispatch import Dispatcher, get_dispatcher
from app.api.routers.clips import clip_out, latest_renders
from app.api.routers.videos import purge
from app.core.errors import AppError, Conflict, NotFound
from app.core.ids import uuid7
from app.core.net import assert_public_url
from app.db.models import TERMINAL_JOB_STATES, Artifact, ArtifactKind, Clip, Job, JobState, Video, VideoStatus
from app.db.session import get_async_sessionmaker
from app.schemas.clips import ClipOut
from app.schemas.common import Page
from app.schemas.jobs import JobCreate, JobEvent, JobOut
from app.storage.s3 import get_storage, job_prefix

log = structlog.get_logger()
router = APIRouter(prefix="/v1/jobs", tags=["jobs"], dependencies=[Depends(rate_limit)])

Dispatch = Annotated[Dispatcher, Depends(get_dispatcher)]
_STARTABLE = {VideoStatus.uploaded, VideoStatus.pending_download, VideoStatus.ready}


def _enqueue(dispatcher: Dispatcher, job: Job) -> None:
    try:
        dispatcher.enqueue_pipeline(job.id, job.attempt)
    except Exception as e:
        log.exception("enqueue_failed", job_id=str(job.id))
        raise AppError("The job queue is unavailable; retry shortly", code="queue_unavailable", status_code=503) from e


@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit_jobs)])
async def create_job(body: JobCreate, principal: CurrentPrincipal, db: DB, dispatcher: Dispatch) -> Job:
    video = await get_scoped(db, Video, body.video_id, principal)
    if video.status not in _STARTABLE:
        raise Conflict(f"Video is {video.status}", code="video_not_ready")
    if body.options.webhook_url:
        await run_in_threadpool(assert_public_url, str(body.options.webhook_url))
    job = Job(
        id=uuid7(),
        workspace_id=principal.workspace_id,
        video_id=video.id,
        created_by=principal.user_id,
        options=body.options.model_dump(mode="json"),
        state=JobState.queued,
        attempt=1,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    try:
        _enqueue(dispatcher, job)
    except AppError:
        job.state = JobState.failed
        job.error = {"code": "queue_unavailable", "message": "Could not enqueue", "stage": None, "retryable": True}
        await db.commit()
        raise
    return job


@router.get("", response_model=Page[JobOut])
async def list_jobs(
    principal: CurrentPrincipal,
    db: DB,
    video_id: uuid.UUID | None = None,
    state: JobState | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    cursor: datetime | None = None,
) -> Page[JobOut]:
    stmt = select(Job).where(Job.workspace_id == principal.workspace_id)
    if video_id:
        stmt = stmt.where(Job.video_id == video_id)
    if state:
        stmt = stmt.where(Job.state == state)
    if cursor:
        stmt = stmt.where(Job.created_at < cursor)
    rows = list((await db.execute(stmt.order_by(Job.created_at.desc()).limit(limit + 1))).scalars())
    items = rows[:limit]
    return Page(
        items=[JobOut.model_validate(j) for j in items], next_cursor=items[-1].created_at if len(rows) > limit else None
    )


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: uuid.UUID, principal: CurrentPrincipal, db: DB) -> Job:
    return await get_scoped(db, Job, job_id, principal)


def _event(job: Job) -> JobEvent:
    return JobEvent(id=job.id, state=job.state, stage=job.stage, progress=job.progress, error=job.error)


@router.get("/{job_id}/events", response_class=EventSourceResponse, summary="Server-sent progress events")
async def job_events(
    job_id: uuid.UUID, request: Request, principal: CurrentPrincipal, db: DB
) -> AsyncIterable[ServerSentEvent]:
    await get_scoped(db, Job, job_id, principal)
    await db.close()  # don't pin a pooled connection for the life of the stream
    sessionmaker = get_async_sessionmaker()
    last: tuple[Any, ...] | None = None
    last_sent = time.monotonic()
    while not await request.is_disconnected():
        async with sessionmaker() as session:
            job = await session.get(Job, job_id)
        if job is None:
            yield ServerSentEvent(event="deleted", data={"id": str(job_id)})
            return
        snapshot = (job.state, job.stage, job.progress, job.error)
        if snapshot != last:
            last, last_sent = snapshot, time.monotonic()
            yield ServerSentEvent(
                event="progress", id=f"{job.state}:{job.progress}", data=_event(job).model_dump(mode="json")
            )
        elif time.monotonic() - last_sent > 15:
            last_sent = time.monotonic()
            yield ServerSentEvent(comment="keepalive")
        if JobState(job.state) in TERMINAL_JOB_STATES:
            yield ServerSentEvent(event="end", data=_event(job).model_dump(mode="json"))
            return
        await asyncio.sleep(1)


@router.get("/{job_id}/transcript", summary="Transcript JSON (language, sentences, words)")
async def get_transcript(job_id: uuid.UUID, principal: CurrentPrincipal, db: DB) -> Any:
    await get_scoped(db, Job, job_id, principal)
    key = (
        await db.execute(
            select(Artifact.storage_key).where(
                Artifact.job_id == job_id, Artifact.kind == ArtifactKind.transcript, Artifact.clip_id.is_(None)
            )
        )
    ).scalar_one_or_none()
    if key is None:
        raise NotFound("Transcript is not available yet", code="transcript_not_ready")
    return await run_in_threadpool(get_storage().get_json, key)


@router.get("/{job_id}/clips", response_model=list[ClipOut], summary="Ranked clips with metadata")
async def list_job_clips(job_id: uuid.UUID, principal: CurrentPrincipal, db: DB) -> list[ClipOut]:
    await get_scoped(db, Job, job_id, principal)
    clips = list((await db.execute(select(Clip).where(Clip.job_id == job_id).order_by(Clip.rank))).scalars())
    renders = await latest_renders(db, [c.id for c in clips])
    return [clip_out(c, renders.get(c.id)) for c in clips]


@router.post("/{job_id}/cancel", response_model=JobOut)
async def cancel_job(job_id: uuid.UUID, principal: CurrentPrincipal, db: DB) -> Job:
    job = await get_scoped(db, Job, job_id, principal)
    if JobState(job.state) in TERMINAL_JOB_STATES:
        raise Conflict(f"Job is already {job.state}")
    job.state = JobState.canceled
    job.finished_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(job)
    return job


@router.post(
    "/{job_id}/retry", response_model=JobOut, summary="Resume a failed or canceled job from its last completed stage"
)
async def retry_job(job_id: uuid.UUID, principal: CurrentPrincipal, db: DB, dispatcher: Dispatch) -> Job:
    job = await get_scoped(db, Job, job_id, principal)
    if job.state not in (JobState.failed, JobState.canceled):
        raise Conflict("Only failed or canceled jobs can be retried")
    result = await db.execute(
        update(Job)
        .where(Job.id == job.id, Job.attempt == job.attempt)
        .values(
            state=JobState.queued, error=None, finished_at=None, attempt=job.attempt + 1, heartbeat_at=datetime.now(UTC)
        )
        .returning(Job.attempt)
    )
    if result.scalar_one_or_none() is None:
        raise Conflict("Job changed concurrently; try again")
    await db.commit()
    await db.refresh(job)
    _enqueue(dispatcher, job)
    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete the job and all its media")
async def delete_job(job_id: uuid.UUID, principal: CurrentPrincipal, db: DB, dispatcher: Dispatch) -> None:
    job = await get_scoped(db, Job, job_id, principal)
    prefix = job_prefix(job.workspace_id, job.id)
    await db.delete(job)  # running tasks see the job is gone and stop
    await db.commit()
    await purge([prefix], dispatcher)
