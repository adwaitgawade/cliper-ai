"""Score cache (FR-HLT-9, LC-8): keyed by a hash of the transcript payload, prompt version
and model, so re-running a job costs nothing."""

import hashlib
import json
from typing import Any, Protocol

import structlog
from redis import Redis

log = structlog.get_logger()


def cache_key(*, chain: str, prompt_version: str, model: str, payload: str, instructions: str | None) -> str:
    material = json.dumps(
        {"chain": chain, "prompt": prompt_version, "model": model, "payload": payload, "instructions": instructions},
        sort_keys=True,
    )
    return f"llmcache:{chain}:{hashlib.sha256(material.encode()).hexdigest()}"


class ScoreCache(Protocol):
    def get(self, key: str) -> Any | None: ...
    def set(self, key: str, value: Any) -> None: ...


class NullCache:
    def get(self, key: str) -> Any | None:
        return None

    def set(self, key: str, value: Any) -> None:
        return None


class MemoryCache:
    def __init__(self) -> None:
        self.data: dict[str, Any] = {}

    def get(self, key: str) -> Any | None:
        return self.data.get(key)

    def set(self, key: str, value: Any) -> None:
        self.data[key] = value


class RedisCache:
    def __init__(self, url: str, ttl_seconds: int) -> None:
        self.redis = Redis.from_url(url, socket_timeout=5)
        self.ttl = ttl_seconds

    def get(self, key: str) -> Any | None:
        try:
            raw = self.redis.get(key)
        except Exception:  # A cache outage must never fail a job.
            log.warning("llm_cache_unavailable")
            return None
        return json.loads(raw) if raw else None  # type: ignore[arg-type]

    def set(self, key: str, value: Any) -> None:
        try:
            self.redis.set(key, json.dumps(value), ex=self.ttl)
        except Exception:
            log.warning("llm_cache_unavailable")
