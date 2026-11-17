"""Celery application. Pipeline orchestration lives here, not in FastAPI (D2).

Queues:

- `gpu`: transcription.
- `cpu`: ingest (download, probe, transcode, audio) and clip posters.
- `render`: clip renders (Remotion + ffmpeg). Separate from `cpu` so a burst of renders
  never holds up new jobs, and so render capacity scales on its own.
- `interactive`: requests someone is waiting on in the editor (AI edits). I/O bound.
- `default`: LLM analysis, fan-out, finalize, maintenance.

Run one worker per pool, e.g.::

    celery -A app.workers.celery_app worker -Q gpu -c 1
    celery -A app.workers.celery_app worker -Q cpu,default -c 4
    celery -A app.workers.celery_app worker -Q render -c 2
    celery -A app.workers.celery_app worker -Q interactive -P threads -c 16
    celery -A app.workers.celery_app beat

Every message carries `enqueued_at` and `trace_id` headers. The trace id is the API
request id that started the work (or a fresh one), bound into every log line of every
task that follows from it. A task that waited longer than QUEUE_DELAY_ALERT_SECONDS
before starting raises a `queue_delay` alert.
"""

import contextlib
import time
import uuid
from datetime import datetime
from typing import Any

import structlog
from celery import Celery
from celery.signals import before_task_publish, setup_logging, task_prerun

from app.core.config import get_settings
from app.core.logging import configure_logging

settings = get_settings()
log = structlog.get_logger()

celery_app = Celery(
    "clippro", broker=settings.broker_url, backend=settings.result_backend, include=["app.workers.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    # Resume on worker death: a task is acknowledged only after it finishes, and is
    # redelivered if the worker process is killed mid-task.
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    broker_transport_options={"visibility_timeout": settings.celery_visibility_timeout},
    result_expires=24 * 3600,
    task_default_queue=settings.queue_default,
    task_routes={
        "pipeline.ingest": {"queue": settings.queue_cpu},
        "pipeline.transcribe": {"queue": settings.queue_gpu},
        "pipeline.analyze": {"queue": settings.queue_default},
        "pipeline.fanout": {"queue": settings.queue_default},
        "pipeline.render_clip": {"queue": settings.queue_render},
        "pipeline.finalize": {"queue": settings.queue_default},
        "interactive.*": {"queue": settings.queue_interactive},
        "maintenance.*": {"queue": settings.queue_default},
    },
    beat_schedule={
        "requeue-stale-jobs": {"task": "maintenance.requeue_stale_jobs", "schedule": 300.0},
        "purge-expired-videos": {"task": "maintenance.purge_expired_videos", "schedule": 3600.0},
        "wake-waiting-jobs": {"task": "maintenance.wake_waiting_jobs", "schedule": 60.0},
        "sweep-orphaned-media": {"task": "maintenance.sweep_orphaned_media", "schedule": 6 * 3600.0},
        "sweep-shared-cache": {"task": "maintenance.sweep_shared_cache", "schedule": 24 * 3600.0},
    },
)


@setup_logging.connect
def _setup_logging(**_: object) -> None:
    configure_logging(settings.log_level, settings.log_json)


def current_trace_id() -> str | None:
    ctx = structlog.contextvars.get_contextvars()
    return ctx.get("trace_id") or ctx.get("request_id")


@before_task_publish.connect
def _stamp_message(headers: dict[str, Any] | None = None, **_: object) -> None:
    """Runs in whichever process publishes (API or worker), so chains, retries and
    fan-outs all carry the trace id of the request that started them."""
    if headers is None:
        return
    headers["enqueued_at"] = time.time()
    headers.setdefault("trace_id", current_trace_id() or uuid.uuid4().hex)


def _header(request: Any, name: str) -> Any:
    # Custom message headers surface as request attributes (protocol 2).
    value = getattr(request, name, None)
    if value is None:
        value = (getattr(request, "headers", None) or {}).get(name)
    return value


def queue_wait_seconds(request: Any, now: float | None = None) -> float | None:
    """Seconds between when the task became runnable and now. A countdown/ETA task
    becomes runnable at its ETA, not when it was published."""
    enqueued = _header(request, "enqueued_at")
    if enqueued is None:
        return None
    ready = float(enqueued)
    eta = getattr(request, "eta", None)
    if eta:
        with contextlib.suppress(ValueError):
            ready = max(ready, datetime.fromisoformat(str(eta)).timestamp())
    return max(0.0, (now if now is not None else time.time()) - ready)


def _queue_depth(queue: str) -> int | None:
    if not settings.broker_url.startswith(("redis://", "rediss://")):
        return None
    try:
        from redis import Redis

        depth: Any = Redis.from_url(settings.broker_url, socket_timeout=2, socket_connect_timeout=2).llen(queue)
        return int(depth)
    except Exception:
        return None


def check_queue_delay(task_name: str | None, queue: str | None, waited: float | None) -> bool:
    """Alert when a task waited too long for a worker. Returns whether it alerted."""
    threshold = settings.queue_delay_alert_seconds
    if waited is None or threshold <= 0 or waited < threshold:
        return False
    from app.core.alerts import alert

    queue = queue or "unknown"
    depth = _queue_depth(queue)
    alert(
        "queue_delay",
        f"{task_name} waited {waited:.0f}s on queue '{queue}' (threshold {threshold}s, depth {depth})",
        fingerprint=f"queue_delay:{queue}",
        queue=queue,
        task=task_name,
        waited_seconds=round(waited),
        depth=depth,
    )
    return True


@task_prerun.connect
def _bind_task_context(task_id: str | None = None, task: Any = None, args: tuple = (), **_: object) -> None:
    structlog.contextvars.clear_contextvars()
    request = getattr(task, "request", None)
    trace_id = _header(request, "trace_id") if request is not None else None
    structlog.contextvars.bind_contextvars(
        task=getattr(task, "name", None), task_id=task_id, trace_id=trace_id or uuid.uuid4().hex
    )
    if args and getattr(task, "name", "").startswith("pipeline.") and args[0] is not None:
        structlog.contextvars.bind_contextvars(job_id=str(args[0]))
    if request is None or getattr(request, "is_eager", False):
        return
    waited = queue_wait_seconds(request)
    queue = ((getattr(request, "delivery_info", None) or {}).get("routing_key")) or None
    if waited is not None:
        log.info("task_started", queue=queue, waited_seconds=round(waited, 2))
    check_queue_delay(getattr(task, "name", None), queue, waited)
