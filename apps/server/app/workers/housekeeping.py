"""Storage housekeeping: orphaned media and the shared cache.

Retention (`purge_expired_videos`) and deletes through the API remove media by prefix.
What they can miss: files written by a task that crashed or lost a race with a delete
(a render finishing after its clip was deleted, an upload whose video row was rolled
back). `sweep_orphaned_media` finds those by reference: every object under `ws/` is
attributed to the video, job, clip or render its key names, and deleted when that row
no longer exists. Objects younger than ORPHAN_MIN_AGE_HOURS are left alone, because
their row may simply not be committed yet. Keys that don't follow the layout in
app/storage/s3.py are never touched.
"""

import uuid
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import select

from app.db.models import Clip, Job, Render, Video
from app.db.session import sync_session
from app.storage.shared import SHARED_PREFIX

log = structlog.get_logger()

BATCH = 1000


@dataclass(frozen=True)
class Owner:
    """The rows an object's key says it belongs to (deepest one decides)."""

    video_id: uuid.UUID | None = None
    job_id: uuid.UUID | None = None
    clip_id: uuid.UUID | None = None
    render_id: uuid.UUID | None = None


def owner_of(key: str) -> Owner | None:
    """Parse ws/<ws>/videos/<video>/..., ws/<ws>/jobs/<job>/[clips/<clip>/[renders/<render>/]]..."""
    parts = key.split("/")
    try:
        if len(parts) < 5 or parts[0] != "ws":
            return None
        uuid.UUID(parts[1])
        if parts[2] == "videos":
            return Owner(video_id=uuid.UUID(parts[3]))
        if parts[2] != "jobs":
            return None
        job_id = uuid.UUID(parts[3])
        if len(parts) >= 7 and parts[4] == "clips":
            clip_id = uuid.UUID(parts[5])
            if len(parts) >= 9 and parts[6] == "renders":
                return Owner(job_id=job_id, clip_id=clip_id, render_id=uuid.UUID(parts[7]))
            return Owner(job_id=job_id, clip_id=clip_id)
        return Owner(job_id=job_id)
    except ValueError:
        return None


def _existing(db: Any, column: Any, ids: set[uuid.UUID]) -> set[uuid.UUID]:
    if not ids:
        return set()
    return set(db.execute(select(column).where(column.in_(ids))).scalars())


def _orphans(batch: list[tuple[str, Owner]]) -> list[str]:
    with sync_session() as db:
        videos = _existing(db, Video.id, {o.video_id for _, o in batch if o.video_id})
        jobs = _existing(db, Job.id, {o.job_id for _, o in batch if o.job_id})
        clips = _existing(db, Clip.id, {o.clip_id for _, o in batch if o.clip_id})
        renders = _existing(db, Render.id, {o.render_id for _, o in batch if o.render_id})
    out = []
    for key, o in batch:
        alive = (
            (o.video_id is None or o.video_id in videos)
            and (o.job_id is None or o.job_id in jobs)
            and (o.clip_id is None or o.clip_id in clips)
            and (o.render_id is None or o.render_id in renders)
        )
        if not alive:
            out.append(key)
    return out


def _batches(objects: Iterable[dict[str, Any]], cutoff: datetime) -> Iterable[list[tuple[str, Owner]]]:
    batch: list[tuple[str, Owner]] = []
    for obj in objects:
        if obj["LastModified"] > cutoff:
            continue
        owner = owner_of(obj["Key"])
        if owner is None:
            continue
        batch.append((obj["Key"], owner))
        if len(batch) >= BATCH:
            yield batch
            batch = []
    if batch:
        yield batch


def sweep_orphaned_media(storage: Any, *, min_age_hours: int, now: datetime | None = None) -> int:
    cutoff = (now or datetime.now(UTC)) - timedelta(hours=min_age_hours)
    deleted = 0
    for batch in _batches(storage.iter_objects("ws/"), cutoff):
        orphans = _orphans(batch)
        if orphans:
            deleted += storage.delete_keys(orphans)
    if deleted:
        log.info("orphaned_media_deleted", objects=deleted)
    return deleted


def sweep_shared_cache(storage: Any, *, ttl_days: int, now: datetime | None = None) -> int:
    cutoff = (now or datetime.now(UTC)) - timedelta(days=ttl_days)
    expired = [o["Key"] for o in storage.iter_objects(SHARED_PREFIX) if o["LastModified"] < cutoff]
    if expired:
        storage.delete_keys(expired)
        log.info("shared_cache_expired", objects=len(expired))
    return len(expired)
