"""Hands work to Celery. A dependency, so tests can substitute a recorder."""

import uuid
from typing import Protocol


class Dispatcher(Protocol):
    def enqueue_pipeline(self, job_id: uuid.UUID, attempt: int) -> None: ...
    def enqueue_render(self, clip_id: uuid.UUID, render_id: uuid.UUID) -> None: ...
    def purge_prefixes(self, prefixes: list[str]) -> None: ...


class CeleryDispatcher:
    # Imported lazily so the API process does not load pipeline modules until needed.
    def enqueue_pipeline(self, job_id: uuid.UUID, attempt: int) -> None:
        from app.workers.tasks import enqueue_pipeline

        enqueue_pipeline(job_id, attempt)

    def enqueue_render(self, clip_id: uuid.UUID, render_id: uuid.UUID) -> None:
        from app.workers.tasks import enqueue_render

        enqueue_render(clip_id, render_id)

    def purge_prefixes(self, prefixes: list[str]) -> None:
        from app.workers.tasks import purge_prefixes

        purge_prefixes.delay(prefixes)


_dispatcher = CeleryDispatcher()


def get_dispatcher() -> Dispatcher:
    return _dispatcher
