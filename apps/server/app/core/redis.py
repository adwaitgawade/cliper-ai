"""Shared Redis clients.

Redis carries the Celery broker, rate limits, render slots, progress events and alert
de-duplication. None of those may take the product down: callers treat Redis errors as
"unavailable" and fall back (fail open, poll the database, or skip).
"""

from functools import lru_cache

from redis import Redis
from redis.asyncio import Redis as AsyncRedis

from app.core.config import get_settings


@lru_cache
def sync_redis() -> Redis:
    """For workers and other sync code. Short timeouts so an outage never stalls a task."""
    return Redis.from_url(
        get_settings().redis_url, socket_timeout=5, socket_connect_timeout=2, health_check_interval=30
    )


_pubsub_client: AsyncRedis | None = None


def pubsub_redis() -> AsyncRedis:
    """For long-lived subscriptions (SSE). No read timeout: the stream waits on messages
    with its own short poll interval instead."""
    global _pubsub_client
    if _pubsub_client is None:
        _pubsub_client = AsyncRedis.from_url(
            get_settings().redis_url, socket_connect_timeout=2, health_check_interval=30
        )
    return _pubsub_client
