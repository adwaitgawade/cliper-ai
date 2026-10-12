"""Structured output schema for LLM highlight scoring (section 8 of the requirements)."""

from pydantic import BaseModel, Field


class CandidateScore(BaseModel):
    """Rubric scores and copy for one candidate clip."""

    candidate_id: int = Field(description="The id attribute of the candidate being scored")
    hook: int = Field(ge=1, le=10, description="Strength of the hook in the first 3 seconds")
    self_contained: int = Field(ge=1, le=10, description="Understandable without surrounding context")
    emotion: int = Field(ge=1, le=10, description="Emotion or novelty")
    payoff: int = Field(ge=1, le=10, description="Clear payoff or ending")
    shareability: int = Field(ge=1, le=10, description="Likelihood viewers share it")
    overall: int = Field(ge=1, le=10, description="Overall quality as a short-form clip")
    title: str = Field(description="Catchy title, at most 80 characters")
    hook_line: str = Field(description="One-line hook to show on screen, at most 100 characters")
    reason: str = Field(description="One short sentence explaining the score")


class ScoreBatch(BaseModel):
    """Scores for every candidate clip in the batch, one entry per candidate id."""

    scores: list[CandidateScore]
