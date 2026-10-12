import pytest
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI

from app.core.config import get_settings
from app.llm import factory


@pytest.fixture
def opencode_key(monkeypatch):
    monkeypatch.setattr(get_settings(), "opencode_api_key", "sk-test")
    monkeypatch.setattr(get_settings(), "opencode_base_url", "https://opencode.ai/zen/go")


@pytest.mark.parametrize(
    "model_id,api",
    [
        ("claude-sonnet-5-5", "messages"),
        ("qwen3.5-plus", "messages"),
        ("qwen3.8-max", "messages"),
        ("minimax-m3", "messages"),
        ("gpt-6-luna", "responses"),
        ("muse-spark-1.3-contributor", "responses"),
        ("gpt-5.5", "responses"),
        ("grok-4.7", "responses"),
        ("kimi-k2.6", "chat"),
        ("glm-5.3-flash", "chat"),
        ("deepseek-v4-flash", "chat"),
    ],
)
def test_opencode_go_api_family(opencode_key, model_id, api):
    assert factory.parse_model(f"opencode:{model_id}").api == api


def test_pay_as_you_go_zen_families_differ():
    # Zen serves these through Chat Completions, unlike Go.
    assert factory.opencode_api_for("qwen3.8-max", go=False) == "chat"
    assert factory.opencode_api_for("minimax-m3", go=False) == "chat"
    assert factory.opencode_api_for("claude-haiku-5-5", go=False) == "messages"


def test_explicit_family_and_unsupported_models():
    assert factory.parse_model("opencode/chat:some-new-model").api == "chat"
    with pytest.raises(ValueError):
        factory.parse_model("opencode/grpc:x")
    with pytest.raises(ValueError, match="Gemini"):
        factory.parse_model("opencode:gemini-3.5-flash")
    with pytest.raises(ValueError):
        factory.parse_model("no-provider")
    assert not factory.parse_model("anthropic:claude-sonnet-5-5").is_opencode


def test_chat_completions_client(opencode_key):
    m = factory.make_chat_model("opencode:glm-5.3-flash", temperature=0.1, max_retries=2)
    assert isinstance(m, ChatOpenAI)
    assert m.openai_api_base == "https://opencode.ai/zen/go/v1"
    assert m.openai_api_key.get_secret_value() == "sk-test"
    assert m.temperature == 0.1 and m.max_retries == 2 and not m.use_responses_api
    assert factory.structured_output_kwargs("opencode:glm-5.3-flash") == {"method": "function_calling"}


def test_responses_client_omits_temperature(opencode_key):
    m = factory.make_chat_model("opencode:gpt-5.5", temperature=0.1, max_retries=2)
    assert isinstance(m, ChatOpenAI) and m.use_responses_api
    assert m.temperature is None
    assert factory.structured_output_kwargs("opencode:gpt-5.5") == {}


def test_messages_client_sends_bearer_token(opencode_key):
    m = factory.make_chat_model("opencode:claude-sonnet-5-5", temperature=0.0, max_retries=3)
    assert isinstance(m, ChatAnthropic)
    assert m.anthropic_api_url == "https://opencode.ai/zen/go"
    assert m.default_headers["Authorization"] == "Bearer sk-test"
    assert m.default_headers["User-Agent"] == factory.USER_AGENT
    assert m.max_tokens == factory.MAX_OUTPUT_TOKENS


def test_missing_key(monkeypatch):
    monkeypatch.setattr(get_settings(), "opencode_api_key", None)
    with pytest.raises(ValueError, match="OPENCODE_API_KEY"):
        factory.make_chat_model("opencode:kimi-k2.6", temperature=0.1, max_retries=1)


@pytest.mark.parametrize(
    "model,sends_temperature",
    [
        ("opencode:claude-haiku-5-5", False),  # Claude 5+: "temperature is deprecated for this model"
        ("opencode:claude-fable-5", False),
        ("opencode:claude-haiku-4-5", True),
        ("opencode:gpt-6-luna", False),  # Responses / reasoning
        ("opencode:minimax-m3", True),
        ("opencode:deepseek-v4-flash", True),
    ],
)
def test_temperature_only_sent_where_accepted(opencode_key, model, sends_temperature):
    m = factory.make_chat_model(model, temperature=0.1, max_retries=1)
    assert (m.temperature == 0.1) is sends_temperature
