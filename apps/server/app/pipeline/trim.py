"""Clip trim rules shared by the editor API and AI edits: word snapping and limits."""

import bisect

from app.pipeline.types import Transcript

MIN_CLIP_SECONDS, MAX_CLIP_SECONDS = 1.0, 180.0


def snap_start(t: float, transcript: Transcript) -> float:
    """Nearest word start to `t`."""
    starts = [w.start for w in transcript.words]
    i = bisect.bisect_left(starts, t)
    options = [starts[j] for j in (i - 1, i) if 0 <= j < len(starts)]
    return min(options, key=lambda s: abs(s - t))


def snap_end(t: float, transcript: Transcript) -> float:
    """Nearest word end to `t`."""
    ends = [w.end for w in transcript.words]
    i = bisect.bisect_left(ends, t)
    options = [ends[j] for j in (i - 1, i) if 0 <= j < len(ends)]
    return min(options, key=lambda e: abs(e - t))
