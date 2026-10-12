"""Real speech through faster-whisper. Slow: downloads the `tiny` model on first run.

Run with: uv run pytest -m slow
"""

import shutil
import subprocess

import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.pipeline import media
from tests.conftest import has_ffmpeg

pytestmark = [
    pytest.mark.integration,
    pytest.mark.slow,
    pytest.mark.skipif(not (has_ffmpeg() and shutil.which("say")), reason="needs ffmpeg and macOS `say`"),
]

SCRIPT = (
    "Why do most startups fail in their first year? The answer surprised me. "
    "It is not money, and it is not competition. "
    "It is that founders build things nobody actually wants. "
    "So here is the secret that changed everything for us. "
    "We talked to one hundred customers before we wrote a single line of code. "
    "That sounds slow, but it saved us two years of work. "
    "Honestly, that was the best decision we ever made. "
    "If you remember one thing from this talk, remember this. Talk to your users every single week."
)


def test_real_transcription_pipeline(database, s3, eager_celery, tmp_path, monkeypatch):
    from app.db.models import Clip, Video
    from app.db.session import sync_session
    from app.storage.s3 import get_storage
    from app.workers.tasks import enqueue_pipeline
    from tests.integration.test_pipeline import _artifact_key, _job, _seed_job

    monkeypatch.setattr(get_settings(), "whisper_model", "tiny")
    monkeypatch.setattr(get_settings(), "whisper_device", "cpu")
    monkeypatch.setattr(get_settings(), "work_dir", tmp_path / "work")
    if not media.has_filter("ass"):
        monkeypatch.setattr(get_settings(), "captions_burn_in", False)

    job_id, video_id = _seed_job(tmp_path, {"num_clips": 2, "min_duration": 8, "max_duration": 25})
    # Swap the seeded synthetic video for one carrying real synthesized speech.
    speech = tmp_path / "speech.aiff"
    subprocess.run(["say", "-r", "170", "-o", str(speech), SCRIPT], check=True)
    talk = tmp_path / "speech.mp4"
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "testsrc2=size=640x360:rate=30",
            "-i",
            str(speech),
            "-shortest",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            str(talk),
        ],
        check=True,
    )
    with sync_session() as db:
        get_storage().upload_file(talk, db.get(Video, video_id).storage_key)

    enqueue_pipeline(job_id, 1)
    job = _job(job_id)
    assert job.state == "completed", job.error

    transcript = get_storage().get_json(_artifact_key(job_id, "transcript"))
    text = " ".join(w["word"] for w in transcript["words"]).lower()
    assert transcript["language"] == "en"
    assert "startups" in text and "customers" in text
    assert all(w["end"] >= w["start"] for w in transcript["words"])
    with sync_session() as db:
        clips = list(db.execute(select(Clip).where(Clip.job_id == job_id)).scalars())
    assert clips and all(c.status == "ready" for c in clips)
