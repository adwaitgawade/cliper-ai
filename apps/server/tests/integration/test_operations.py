"""Fairness caps, pushed progress, AI edits, the shared source cache and orphan cleanup."""

import asyncio
import json
import uuid
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path

import pytest
from sqlalchemy import select, update

from app.core.config import get_settings
from app.storage.s3 import get_storage
from tests.conftest import has_ffmpeg, make_transcript
from tests.integration.test_api import _upload_video
from tests.integration.test_pipeline import pipeline_env  # noqa: F401  (fixture)

pytestmark = pytest.mark.integration

# --- helpers -----------------------------------------------------------------------------------


def _seed_clip(users, *, with_transcript: bool = True) -> dict:
    """A user with a personal workspace, a ready video, a completed job and one clip."""
    from app.core.ids import uuid7
    from app.db.models import Artifact, Clip, Job, User, Video, Workspace, WorkspaceMember
    from app.db.session import sync_session
    from app.storage.s3 import job_key

    user_id, email = users.create()
    ws, video_id, job_id, clip_id = uuid7(), uuid7(), uuid7(), uuid7()
    transcript = make_transcript(
        ["Why do most startups fail?", "The answer surprised me.", "It is not money.", "Founders build wrong."],
        word_s=0.5,
    )
    now = datetime.now(UTC)
    with sync_session() as db:
        db.add(User(id=user_id, email=email))
        db.flush()
        db.add(Workspace(id=ws, name="w", is_personal=True, created_by=user_id))
        db.flush()
        db.add(WorkspaceMember(workspace_id=ws, user_id=user_id, role="owner"))
        db.add(
            Video(
                id=video_id,
                workspace_id=ws,
                created_by=user_id,
                status="ready",
                source="upload",
                storage_key=f"ws/{ws}/videos/{video_id}/source.mp4",
                duration=transcript.duration,
                width=1280,
                height=720,
                fps=30,
                rights_attested_at=now,
            )
        )
        db.flush()
        db.add(Job(id=job_id, workspace_id=ws, video_id=video_id, created_by=user_id, options={}, state="completed"))
        db.flush()
        s = transcript.sentences
        db.add(
            Clip(
                id=clip_id,
                job_id=job_id,
                workspace_id=ws,
                rank=1,
                start_s=s[1].start,
                end_s=s[2].end,
                caption_style="bold_highlight",
                caption_overrides={},
                title="Original",
            )
        )
        if with_transcript:
            key = job_key(ws, job_id, "transcript.json")
            get_storage().put_json(key, transcript.model_dump(mode="json"))
            db.add(Artifact(id=uuid7(), job_id=job_id, kind="transcript", storage_key=key))
        db.commit()
    headers = {"Authorization": f"Bearer {users.token(user_id, email)}"}
    return {"ws": ws, "video": video_id, "job": job_id, "clip": clip_id, "headers": headers, "transcript": transcript}


def _sse(text: str) -> list[tuple[str, dict]]:
    events = []
    for block in text.replace("\r\n", "\n").split("\n\n"):
        name, data = "message", []
        for line in block.splitlines():
            if line.startswith("event:"):
                name = line[6:].strip()
            elif line.startswith("data:"):
                data.append(line[5:].strip())
        if data:
            events.append((name, json.loads("\n".join(data))))
    return events


# --- fairness: per-workspace job cap -----------------------------------------------------------


async def test_jobs_over_the_workspace_cap_wait_and_start_when_slots_free(client, users, recorder, monkeypatch):
    from app.db.models import Job
    from app.db.session import sync_session
    from app.workers import admission, tasks

    monkeypatch.setattr(get_settings(), "workspace_max_active_jobs", 2)
    started: list[tuple[uuid.UUID, int]] = []
    monkeypatch.setattr(tasks, "enqueue_pipeline", lambda jid, attempt: started.append((jid, attempt)))
    headers = users.headers()
    video = await _upload_video(client, headers)
    jobs = [(await client.post("/v1/jobs", headers=headers, json={"video_id": video["id"]})).json() for _ in range(4)]
    assert [j["state"] for j in jobs] == ["queued", "queued", "waiting", "waiting"]
    assert [jid for jid, _ in recorder.pipelines] == [uuid.UUID(j["id"]) for j in jobs[:2]]
    ws = uuid.UUID(jobs[0]["workspace_id"])

    # Another workspace has its own slots.
    other = users.headers()
    other_video = await _upload_video(client, other)
    assert (await client.post("/v1/jobs", headers=other, json={"video_id": other_video["id"]})).json()[
        "state"
    ] == "queued"

    # The stale-job reaper never "resumes" a job that is only waiting for a slot.
    with sync_session() as db:
        db.execute(
            update(Job)
            .where(Job.id == uuid.UUID(jobs[2]["id"]))
            .values(created_at=datetime.now(UTC) - timedelta(hours=2))
        )
        db.commit()
    assert tasks.requeue_stale_jobs() == 0

    # Canceling a running job frees a slot: the API asks the workers to wake the next one.
    await client.post(f"/v1/jobs/{jobs[0]['id']}/cancel", headers=headers)
    assert recorder.woken == [ws]
    assert admission.wake_waiting_jobs(ws) == [(uuid.UUID(jobs[2]["id"]), 1)]
    assert admission.wake_waiting_jobs(ws) == []  # full again

    # A failure inside the worker wakes the next waiting job by itself.
    tasks.fail_job(jobs[1]["id"], 1, {"code": "x", "message": "boom", "stage": "ingesting", "retryable": False})
    assert started == [(uuid.UUID(jobs[2]["id"]), 1), (uuid.UUID(jobs[3]["id"]), 1)]
    states = [(await client.get(f"/v1/jobs/{j['id']}", headers=headers)).json()["state"] for j in jobs]
    assert states == ["canceled", "failed", "queued", "queued"]


async def test_retry_respects_the_cap(client, users, recorder, monkeypatch):
    monkeypatch.setattr(get_settings(), "workspace_max_active_jobs", 1)
    headers = users.headers()
    video = await _upload_video(client, headers)
    first = (await client.post("/v1/jobs", headers=headers, json={"video_id": video["id"]})).json()
    await client.post(f"/v1/jobs/{first['id']}/cancel", headers=headers)
    second = (await client.post("/v1/jobs", headers=headers, json={"video_id": video["id"]})).json()
    assert second["state"] == "queued"
    retried = (await client.post(f"/v1/jobs/{first['id']}/retry", headers=headers)).json()
    assert retried["state"] == "waiting" and retried["attempt"] == 2
    assert recorder.pipelines[-1] == (uuid.UUID(second["id"]), 1)


# --- pushed progress (SSE over Redis pub/sub) ------------------------------------------------


class FakeBroker:
    """Redis pub/sub stand-in. `scripted` messages are delivered right after a
    subscription starts, as if a worker published them while the client watched."""

    def __init__(self, scripted: list[dict] | None = None, fail: bool = False) -> None:
        self.scripted = scripted or []
        self.fail = fail
        self.published: dict[str, list[str]] = defaultdict(list)

    def pubsub(self):
        broker = self

        class PubSub:
            def __init__(self) -> None:
                self.queue: asyncio.Queue = asyncio.Queue()
                self.closed = False

            async def subscribe(self, channel):
                if broker.fail:
                    raise ConnectionError("redis down")
                for msg in broker.scripted:
                    self.queue.put_nowait({"type": "message", "data": json.dumps(msg)})

            async def get_message(self, ignore_subscribe_messages, timeout):
                try:
                    return await asyncio.wait_for(self.queue.get(), timeout)
                except TimeoutError:
                    return None

            async def unsubscribe(self):
                return None

            async def aclose(self):
                self.closed = True

        return PubSub()

    async def publish(self, channel, data):
        self.published[channel].append(data)


def _use_broker(monkeypatch, broker):
    from app.api.routers import jobs as jobs_router
    from app.core import redis as redis_mod

    monkeypatch.setattr(jobs_router, "pubsub_redis", lambda: broker)
    monkeypatch.setattr(redis_mod, "pubsub_redis", lambda: broker)


async def test_sse_follows_pubsub_and_reads_the_row_once(client, users, monkeypatch):
    from app.api.routers import jobs as jobs_router

    headers = users.headers()
    video = await _upload_video(client, headers)
    job = (await client.post("/v1/jobs", headers=headers, json={"video_id": video["id"]})).json()
    progress = {"id": job["id"], "state": "analyzing", "stage": "analyzing", "progress": 37, "error": None}
    done = {**progress, "state": "completed", "progress": 100}
    broker = FakeBroker([{"event": "progress", "data": progress}, {"event": "progress", "data": done}])
    _use_broker(monkeypatch, broker)
    reads = []
    maker = jobs_router.get_async_sessionmaker()

    def counting_maker():
        reads.append(1)
        return maker()

    monkeypatch.setattr(jobs_router, "get_async_sessionmaker", lambda: counting_maker)

    resp = await client.get(f"/v1/jobs/{job['id']}/events", headers=headers)
    events = _sse(resp.text)
    assert [(e, d["state"], d["progress"]) for e, d in events] == [
        ("progress", "queued", 0),
        ("progress", "analyzing", 37),
        ("progress", "completed", 100),
        ("end", "completed", 100),
    ]
    # Only the opening read hit the database: every update after it came from pub/sub.
    assert len(reads) == 1


async def test_sse_ends_on_deleted_and_falls_back_to_polling(client, users, monkeypatch):
    headers = users.headers()
    video = await _upload_video(client, headers)
    job = (await client.post("/v1/jobs", headers=headers, json={"video_id": video["id"]})).json()

    _use_broker(monkeypatch, FakeBroker([{"event": "deleted", "data": {"id": job["id"]}}]))
    events = _sse((await client.get(f"/v1/jobs/{job['id']}/events", headers=headers)).text)
    assert [e for e, _ in events] == ["progress", "deleted"]

    # Redis down: the stream polls the row instead and still ends.
    broker = FakeBroker(fail=True)
    _use_broker(monkeypatch, broker)
    await client.post(f"/v1/jobs/{job['id']}/cancel", headers=headers)
    events = _sse((await client.get(f"/v1/jobs/{job['id']}/events", headers=headers)).text)
    assert [(e, d["state"]) for e, d in events] == [("progress", "canceled"), ("end", "canceled")]


async def test_api_state_changes_publish_events(client, users, monkeypatch):
    from app.core.events import job_channel

    broker = FakeBroker()
    _use_broker(monkeypatch, broker)
    headers = users.headers()
    video = await _upload_video(client, headers)
    job = (await client.post("/v1/jobs", headers=headers, json={"video_id": video["id"]})).json()
    await client.post(f"/v1/jobs/{job['id']}/cancel", headers=headers)
    await client.delete(f"/v1/jobs/{job['id']}", headers=headers)
    sent = [json.loads(m) for m in broker.published[job_channel(job["id"])]]
    assert [(m["event"], m["data"].get("state")) for m in sent] == [("progress", "canceled"), ("deleted", None)]


# --- render slots ----------------------------------------------------------------------------


def test_render_without_a_free_slot_is_deferred(users, eager_celery, monkeypatch):
    from app.workers import admission, stages, tasks

    seeded = _seed_clip(users)
    answers = iter([False, True])
    calls = []
    monkeypatch.setattr(admission, "acquire_render_slot", lambda ws, rid: next(answers))
    monkeypatch.setattr(admission, "release_render_slot", lambda ws, rid: calls.append(("release", ws)))
    monkeypatch.setattr(stages, "render_clip", lambda cid, rid, **kw: calls.append(("render", cid)))
    render_id = stages.create_render(seeded["clip"])
    # Eager mode runs the re-queued task inline, so this returns the first attempt's result.
    result = tasks.render_clip_task.apply(args=(None, None, str(seeded["clip"]), str(render_id))).get()
    assert result == "deferred"
    assert calls == [("render", seeded["clip"]), ("release", seeded["ws"])]
    assert tasks.render_clip_task.apply(args=(None, None, str(uuid.uuid4()), str(render_id))).get() == "skipped"


# --- AI edits ------------------------------------------------------------------------------------


async def test_ai_edit_round_trip(client, users, recorder, monkeypatch):
    from app.db.models import Clip, LlmRun
    from app.db.session import sync_session
    from app.llm.callbacks import UsageRecord
    from app.pipeline import ai_edit
    from app.pipeline.ai_edit import CaptionChanges, EditPlan

    seeded = _seed_clip(users)
    headers, clip_id = seeded["headers"], seeded["clip"]
    url = f"/v1/clips/{clip_id}/ai-edits"

    monkeypatch.setattr(get_settings(), "llm_model", None)
    monkeypatch.setattr(get_settings(), "ai_edit_model", None)
    off = await client.post(url, headers=headers, json={"instruction": "bigger captions"})
    assert off.status_code == 503 and off.json()["error"]["code"] == "ai_unavailable"

    monkeypatch.setattr(get_settings(), "ai_edit_model", "opencode:test-model")
    assert (await client.post(url, headers=headers, json={"instruction": ""})).status_code == 422
    bad_base = {"start": 5, "end": 1, "layout": "auto", "caption_style": "clean"}
    assert (await client.post(url, headers=headers, json={"instruction": "x", "base": bad_base})).status_code == 422

    # The request edits the editor's unsaved draft, not the saved clip.
    s = seeded["transcript"].sentences
    draft = {"start": s[1].start, "end": s[2].end, "layout": "wide", "caption_style": "clean", "title": "Draft"}
    created = await client.post(url, headers=headers, json={"instruction": "Bigger captions + hook", "base": draft})
    assert created.status_code == 202, created.text
    edit = created.json()
    assert edit["status"] == "queued" and recorder.ai_edits == [uuid.UUID(edit["id"])]

    seen = {}

    def fake_plan(prompt_input, *, session_id):
        seen.update(prompt_input)
        plan = EditPlan(summary="Made captions bigger.", caption_style=CaptionChanges(size=120), hook_title="Hi")
        return plan, UsageRecord(model="opencode:test-model", tokens_in=900, tokens_out=60, cost=0.0012)

    monkeypatch.setattr(ai_edit, "plan_edit", fake_plan)
    assert ai_edit.run_edit(uuid.UUID(edit["id"])) == "succeeded"
    assert ai_edit.run_edit(uuid.UUID(edit["id"])) == "skipped"  # already done
    assert '"caption_style": "clean"' in seen["draft"] and "Bigger captions + hook" in seen["instruction"]

    got = (await client.get(f"{url}/{edit['id']}", headers=headers)).json()
    assert got["status"] == "succeeded" and got["summary"] == "Made captions bigger."
    assert got["proposal"]["layout"] == "wide" and got["proposal"]["caption_style"] == "clean"
    assert got["proposal"]["caption_overrides"] == {"size": 120, "hook_text": "Hi"}
    assert got["applied"] and got["ignored"] == []
    with sync_session() as db:
        assert db.get(Clip, clip_id).caption_overrides == {}  # nothing saved
        run = db.execute(select(LlmRun).where(LlmRun.chain == "clip_edit", LlmRun.job_id == seeded["job"])).scalar_one()
        assert run.cost == Decimal("0.001200") and run.tokens_in == 900

    # Another workspace can't read it, and the edit is tied to its clip.
    assert (await client.get(f"{url}/{edit['id']}", headers=users.headers())).status_code == 404
    other = _seed_clip(users)
    assert (await client.get(f"/v1/clips/{other['clip']}/ai-edits/{edit['id']}", headers=headers)).status_code == 404


async def test_ai_edit_failures_are_reported(client, users, recorder, monkeypatch):
    from app.pipeline import ai_edit

    monkeypatch.setattr(get_settings(), "ai_edit_model", "opencode:test-model")
    seeded = _seed_clip(users, with_transcript=False)
    url = f"/v1/clips/{seeded['clip']}/ai-edits"
    edit = (await client.post(url, headers=seeded["headers"], json={"instruction": "tighten"})).json()
    assert ai_edit.run_edit(uuid.UUID(edit["id"])) == "failed"
    got = (await client.get(f"{url}/{edit['id']}", headers=seeded["headers"])).json()
    assert got["error"]["code"] == "transcript_not_ready"

    seeded = _seed_clip(users)
    url = f"/v1/clips/{seeded['clip']}/ai-edits"
    edit = (await client.post(url, headers=seeded["headers"], json={"instruction": "tighten"})).json()

    def broken(*a, **kw):
        raise ValueError("model said nonsense")

    monkeypatch.setattr(ai_edit, "plan_edit", broken)
    assert ai_edit.run_edit(uuid.UUID(edit["id"])) == "failed"
    got = (await client.get(f"{url}/{edit['id']}", headers=seeded["headers"])).json()
    assert got["error"]["code"] == "ai_failed" and got["proposal"] is None


# --- orphaned media -------------------------------------------------------------------------------


def test_orphan_sweep_deletes_only_unreferenced_old_objects(users, s3):
    from app.workers import housekeeping

    seeded = _seed_clip(users)
    storage = get_storage()
    ws, job = seeded["ws"], seeded["job"]
    keep = [
        f"ws/{ws}/jobs/{job}/audio.wav",
        f"ws/{ws}/jobs/{job}/clips/{seeded['clip']}/thumb.jpg",
        f"ws/{ws}/videos/{seeded['video']}/source.mp4",
        "shared/sources/abc/meta.json",
        f"ws/{ws}/notes/readme.txt",
    ]
    orphans = [
        f"ws/{ws}/jobs/{uuid.uuid4()}/audio.wav",
        f"ws/{ws}/jobs/{job}/clips/{uuid.uuid4()}/thumb.jpg",
        f"ws/{ws}/jobs/{job}/clips/{seeded['clip']}/renders/{uuid.uuid4()}/clip.mp4",
        f"ws/{ws}/videos/{uuid.uuid4()}/source.mp4",
    ]
    for key in keep + orphans:
        storage.client.put_object(Bucket=storage.bucket, Key=key, Body=b"x")

    # Young objects are never touched: their rows may not be committed yet.
    assert housekeeping.sweep_orphaned_media(storage, min_age_hours=24) == 0
    later = datetime.now(UTC) + timedelta(days=2)
    assert housekeeping.sweep_orphaned_media(storage, min_age_hours=24, now=later) == len(orphans)
    assert all(storage.exists(k) for k in keep)
    assert not any(storage.exists(k) for k in orphans)


# --- shared cache for public URLs ----------------------------------------------------------------


@pytest.mark.skipif(not has_ffmpeg(), reason="ffmpeg not installed")
def test_same_public_url_is_downloaded_and_transcribed_once(users, pipeline_env, monkeypatch):  # noqa: F811
    from app.core.ids import uuid7
    from app.db.models import Artifact, Job, User, Video, Workspace, WorkspaceMember
    from app.db.session import sync_session
    from app.storage import shared
    from app.storage.s3 import video_key
    from app.workers import stages
    from app.workers.tasks import enqueue_pipeline
    from tests.integration.test_pipeline import OPTIONS, _job, _seconds_of_synth, fake_transcribe, synth_video

    src = synth_video(pipeline_env / "remote.mp4", seconds=_seconds_of_synth())
    downloads, transcribes = [], []

    def fake_download(url, dest_dir: Path, **kw):
        downloads.append(url)
        dest_dir.mkdir(parents=True, exist_ok=True)
        out = dest_dir / "source.mp4"
        out.write_bytes(src.read_bytes())
        return out, "A public talk"

    monkeypatch.setattr(stages, "download_url", fake_download)
    monkeypatch.setattr(stages, "transcribe_audio", lambda *a, **kw: transcribes.append(1) or fake_transcribe(*a, **kw))

    def seed(url):
        user_id, email = users.create()
        ws, video_id, job_id = uuid7(), uuid7(), uuid7()
        with sync_session() as db:
            db.add(User(id=user_id, email=email))
            db.flush()
            db.add(Workspace(id=ws, name="w", is_personal=True, created_by=user_id))
            db.flush()
            db.add(WorkspaceMember(workspace_id=ws, user_id=user_id, role="owner"))
            db.add(
                Video(
                    id=video_id,
                    workspace_id=ws,
                    created_by=user_id,
                    status="pending_download",
                    source="url",
                    source_url=url,
                    storage_key=video_key(ws, video_id, ""),
                    rights_attested_at=datetime.now(UTC),
                )
            )
            db.flush()
            db.add(
                Job(
                    id=job_id,
                    workspace_id=ws,
                    video_id=video_id,
                    created_by=user_id,
                    options=OPTIONS,
                    state="queued",
                    attempt=1,
                )
            )
            db.commit()
        return ws, video_id, job_id

    url = f"https://www.youtube.com/watch?v={uuid.uuid4().hex[:11]}"
    first = seed(url)
    enqueue_pipeline(first[2], 1)
    assert _job(first[2]).state == "completed", _job(first[2]).error
    second = seed(url.replace("https://www.youtube.com/watch?v=", "https://youtu.be/") + "?si=share")
    enqueue_pipeline(second[2], 1)
    assert _job(second[2]).state == "completed", _job(second[2]).error

    assert len(downloads) == 1 and len(transcribes) == 1
    storage = get_storage()
    with sync_session() as db:
        v1, v2 = db.get(Video, first[1]), db.get(Video, second[1])
        assert v2.storage_key.startswith(f"ws/{second[0]}/") and storage.exists(v2.storage_key)
        assert v2.title == "A public talk" and v2.status == "ready"
        meta = db.execute(
            select(Artifact.meta).where(Artifact.job_id == second[2], Artifact.kind == "transcript")
        ).scalar_one()
    assert meta["shared_cache"] is True
    assert storage.exists(shared.source_prefix(url) + "meta.json")

    # Deleting the first workspace's media leaves the second one's copy intact.
    storage.delete_prefix(f"ws/{first[0]}/")
    assert storage.exists(v2.storage_key) and v1.storage_key.startswith(f"ws/{first[0]}/")

    # Disabled: always downloads.
    monkeypatch.setattr(get_settings(), "shared_cache_enabled", False)
    third = seed(url)
    enqueue_pipeline(third[2], 1)
    assert _job(third[2]).state == "completed" and len(downloads) == 2
