"""Operational alerts: logged always, and posted to ALERT_WEBHOOK_URL when it is set.

The webhook body is Slack-compatible (`{"text": ...}`) and carries the structured fields
too, so it also works with generic receivers. The same fingerprint is sent at most once
per ALERT_DEDUPE_SECONDS (shared across processes through Redis, per process if Redis is
down). Sending happens on a background thread and never raises into the caller.
"""

import threading
import time
from typing import Any

import httpx
import structlog

from app.core.config import get_settings
from app.core.redis import sync_redis

log = structlog.get_logger()

_local_sent: dict[str, float] = {}
_local_lock = threading.Lock()


def _first_in_window(fingerprint: str, window: int) -> bool:
    try:
        return bool(sync_redis().set(f"alert:{fingerprint}", 1, nx=True, ex=window))
    except Exception:
        now = time.monotonic()
        with _local_lock:
            last = _local_sent.get(fingerprint)
            if last is not None and now - last < window:
                return False
            _local_sent[fingerprint] = now
            return True


def _send(url: str, payload: dict[str, Any], fingerprint: str, window: int) -> None:
    try:
        if not _first_in_window(fingerprint, window):
            return
        httpx.post(url, json=payload, timeout=5.0).raise_for_status()
    except Exception as e:
        log.warning("alert_delivery_failed", error=type(e).__name__)


def alert(kind: str, message: str, *, fingerprint: str | None = None, **fields: Any) -> None:
    """Report something an operator should look at. Safe to call from any context."""
    context = structlog.contextvars.get_contextvars()
    trace_id = context.get("trace_id") or context.get("request_id")
    log.error("alert", kind=kind, alert_message=message, **fields)
    s = get_settings()
    if not s.alert_webhook_url:
        return
    details = {**fields, "trace_id": trace_id, "job_id": context.get("job_id")}
    payload = {
        "text": f"[clippro {s.env}] {kind}: {message}",
        "kind": kind,
        "env": s.env,
        "fields": {k: str(v) for k, v in details.items() if v is not None},
    }
    threading.Thread(
        target=_send,
        args=(s.alert_webhook_url, payload, fingerprint or kind, s.alert_dedupe_seconds),
        daemon=True,
        name="alert-sender",
    ).start()
