"""The single place chat models are created (LC-2). Provider and model come from config.

`LLM_MODEL` accepts:

- `opencode:<model-id>`: an OpenCode gateway (Go subscription by default, see
  OPENCODE_BASE_URL). Each model is served through one API family, inferred from its id.
- `opencode/<chat|responses|messages>:<model-id>`: same, with the API family explicit.
- `<provider>:<model>`: any provider langchain's init_chat_model supports directly.
"""

import re
from dataclasses import dataclass
from typing import Any, Literal

from langchain.chat_models import init_chat_model
from langchain_core.language_models import BaseChatModel

from app.core.config import get_settings

OpenCodeApi = Literal["chat", "responses", "messages"]
MAX_OUTPUT_TOKENS = 4096
USER_AGENT = "clippro-server/0.1"

# Where a model's family differs between OpenCode Go (zen/go) and pay-as-you-go Zen (zen).
# Sources: /docs/console/go#endpoints and /docs/console/models#endpoints.
_GO_OVERRIDES: dict[str, OpenCodeApi] = {"minimax-": "messages"}
_ZEN_OVERRIDES: dict[str, OpenCodeApi] = {"qwen3.8-max": "chat", "minimax-": "chat"}
# Extra request-body fields per model prefix (Chat Completions only).
_EXTRA_BODY: dict[str, dict[str, Any]] = {
    # DeepSeek's thinking mode rejects a forced tool_choice, which structured output relies
    # on. Scoring doesn't need reasoning tokens, so turn thinking off.
    "deepseek-": {"thinking": {"type": "disabled"}},
}
_UNSUPPORTED_PREFIXES = {
    "gemini-": "Gemini models use the Gemini API",
    "jev-": "Jev models use OpenCode's systemone API",
}


@dataclass(frozen=True)
class ModelSpec:
    provider: str
    name: str
    api: OpenCodeApi | None = None  # set for OpenCode models

    @property
    def is_opencode(self) -> bool:
        return self.provider == "opencode"


_CLAUDE_VERSION = re.compile(r"^claude-[a-z]+-(\d+)")


def accepts_temperature(spec: "ModelSpec") -> bool:
    """GPT reasoning models (Responses API) and Claude 5+ reject sampling parameters."""
    if spec.api == "responses":
        return False
    match = _CLAUDE_VERSION.match(spec.name)
    return not (match and int(match.group(1)) >= 5)


def is_go_gateway(base_url: str) -> bool:
    return "/zen/go" in base_url


def opencode_api_for(model_id: str, *, go: bool = True) -> OpenCodeApi:
    """Which OpenCode endpoint family serves `model_id`."""
    for prefix, why in _UNSUPPORTED_PREFIXES.items():
        if model_id.startswith(prefix):
            raise ValueError(f"OpenCode model '{model_id}' is not supported yet: {why}")
    for prefix, api in (_GO_OVERRIDES if go else _ZEN_OVERRIDES).items():
        if model_id.startswith(prefix):
            return api
    if model_id.startswith(("claude-", "qwen")):
        return "messages"
    if model_id.startswith(("gpt-", "grok-", "muse-spark-")):
        return "responses"
    return "chat"


def parse_model(model: str) -> ModelSpec:
    provider, sep, name = model.partition(":")
    if not sep or not name:
        raise ValueError(f"LLM model must look like 'provider:model', got '{model}'")
    if provider == "opencode":
        return ModelSpec("opencode", name, opencode_api_for(name, go=is_go_gateway(get_settings().opencode_base_url)))
    if provider.startswith("opencode/"):
        api = provider.removeprefix("opencode/")
        if api not in ("chat", "responses", "messages"):
            raise ValueError(f"Unknown OpenCode API family '{api}'; use chat, responses or messages")
        return ModelSpec("opencode", name, api)  # type: ignore[arg-type]
    return ModelSpec(provider, name)


def _opencode_model(spec: ModelSpec, *, temperature: float, max_retries: int, session_id: str | None) -> BaseChatModel:
    s = get_settings()
    if not s.opencode_api_key:
        raise ValueError("OPENCODE_API_KEY is not set")
    base = s.opencode_base_url.rstrip("/")
    key = s.opencode_api_key
    # OpenCode asks clients to identify themselves and send a stable session id per
    # conversation; the session lets the gateway route and prompt-cache consistently.
    headers = {"User-Agent": USER_AGENT}
    if session_id:
        headers["x-opencode-session"] = session_id
    common: dict[str, Any] = {"api_key": key, "max_retries": max_retries, "max_tokens": MAX_OUTPUT_TOKENS}
    if accepts_temperature(spec):
        common["temperature"] = temperature
    if spec.api == "messages":
        # The Anthropic SDK appends /v1/messages and authenticates with x-api-key; the
        # gateway also accepts a Bearer token, so send both.
        return init_chat_model(
            spec.name,
            model_provider="anthropic",
            base_url=base,
            default_headers={**headers, "Authorization": f"Bearer {key}"},
            **common,
        )
    openai_kwargs: dict[str, Any] = {"base_url": f"{base}/v1", "default_headers": headers, **common}
    if spec.api == "responses":
        return init_chat_model(spec.name, model_provider="openai", use_responses_api=True, **openai_kwargs)
    extra_body = next((body for prefix, body in _EXTRA_BODY.items() if spec.name.startswith(prefix)), None)
    if extra_body:
        openai_kwargs["extra_body"] = extra_body
    return init_chat_model(spec.name, model_provider="openai", **openai_kwargs)


def make_chat_model(
    model: str, *, temperature: float, max_retries: int, session_id: str | None = None, **kwargs: Any
) -> BaseChatModel:
    """`max_retries` is handled by the provider SDK and covers rate limits (429) and 5xx.
    `session_id` groups related calls (one job's scoring) for OpenCode routing and caching."""
    spec = parse_model(model)
    if spec.is_opencode:
        return _opencode_model(spec, temperature=temperature, max_retries=max_retries, session_id=session_id)
    return init_chat_model(model, temperature=temperature, max_retries=max_retries, **kwargs)


def structured_output_kwargs(model: str) -> dict[str, Any]:
    """Structured-output method per backend. Open-weight models behind OpenCode's Chat
    Completions endpoint support tool calling far more reliably than strict json_schema."""
    spec = parse_model(model)
    if spec.is_opencode and spec.api == "chat":
        return {"method": "function_calling"}
    return {}
