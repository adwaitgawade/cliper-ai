import uuid

import pytest

from app.storage.s3 import get_storage

pytestmark = pytest.mark.integration


async def _upload_video(client, headers, *, size=1024):
    resp = await client.post(
        "/v1/videos", headers=headers, json={"filename": "talk.mp4", "size_bytes": size, "rights_attested": True}
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    get_storage().client.put_object(Bucket=get_storage().bucket, Key=_key(body), Body=b"x" * size)
    done = await client.post(f"/v1/videos/{body['video']['id']}/complete", headers=headers)
    assert done.status_code == 200, done.text
    return done.json()


def _key(created):
    url = created["upload"]["url"]
    return url.split("/clippro-test/", 1)[1].split("?", 1)[0]


async def test_unauthenticated_requests_use_error_envelope(client):
    resp = await client.get("/v1/me")
    assert resp.status_code == 401
    err = resp.json()["error"]
    assert err["code"] == "unauthorized" and err["request_id"]
    assert resp.headers["www-authenticate"] == "Bearer"

    bad = await client.get("/v1/me", headers={"Authorization": "Bearer not.a.jwt"})
    assert bad.status_code == 401 and bad.json()["error"]["code"] == "invalid_token"


async def test_first_request_provisions_personal_workspace(client, users):
    uid, email = users.create()
    headers = {"Authorization": f"Bearer {users.token(uid, email)}"}
    me = (await client.get("/v1/me", headers=headers)).json()
    assert me["user_id"] == str(uid) and me["email"] == email
    assert len(me["workspaces"]) == 1
    ws = me["workspaces"][0]
    assert ws["is_personal"] and ws["role"] == "owner" and ws["id"] == me["current_workspace_id"]
    again = (await client.get("/v1/me", headers=headers)).json()  # idempotent
    assert again["workspaces"] == me["workspaces"]


async def test_token_for_deleted_supabase_user_is_rejected(client, users):
    ghost = uuid.uuid4()
    resp = await client.get("/v1/me", headers={"Authorization": f"Bearer {users.token(ghost, 'g@x.co')}"})
    assert resp.status_code == 401


async def test_presigned_upload_flow_and_validation(client, users):
    headers = users.headers()
    bad = await client.post(
        "/v1/videos", headers=headers, json={"filename": "x.avi", "size_bytes": 10, "rights_attested": True}
    )
    assert bad.status_code == 415 and bad.json()["error"]["code"] == "unsupported_file_type"
    no_rights = await client.post(
        "/v1/videos", headers=headers, json={"filename": "x.mp4", "size_bytes": 10, "rights_attested": False}
    )
    assert no_rights.status_code == 422 and no_rights.json()["error"]["code"] == "validation_error"
    too_big = await client.post(
        "/v1/videos", headers=headers, json={"filename": "x.mp4", "size_bytes": 6 * 1024**3, "rights_attested": True}
    )
    assert too_big.status_code == 413

    created = (
        await client.post(
            "/v1/videos", headers=headers, json={"filename": "talk.mp4", "size_bytes": 100, "rights_attested": True}
        )
    ).json()
    assert created["video"]["status"] == "pending_upload"
    assert created["upload"]["method"] == "PUT" and "X-Amz-Signature" in created["upload"]["url"]
    vid = created["video"]["id"]
    missing = await client.post(f"/v1/videos/{vid}/complete", headers=headers)
    assert missing.status_code == 409 and missing.json()["error"]["code"] == "upload_missing"
    get_storage().client.put_object(Bucket=get_storage().bucket, Key=_key(created), Body=b"x" * 99)
    mismatch = await client.post(f"/v1/videos/{vid}/complete", headers=headers)
    assert mismatch.json()["error"]["code"] == "upload_size_mismatch"
    get_storage().client.put_object(Bucket=get_storage().bucket, Key=_key(created), Body=b"x" * 100)
    ok = await client.post(f"/v1/videos/{vid}/complete", headers=headers)
    assert ok.json()["status"] == "uploaded"
    assert ok.json()["expires_at"] is not None  # retention


async def test_multipart_upload(client, users):
    headers = users.headers()
    resp = await client.post(
        "/v1/videos/upload",
        headers=headers,
        data={"rights_attested": "true"},
        files={"file": ("clip.mov", b"\x00" * 2048, "video/quicktime")},
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["status"] == "uploaded" and resp.json()["content_type"] == "video/quicktime"


async def test_url_ingest_blocks_private_hosts(client, users):
    headers = users.headers()
    resp = await client.post(
        "/v1/videos/from-url", headers=headers, json={"url": "http://169.254.169.254/latest", "rights_attested": True}
    )
    assert resp.status_code == 400 and resp.json()["error"]["code"] == "unsafe_url"
    ok = await client.post(
        "/v1/videos/from-url", headers=headers, json={"url": "https://1.1.1.1/video.mp4", "rights_attested": True}
    )
    assert ok.status_code == 201 and ok.json()["status"] == "pending_download"


async def test_job_lifecycle(client, users, recorder):
    headers = users.headers()
    video = await _upload_video(client, headers)
    bad = await client.post(
        "/v1/jobs", headers=headers, json={"video_id": video["id"], "options": {"min_duration": 60, "max_duration": 30}}
    )
    assert bad.status_code == 422
    bad_style = await client.post(
        "/v1/jobs", headers=headers, json={"video_id": video["id"], "options": {"caption_style": "nope"}}
    )
    assert bad_style.status_code == 422

    resp = await client.post(
        "/v1/jobs",
        headers=headers,
        json={
            "video_id": video["id"],
            "options": {"num_clips": 5, "instructions": "funny moments", "reframe": {"asd_level": "A"}},
        },
    )
    assert resp.status_code == 201, resp.text
    job = resp.json()
    assert job["state"] == "queued" and job["attempt"] == 1
    assert job["options"]["num_clips"] == 5 and job["options"]["caption_style"] == "bold_highlight"
    assert recorder.pipelines == [(uuid.UUID(job["id"]), 1)]

    got = await client.get(f"/v1/jobs/{job['id']}", headers=headers)
    assert got.status_code == 200
    listed = (await client.get("/v1/jobs", headers=headers, params={"video_id": video["id"]})).json()
    assert [j["id"] for j in listed["items"]] == [job["id"]]
    transcript = await client.get(f"/v1/jobs/{job['id']}/transcript", headers=headers)
    assert transcript.status_code == 404 and transcript.json()["error"]["code"] == "transcript_not_ready"
    assert (await client.get(f"/v1/jobs/{job['id']}/clips", headers=headers)).json() == []

    retry_running = await client.post(f"/v1/jobs/{job['id']}/retry", headers=headers)
    assert retry_running.status_code == 409
    canceled = await client.post(f"/v1/jobs/{job['id']}/cancel", headers=headers)
    assert canceled.json()["state"] == "canceled"
    retried = await client.post(f"/v1/jobs/{job['id']}/retry", headers=headers)
    assert retried.json()["state"] == "queued" and retried.json()["attempt"] == 2
    assert recorder.pipelines[-1] == (uuid.UUID(job["id"]), 2)

    # SSE ends once the job is terminal.
    await client.post(f"/v1/jobs/{job['id']}/cancel", headers=headers)
    async with client.stream("GET", f"/v1/jobs/{job['id']}/events", headers=headers) as stream:
        assert stream.headers["content-type"].startswith("text/event-stream")
        body = (await stream.aread()).decode()
    assert "event: progress" in body and "event: end" in body and '"state": "canceled"' in body

    deleted = await client.delete(f"/v1/jobs/{job['id']}", headers=headers)
    assert deleted.status_code == 204
    assert any(p.endswith(f"/jobs/{job['id']}/") for p in recorder.purged)
    assert (await client.get(f"/v1/jobs/{job['id']}", headers=headers)).status_code == 404


async def test_queue_outage_fails_job_cleanly(client, users, recorder):
    headers = users.headers()
    video = await _upload_video(client, headers)
    recorder.fail = True
    resp = await client.post("/v1/jobs", headers=headers, json={"video_id": video["id"]})
    assert resp.status_code == 503 and resp.json()["error"]["code"] == "queue_unavailable"
    jobs = (await client.get("/v1/jobs", headers=headers)).json()["items"]
    assert jobs[0]["state"] == "failed" and jobs[0]["error"]["retryable"] is True


async def test_tenant_isolation(client, users):
    alice, mallory = users.headers(), users.headers()
    video = await _upload_video(client, alice)
    job = (await client.post("/v1/jobs", headers=alice, json={"video_id": video["id"]})).json()
    for path in (f"/v1/videos/{video['id']}", f"/v1/jobs/{job['id']}", f"/v1/jobs/{job['id']}/clips"):
        assert (await client.get(path, headers=mallory)).status_code == 404
    assert (await client.post("/v1/jobs", headers=mallory, json={"video_id": video["id"]})).status_code == 404
    assert (await client.delete(f"/v1/videos/{video['id']}", headers=mallory)).status_code == 404
    assert (await client.get("/v1/videos", headers=mallory)).json()["items"] == []
    # Selecting someone else's workspace is refused.
    alice_ws = (await client.get("/v1/me", headers=alice)).json()["current_workspace_id"]
    hijack = await client.get("/v1/videos", headers={**mallory, "X-Workspace-Id": alice_ws})
    assert hijack.status_code == 404 and hijack.json()["error"]["code"] == "workspace_not_found"


async def test_team_workspace_membership(client, users):
    owner = users.headers()
    member_id, member_email = users.create()
    member = {"Authorization": f"Bearer {users.token(member_id, member_email)}"}
    await client.get("/v1/me", headers=member)  # provision

    team = (await client.post("/v1/workspaces", headers=owner, json={"name": "Studio"})).json()
    team_owner = {**owner, "X-Workspace-Id": team["id"]}
    added = await client.post("/v1/workspace/members", headers=team_owner, json={"email": member_email.upper()})
    assert added.status_code == 201 and added.json()["role"] == "member"
    dup = await client.post("/v1/workspace/members", headers=team_owner, json={"email": member_email})
    assert dup.status_code == 409

    team_member = {**member, "X-Workspace-Id": team["id"]}
    video = await _upload_video(client, team_owner)
    assert (await client.get(f"/v1/videos/{video['id']}", headers=team_member)).status_code == 200
    # Members cannot manage membership or keys.
    assert (
        await client.post("/v1/workspace/members", headers=team_member, json={"email": "x@y.co"})
    ).status_code == 403
    assert (await client.post("/v1/api-keys", headers=team_member, json={"name": "k"})).status_code == 403
    # The last owner cannot be demoted or removed.
    owner_id = (await client.get("/v1/me", headers=owner)).json()["user_id"]
    demote = await client.patch(f"/v1/workspace/members/{owner_id}", headers=team_owner, json={"role": "member"})
    assert demote.status_code == 409
    # Personal workspaces are single-user.
    personal = await client.post("/v1/workspace/members", headers=owner, json={"email": member_email})
    assert personal.status_code == 403
    removed = await client.delete(f"/v1/workspace/members/{member_id}", headers=team_owner)
    assert removed.status_code == 204
    assert (await client.get(f"/v1/videos/{video['id']}", headers=team_member)).status_code == 404


async def test_api_keys(client, users):
    owner = users.headers()
    created = await client.post("/v1/api-keys", headers=owner, json={"name": "ci"})
    assert created.status_code == 201
    key = created.json()["key"]
    listed = (await client.get("/v1/api-keys", headers=owner)).json()
    assert listed[0]["prefix"] == created.json()["prefix"] and "key" not in listed[0]

    for headers in ({"X-API-Key": key}, {"Authorization": f"Bearer {key}"}):
        me = await client.get("/v1/me", headers=headers)
        assert me.status_code == 200 and me.json()["auth"] == "api_key"
    video = await _upload_video(client, {"X-API-Key": key})
    assert (await client.get(f"/v1/videos/{video['id']}", headers=owner)).status_code == 200
    # API keys cannot mint more keys.
    assert (await client.post("/v1/api-keys", headers={"X-API-Key": key}, json={"name": "x"})).status_code == 403

    assert (await client.delete(f"/v1/api-keys/{created.json()['id']}", headers=owner)).status_code == 204
    revoked = await client.get("/v1/me", headers={"X-API-Key": key})
    assert revoked.status_code == 401 and revoked.json()["error"]["code"] == "invalid_api_key"
    tampered = key[:-2] + ("AA" if not key.endswith("AA") else "BB")
    assert (await client.get("/v1/me", headers={"X-API-Key": tampered})).status_code == 401


async def test_rate_limit(client, users, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "rate_limit_per_minute", 3)
    headers = users.headers()
    codes = [(await client.get("/v1/videos", headers=headers)).status_code for _ in range(4)]
    assert codes == [200, 200, 200, 429]


async def test_healthz(client):
    assert (await client.get("/healthz")).json() == {"status": "ok"}
