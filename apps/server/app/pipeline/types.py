"""Data shapes persisted as pipeline artifacts (JSON in object storage)."""

from pydantic import BaseModel, Field

DEFAULT_SPEAKER = "SPEAKER_0"


class Word(BaseModel):
    word: str
    start: float
    end: float
    speaker: str = DEFAULT_SPEAKER
    confidence: float = 1.0


class Sentence(BaseModel):
    id: int
    start: float
    end: float
    text: str
    speaker: str
    # Half-open range into Transcript.words.
    word_start: int
    word_end: int


class Transcript(BaseModel):
    language: str
    duration: float
    sentences: list[Sentence]
    words: list[Word]

    def text_between(self, sentence_start: int, sentence_end: int) -> str:
        return " ".join(s.text for s in self.sentences[sentence_start : sentence_end + 1])


class Candidate(BaseModel):
    id: int
    # Inclusive sentence index range.
    sentence_start: int
    sentence_end: int
    start: float
    end: float
    features: dict[str, float] = Field(default_factory=dict)
    prefilter_score: float = 0.0

    @property
    def duration(self) -> float:
        return self.end - self.start
