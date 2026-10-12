import wave

import numpy as np
import pytest

from app.pipeline.highlights.candidates import build_candidates
from app.pipeline.highlights.prefilter import energy_envelope, prefilter, top_k_for_duration
from app.pipeline.highlights.schemas import CandidateScore
from app.pipeline.highlights.validate import overlap_ratio, rank_valid, select_clips, snap_to_words
from app.pipeline.types import Candidate
from tests.conftest import make_transcript


def _score(cid: int, overall: int, **kw) -> CandidateScore:
    base = {"hook": 5, "self_contained": 5, "emotion": 5, "payoff": 5, "shareability": 5}
    base.update(kw)
    return CandidateScore(candidate_id=cid, overall=overall, title=f"t{cid}", hook_line="h", reason="r", **base)


@pytest.fixture
def transcript():
    lines = []
    for i in range(60):
        lines.append("Why does this matter so much?" if i % 7 == 0 else f"Here is a plain point number {i} today.")
    return make_transcript(lines)


def test_top_k_scales_with_duration():
    assert top_k_for_duration(3600, 40, 8) == 40
    assert top_k_for_duration(7200, 40, 8) == 80
    assert top_k_for_duration(60, 40, 8) == 24  # at least 3x the clip count


def test_prefilter_keeps_k_and_suppresses_duplicates(transcript):
    candidates = build_candidates(transcript.sentences, min_duration=10, max_duration=30)
    kept = prefilter(candidates, transcript, envelope=None, k=10)
    assert 0 < len(kept) <= 10
    assert all("speech_rate" in c.features for c in kept)
    for i, a in enumerate(kept):
        for b in kept[i + 1 :]:
            assert overlap_ratio((a.start, a.end), (b.start, b.end)) <= 0.8
    # Question openers get the hook feature.
    assert any(c.features["hook"] > 0 for c in candidates)


def test_energy_envelope(tmp_path):
    rate = 16000
    t = np.arange(rate * 2) / rate
    signal = np.concatenate([np.zeros(rate), 0.5 * np.sin(2 * np.pi * 440 * t[:rate])])
    path = tmp_path / "a.wav"
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        wf.writeframes((signal * 32767).astype(np.int16).tobytes())
    env = energy_envelope(path)
    assert len(env) == 20
    assert env[:10].max() < -80 and env[10:].min() > -10


def test_snap_to_word_edges(transcript):
    cand = build_candidates(transcript.sentences, min_duration=10, max_duration=30)[0]
    start, end = snap_to_words(cand, transcript)
    first = transcript.sentences[cand.sentence_start]
    last = transcript.sentences[cand.sentence_end]
    assert start == transcript.words[first.word_start].start
    assert end == transcript.words[last.word_end - 1].end


def test_rank_valid_rejects_unknown_ids_and_bad_durations(transcript):
    candidates = build_candidates(transcript.sentences, min_duration=10, max_duration=30)
    scores = {c.id: _score(c.id, 5) for c in candidates[:5]}
    scores[99999] = _score(99999, 10)  # unknown id
    ranked = rank_valid(
        candidates, scores, transcript, video_duration=transcript.duration, min_duration=10, max_duration=30
    )
    assert {c.id for c, _, _ in ranked} == set(list(scores)[:5])
    # Tighter limits than the candidates were built with reject them.
    assert (
        rank_valid(candidates, scores, transcript, video_duration=transcript.duration, min_duration=40, max_duration=60)
        == []
    )
    # Clips past the end of the video are rejected.
    assert rank_valid(candidates, scores, transcript, video_duration=1.0, min_duration=10, max_duration=30) == []


def test_select_clips_overlap_rule_and_ranking(transcript):
    candidates = build_candidates(transcript.sentences, min_duration=10, max_duration=30)
    scores = {c.id: _score(c.id, 1 + (c.id % 10)) for c in candidates}
    ranked = rank_valid(
        candidates, scores, transcript, video_duration=transcript.duration, min_duration=10, max_duration=30
    )
    clips = select_clips(ranked, num_clips=5, video_duration=transcript.duration)
    assert len(clips) == 5
    assert [c.rank for c in clips] == [1, 2, 3, 4, 5]
    assert clips[0].score >= clips[-1].score
    for i, a in enumerate(clips):
        for b in clips[i + 1 :]:
            assert overlap_ratio((a.start, a.end), (b.start, b.end)) <= 0.3


def test_spread_falls_back_to_fill_slots():
    # Three candidates crammed together, video long: spread can't be honoured, but slots still fill.
    c = [Candidate(id=i, sentence_start=0, sentence_end=0, start=i * 30.0, end=i * 30.0 + 25) for i in range(3)]
    s = {i: _score(i, 10 - i) for i in range(3)}
    ranked = [(c[i], s[i], (c[i].start, c[i].end)) for i in range(3)]
    clips = select_clips(ranked, num_clips=3, video_duration=3600)
    assert [x.candidate_id for x in clips] == [0, 1, 2]


def test_spread_prefers_distant_clips():
    c = [
        Candidate(id=0, sentence_start=0, sentence_end=0, start=0, end=25),
        Candidate(id=1, sentence_start=0, sentence_end=0, start=26, end=50),
        Candidate(id=2, sentence_start=0, sentence_end=0, start=500, end=525),
    ]
    s = {0: _score(0, 9), 1: _score(1, 8), 2: _score(2, 7)}
    ranked = [(c[i], s[i], (c[i].start, c[i].end)) for i in range(3)]
    clips = select_clips(ranked, num_clips=2, video_duration=600)
    assert {x.candidate_id for x in clips} == {0, 2}
