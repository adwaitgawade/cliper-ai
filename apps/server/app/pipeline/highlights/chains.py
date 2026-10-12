"""LLM highlight scoring with LangChain (FR-HLT-3..5, FR-HLT-8, FR-HLT-9, LC-1..9).

The model only ever sees candidate ids and transcript text, and returns scores by id.
It never produces timestamps, and the chain has no tools.
"""

import itertools
import re
from collections import defaultdict
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

import structlog
from langchain_core.exceptions import OutputParserException
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable, RunnableConfig, RunnableLambda
from pydantic import ValidationError

from app.core.errors import PipelineError
from app.llm.cache import ScoreCache, cache_key
from app.llm.callbacks import UsageCallbackHandler, UsageRecord
from app.llm.factory import make_chat_model, structured_output_kwargs
from app.pipeline.highlights.schemas import CandidateScore, ScoreBatch
from app.pipeline.types import Candidate, Transcript

log = structlog.get_logger()

CHAIN_NAME = "highlight_scoring"
PROMPT_VERSION = "v1"
PROMPTS_DIR = Path(__file__).resolve().parents[2] / "llm" / "prompts"
HEURISTIC_MODEL = "heuristic"

_SCORE_FIELDS = ("hook", "self_contained", "emotion", "payoff", "shareability", "overall")


@lru_cache
def load_prompt(version: str = PROMPT_VERSION) -> ChatPromptTemplate:
    base = PROMPTS_DIR / version / CHAIN_NAME
    return ChatPromptTemplate.from_messages(
        [
            ("system", (base / "system.md").read_text()),
            ("human", (base / "human.md").read_text()),
        ]
    )


_DELIMITER_CHARS = re.compile(r"[<>]")


def sanitize(text: str) -> str:
    """Strip angle brackets so transcript text can never close or forge our delimiters."""
    return _DELIMITER_CHARS.sub("", text)


def format_candidates(candidates: Iterable[Candidate], transcript: Transcript) -> str:
    parts = []
    for c in candidates:
        lines = []
        for s in transcript.sentences[c.sentence_start : c.sentence_end + 1]:
            lines.append(f"[{s.speaker}] {sanitize(s.text)}")
        parts.append(f'<candidate id="{c.id}">\n' + "\n".join(lines) + "\n</candidate>")
    return "\n\n".join(parts)


def build_prompt_input(candidates: list[Candidate], transcript: Transcript, instructions: str | None) -> dict[str, Any]:
    block = ""
    if instructions and instructions.strip():
        block = f"<user_instructions>\n{sanitize(instructions.strip())}\n</user_instructions>\n\n"
    return {
        "user_instructions_block": block,
        "count": len(candidates),
        "candidates": format_candidates(candidates, transcript),
    }


def _require_output(result: Any) -> ScoreBatch:
    # Some providers return None instead of raising when structured parsing fails.
    if result is None:
        raise OutputParserException("Model returned no structured output")
    return result


_RETRYABLE = (OutputParserException, ValidationError)


def _structured(
    model_name: str, *, temperature: float, max_retries: int, session_id: str | None
) -> Runnable[dict[str, Any], ScoreBatch]:
    model = make_chat_model(model_name, temperature=temperature, max_retries=max_retries, session_id=session_id)
    return (
        load_prompt()
        | model.with_structured_output(ScoreBatch, **structured_output_kwargs(model_name))
        | RunnableLambda(_require_output)
    ).with_retry(retry_if_exception_type=_RETRYABLE, stop_after_attempt=3)


def build_scoring_chain(
    model: str,
    *,
    fallback_model: str | None,
    temperature: float,
    max_retries: int,
    session_id: str | None = None,
) -> Runnable[dict[str, Any], ScoreBatch]:
    """prompt | model.with_structured_output(ScoreBatch), with parse retries and an
    optional fallback model for provider outages (LC-1, LC-4). `session_id` should be
    stable for one job so the gateway can route and prompt-cache its chunks together."""
    chain = _structured(model, temperature=temperature, max_retries=max_retries, session_id=session_id)
    if fallback_model:
        fallback = _structured(fallback_model, temperature=temperature, max_retries=max_retries, session_id=session_id)
        chain = chain.with_fallbacks([fallback])
    return chain


def chunk_candidates(candidates: list[Candidate], size: int, overlap: int) -> list[list[Candidate]]:
    """Time-ordered chunks with `overlap` candidates shared between neighbours, so
    candidates near chunk edges are judged in context of both sides (FR-HLT-5)."""
    ordered = sorted(candidates, key=lambda c: (c.start, c.end))
    if len(ordered) <= size:
        return [ordered] if ordered else []
    step = max(1, size - overlap)
    chunks = []
    for i in range(0, len(ordered), step):
        chunks.append(ordered[i : i + size])
        if i + size >= len(ordered):
            break
    return chunks


def merge_scores(batches: Iterable[tuple[list[Candidate], ScoreBatch]]) -> dict[int, CandidateScore]:
    """Merge chunk results, rejecting ids that were not in the chunk (FR-HLT-6) and
    averaging candidates that were scored in more than one overlapping chunk."""
    collected: dict[int, list[CandidateScore]] = defaultdict(list)
    for chunk, batch in batches:
        allowed = {c.id for c in chunk}
        seen: set[int] = set()
        for score in batch.scores:
            if score.candidate_id in allowed and score.candidate_id not in seen:
                seen.add(score.candidate_id)
                collected[score.candidate_id].append(score)
    merged: dict[int, CandidateScore] = {}
    for cid, items in collected.items():
        if len(items) == 1:
            merged[cid] = items[0]
            continue
        averaged = {f: max(1, min(10, round(sum(getattr(s, f) for s in items) / len(items)))) for f in _SCORE_FIELDS}
        best = max(items, key=lambda s: s.overall)
        merged[cid] = best.model_copy(update=averaged)
    return merged


@dataclass
class ScoringResult:
    scores: dict[int, CandidateScore]
    runs: list[UsageRecord] = field(default_factory=list)
    budget_exhausted: bool = False

    @property
    def cost(self) -> float:
        return sum(r.cost for r in self.runs)


def score_with_llm(
    candidates: list[Candidate],
    transcript: Transcript,
    *,
    chain: Runnable[dict[str, Any], ScoreBatch],
    model: str,
    cache: ScoreCache,
    prices: dict[str, tuple[float, float]],
    instructions: str | None,
    chunk_size: int,
    chunk_overlap: int,
    max_concurrency: int,
    budget_usd: float,
    on_progress: Callable[[float], None] | None = None,
) -> ScoringResult:
    """Score candidates chunk by chunk.

    Chunks run concurrently in waves of `max_concurrency` (LC-5). Spend is checked
    between waves, and scoring stops once the per-job budget is reached.
    """
    chunks = chunk_candidates(candidates, chunk_size, chunk_overlap)
    result = ScoringResult(scores={})
    done: list[tuple[list[Candidate], ScoreBatch]] = []
    pending: list[tuple[list[Candidate], dict[str, Any], str]] = []

    for chunk in chunks:
        prompt_input = build_prompt_input(chunk, transcript, instructions)
        key = cache_key(
            chain=CHAIN_NAME,
            prompt_version=PROMPT_VERSION,
            model=model,
            payload=prompt_input["candidates"],
            instructions=instructions,
        )
        hit = cache.get(key)
        if hit is not None:
            done.append((chunk, ScoreBatch.model_validate(hit)))
            result.runs.append(UsageRecord(model=model, cached=True))
        else:
            pending.append((chunk, prompt_input, key))

    failures = 0
    total = max(len(pending), 1)
    for wave_no, wave in enumerate(itertools.batched(pending, max(1, max_concurrency))):
        if result.cost >= budget_usd:
            result.budget_exhausted = True
            log.warning("llm_budget_exhausted", spent=result.cost, budget=budget_usd)
            break
        handlers = [UsageCallbackHandler(model, prices) for _ in wave]
        configs: list[RunnableConfig] = [
            {
                "callbacks": [h],
                "run_name": CHAIN_NAME,
                "metadata": {"prompt_version": PROMPT_VERSION},
                "max_concurrency": max_concurrency,
            }
            for h in handlers
        ]
        outputs = chain.batch(
            [item[1] for item in wave],
            config=configs,
            return_exceptions=True,
        )
        for (chunk, _, key), handler, output in zip(wave, handlers, outputs, strict=True):
            if isinstance(output, BaseException):
                failures += 1
                handler.record.error = handler.record.error or f"{type(output).__name__}: {output}"[:800]
                log.warning("llm_chunk_failed", error=handler.record.error)
            else:
                done.append((chunk, output))
                cache.set(key, output.model_dump())
            result.runs.append(handler.record)
        if on_progress:
            on_progress(min(1.0, (wave_no + 1) * max_concurrency / total))

    if pending and failures == len(pending) and not done:
        raise PipelineError("llm_failed", "Every LLM scoring call failed", retryable=True)
    result.scores = merge_scores(done)
    return result


def score_heuristically(candidates: list[Candidate], transcript: Transcript) -> dict[int, CandidateScore]:
    """Deterministic stand-in for the LLM when no model is configured (dev and tests).

    Maps prefilter scores to the 1-10 rubric so the rest of the pipeline is identical.
    """
    if not candidates:
        return {}
    values = [c.prefilter_score for c in candidates]
    lo, hi = min(values), max(values)
    scores: dict[int, CandidateScore] = {}
    for c in candidates:
        norm = 0.5 if hi - lo < 1e-9 else (c.prefilter_score - lo) / (hi - lo)
        level = max(1, min(10, round(1 + norm * 9)))
        first = transcript.sentences[c.sentence_start].text
        scores[c.id] = CandidateScore(
            candidate_id=c.id,
            hook=level,
            self_contained=level,
            emotion=level,
            payoff=level,
            shareability=level,
            overall=level,
            title=first[:80],
            hook_line=first[:100],
            reason="Heuristic score (no LLM configured).",
        )
    return scores
