"""Speech recognition through Vercel AI Gateway's transcription endpoint.

The endpoint takes base64 audio in a JSON body (no multipart upload), so the 16 kHz ingest WAV
(~115 MB per hour) is first compressed to mono Opus, and long recordings are sent in chunks
whose timestamps are shifted back onto the full timeline.

Word timing, in order of preference:
1. `providerMetadata.elevenlabs.words` (elevenlabs/scribe-v2): words with speaker ids.
2. The normalized `words` list (`text`, `startSecond`, `endSecond`).
3. `segments` only: each segment's duration is spread over its words, proportionally to their
   length. Approximate, so prefer a model that returns word timestamps.

Docs: https://vercel.com/docs/ai-gateway/modalities/speech-to-text
"""

import base64
import subprocess
import tempfile
import wave
from collections.abc import Callable
from pathlib import Path
from typing import Any

import httpx

from app.pipeline.types import DEFAULT_SPEAKER, Word

# ElevenLabs reports ISO 639-3 codes; the rest of the pipeline uses ISO 639-1 like Whisper.
_ISO3 = {
    "eng": "en", "spa": "es", "fra": "fr", "deu": "de", "ita": "it", "por": "pt", "nld": "nl",
    "pol": "pl", "rus": "ru", "ukr": "uk", "tur": "tr", "ara": "ar", "hin": "hi", "ben": "bn",
    "mar": "mr", "tam": "ta", "tel": "te", "urd": "ur", "jpn": "ja", "kor": "ko", "cmn": "zh",
    "zho": "zh", "yue": "zh", "vie": "vi", "ind": "id", "tha": "th", "swe": "sv", "nor": "no",
    "dan": "da", "fin": "fi", "ces": "cs", "ell": "el", "heb": "he", "ron": "ro", "hun": "hu",
}  # fmt: skip
_HEADERS = {"ai-gateway-protocol-version": "0.0.1", "ai-transcription-model-specification-version": "4"}


class GatewaySttError(RuntimeError):
    pass


def wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as wf:
        return wf.getnframes() / float(wf.getframerate())


def encode_opus(
    wav_path: Path, out_path: Path, *, start: float, duration: float, bitrate_kbps: int, ffmpeg_bin: str
) -> None:
    """Cut [start, start + duration) out of the WAV as mono Ogg/Opus."""
    cmd = [
        ffmpeg_bin, "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
        "-ss", f"{start:.3f}", "-t", f"{duration:.3f}", "-i", str(wav_path),
        "-ac", "1", "-c:a", "libopus", "-b:a", f"{bitrate_kbps}k", "-application", "voip",
        str(out_path),
    ]  # fmt: skip
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise GatewaySttError(f"ffmpeg failed to encode audio for transcription: {result.stderr.strip()[-400:]}")


def _speaker(label: Any, mapping: dict[str, str]) -> str:
    # ElevenLabs labels speakers "speaker_0", "speaker_1", ...; keep our SPEAKER_<n> convention,
    # numbered in order of appearance so chunks agree as far as the provider does.
    if label in (None, ""):
        return DEFAULT_SPEAKER
    return mapping.setdefault(str(label), f"SPEAKER_{len(mapping)}")


def _word(text: str, start: float, end: float, offset: float, speaker: str, confidence: float = 1.0) -> Word:
    return Word(
        word=text,
        start=round(offset + start, 3),
        end=round(offset + max(end, start), 3),
        speaker=speaker,
        confidence=round(confidence, 3),
    )


def _spread_segment(text: str, start: float, end: float, offset: float) -> list[Word]:
    tokens = text.split()
    total = sum(len(t) for t in tokens) or 1
    words, cursor = [], start
    for token in tokens:
        span = (end - start) * len(token) / total
        words.append(_word(token, cursor, cursor + span, offset, DEFAULT_SPEAKER))
        cursor += span
    return words


def parse_words(result: dict[str, Any], *, offset: float, speakers: dict[str, str]) -> list[Word]:
    """Map one transcription response onto Words on the full timeline (see module docstring)."""
    eleven = ((result.get("providerMetadata") or {}).get("elevenlabs") or {}).get("words")
    if eleven:
        out = []
        for w in eleven:
            text = str(w.get("text") or "").strip()
            if w.get("type", "word") != "word" or not text:
                continue  # spacing and audio events ("[laughs]")
            logprob = w.get("logprob")
            confidence = 1.0 if logprob is None else min(1.0, 2.718281828 ** float(logprob))
            out.append(
                _word(
                    text,
                    float(w["start"]),
                    float(w["end"]),
                    offset,
                    _speaker(w.get("speaker_id"), speakers),
                    confidence,
                )
            )
        return out
    if result.get("words"):
        return [
            _word(text, float(w["startSecond"]), float(w["endSecond"]), offset, DEFAULT_SPEAKER)
            for w in result["words"]
            if (text := str(w.get("text") or "").strip())
        ]
    out = []
    for seg in result.get("segments") or []:
        out.extend(
            _spread_segment(str(seg.get("text") or ""), float(seg["startSecond"]), float(seg["endSecond"]), offset)
        )
    return out


def _provider_options(model: str, language: str | None, extra: dict[str, Any]) -> dict[str, Any]:
    options: dict[str, Any] = {k: dict(v) for k, v in extra.items()}
    if language in (None, "auto"):
        return options
    creator = model.partition("/")[0]
    key = {"elevenlabs": "languageCode", "openai": "language", "mistral": "language"}.get(creator)
    if key:
        options.setdefault(creator, {}).setdefault(key, language)
    return options


def transcribe_audio_gateway(
    wav_path: Path,
    *,
    api_key: str,
    model: str = "elevenlabs/scribe-v2",
    base_url: str = "https://ai-gateway.vercel.sh",
    language: str | None = None,
    chunk_seconds: float = 1200,
    bitrate_kbps: int = 32,
    provider_options: dict[str, Any] | None = None,
    ffmpeg_bin: str = "ffmpeg",
    timeout: float = 900,
    on_progress: Callable[[float], None] | None = None,
    transport: httpx.BaseTransport | None = None,
) -> tuple[str, list[Word]]:
    """Return (language, words) with word-level timestamps in seconds."""
    duration = wav_duration(wav_path)
    step = chunk_seconds if chunk_seconds > 0 else max(duration, 1.0)
    starts = [i * step for i in range(max(1, int(-(-duration // step))))]
    options = _provider_options(model, language, provider_options or {})
    speakers: dict[str, str] = {}
    words: list[Word] = []
    detected: str | None = None

    with (
        tempfile.TemporaryDirectory(prefix="stt-") as tmp,
        httpx.Client(
            base_url=base_url.rstrip("/"),
            headers={"Authorization": f"Bearer {api_key}", "ai-model-id": model, **_HEADERS},
            timeout=httpx.Timeout(60, read=timeout),
            transport=transport,
        ) as http,
    ):
        for i, start in enumerate(starts):
            chunk = Path(tmp) / f"chunk-{i}.ogg"
            encode_opus(wav_path, chunk, start=start, duration=step, bitrate_kbps=bitrate_kbps, ffmpeg_bin=ffmpeg_bin)
            body: dict[str, Any] = {"audio": base64.b64encode(chunk.read_bytes()).decode(), "mediaType": "audio/ogg"}
            if options:
                body["providerOptions"] = options
            resp = http.post("/v4/ai/transcription-model", json=body)
            if resp.is_error:
                raise GatewaySttError(f"AI Gateway transcription ({model}) {resp.status_code}: {resp.text[:500]}")
            result: dict[str, Any] = resp.json()
            words.extend(parse_words(result, offset=start, speakers=speakers))
            detected = detected or result.get("language")
            if on_progress:
                on_progress((i + 1) / len(starts))

    # Normalize "en-US" / "eng" style codes to the base language, as Whisper reports it.
    lang = str(detected or language or "en").replace("_", "-").split("-")[0].lower()
    lang = _ISO3.get(lang, lang)
    return ("en" if lang == "auto" else lang), words
