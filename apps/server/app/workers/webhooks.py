"""Outbound webhooks, signed with HMAC-SHA256 when WEBHOOK_SIGNING_SECRET is set.

Receivers verify: hex(hmac_sha256(secret, f"{timestamp}.{body}")) == X-ClipPro-Signature.
"""

import hashlib
import hmac
import json
import time
from typing import Any

import httpx
import structlog

from app.core.net import UnsafeUrl, assert_public_url

log = structlog.get_logger()


def sign(secret: str, timestamp: str, body: bytes) -> str:
    return hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()


def send_webhook(url: str, payload: dict[str, Any], *, secret: str | None, timeout: float, attempts: int = 3) -> bool:
    try:
        assert_public_url(url)  # re-checked at send time: DNS may have changed since creation
    except UnsafeUrl as e:
        log.warning("webhook_rejected", reason=e.message)
        return False
    body = json.dumps(payload, separators=(",", ":")).encode()
    for attempt in range(attempts):
        ts = str(int(time.time()))
        headers = {"Content-Type": "application/json", "User-Agent": "ClipPro-Webhook/1", "X-ClipPro-Timestamp": ts}
        if secret:
            headers["X-ClipPro-Signature"] = sign(secret, ts, body)
        try:
            resp = httpx.post(url, content=body, headers=headers, timeout=timeout, follow_redirects=False)
            if resp.status_code < 300:
                return True
            log.warning("webhook_bad_status", status=resp.status_code)
        except httpx.HTTPError as e:
            log.warning("webhook_error", error=str(e))
        if attempt + 1 < attempts:
            time.sleep(2 ** (attempt * 2))  # 1s, 4s
    return False
