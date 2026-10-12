import json
import uuid

import httpx
from langchain_core.messages import AIMessage
from langchain_core.outputs import ChatGeneration, LLMResult

from app.llm.callbacks import UsageCallbackHandler
from app.workers import webhooks


def test_usage_handler_accumulates_tokens_cost_and_latency():
    handler = UsageCallbackHandler("m", {"m": (3.0, 15.0)})
    for _ in range(2):  # e.g. a parse retry makes two model calls
        run_id = uuid.uuid4()
        handler.on_chat_model_start({}, [], run_id=run_id)
        msg = AIMessage(content="", usage_metadata={"input_tokens": 1000, "output_tokens": 200, "total_tokens": 1200})
        handler.on_llm_end(LLMResult(generations=[[ChatGeneration(message=msg)]]), run_id=run_id)
    assert handler.record.tokens_in == 2000 and handler.record.tokens_out == 400
    assert handler.record.cost == (2000 * 3.0 + 400 * 15.0) / 1_000_000
    assert handler.record.latency_ms >= 0


def test_usage_handler_falls_back_to_llm_output_and_records_errors():
    handler = UsageCallbackHandler("m", {})
    run_id = uuid.uuid4()
    handler.on_llm_start({}, ["p"], run_id=run_id)
    result = LLMResult(generations=[[]], llm_output={"token_usage": {"prompt_tokens": 7, "completion_tokens": 3}})
    handler.on_llm_end(result, run_id=run_id)
    assert (handler.record.tokens_in, handler.record.tokens_out, handler.record.cost) == (7, 3, 0.0)
    handler.on_llm_error(RuntimeError("rate limited"), run_id=uuid.uuid4())
    assert "rate limited" in handler.record.error


def test_webhook_is_signed(monkeypatch):
    sent = {}

    def fake_post(url, *, content, headers, timeout, follow_redirects):
        sent.update(url=url, content=content, headers=headers)
        return httpx.Response(200)

    monkeypatch.setattr(webhooks, "assert_public_url", lambda url: "example.com")
    monkeypatch.setattr(webhooks.httpx, "post", fake_post)
    assert webhooks.send_webhook("https://example.com/hook", {"event": "job.completed"}, secret="s", timeout=1)
    ts = sent["headers"]["X-ClipPro-Timestamp"]
    assert sent["headers"]["X-ClipPro-Signature"] == webhooks.sign("s", ts, sent["content"])
    assert json.loads(sent["content"]) == {"event": "job.completed"}


def test_webhook_retries_then_gives_up(monkeypatch):
    calls = []
    monkeypatch.setattr(webhooks, "assert_public_url", lambda url: "example.com")
    monkeypatch.setattr(webhooks.httpx, "post", lambda *a, **k: calls.append(1) or httpx.Response(500))
    monkeypatch.setattr(webhooks.time, "sleep", lambda s: None)
    assert not webhooks.send_webhook("https://example.com/hook", {}, secret=None, timeout=1, attempts=3)
    assert len(calls) == 3


def test_webhook_to_private_address_is_not_sent(monkeypatch):
    monkeypatch.setattr(webhooks.httpx, "post", lambda *a, **k: (_ for _ in ()).throw(AssertionError("sent")))
    assert not webhooks.send_webhook("http://127.0.0.1/hook", {}, secret=None, timeout=1)


def test_fallback_calls_are_priced_and_labelled_by_serving_model():
    prices = {"opencode:claude-haiku-5-5": (0.10, 0.50), "opencode:deepseek-v4-flash": (0.14, 0.28)}
    handler = UsageCallbackHandler("opencode:claude-haiku-5-5", prices)
    for served_by in ("claude-haiku-5-5", "deepseek-v4-flash"):  # primary call, then fallback
        run_id = uuid.uuid4()
        handler.on_chat_model_start({}, [], run_id=run_id, invocation_params={"model": served_by})
        msg = AIMessage(content="", usage_metadata={"input_tokens": 1_000_000, "output_tokens": 0, "total_tokens": 0})
        handler.on_llm_end(LLMResult(generations=[[ChatGeneration(message=msg)]]), run_id=run_id)
    assert handler.record.cost == 0.10 + 0.14
    assert handler.record.model == "opencode:deepseek-v4-flash"
