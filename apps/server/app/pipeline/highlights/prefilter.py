"""Cheap deterministic pre-filter (FR-HLT-2).

Ranks every candidate on speech rate, audio energy, laughter and question/answer
patterns, then keeps the top K for LLM scoring. This bounds LLM cost on long videos.
"""

import math
import re
import wave
from pathlib import Path

import numpy as np

from app.pipeline.types import Candidate, Transcript

ENVELOPE_HOP_S = 0.1

_LAUGH = re.compile(r"\b(ha(ha)+|lol|lmao)\b|\[(laughter|laughs)\]|\((laughter|laughs|laughing)\)", re.I)
_HOOK = re.compile(
    r"\b(secret|never|always|mistake|truth|actually|crazy|insane|surprising|biggest|worst|best|"
    r"nobody|everyone|why|how|what if|imagine|here's|the reason)\b|\d",
    re.I,
)
_WEAK_OPENERS = {"and", "but", "so", "because", "um", "uh", "yeah", "like", "or", "then", "which", "that"}

WEIGHTS = {
    "speech_rate": 0.8,
    "energy": 1.0,
    "energy_var": 0.6,
    "laughter": 1.2,
    "qa": 1.0,
    "hook": 0.8,
    "weak_open": -1.0,
}


def energy_envelope(wav_path: Path, hop_s: float = ENVELOPE_HOP_S) -> np.ndarray:
    """RMS loudness in dB per `hop_s` window, read in chunks to bound memory."""
    with wave.open(str(wav_path), "rb") as wf:
        if wf.getsampwidth() != 2:
            raise ValueError("expected 16-bit PCM audio")
        rate, channels = wf.getframerate(), wf.getnchannels()
        hop = max(1, int(rate * hop_s))
        values: list[float] = []
        while True:
            frames = wf.readframes(hop * 600)
            if not frames:
                break
            samples = np.frombuffer(frames, dtype=np.int16).astype(np.float32)
            if channels > 1:
                samples = samples.reshape(-1, channels).mean(axis=1)
            usable = len(samples) - len(samples) % hop
            if usable:
                blocks = samples[:usable].reshape(-1, hop)
                values.extend(np.sqrt(np.mean(blocks**2, axis=1)).tolist())
            if len(samples) > usable:
                tail = samples[usable:]
                values.append(float(np.sqrt(np.mean(tail**2))))
    rms = np.asarray(values, dtype=np.float32)
    return 20 * np.log10(np.maximum(rms, 1.0) / 32768.0)


def _zscore(values: np.ndarray) -> np.ndarray:
    std = values.std()
    return np.zeros_like(values) if std < 1e-9 else (values - values.mean()) / std


def compute_features(candidates: list[Candidate], transcript: Transcript, envelope: np.ndarray | None) -> None:
    sentences = transcript.sentences
    for c in candidates:
        first, last = sentences[c.sentence_start], sentences[c.sentence_end]
        words = transcript.words[first.word_start : last.word_end]
        text = " ".join(w.word for w in words)
        duration = max(c.duration, 1e-6)

        qa = 0.0
        for s in sentences[c.sentence_start : c.sentence_end]:  # a question followed by an answer
            if s.text.rstrip().endswith("?"):
                qa = 1.0
                break

        energy = energy_var = 0.0
        if envelope is not None and len(envelope):
            a = int(c.start / ENVELOPE_HOP_S)
            b = max(a + 1, math.ceil(c.end / ENVELOPE_HOP_S))
            window = envelope[a:b]
            if len(window):
                energy, energy_var = float(window.mean()), float(window.std())

        first_word = re.sub(r"\W", "", words[0].word.lower()) if words else ""
        c.features = {
            "speech_rate": len(words) / duration,
            "energy": energy,
            "energy_var": energy_var,
            "laughter": float(len(_LAUGH.findall(text))),
            "qa": qa,
            "hook": float(bool(_HOOK.search(first.text))) + (0.5 if first.text.rstrip().endswith("?") else 0.0),
            "weak_open": float(first_word in _WEAK_OPENERS),
        }


def score_candidates(candidates: list[Candidate]) -> None:
    if not candidates:
        return
    total = np.zeros(len(candidates))
    for name, weight in WEIGHTS.items():
        values = np.array([c.features.get(name, 0.0) for c in candidates], dtype=np.float64)
        # Binary-ish features are used raw; continuous ones are normalized.
        normalized = values if name in ("qa", "weak_open") else _zscore(values)
        total += weight * normalized
    for c, s in zip(candidates, total, strict=True):
        c.prefilter_score = round(float(s), 4)


def _overlap(a: Candidate, b: Candidate) -> float:
    inter = min(a.end, b.end) - max(a.start, b.start)
    return max(0.0, inter) / max(min(a.duration, b.duration), 1e-6)


def top_k_for_duration(duration_s: float, per_hour: int, num_clips: int) -> int:
    return max(num_clips * 3, math.ceil(per_hour * duration_s / 3600))


def prefilter(
    candidates: list[Candidate],
    transcript: Transcript,
    *,
    envelope: np.ndarray | None,
    k: int,
    max_overlap: float = 0.8,
) -> list[Candidate]:
    """Score all candidates and keep the top `k`, suppressing near-duplicate windows."""
    compute_features(candidates, transcript, envelope)
    score_candidates(candidates)
    kept: list[Candidate] = []
    for c in sorted(candidates, key=lambda c: c.prefilter_score, reverse=True):
        if all(_overlap(c, other) <= max_overlap for other in kept):
            kept.append(c)
            if len(kept) >= k:
                break
    return sorted(kept, key=lambda c: c.start)
