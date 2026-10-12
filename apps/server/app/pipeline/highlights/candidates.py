"""Deterministic candidate generation (FR-HLT-1).

Windows always start at a sentence start and end at a sentence end, so a clip can
never begin or end mid-sentence.
"""

from app.pipeline.types import Candidate, Sentence


def build_candidates(sentences: list[Sentence], *, min_duration: float, max_duration: float) -> list[Candidate]:
    candidates: list[Candidate] = []
    n = len(sentences)
    for i in range(n):
        start = sentences[i].start
        for j in range(i, n):
            duration = sentences[j].end - start
            if duration > max_duration:
                break
            if duration >= min_duration:
                candidates.append(
                    Candidate(
                        id=len(candidates),
                        sentence_start=i,
                        sentence_end=j,
                        start=start,
                        end=sentences[j].end,
                    )
                )
    return candidates
