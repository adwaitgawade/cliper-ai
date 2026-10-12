"""Validation and selection of scored candidates, done in code (FR-HLT-6, FR-HLT-7)."""

from dataclasses import asdict, dataclass, field
from typing import Any

from app.pipeline.highlights.schemas import CandidateScore
from app.pipeline.types import Candidate, Transcript

DURATION_TOLERANCE_S = 0.5


@dataclass
class SelectedClip:
    candidate_id: int
    rank: int
    start: float
    end: float
    score: float
    title: str
    hook: str
    reason: str
    scores: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def snap_to_words(candidate: Candidate, transcript: Transcript) -> tuple[float, float] | None:
    """Snap a candidate's boundaries to the edges of its first and last words."""
    first = transcript.sentences[candidate.sentence_start]
    last = transcript.sentences[candidate.sentence_end]
    if first.word_start >= last.word_end:
        return None
    return transcript.words[first.word_start].start, transcript.words[last.word_end - 1].end


def overlap_ratio(a: tuple[float, float], b: tuple[float, float]) -> float:
    inter = min(a[1], b[1]) - max(a[0], b[0])
    shorter = min(a[1] - a[0], b[1] - b[0])
    return max(0.0, inter) / max(shorter, 1e-6)


def _sort_key(item: tuple[Candidate, CandidateScore]) -> tuple[float, float, float]:
    cand, s = item
    subtotal = s.hook + s.self_contained + s.emotion + s.payoff + s.shareability
    return (s.overall, subtotal, cand.prefilter_score)


def rank_valid(
    candidates: list[Candidate],
    scores: dict[int, CandidateScore],
    transcript: Transcript,
    *,
    video_duration: float,
    min_duration: float,
    max_duration: float,
) -> list[tuple[Candidate, CandidateScore, tuple[float, float]]]:
    """Drop unknown IDs and out-of-bounds clips, snap to word edges, rank by score."""
    by_id = {c.id: c for c in candidates}
    valid: list[tuple[Candidate, CandidateScore, tuple[float, float]]] = []
    for cid, score in scores.items():
        cand = by_id.get(cid)
        if cand is None:
            continue
        span = snap_to_words(cand, transcript)
        if span is None:
            continue
        start, end = span
        if start < 0 or end > video_duration + DURATION_TOLERANCE_S:
            continue
        duration = end - start
        if not (min_duration - DURATION_TOLERANCE_S <= duration <= max_duration + DURATION_TOLERANCE_S):
            continue
        valid.append((cand, score, span))
    valid.sort(key=lambda t: _sort_key((t[0], t[1])), reverse=True)
    return valid


def select_clips(
    ranked: list[tuple[Candidate, CandidateScore, tuple[float, float]]],
    *,
    num_clips: int,
    video_duration: float,
    max_overlap: float = 0.3,
    spread: bool = True,
) -> list[SelectedClip]:
    """Greedy top-N with the 30% overlap rule and an optional spread constraint.

    The spread pass first requires clip centers to be at least
    `video_duration / (2 * num_clips)` apart; a second pass fills any remaining slots
    without it, so spread never reduces the number of clips returned.
    """
    chosen: list[tuple[Candidate, CandidateScore, tuple[float, float]]] = []
    min_gap = video_duration / (2 * num_clips) if spread and num_clips > 1 else 0.0

    def fits(span: tuple[float, float], gap: float) -> bool:
        center = (span[0] + span[1]) / 2
        for _, _, other in chosen:
            if overlap_ratio(span, other) > max_overlap:
                return False
            if gap and abs(center - (other[0] + other[1]) / 2) < gap:
                return False
        return True

    for gap in [min_gap, 0.0] if min_gap else [0.0]:
        for item in ranked:
            if len(chosen) >= num_clips:
                break
            if item not in chosen and fits(item[2], gap):
                chosen.append(item)

    chosen.sort(key=lambda t: _sort_key((t[0], t[1])), reverse=True)
    return [
        SelectedClip(
            candidate_id=cand.id,
            rank=i + 1,
            start=round(span[0], 3),
            end=round(span[1], 3),
            score=float(score.overall),
            title=score.title,
            hook=score.hook_line,
            reason=score.reason,
            scores=score.model_dump(exclude={"candidate_id", "title", "hook_line", "reason"}),
        )
        for i, (cand, score, span) in enumerate(chosen)
    ]
