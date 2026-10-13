import os
import shutil
from pathlib import Path

# Configure before any app module reads settings.
os.environ.update(
    {
        "CLIPPRO_ENV_FILE": "",
        "ENV": "test",
        "SUPABASE_URL": "https://testproject.supabase.co",
        "DATABASE_URL": os.environ.get("TEST_DATABASE_URL", "postgresql+psycopg:///clippro_test?host=/tmp"),
        "REDIS_URL": "redis://127.0.0.1:1/0",
        "S3_ENDPOINT_URL": "",
        "S3_REGION": "apac",
        "S3_BUCKET": "clippro-test",
        "S3_ACCESS_KEY_ID": "testing",
        "S3_SECRET_ACCESS_KEY": "testing",
        "S3_FORCE_PATH_STYLE": "true",
        "LLM_MODEL": "",
        # moto's in-memory S3 can't be fetched by Chrome; Remotion has its own tests.
        "RENDERER": "ffmpeg",
        "WORK_DIR": str(Path(os.environ.get("TMPDIR", "/tmp")) / "clippro-tests"),
        "LOG_LEVEL": "WARNING",
    }
)
os.environ.pop("LLM_MODEL", None)

import pytest

from app.pipeline.transcribe import segment_sentences
from app.pipeline.types import Sentence, Transcript, Word


def make_words(
    text_by_sentence: list[str], *, start: float = 0.0, word_s: float = 0.4, gap_s: float = 0.2
) -> list[Word]:
    """Words at a steady pace, with a short gap between sentences."""
    words: list[Word] = []
    t = start
    for sentence in text_by_sentence:
        for token in sentence.split():
            words.append(Word(word=token, start=round(t, 3), end=round(t + word_s - 0.05, 3)))
            t += word_s
        t += gap_s
    return words


def make_transcript(sentences: list[str], **kw: float) -> Transcript:
    words = make_words(sentences, **kw)
    return Transcript(language="en", duration=words[-1].end + 1, sentences=segment_sentences(words), words=words)


@pytest.fixture
def transcript_factory():
    return make_transcript


def has_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


__all__ = ["Sentence", "make_transcript", "make_words"]
