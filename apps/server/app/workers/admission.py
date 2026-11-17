"""Fairness between workspaces.

Two caps keep one busy workspace from filling every worker:

- **Jobs.** At most WORKSPACE_MAX_ACTIVE_JOBS pipelines per workspace run at once. A job
  over the cap is stored in state `waiting` and not enqueued. When a job of that
  workspace finishes, fails or is canceled, the oldest waiting jobs are started. A
  transaction-scoped advisory lock per workspace serialises the count-and-admit step.
  A beat task also wakes waiting jobs every minute, so a lost wake-up only delays them.

- **Renders.** At most WORKSPACE_MAX_CONCURRENT_RENDERS clip renders per workspace run at
  once. Slots are Redis leases (a sorted set scored by expiry), so a worker that dies
  mid-render frees its slot when the lease runs out. A render without a free slot is put
  back on the queue with a short delay; its row stays `queued`. If Redis is unreachable
  renders are admitted (fail open) rather than stalled.
"""

import uuid
from datetime import UTC, datetime
from typing import Any

import structlog
from sqlalchemy import func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.events import job_snapshot, publish_job_event
from app.core.redis import sync_redis
from app.db.models import TERMINAL_JOB_STATES, Job, JobState
from app.db.session import sync_session

log = structlog.get_logger()

# Live jobs that hold a pipeline slot (waiting jobs don't).
RUNNING_STATES = [s.value for s in JobState if s not in TERMINAL_JOB_STATES and s != JobState.waiting]

_LOCK_SQL = text("select pg_advisory_xact_lock(hashtextextended(:key, 0))")


def _lock_key(workspace_id: uuid.UUID) -> str:
    return f"clippro:admission:{workspace_id}"


def _running_count_stmt(workspace_id: uuid.UUID, exclude: uuid.UUID | None = None) -> Any:
    stmt = select(func.count()).select_from(Job).where(Job.workspace_id == workspace_id, Job.state.in_(RUNNING_STATES))
    if exclude is not None:
        stmt = stmt.where(Job.id != exclude)
    return stmt


def free_job_slots(running: int) -> int | None:
    """Free pipeline slots, or None when there is no cap."""
    limit = get_settings().workspace_max_active_jobs
    return None if limit <= 0 else max(0, limit - running)


async def admit_job(db: AsyncSession, job: Job) -> bool:
    """Decide, inside the caller's transaction, whether `job` may start now. Sets
    `job.state` to queued (start now) or waiting. The caller commits, then enqueues
    the pipeline only when this returns True."""
    if get_settings().workspace_max_active_jobs <= 0:
        job.state = JobState.queued
        return True
    await db.execute(_LOCK_SQL, {"key": _lock_key(job.workspace_id)})
    running = (await db.execute(_running_count_stmt(job.workspace_id, exclude=job.id))).scalar_one()
    free = free_job_slots(running)
    admitted = free is None or free > 0
    job.state = JobState.queued if admitted else JobState.waiting
    if not admitted:
        log.info("job_waiting_for_slot", job_id=str(job.id), running=running)
    return admitted


def wake_waiting_jobs(workspace_id: uuid.UUID | str) -> list[tuple[uuid.UUID, int]]:
    """Start the oldest waiting jobs of a workspace while it has free slots. Returns the
    (job_id, attempt) pairs that were started; their pipelines are already enqueued."""
    from app.workers.tasks import enqueue_pipeline

    ws = uuid.UUID(str(workspace_id))
    with sync_session() as db:
        db.execute(_LOCK_SQL, {"key": _lock_key(ws)})
        running = db.execute(_running_count_stmt(ws)).scalar_one()
        free = free_job_slots(running)
        if free == 0:
            db.commit()
            return []
        stmt = (
            select(Job.id, Job.attempt)
            .where(Job.workspace_id == ws, Job.state == JobState.waiting)
            .order_by(Job.created_at)
            .with_for_update(skip_locked=True)
        )
        if free is not None:
            stmt = stmt.limit(free)
        picked = [(row.id, row.attempt) for row in db.execute(stmt)]
        if picked:
            db.execute(
                update(Job)
                .where(Job.id.in_([jid for jid, _ in picked]), Job.state == JobState.waiting)
                .values(state=JobState.queued, heartbeat_at=datetime.now(UTC))
            )
        db.commit()
    for job_id, attempt in picked:
        publish_job_event(job_id, job_snapshot(job_id, JobState.queued, None, 0, None))
        enqueue_pipeline(job_id, attempt)
        log.info("job_admitted", job_id=str(job_id), attempt=attempt)
    return picked


def workspaces_with_waiting_jobs(limit: int = 500) -> list[uuid.UUID]:
    with sync_session() as db:
        return list(
            db.execute(select(Job.workspace_id).where(Job.state == JobState.waiting).distinct().limit(limit)).scalars()
        )


# --- render slots (Redis leases) --------------------------------------------------------

# KEYS[1] = slot set; ARGV = now, lease seconds, limit, member. Returns 1 when the member
# holds a slot afterwards (newly acquired or renewed), 0 when the set is full.
_ACQUIRE = """
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
local expires = tonumber(ARGV[1]) + tonumber(ARGV[2])
if redis.call('ZSCORE', KEYS[1], ARGV[4]) then
  redis.call('ZADD', KEYS[1], expires, ARGV[4])
  return 1
end
if redis.call('ZCARD', KEYS[1]) < tonumber(ARGV[3]) then
  redis.call('ZADD', KEYS[1], expires, ARGV[4])
  redis.call('EXPIRE', KEYS[1], ARGV[2])
  return 1
end
return 0
"""


def _render_slot_key(workspace_id: uuid.UUID | str) -> str:
    return f"slots:render:{workspace_id}"


def render_lease_seconds() -> int:
    # A lease outlives the longest possible render (the task's hard time limit).
    return get_settings().render_timeout_seconds + 120


def acquire_render_slot(workspace_id: uuid.UUID | str, render_id: uuid.UUID | str, *, redis: Any = None) -> bool:
    limit = get_settings().workspace_max_concurrent_renders
    if limit <= 0:
        return True
    try:
        r = redis or sync_redis()
        now = datetime.now(UTC).timestamp()
        got: Any = r.eval(
            _ACQUIRE,
            1,
            _render_slot_key(workspace_id),
            str(now),
            str(render_lease_seconds()),
            str(limit),
            str(render_id),
        )
        return bool(int(got))
    except Exception:
        log.warning("render_slots_unavailable", workspace_id=str(workspace_id))
        return True


def release_render_slot(workspace_id: uuid.UUID | str, render_id: uuid.UUID | str, *, redis: Any = None) -> None:
    if get_settings().workspace_max_concurrent_renders <= 0:
        return
    try:
        (redis or sync_redis()).zrem(_render_slot_key(workspace_id), str(render_id))
    except Exception:
        log.warning("render_slot_release_failed", workspace_id=str(workspace_id))
