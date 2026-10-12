"""Pipeline integration: real ffmpeg, real Postgres, moto S3, Celery tasks run eagerly."""

import subprocess
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import select, update

from app.core.config import get_settings
from app.core.errors import PipelineError
from app.pipeline import media
from app.pipeline.reframe.crop import center_crop_path
from app.pipeline.render import make_thumbnail, render_clip
from tests.conftest import has_ffmpeg, make_words

pytestmark = [pytest.mark.integration, pytest.mark.skipif(not has_ffmpeg(), reason="ffmpeg not installed")]


def synth_video(path: Path, *, seconds: float, size: str = "640x360", fps: int = 30, audio: bool = True) -> Path:
    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"testsrc2=size={size}:rate={fps}:duration={seconds}",
    ]
    if audio:
        cmd += ["-f", "lavfi", "-i", f"sine=frequency=220:sample_rate=44100:duration={seconds}"]
    cmd += ["-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p"]
    if audio:
        cmd += ["-c:a", "aac", "-shortest"]
    subprocess.run([*cmd, str(path)], check=True)
    return path


def test_probe_validate_and_extract_audio(tmp_path):
    src = synth_video(tmp_path / "in.mp4", seconds=3, fps=60)
    info = media.probe(src)
    assert (info.width, info.height) == (640, 360) and info.has_audio
    assert info.fps == pytest.approx(60) and info.duration == pytest.approx(3, abs=0.1)
    media.validate(info, max_duration=7200)
    with pytest.raises(PipelineError) as too_long:
        media.validate(info, max_duration=1)
    assert too_long.value.code == "duration_too_long"

    wav = media.extract_audio(src, tmp_path / "a.wav")
    out = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "stream=sample_rate,channels,codec_name",
            "-of",
            "csv=p=0",
            str(wav),
        ],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()
    assert out == "pcm_s16le,16000,1"
    assert src.stat().st_size > 0  # original untouched


def test_rejects_silent_and_garbage_files(tmp_path):
    silent = synth_video(tmp_path / "silent.mp4", seconds=1, audio=False)
    with pytest.raises(PipelineError) as exc:
        media.validate(media.probe(silent), max_duration=7200)
    assert exc.value.code == "no_audio_stream"
    junk = tmp_path / "junk.mp4"
    junk.write_bytes(b"not a video at all")
    with pytest.raises(PipelineError) as exc:
        media.probe(junk)
    assert exc.value.code == "invalid_media"


def _probe_out(path: Path) -> dict[str, str]:
    def stream(selector: str) -> dict[str, str]:
        out = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                selector,
                "-show_entries",
                "stream=codec_name,width,height,pix_fmt,r_frame_rate,sample_rate",
                "-of",
                "default=nw=1",
                str(path),
            ],
            capture_output=True,
            text=True,
            check=True,
        ).stdout
        return dict(line.split("=", 1) for line in out.splitlines() if "=" in line)

    video, audio = stream("v:0"), stream("a:0")
    return {**video, "audio_codec": audio.get("codec_name", ""), "sample_rate": audio.get("sample_rate", "")}


@pytest.mark.parametrize("layout", ["crop", "wide"])
def test_render_output_spec(tmp_path, layout):
    src = synth_video(tmp_path / "in.mp4", seconds=4, size="1280x720", fps=60)
    crop = center_crop_path(width=1280, height=720, fps=60, duration=2, layout=layout)
    ass = None
    if media.has_filter("ass"):
        from app.pipeline.captions import build_captions

        ass_text, _, _ = build_captions(make_words(["hello there world."]), start=0, end=2, style_name="bold_highlight")
        ass = tmp_path / "captions.ass"
        ass.write_text(ass_text)
    out = render_clip(
        ffmpeg="ffmpeg",
        source=src,
        start=1.0,
        end=3.0,
        crop=crop,
        fps=60,
        output=tmp_path / "o.mp4",
        ass_path=ass,
        encoder="libx264",
        timeout=120,
    )
    info = _probe_out(out)
    assert info["codec_name"] == "h264" and info["audio_codec"] == "aac" and info["sample_rate"] == "48000"
    assert (info["width"], info["height"]) == ("1080", "1920")
    assert info["pix_fmt"] == "yuv420p"
    assert info["r_frame_rate"] == "30/1"  # capped at 30 fps
    assert media.probe(out).duration == pytest.approx(2, abs=0.15)
    thumb = make_thumbnail(ffmpeg="ffmpeg", video=out, at=0.5, output=tmp_path / "t.jpg")
    assert thumb.stat().st_size > 0


# --- end to end through Celery tasks -----------------------------------------------------


SENTENCES = [
    "Why do most startups fail in their first year?",
    "The answer surprised me when I first heard it.",
    "It is not money and it is not competition.",
    "It is that founders build things nobody actually wants.",
    "So here is the secret that changed everything for us.",
    "We talked to one hundred customers before writing code.",
    "That sounds slow but it saved us two years of work.",
    "And honestly that was the best decision we ever made.",
] * 3


def fake_transcribe(wav_path, **kw):
    kw["on_progress"](0.5)
    return "en", make_words(SENTENCES, start=0.5, word_s=0.42, gap_s=0.3)


@pytest.fixture
def pipeline_env(database, s3, monkeypatch, eager_celery, tmp_path):
    from app.workers import stages

    monkeypatch.setattr(stages, "transcribe_audio", fake_transcribe)
    monkeypatch.setattr(get_settings(), "work_dir", tmp_path / "work")
    if not media.has_filter("ass"):
        monkeypatch.setattr(get_settings(), "captions_burn_in", False)
    return tmp_path


def _seed_job(tmp_path: Path, options: dict) -> tuple[uuid.UUID, uuid.UUID]:
    from app.core.ids import uuid7
    from app.db.models import Job, JobState, User, Video, VideoStatus, Workspace, WorkspaceMember
    from app.db.session import sync_session
    from app.storage.s3 import get_storage, video_key
    from tests.integration.conftest import Users

    user_id, email = Users().create()
    src = synth_video(tmp_path / "talk.mp4", seconds=sum(len(s.split()) for s in SENTENCES) * 0.42 + 15)
    ws_id, video_id, job_id = uuid7(), uuid7(), uuid7()
    key = video_key(ws_id, video_id, ".mp4")
    get_storage().upload_file(src, key)
    now = datetime.now(UTC)
    with sync_session() as db:
        db.add(User(id=user_id, email=email))
        db.flush()
        db.add(Workspace(id=ws_id, name="w", is_personal=True, created_by=user_id))
        db.flush()
        db.add(WorkspaceMember(workspace_id=ws_id, user_id=user_id, role="owner"))
        db.add(
            Video(
                id=video_id,
                workspace_id=ws_id,
                created_by=user_id,
                status=VideoStatus.uploaded,
                source="upload",
                filename="talk.mp4",
                storage_key=key,
                rights_attested_at=now,
            )
        )
        db.flush()
        db.add(
            Job(
                id=job_id,
                workspace_id=ws_id,
                video_id=video_id,
                created_by=user_id,
                options=options,
                state=JobState.queued,
                attempt=1,
            )
        )
        db.commit()
    return job_id, video_id


OPTIONS = {
    "num_clips": 2,
    "min_duration": 15,
    "max_duration": 30,
    "caption_style": "bold_highlight",
    "language": "auto",
}


def _job(job_id):
    from app.db.models import Job
    from app.db.session import sync_session

    with sync_session() as db:
        return db.get(Job, job_id)


def test_full_pipeline_produces_ranked_rendered_clips(pipeline_env):
    from app.db.models import Artifact, Clip, Render, Video
    from app.db.session import sync_session
    from app.storage.s3 import get_storage
    from app.workers.tasks import enqueue_pipeline

    job_id, video_id = _seed_job(pipeline_env, OPTIONS)
    enqueue_pipeline(job_id, 1)

    job = _job(job_id)
    assert job.state == "completed", job.error
    assert job.progress == 100 and job.finished_at is not None
    with sync_session() as db:
        video = db.get(Video, video_id)
        assert video.status == "ready" and video.width == 640 and video.duration > 0
        kinds = set(db.execute(select(Artifact.kind).where(Artifact.job_id == job_id)).scalars())
        assert {"audio", "transcript", "candidates", "scores", "crop_path"} <= kinds
        clips = list(db.execute(select(Clip).where(Clip.job_id == job_id).order_by(Clip.rank)).scalars())
        assert [c.rank for c in clips] == [1, 2]
        renders = list(db.execute(select(Render).where(Render.clip_id.in_([c.id for c in clips]))).scalars())

    transcript = get_storage().get_json(_artifact_key(job_id, "transcript"))
    word_starts = {w["start"] for w in transcript["words"]}
    word_ends = {w["end"] for w in transcript["words"]}
    sentence_starts = {s["start"] for s in transcript["sentences"]}
    sentence_ends = {s["end"] for s in transcript["sentences"]}
    for c in clips:
        assert c.status == "ready"
        # Acceptance: every clip starts and ends on sentence boundaries and word edges.
        assert c.start_s in word_starts and c.start_s in sentence_starts
        assert c.end_s in word_ends and c.end_s in sentence_ends
        assert 15 - 0.5 <= c.end_s - c.start_s <= 30 + 0.5
    assert len(renders) == 2 and all(r.status == "succeeded" for r in renders)
    out = pipeline_env / "dl.mp4"
    get_storage().download_file(renders[0].storage_key, out)
    info = _probe_out(out)
    assert (info["width"], info["height"]) == ("1080", "1920")
    assert get_storage().exists(renders[0].meta["captions"]["srt"])


def _artifact_key(job_id, kind):
    from app.db.models import Artifact
    from app.db.session import sync_session

    with sync_session() as db:
        return db.execute(
            select(Artifact.storage_key).where(
                Artifact.job_id == job_id, Artifact.kind == kind, Artifact.clip_id.is_(None)
            )
        ).scalar_one()


def test_resume_after_worker_death_skips_completed_stages(pipeline_env, monkeypatch):
    """Acceptance: killing a worker mid-job still results in a completed job via resume."""
    from app.db.models import Job
    from app.db.session import sync_session
    from app.workers import stages, tasks

    job_id, _ = _seed_job(pipeline_env, OPTIONS)
    calls = {"transcribe": 0}

    def counting_transcribe(*a, **kw):
        calls["transcribe"] += 1
        return fake_transcribe(*a, **kw)

    monkeypatch.setattr(stages, "transcribe_audio", counting_transcribe)

    # Simulate the worker dying during analysis: the process vanishes without
    # updating job state (SystemExit is not caught by the stage error handling).
    original_analyze = stages.analyze

    def die(ctx):
        raise SystemExit("worker killed")

    monkeypatch.setattr(stages, "analyze", die)
    with pytest.raises(SystemExit):
        tasks.enqueue_pipeline(job_id, 1)
    job = _job(job_id)
    assert job.state == "transcribing" and calls["transcribe"] == 1

    # The heartbeat goes stale; the reaper resumes with a new attempt.
    monkeypatch.setattr(stages, "analyze", original_analyze)
    with sync_session() as db:
        db.execute(update(Job).where(Job.id == job_id).values(heartbeat_at=datetime.now(UTC) - timedelta(hours=1)))
        db.commit()
    assert tasks.requeue_stale_jobs() >= 1

    job = _job(job_id)
    assert job.state == "completed", job.error
    assert job.attempt == 2
    assert calls["transcribe"] == 1  # transcript artifact reused, stage skipped


def test_stale_attempt_tasks_exit_without_side_effects(pipeline_env):
    from app.workers.context import JobContext, StopJob

    job_id, _ = _seed_job(pipeline_env, OPTIONS)
    with pytest.raises(StopJob):
        JobContext(job_id, attempt=99)


def test_invalid_media_fails_job_with_stage_and_code(pipeline_env):
    from app.db.models import Video
    from app.db.session import sync_session
    from app.storage.s3 import get_storage
    from app.workers.tasks import enqueue_pipeline

    job_id, video_id = _seed_job(pipeline_env, OPTIONS)
    with sync_session() as db:
        key = db.get(Video, video_id).storage_key
    junk = pipeline_env / "junk.mp4"
    junk.write_bytes(b"garbage")
    get_storage().upload_file(junk, key)
    enqueue_pipeline(job_id, 1)
    job = _job(job_id)
    assert job.state == "failed"
    assert job.error["code"] == "invalid_media" and job.error["stage"] == "ingesting"
    assert job.error["retryable"] is False
    with sync_session() as db:
        assert db.get(Video, video_id).status == "invalid"


def test_single_clip_rerender_after_trim(pipeline_env):
    from app.db.models import Clip, Render
    from app.db.session import sync_session
    from app.workers import stages
    from app.workers.tasks import enqueue_pipeline, enqueue_render

    job_id, _ = _seed_job(pipeline_env, OPTIONS)
    enqueue_pipeline(job_id, 1)
    with sync_session() as db:
        clip = db.execute(select(Clip).where(Clip.job_id == job_id, Clip.rank == 1)).scalar_one()
        clip.caption_style = "boxed"
        clip.layout = "wide"
        db.commit()
    render_id = stages.create_render(clip.id)
    enqueue_render(clip.id, render_id)
    with sync_session() as db:
        render = db.get(Render, render_id)
        assert render.status == "succeeded", render.error
        assert render.meta["layout"] == "wide" and render.meta["caption_style"] == "boxed"
