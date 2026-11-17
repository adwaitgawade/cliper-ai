"""Queue-delay alerts, alert delivery, render slots, orphan parsing and the shared cache keys."""

import time
import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest

from app.core import alerts
from app.core.config import get_settings
from app.storage import shared
from app.workers import admission, celery_app, housekeeping

# --- queue delay -------------------------------------------------------------------------


def test_queue_wait_counts_from_publish_or_eta():
    now = time.time()
    assert celery_app.queue_wait_seconds(SimpleNamespace(enqueued_at=now - 42, eta=None), now) == pytest.approx(42)
    # Custom headers can also arrive in request.headers.
    req = SimpleNamespace(headers={"enqueued_at": now - 5}, eta=None)
    assert celery_app.queue_wait_seconds(req, now) == pytest.approx(5)
    # A countdown task is runnable at its ETA, not when it was published.
    eta = datetime.fromtimestamp(now - 3, UTC).isoformat()
    assert celery_app.queue_wait_seconds(SimpleNamespace(enqueued_at=now - 600, eta=eta), now) == pytest.approx(3)
    assert celery_app.queue_wait_seconds(SimpleNamespace(eta=None), now) is None


def test_queue_delay_alerts_only_past_the_threshold(monkeypatch):
    sent = []
    monkeypatch.setattr(alerts, "alert", lambda kind, message, **kw: sent.append((kind, kw)))
    monkeypatch.setattr(get_settings(), "queue_delay_alert_seconds", 300)
    assert not celery_app.check_queue_delay("pipeline.ingest", "cpu", 299)
    assert not celery_app.check_queue_delay("pipeline.ingest", "cpu", None)
    assert celery_app.check_queue_delay("pipeline.ingest", "cpu", 301)
    assert sent[0][0] == "queue_delay" and sent[0][1]["fingerprint"] == "queue_delay:cpu"
    monkeypatch.setattr(get_settings(), "queue_delay_alert_seconds", 0)  # disabled
    assert not celery_app.check_queue_delay("pipeline.ingest", "cpu", 10_000)


# --- alerts ----------------------------------------------------------------------------------


class _InlineThread:
    def __init__(self, target, args, **_):
        self.target, self.args = target, args

    def start(self):
        self.target(*self.args)


def test_alert_posts_once_per_fingerprint_window(monkeypatch):
    posts = []
    monkeypatch.setattr(get_settings(), "alert_webhook_url", "https://hooks.example.com/x")
    monkeypatch.setattr(alerts.threading, "Thread", _InlineThread)
    monkeypatch.setattr(
        alerts.httpx,
        "post",
        lambda url, json, timeout: posts.append(json) or SimpleNamespace(raise_for_status=lambda: 0),
    )
    alerts._local_sent.clear()  # Redis is unreachable in tests: the per-process window applies
    alerts.alert("stage_crashed", "ingesting crashed", fingerprint="fp-1", stage="ingesting")
    alerts.alert("stage_crashed", "ingesting crashed again", fingerprint="fp-1")
    alerts.alert("stage_crashed", "other", fingerprint="fp-2")
    assert len(posts) == 2
    assert posts[0]["text"].startswith("[clippro test] stage_crashed")
    assert posts[0]["fields"]["stage"] == "ingesting"


def test_alert_without_webhook_only_logs(monkeypatch):
    monkeypatch.setattr(get_settings(), "alert_webhook_url", None)
    monkeypatch.setattr(alerts.threading, "Thread", lambda **kw: pytest.fail("no thread without a webhook"))
    alerts.alert("api_error", "boom")


# --- render slots ----------------------------------------------------------------------------


class SlotRedis:
    """In-memory stand-in for the slot script's semantics (expired leases are dropped,
    holders renew, newcomers wait while the set is full)."""

    def __init__(self):
        self.sets: dict[str, dict[str, float]] = {}

    def eval(self, script, numkeys, key, now, lease, limit, member):
        now, lease, limit = float(now), float(lease), int(limit)
        members = {m: exp for m, exp in self.sets.get(key, {}).items() if exp > now}
        if member in members or len(members) < limit:
            members[member] = now + lease
            self.sets[key] = members
            return 1
        self.sets[key] = members
        return 0

    def zrem(self, key, member):
        self.sets.get(key, {}).pop(member, None)


def test_render_slots_cap_each_workspace_separately(monkeypatch):
    monkeypatch.setattr(get_settings(), "workspace_max_concurrent_renders", 2)
    r = SlotRedis()
    ws_a, ws_b = uuid.uuid4(), uuid.uuid4()
    assert admission.acquire_render_slot(ws_a, "r1", redis=r)
    assert admission.acquire_render_slot(ws_a, "r2", redis=r)
    assert not admission.acquire_render_slot(ws_a, "r3", redis=r)
    assert admission.acquire_render_slot(ws_a, "r1", redis=r)  # a holder renews its lease
    assert admission.acquire_render_slot(ws_b, "r9", redis=r)  # another workspace is unaffected
    admission.release_render_slot(ws_a, "r1", redis=r)
    assert admission.acquire_render_slot(ws_a, "r3", redis=r)


def test_render_slots_fail_open_and_can_be_disabled(monkeypatch):
    class Down:
        def eval(self, *a):
            raise ConnectionError("redis down")

    monkeypatch.setattr(get_settings(), "workspace_max_concurrent_renders", 1)
    assert admission.acquire_render_slot(uuid.uuid4(), "r1", redis=Down())
    monkeypatch.setattr(get_settings(), "workspace_max_concurrent_renders", 0)
    assert admission.acquire_render_slot(uuid.uuid4(), "r1", redis=Down())


def test_free_job_slots(monkeypatch):
    monkeypatch.setattr(get_settings(), "workspace_max_active_jobs", 2)
    assert admission.free_job_slots(0) == 2
    assert admission.free_job_slots(3) == 0
    monkeypatch.setattr(get_settings(), "workspace_max_active_jobs", 0)
    assert admission.free_job_slots(50) is None


# --- orphan sweep key parsing ----------------------------------------------------------------


def test_owner_of_follows_the_storage_layout():
    ws, vid, job, clip, render = (uuid.uuid4() for _ in range(5))
    assert housekeeping.owner_of(f"ws/{ws}/videos/{vid}/source.mp4") == housekeeping.Owner(video_id=vid)
    assert housekeeping.owner_of(f"ws/{ws}/jobs/{job}/audio.wav") == housekeeping.Owner(job_id=job)
    assert housekeeping.owner_of(f"ws/{ws}/jobs/{job}/clips/{clip}/thumb.jpg") == housekeeping.Owner(
        job_id=job, clip_id=clip
    )
    assert housekeeping.owner_of(f"ws/{ws}/jobs/{job}/clips/{clip}/renders/{render}/clip.mp4") == housekeeping.Owner(
        job_id=job, clip_id=clip, render_id=render
    )
    # Anything else is never touched.
    for key in (f"ws/{ws}/other/{vid}/x", f"ws/not-a-uuid/videos/{vid}/x", "shared/sources/abc/source.mp4", "x"):
        assert housekeeping.owner_of(key) is None


def test_shared_cache_sweep_deletes_only_expired_entries():
    now = datetime.now(UTC)

    class Store:
        def __init__(self):
            self.deleted: list[str] = []

        def iter_objects(self, prefix):
            assert prefix == "shared/"
            yield {"Key": "shared/old.json", "LastModified": now - timedelta(days=20)}
            yield {"Key": "shared/new.json", "LastModified": now - timedelta(days=1)}

        def delete_keys(self, keys):
            self.deleted.extend(keys)
            return len(keys)

    store = Store()
    assert housekeeping.sweep_shared_cache(store, ttl_days=14, now=now) == 1
    assert store.deleted == ["shared/old.json"]


# --- shared cache keys -----------------------------------------------------------------------


@pytest.mark.parametrize(
    "url",
    [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s&si=abc",
        "https://youtu.be/dQw4w9WgXcQ?si=xyz",
        "https://m.youtube.com/shorts/dQw4w9WgXcQ",
        "https://www.youtube.com/live/dQw4w9WgXcQ?feature=share",
    ],
)
def test_youtube_link_variants_share_one_key(url):
    assert shared.canonical_source(url) == "youtube:dQw4w9WgXcQ"


def test_generic_urls_drop_tracking_but_keep_identity():
    a = shared.canonical_source("https://WWW.Example.com/videos/42/?utm_source=x&b=2&a=1#frag")
    b = shared.canonical_source("https://example.com/videos/42?a=1&b=2&fbclid=zzz")
    assert a == b == "url:https://example.com/videos/42?a=1&b=2"
    assert shared.canonical_source("https://example.com/videos/43") != a


def test_transcript_key_depends_on_engine_and_language():
    url = "https://youtu.be/dQw4w9WgXcQ"
    base = shared.transcript_key(url, provider="redux", model="m1", language="auto")
    assert base == shared.transcript_key(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ", provider="redux", model="m1", language="auto"
    )
    assert base != shared.transcript_key(url, provider="assemblyai", model="m1", language="auto")
    assert base != shared.transcript_key(url, provider="redux", model="m1", language="en")
    assert base.startswith("shared/transcripts/") and base.endswith(".json")
