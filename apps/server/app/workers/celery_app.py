"""Celery application. Pipeline orchestration lives here, not in FastAPI (D2).

Queues: `gpu` (transcription), `cpu` (ingest, reframe, render), `default` (LLM analysis,
fan-out, finalize, maintenance). Run one worker per pool, e.g.::

    celery -A app.workers.celery_app worker -Q gpu -c 1
    celery -A app.workers.celery_app worker -Q cpu,default -c 4
    celery -A app.workers.celery_app beat
"""

from celery import Celery
from celery.signals import setup_logging, task_prerun

from app.core.config import get_settings
from app.core.logging import configure_logging

settings = get_settings()

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
        "pipeline.render_clip": {"queue": settings.queue_cpu},
        "pipeline.finalize": {"queue": settings.queue_default},
        "maintenance.*": {"queue": settings.queue_default},
    },
    beat_schedule={
        "requeue-stale-jobs": {"task": "maintenance.requeue_stale_jobs", "schedule": 300.0},
        "purge-expired-videos": {"task": "maintenance.purge_expired_videos", "schedule": 3600.0},
    },
)


@setup_logging.connect
def _setup_logging(**_: object) -> None:
    configure_logging(settings.log_level, settings.log_json)


@task_prerun.connect
def _bind_task_context(task_id: str | None = None, task: object = None, args: tuple = (), **_: object) -> None:
    import structlog

    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(task=getattr(task, "name", None), task_id=task_id)
    if args:
        structlog.contextvars.bind_contextvars(job_id=str(args[0]))
