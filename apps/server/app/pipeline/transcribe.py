"""Speech recognition (faster-whisper with silero VAD) and sentence segmentation.

Diarization (pyannote) arrives in M3; until then every word carries DEFAULT_SPEAKER.
"""

import wave
from collections.abc import Callable
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np

from app.pipeline.types import DEFAULT_SPEAKER, Sentence, Transcript, Word

SENTENCE_END = (".", "?", "!", "…")
_TRAILING_QUOTES = "\"')]}”’»"


@lru_cache(maxsize=2)
def _load_model(model_size: str, device: str, compute_type: str) -> Any:
    from faster_whisper import WhisperModel

    return WhisperModel(model_size, device=device, compute_type=compute_type)


def load_wav_16k(path: Path) -> np.ndarray:
    """Read the 16 kHz mono PCM WAV produced at ingest as float32 in [-1, 1].

    Decoding it ourselves avoids faster-whisper's PyAV path, which breaks across PyAV
    releases, and we already guarantee the format at ingest.
    """
    with wave.open(str(path), "rb") as wf:
        if wf.getframerate() != 16000 or wf.getnchannels() != 1 or wf.getsampwidth() != 2:
            raise ValueError("expected 16 kHz mono 16-bit PCM audio")
        frames = wf.readframes(wf.getnframes())
    return np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0


def transcribe_audio(
    wav_path: Path,
    *,
    model_size: str,
    device: str = "auto",
    compute_type: str = "int8",
    language: str | None = None,
    on_progress: Callable[[float], None] | None = None,
) -> tuple[str, list[Word]]:
    """Return (detected_language, words) with word-level timestamps."""
    model = _load_model(model_size, device, compute_type)
    segments, info = model.transcribe(
        load_wav_16k(wav_path),
        language=None if language in (None, "auto") else language,
        word_timestamps=True,
        # Silero VAD skips silence, which avoids hallucinated text (FR-TRN-2).
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 500},
        condition_on_previous_text=False,
        beam_size=5,
    )
    words: list[Word] = []
    total = max(float(info.duration or 0.0), 1e-6)
    for segment in segments:
        for w in segment.words or []:
            text = w.word.strip()
            if not text:
                continue
            words.append(
                Word(
                    word=text,
                    start=round(float(w.start), 3),
                    end=round(float(w.end), 3),
                    speaker=DEFAULT_SPEAKER,
                    confidence=round(float(w.probability), 3),
                )
            )
        if on_progress:
            on_progress(min(1.0, float(segment.end) / total))
    return str(info.language), words


def _ends_sentence(word: str) -> bool:
    return word.rstrip(_TRAILING_QUOTES).endswith(SENTENCE_END)


def segment_sentences(
    words: list[Word],
    *,
    pause_threshold: float = 0.7,
    max_sentence_duration: float = 20.0,
) -> list[Sentence]:
    """Split words into sentences on punctuation, pauses > `pause_threshold`, and speaker
    changes (FR-TRN-4). Very long unpunctuated runs are split so they can still fit a clip."""
    sentences: list[Sentence] = []
    start_idx = 0
    for i, word in enumerate(words):
        nxt = words[i + 1] if i + 1 < len(words) else None
        boundary = (
            nxt is None
            or _ends_sentence(word.word)
            or (nxt.start - word.end) > pause_threshold
            or nxt.speaker != word.speaker
            or (word.end - words[start_idx].start) >= max_sentence_duration
        )
        if boundary:
            chunk = words[start_idx : i + 1]
            sentences.append(
                Sentence(
                    id=len(sentences),
                    start=chunk[0].start,
                    end=chunk[-1].end,
                    text=" ".join(w.word for w in chunk),
                    speaker=chunk[0].speaker,
                    word_start=start_idx,
                    word_end=i + 1,
                )
            )
            start_idx = i + 1
    return sentences


def build_transcript(language: str, duration: float, words: list[Word]) -> Transcript:
    return Transcript(language=language, duration=duration, sentences=segment_sentences(words), words=words)
