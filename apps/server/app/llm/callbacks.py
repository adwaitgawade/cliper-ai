"""Usage accounting: tokens, cost and latency per LLM call (LC-7)."""

import time
import uuid
from dataclasses import dataclass
from typing import Any

from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import LLMResult


@dataclass
class UsageRecord:
    model: str
    tokens_in: int = 0
    tokens_out: int = 0
    latency_ms: int = 0
    cost: float = 0.0
    cached: bool = False
    error: str | None = None


def _lookup(prices: dict[str, tuple[float, float]], model: str) -> tuple[float, float] | None:
    """Prices are keyed by configured name ("opencode:claude-haiku-5-5"); callbacks see the
    provider's bare model name ("claude-haiku-5-5"). Accept either."""
    if model in prices:
        return prices[model]
    bare = model.partition(":")[2] or model
    for key, value in prices.items():
        if key.partition(":")[2] == bare:
            return value
    return None


def price_for(prices: dict[str, tuple[float, float]], model: str, tokens_in: int, tokens_out: int) -> float:
    per_million = _lookup(prices, model)
    if not per_million:
        return 0.0
    return (tokens_in * per_million[0] + tokens_out * per_million[1]) / 1_000_000


class UsageCallbackHandler(BaseCallbackHandler):
    """Accumulates usage across every model call made within one runnable invocation,
    including retries and fallbacks. Each call is priced at the model that actually
    served it, and `record.model` reports the last model that answered."""

    def __init__(self, model: str, prices: dict[str, tuple[float, float]]) -> None:
        self.record = UsageRecord(model=model)
        self.prices = prices
        self._started: dict[uuid.UUID, tuple[float, str | None]] = {}

    @staticmethod
    def _model_name(kw: dict[str, Any]) -> str | None:
        params = kw.get("invocation_params") or {}
        meta = kw.get("metadata") or {}
        return params.get("model") or params.get("model_name") or meta.get("ls_model_name")

    def on_chat_model_start(self, serialized: dict[str, Any], messages: Any, *, run_id: uuid.UUID, **kw: Any) -> None:
        self._started[run_id] = (time.perf_counter(), self._model_name(kw))

    def on_llm_start(self, serialized: dict[str, Any], prompts: list[str], *, run_id: uuid.UUID, **kw: Any) -> None:
        self._started[run_id] = (time.perf_counter(), self._model_name(kw))

    def on_llm_end(self, response: LLMResult, *, run_id: uuid.UUID, **kw: Any) -> None:
        started, served_by = self._started.pop(run_id, (None, None))
        if started is not None:
            self.record.latency_ms += int((time.perf_counter() - started) * 1000)
        tokens_in = tokens_out = 0
        for generations in response.generations:
            for gen in generations:
                usage = getattr(getattr(gen, "message", None), "usage_metadata", None)
                if usage:
                    tokens_in += int(usage.get("input_tokens", 0))
                    tokens_out += int(usage.get("output_tokens", 0))
        if not (tokens_in or tokens_out) and response.llm_output:
            usage = response.llm_output.get("token_usage") or response.llm_output.get("usage") or {}
            tokens_in = int(usage.get("prompt_tokens", usage.get("input_tokens", 0)))
            tokens_out = int(usage.get("completion_tokens", usage.get("output_tokens", 0)))
        self.record.tokens_in += tokens_in
        self.record.tokens_out += tokens_out
        if served_by and served_by != self.record.model.partition(":")[2]:
            # Keep the configured "provider:" prefix when the fallback answered.
            provider = self.record.model.partition(":")[0]
            self.record.model = f"{provider}:{served_by}" if ":" in self.record.model else served_by
        self.record.cost += price_for(self.prices, served_by or self.record.model, tokens_in, tokens_out)

    def on_llm_error(self, error: BaseException, *, run_id: uuid.UUID, **kw: Any) -> None:
        _, model = self._started.pop(run_id, (None, None))
        message = f"{model or self.record.model}: {type(error).__name__}: {error}"[:400]
        # Keep every failure (primary and fallback), not just the last one.
        self.record.error = f"{self.record.error} | {message}" if self.record.error else message
