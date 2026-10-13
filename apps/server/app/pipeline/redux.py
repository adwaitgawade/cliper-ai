"""Speech recognition with Moondream Parakeet Redux, run locally through the Photon runtime.

The runtime splits long audio at pauses into segments of at most 30 s itself, so the whole
ingest WAV goes in one call. Parakeet has no diarization, so words carry DEFAULT_SPEAKER, and
it reports no language, so the caller supplies one.
"""

from collections.abc import Callable
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.pipeline.types import DEFAULT_SPEAKER, Word


@lru_cache(maxsize=2)
def _load_model(model: str, device: str) -> Any:
    try:
        import moondream as md
    except ImportError as e:
        raise RuntimeError("Parakeet Redux needs the moondream package: uv sync --extra redux") from e
    # Photon shares one engine per (model, device) across clients; keep ours for the process.
    return md.photon(model, device=None if device == "auto" else device)


def words_from_result(result: dict[str, Any]) -> list[Word]:
    """Map a `timestamps="word"` result (segments -> words, seconds) onto our Word shape."""
    words: list[Word] = []
    for segment in result.get("segments") or []:
        for w in segment.get("words") or []:
            text = str(w.get("word") or "").strip()
            if not text:
                continue
            words.append(
                Word(
                    word=text,
                    start=round(float(w["start"]), 3),
                    end=round(float(w["end"]), 3),
                    speaker=DEFAULT_SPEAKER,
                    confidence=round(float(w.get("confidence") or 1.0), 3),
                )
            )
    return words


def transcribe_audio_redux(
    wav_path: Path,
    *,
    model: str = "moondream/parakeet-redux",
    device: str = "auto",
    language: str | None = None,
    fallback_language: str = "en",
    on_progress: Callable[[float], None] | None = None,
) -> tuple[str, list[Word]]:
    """Return (language, words) with word-level timestamps in seconds."""
    speech = _load_model(model, device)
    if on_progress:
        on_progress(0.1)
    # Parakeet v3 detects the language and rejects a forced one, so `language` is not sent.
    result = speech.transcribe(audio=str(wav_path), timestamps="word")
    words = words_from_result(result)
    if on_progress:
        on_progress(1.0)
    detected = result.get("language") or (fallback_language if language in (None, "auto") else language)
    return str(detected), words
