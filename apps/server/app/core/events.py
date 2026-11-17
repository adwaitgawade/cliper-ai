"""Job progress events over Redis pub/sub.

Whoever changes a job's state or progress publishes the new snapshot on the job's
channel; the SSE endpoint subscribes instead of polling Postgres. Publishing is best
effort: the SSE stream also re-reads the row now and then, so a lost message only
delays an update.
"""

import json
import uuid
from typing import Any

import structlog

from app.core.redis import sync_redis

log = structlog.get_logger()


def job_channel(job_id: uuid.UUID | str) -> str:
    return f"jobs:{job_id}:events"


def job_snapshot(job_id: uuid.UUID | str, state: str, stage: str | None, progress: int, error: Any) -> dict[str, Any]:
    """Same shape as `JobEvent` in app/schemas/jobs.py."""
    return {"id": str(job_id), "state": str(state), "stage": stage, "progress": progress, "error": error}


def encode(kind: str, data: dict[str, Any]) -> str:
    return json.dumps({"event": kind, "data": data}, default=str)


def publish_job_event(job_id: uuid.UUID | str, data: dict[str, Any], *, kind: str = "progress") -> None:
    try:
        sync_redis().publish(job_channel(job_id), encode(kind, data))
    except Exception:
        log.debug("job_event_publish_failed", job_id=str(job_id))


async def apublish_job_event(job_id: uuid.UUID | str, data: dict[str, Any], *, kind: str = "progress") -> None:
    from app.core.redis import pubsub_redis

    try:
        await pubsub_redis().publish(job_channel(job_id), encode(kind, data))
    except Exception:
        log.debug("job_event_publish_failed", job_id=str(job_id))
