"""Speech recognition through AssemblyAI's pre-recorded (async) API.

Flow: upload the ingest WAV to /v2/upload, create a transcript job on /v2/transcript, poll it
until it completes, then map the word list onto our Word shape. Plain httpx rather than the SDK
keeps the dependency surface small and the request explicit.
"""

import time
from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any

import httpx

from app.pipeline.types import DEFAULT_SPEAKER, Word

_UPLOAD_CHUNK = 5 * 1024 * 1024


class AssemblyAIError(RuntimeError):
    pass


def _iter_file(path: Path) -> Iterator[bytes]:
    with path.open("rb") as f:
        while chunk := f.read(_UPLOAD_CHUNK):
            yield chunk


def _check(resp: httpx.Response) -> dict[str, Any]:
    if resp.is_error:
        try:
            detail = resp.json().get("error") or resp.text
        except ValueError:
            detail = resp.text
        raise AssemblyAIError(f"AssemblyAI {resp.request.method} {resp.request.url.path} {resp.status_code}: {detail}")
    data: dict[str, Any] = resp.json()
    return data


def _speaker(label: str | None, mapping: dict[str, str]) -> str:
    # AssemblyAI labels speakers "A", "B", ...; keep our SPEAKER_<n> convention.
    if not label:
        return DEFAULT_SPEAKER
    return mapping.setdefault(label, f"SPEAKER_{len(mapping)}")


def transcribe_audio_assemblyai(
    wav_path: Path,
    *,
    api_key: str,
    base_url: str = "https://api.assemblyai.com",
    speech_models: list[str] | None = None,
    speaker_labels: bool = False,
    language: str | None = None,
    poll_interval: float = 3.0,
    timeout: float = 3 * 3600,
    on_progress: Callable[[float], None] | None = None,
    transport: httpx.BaseTransport | None = None,
) -> tuple[str, list[Word]]:
    """Return (language, words) with word-level timestamps in seconds."""
    deadline = time.monotonic() + timeout
    # Auth is the raw key, without a "Bearer" prefix.
    with httpx.Client(
        base_url=base_url,
        headers={"Authorization": api_key},
        timeout=httpx.Timeout(60, read=300),
        transport=transport,
    ) as http:
        upload = _check(
            http.post("/v2/upload", content=_iter_file(wav_path), headers={"Content-Type": "application/octet-stream"})
        )
        if on_progress:
            on_progress(0.2)

        body: dict[str, Any] = {
            "audio_url": upload["upload_url"],
            "speech_models": speech_models or ["universal-3-5-pro", "universal-2"],
            "punctuate": True,
            "format_text": True,
            "speaker_labels": speaker_labels,
        }
        if language in (None, "auto"):
            body["language_detection"] = True
        else:
            body["language_code"] = language
        job = _check(http.post("/v2/transcript", json=body))
        if on_progress:
            on_progress(0.3)

        while job["status"] not in ("completed", "error"):
            if time.monotonic() > deadline:
                raise AssemblyAIError(f"AssemblyAI transcript {job['id']} timed out")
            time.sleep(poll_interval)
            job = _check(http.get(f"/v2/transcript/{job['id']}"))
            if on_progress and job["status"] == "processing":
                on_progress(0.6)
        if job["status"] == "error":
            raise AssemblyAIError(f"AssemblyAI transcript {job['id']} failed: {job.get('error')}")

    speakers: dict[str, str] = {}
    words: list[Word] = []
    for w in job.get("words") or []:
        text = (w.get("text") or "").strip()
        if not text:
            continue
        words.append(
            Word(
                word=text,
                start=round(w["start"] / 1000, 3),
                end=round(w["end"] / 1000, 3),
                speaker=_speaker(w.get("speaker"), speakers),
                confidence=round(float(w.get("confidence") or 1.0), 3),
            )
        )
    if on_progress:
        on_progress(1.0)
    # Localized codes such as "en_us" are reduced to the base language, as Whisper reports it.
    detected = str(job.get("language_code") or language or "en").split("_")[0]
    return detected, words
