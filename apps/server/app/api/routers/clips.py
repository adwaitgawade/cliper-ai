"""Clips: details with signed URLs, edits, single-clip re-render (UC3, FR-REV-1/2)."""

import bisect
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.api.deps import DB, CurrentPrincipal, get_scoped, rate_limit
from app.api.dispatch import Dispatcher, get_dispatcher
from app.api.routers.videos import purge
from app.core.errors import AppError, Conflict
from app.core.ids import uuid7
from app.db.models import Artifact, ArtifactKind, Clip, ClipStatus, Job, Render, RenderStatus, Video
from app.pipeline.types import Transcript
from app.schemas.clips import ClipOut, ClipPatch, RenderOut
from app.storage.s3 import clip_key, get_storage

router = APIRouter(prefix="/v1/clips", tags=["clips"], dependencies=[Depends(rate_limit)])

MIN_CLIP_SECONDS, MAX_CLIP_SECONDS = 1.0, 180.0


def render_out(render: Render) -> RenderOut:
    out = RenderOut.model_validate(render)
    if render.status == RenderStatus.succeeded and render.storage_key:
        storage = get_storage()
        out.download_url = storage.presign_get(render.storage_key, filename=f"clip-{render.clip_id}.mp4")
        if render.thumbnail_key:
            out.thumbnail_url = storage.presign_get(render.thumbnail_key)
        caps = (render.meta or {}).get("captions") or {}
        out.captions = {
            fmt: storage.presign_get(key, filename=f"clip-{render.clip_id}.{fmt}") for fmt, key in caps.items()
        }
    return out


def clip_out(clip: Clip, render: Render | None) -> ClipOut:
    return ClipOut(
        id=clip.id,
        job_id=clip.job_id,
        rank=clip.rank,
        start=clip.start_s,
        end=clip.end_s,
        duration=round(clip.end_s - clip.start_s, 3),
        score=clip.score,
        scores=clip.scores,
        title=clip.title,
        hook=clip.hook,
        reason=clip.reason,
        hashtags=list(clip.hashtags or []),
        layout=clip.layout,
        caption_style=clip.caption_style,
        status=clip.status,
        created_at=clip.created_at,
        updated_at=clip.updated_at,
        latest_render=render_out(render) if render else None,
    )


async def latest_renders(db: AsyncSession, clip_ids: list[uuid.UUID]) -> dict[uuid.UUID, Render]:
    if not clip_ids:
        return {}
    rows = await db.execute(
        select(Render)
        .where(Render.clip_id.in_(clip_ids))
        .distinct(Render.clip_id)
        .order_by(Render.clip_id, Render.created_at.desc())
    )
    return {r.clip_id: r for r in rows.scalars()}


async def _load_transcript(db: AsyncSession, job_id: uuid.UUID) -> Transcript:
    key = (
        await db.execute(
            select(Artifact.storage_key).where(
                Artifact.job_id == job_id, Artifact.kind == ArtifactKind.transcript, Artifact.clip_id.is_(None)
            )
        )
    ).scalar_one_or_none()
    if key is None:
        raise Conflict("Transcript is not available for this clip's job", code="transcript_not_ready")
    data = await run_in_threadpool(get_storage().get_json, key)
    return Transcript.model_validate(data)


def snap_start(t: float, transcript: Transcript) -> float:
    """Nearest word start to `t`."""
    starts = [w.start for w in transcript.words]
    i = bisect.bisect_left(starts, t)
    options = [starts[j] for j in (i - 1, i) if 0 <= j < len(starts)]
    return min(options, key=lambda s: abs(s - t))


def snap_end(t: float, transcript: Transcript) -> float:
    """Nearest word end to `t`."""
    ends = [w.end for w in transcript.words]
    i = bisect.bisect_left(ends, t)
    options = [ends[j] for j in (i - 1, i) if 0 <= j < len(ends)]
    return min(options, key=lambda e: abs(e - t))


@router.get("/{clip_id}", response_model=ClipOut, summary="Clip details with signed download URL")
async def get_clip(clip_id: uuid.UUID, principal: CurrentPrincipal, db: DB) -> ClipOut:
    clip = await get_scoped(db, Clip, clip_id, principal)
    renders = await latest_renders(db, [clip.id])
    return clip_out(clip, renders.get(clip.id))


@router.patch("/{clip_id}", response_model=ClipOut, summary="Edit trim, caption style or layout")
async def patch_clip(clip_id: uuid.UUID, body: ClipPatch, principal: CurrentPrincipal, db: DB) -> ClipOut:
    clip = await get_scoped(db, Clip, clip_id, principal)
    if body.start is not None or body.end is not None:
        transcript = await _load_transcript(db, clip.job_id)
        if not transcript.words:
            raise Conflict("Transcript has no words to snap to")
        start = snap_start(body.start, transcript) if body.start is not None else clip.start_s
        end = snap_end(body.end, transcript) if body.end is not None else clip.end_s
        duration = (
            await db.execute(select(Video.duration).join(Job, Job.video_id == Video.id).where(Job.id == clip.job_id))
        ).scalar_one_or_none() or transcript.duration
        if not (0 <= start < end <= duration + 0.05):
            raise AppError("Trim is outside the video", code="invalid_trim")
        if not (MIN_CLIP_SECONDS <= end - start <= MAX_CLIP_SECONDS):
            raise AppError(f"Clip must be {MIN_CLIP_SECONDS:g}-{MAX_CLIP_SECONDS:g} seconds", code="invalid_trim")
        clip.start_s, clip.end_s = round(start, 3), round(end, 3)
    if body.caption_style is not None:
        clip.caption_style = body.caption_style
    if body.layout is not None:
        clip.layout = body.layout
    if body.title is not None:
        clip.title = body.title
    await db.commit()
    await db.refresh(clip)
    renders = await latest_renders(db, [clip.id])
    return clip_out(clip, renders.get(clip.id))


@router.post(
    "/{clip_id}/render",
    response_model=RenderOut,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Re-render one clip without re-running upstream stages",
)
async def rerender_clip(
    clip_id: uuid.UUID,
    principal: CurrentPrincipal,
    db: DB,
    dispatcher: Annotated[Dispatcher, Depends(get_dispatcher)],
) -> RenderOut:
    clip = await get_scoped(db, Clip, clip_id, principal)
    active = (
        await db.execute(
            select(Render.id).where(
                Render.clip_id == clip.id, Render.status.in_([RenderStatus.queued, RenderStatus.running])
            )
        )
    ).first()
    if active:
        raise Conflict("A render for this clip is already in progress", code="render_in_progress")
    render = Render(id=uuid7(), clip_id=clip.id, status=RenderStatus.queued)
    db.add(render)
    clip.status = ClipStatus.pending
    await db.commit()
    await db.refresh(render)
    try:
        dispatcher.enqueue_render(clip.id, render.id)
    except Exception as e:
        render.status = RenderStatus.failed
        render.error = {"code": "queue_unavailable", "message": "Could not enqueue", "retryable": True}
        await db.commit()
        raise AppError("The job queue is unavailable; retry shortly", code="queue_unavailable", status_code=503) from e
    return render_out(render)


@router.delete("/{clip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_clip(
    clip_id: uuid.UUID,
    principal: CurrentPrincipal,
    db: DB,
    dispatcher: Annotated[Dispatcher, Depends(get_dispatcher)],
) -> None:
    clip = await get_scoped(db, Clip, clip_id, principal)
    prefix = clip_key(clip.workspace_id, clip.job_id, clip.id, "")
    await db.delete(clip)
    await db.commit()
    await purge([prefix], dispatcher)
