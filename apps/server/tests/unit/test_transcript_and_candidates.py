from app.pipeline.highlights.candidates import build_candidates
from app.pipeline.transcribe import segment_sentences
from app.pipeline.types import Word
from tests.conftest import make_transcript, make_words


def test_sentences_split_on_punctuation():
    words = make_words(["Hello there friend.", "How are you?", "Great!"])
    sentences = segment_sentences(words)
    assert [s.text for s in sentences] == ["Hello there friend.", "How are you?", "Great!"]
    assert sentences[0].word_start == 0 and sentences[0].word_end == 3
    assert sentences[1].start == words[3].start and sentences[1].end == words[5].end


def test_sentences_split_on_long_pause_and_speaker_change():
    words = [
        Word(word="no", start=0.0, end=0.3),
        Word(word="punctuation", start=0.35, end=0.8),
        Word(word="here", start=1.6, end=1.9),  # 0.8s pause > 0.7s
        Word(word="other", start=2.0, end=2.3, speaker="SPEAKER_1"),
    ]
    assert [s.text for s in segment_sentences(words)] == ["no punctuation", "here", "other"]


def test_short_pause_does_not_split():
    words = [Word(word="a", start=0.0, end=0.3), Word(word="b", start=0.9, end=1.2)]  # 0.6s pause
    assert len(segment_sentences(words)) == 1


def test_unpunctuated_runs_are_capped():
    words = [Word(word=f"w{i}", start=i * 0.5, end=i * 0.5 + 0.4) for i in range(100)]  # 50s, no punctuation
    sentences = segment_sentences(words, max_sentence_duration=20)
    assert len(sentences) >= 3
    assert all(s.end - s.start <= 20.5 for s in sentences)


def test_candidates_start_and_end_on_sentence_boundaries():
    transcript = make_transcript([f"This is sentence number {i} in the talk." for i in range(30)])
    candidates = build_candidates(transcript.sentences, min_duration=10, max_duration=25)
    assert candidates
    starts = {s.start for s in transcript.sentences}
    ends = {s.end for s in transcript.sentences}
    for c in candidates:
        assert c.start in starts and c.end in ends
        assert 10 <= c.duration <= 25
    assert [c.id for c in candidates] == list(range(len(candidates)))


def test_no_candidates_when_sentences_too_short_overall():
    transcript = make_transcript(["Just one short sentence."])
    assert build_candidates(transcript.sentences, min_duration=20, max_duration=60) == []
