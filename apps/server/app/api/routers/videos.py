"""Video upload (presigned direct-to-storage, or multipart for small files) and URL ingest."""

import uuid
from datetime import UTC, datetime, timedelta
from pathlib import PurePosixPath
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy import select
from starlette.concurrency import run_in_threadpool

from app.api.deps import DB, CurrentPrincipal, get_scoped, rate_limit
from app.api.dispatch import Dispatcher, get_dispatcher
from app.core.config import get_settings
from app.core.errors import AppError, Conflict
from app.core.ids import uuid7
from app.core.net import assert_public_url
from app.db.models import Job, Video, VideoSource, VideoStatus
from app.schemas.common import Page
from app.schemas.videos import ALLOWED_CONTENT_TYPES, UploadTarget, VideoCreate, VideoCreated, VideoFromUrl, VideoOut
from app.storage.s3 import get_storage, job_prefix, video_key, video_prefix

log = structlog.get_logger()
router = APIRouter(prefix="/v1/videos", tags=["videos"], dependencies=[Depends(rate_limit)])


def _extension(filename: str) -> str:
    ext = PurePosixPath(filename).suffix.lower()
    if ext not in get_settings().allowed_extensions:
        raise AppError(
            f"Unsupported file type '{ext or filename}'. Allowed: {', '.join(get_settings().allowed_extensions)}",
            code="unsupported_file_type",
            status_code=415,
        )
    return ext


def _video_out(video: Video) -> VideoOut:
    out = VideoOut.model_validate(video)
    if video.thumbnail_key:
        out.thumbnail_url = get_storage().presign_get(video.thumbnail_key)
    return out


def _new_video(principal: CurrentPrincipal, **fields: object) -> Video:
    now = datetime.now(UTC)
    return Video(
        workspace_id=principal.workspace_id,
        created_by=principal.user_id,
        rights_attested_at=now,
        expires_at=now + timedelta(days=get_settings().retention_days),
        **fields,
    )


@router.post(
    "",
    response_model=VideoCreated,
    status_code=status.HTTP_201_CREATED,
    summary="Create a video and get a presigned upload URL",
)
async def create_video(body: VideoCreate, principal: CurrentPrincipal, db: DB) -> VideoCreated:
    s = get_settings()
    ext = _extension(body.filename)
    if body.size_bytes > s.max_upload_bytes:
        raise AppError(
            f"File exceeds the {s.max_upload_bytes // 1024**3} GB limit", code="file_too_large", status_code=413
        )
    content_type = body.content_type or ALLOWED_CONTENT_TYPES[ext]
    video_id = uuid7()
    key = video_key(principal.workspace_id, video_id, ext)
    video = _new_video(
        principal,
        id=video_id,
        status=VideoStatus.pending_upload,
        source=VideoSource.upload,
        filename=body.filename,
        content_type=content_type,
        size_bytes=body.size_bytes,
        storage_key=key,
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)
    url = get_storage().presign_put(key, content_type)
    return VideoCreated(
        video=VideoOut.model_validate(video),
        upload=UploadTarget(url=url, headers={"Content-Type": content_type}, expires_in=s.presign_ttl_seconds),
    )


@router.post("/{video_id}/complete", response_model=VideoOut, summary="Confirm a presigned upload finished")
async def complete_upload(video_id: uuid.UUID, principal: CurrentPrincipal, db: DB) -> Video:
    video = await get_scoped(db, Video, video_id, principal)
    if video.status != VideoStatus.pending_upload:
        return video
    head = await run_in_threadpool(get_storage().head, video.storage_key)
    if head is None:
        raise Conflict("The file has not been uploaded yet", code="upload_missing")
    size = int(head.get("ContentLength", 0))
    if size > get_settings().max_upload_bytes or (video.size_bytes and size != video.size_bytes):
        raise AppError("Uploaded size does not match the declared size", code="upload_size_mismatch")
    video.size_bytes = size
    video.status = VideoStatus.uploaded
    await db.commit()
    await db.refresh(video)
    return video


@router.post(
    "/upload",
    response_model=VideoOut,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a small file directly (multipart)",
)
async def upload_video(
    principal: CurrentPrincipal,
    db: DB,
    file: Annotated[UploadFile, File(description="Video file (small files only; use presigned upload for large)")],
    rights_attested: Annotated[bool, Form(description="You own or have rights to process this content")],
) -> Video:
    s = get_settings()
    if not rights_attested:
        raise AppError("You must attest that you have rights to this content", code="rights_not_attested")
    ext = _extension(file.filename or "")
    size = file.size or 0
    if size > s.max_multipart_upload_bytes:
        raise AppError(
            f"Multipart uploads are limited to {s.max_multipart_upload_bytes // 1024**2} MB; "
            "use POST /v1/videos for a presigned upload",
            code="file_too_large",
            status_code=413,
        )
    video_id = uuid7()
    key = video_key(principal.workspace_id, video_id, ext)
    content_type = ALLOWED_CONTENT_TYPES[ext]
    await run_in_threadpool(get_storage().upload_fileobj, file.file, key, content_type)
    video = _new_video(
        principal,
        id=video_id,
        status=VideoStatus.uploaded,
        source=VideoSource.upload,
        filename=file.filename,
        content_type=content_type,
        size_bytes=size or None,
        storage_key=key,
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)
    return video


@router.post(
    "/from-url",
    response_model=VideoOut,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a video from a URL (requires rights attestation)",
)
async def video_from_url(body: VideoFromUrl, principal: CurrentPrincipal, db: DB) -> Video:
    s = get_settings()
    if not s.url_ingest_enabled:
        raise AppError("URL ingest is disabled", code="url_ingest_disabled", status_code=403)
    url = str(body.url)
    await run_in_threadpool(assert_public_url, url, allowed_domains=s.url_ingest_allowed_domains or None)
    video_id = uuid7()
    video = _new_video(
        principal,
        id=video_id,
        status=VideoStatus.pending_download,
        source=VideoSource.url,
        source_url=url,
        storage_key=video_key(principal.workspace_id, video_id, ""),
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)
    return video


@router.get("", response_model=Page[VideoOut])
async def list_videos(
    principal: CurrentPrincipal,
    db: DB,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    cursor: Annotated[datetime | None, Query(description="next_cursor from the previous page")] = None,
) -> Page[VideoOut]:
    stmt = select(Video).where(Video.workspace_id == principal.workspace_id)
    if cursor:
        stmt = stmt.where(Video.created_at < cursor)
    rows = list((await db.execute(stmt.order_by(Video.created_at.desc()).limit(limit + 1))).scalars())
    items = rows[:limit]
    return Page(
        items=[_video_out(v) for v in items],
        next_cursor=items[-1].created_at if len(rows) > limit else None,
    )


@router.get("/{video_id}", response_model=VideoOut)
async def get_video(video_id: uuid.UUID, principal: CurrentPrincipal, db: DB) -> VideoOut:
    return _video_out(await get_scoped(db, Video, video_id, principal))


@router.delete(
    "/{video_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a video, its jobs, clips and all media"
)
async def delete_video(
    video_id: uuid.UUID,
    principal: CurrentPrincipal,
    db: DB,
    dispatcher: Annotated[Dispatcher, Depends(get_dispatcher)],
) -> None:
    video = await get_scoped(db, Video, video_id, principal)
    job_ids = list((await db.execute(select(Job.id).where(Job.video_id == video.id))).scalars())
    prefixes = [video_prefix(video.workspace_id, video.id)] + [job_prefix(video.workspace_id, j) for j in job_ids]
    await db.delete(video)  # cascades to jobs, clips, artifacts, renders
    await db.commit()
    await purge(prefixes, dispatcher)


async def purge(prefixes: list[str], dispatcher: Dispatcher) -> None:
    try:
        dispatcher.purge_prefixes(prefixes)
    except Exception:
        log.warning("purge_enqueue_failed_inline_fallback")
        storage = get_storage()
        for p in prefixes:
            await run_in_threadpool(storage.delete_prefix, p)
