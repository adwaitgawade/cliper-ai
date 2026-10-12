"""Wire-level check of the OpenCode integration against a local fake gateway.

Runs the real scoring chain (prompt -> LangChain model -> structured output) for each
OpenCode API family and asserts on what actually goes over HTTP: the endpoint paths
from the Go docs, auth, the client User-Agent and the per-job session header.
"""

import json
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import ClassVar

import pytest

from app.core.config import get_settings
from app.llm.cache import NullCache
from app.llm.factory import USER_AGENT
from app.pipeline.highlights import chains
from app.pipeline.highlights.candidates import build_candidates
from app.pipeline.highlights.prefilter import prefilter
from tests.conftest import make_transcript

KEY = "sk-go-test"


def _scores(ids: list[int]) -> dict:
    return {
        "scores": [
            {
                "candidate_id": i,
                "hook": 6,
                "self_contained": 7,
                "emotion": 5,
                "payoff": 6,
                "shareability": 6,
                "overall": 1 + i % 10,
                "title": f"Title {i}",
                "hook_line": "Hook",
                "reason": "Reason",
            }
            for i in ids
        ]
    }


class FakeGateway(BaseHTTPRequestHandler):
    requests: ClassVar[list[dict]] = []

    def log_message(self, *args) -> None:
        pass

    def do_POST(self) -> None:
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        FakeGateway.requests.append(
            {"path": self.path, "headers": {k.lower(): v for k, v in self.headers.items()}, "body": body}
        )
        ids = sorted({int(x) for x in re.findall(r'candidate id=\\?"(\d+)', json.dumps(body))})
        payload = _scores(ids)
        model = body.get("model")
        if self.path.endswith("/v1/chat/completions"):
            resp = {
                "id": "c1",
                "object": "chat.completion",
                "created": 0,
                "model": model,
                "choices": [
                    {
                        "index": 0,
                        "finish_reason": "tool_calls",
                        "message": {
                            "role": "assistant",
                            "content": None,
                            "tool_calls": [
                                {
                                    "id": "t1",
                                    "type": "function",
                                    "function": {"name": "ScoreBatch", "arguments": json.dumps(payload)},
                                }
                            ],
                        },
                    }
                ],
                "usage": {"prompt_tokens": 900, "completion_tokens": 300, "total_tokens": 1200},
            }
        elif self.path.endswith("/v1/responses"):
            resp = {
                "id": "r1",
                "object": "response",
                "created_at": 0,
                "status": "completed",
                "model": model,
                "output": [
                    {
                        "type": "message",
                        "id": "m1",
                        "status": "completed",
                        "role": "assistant",
                        "content": [{"type": "output_text", "text": json.dumps(payload), "annotations": []}],
                    }
                ],
                "parallel_tool_calls": True,
                "tool_choice": "auto",
                "tools": [],
                "usage": {
                    "input_tokens": 900,
                    "output_tokens": 300,
                    "total_tokens": 1200,
                    "input_tokens_details": {"cached_tokens": 0},
                    "output_tokens_details": {"reasoning_tokens": 0},
                },
            }
        elif self.path.endswith("/v1/messages"):
            resp = {
                "id": "msg1",
                "type": "message",
                "role": "assistant",
                "model": model,
                "stop_reason": "tool_use",
                "stop_sequence": None,
                "content": [{"type": "tool_use", "id": "tu1", "name": "ScoreBatch", "input": payload}],
                "usage": {"input_tokens": 900, "output_tokens": 300},
            }
        else:
            self.send_response(404)
            self.end_headers()
            return
        data = json.dumps(resp).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


@pytest.fixture(scope="module")
def gateway():
    server = ThreadingHTTPServer(("127.0.0.1", 0), FakeGateway)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_port}/zen/go"
    server.shutdown()


@pytest.mark.parametrize(
    "model,path,auth_header",
    [
        ("opencode:claude-haiku-5-5", "/zen/go/v1/messages", "x-api-key"),
        ("opencode:deepseek-v4-flash", "/zen/go/v1/chat/completions", "authorization"),
        ("opencode:minimax-m3", "/zen/go/v1/messages", "x-api-key"),
        ("opencode:gpt-6-luna", "/zen/go/v1/responses", "authorization"),
    ],
)
def test_scoring_chain_over_the_wire(gateway, monkeypatch, model, path, auth_header):
    monkeypatch.setattr(get_settings(), "opencode_api_key", KEY)
    monkeypatch.setattr(get_settings(), "opencode_base_url", gateway)
    FakeGateway.requests.clear()

    transcript = make_transcript([f"Point {i} matters because of a clear reason." for i in range(20)])
    shortlist = prefilter(
        build_candidates(transcript.sentences, min_duration=6, max_duration=12), transcript, envelope=None, k=6
    )
    chain = chains.build_scoring_chain(
        model, fallback_model=None, temperature=0.1, max_retries=0, session_id="clippro-job-123"
    )
    result = chains.score_with_llm(
        shortlist,
        transcript,
        chain=chain,
        model=model,
        cache=NullCache(),
        prices={model: (0.10, 0.50)},
        instructions=None,
        chunk_size=6,
        chunk_overlap=0,
        max_concurrency=1,
        budget_usd=1.0,
    )

    assert set(result.scores) == {c.id for c in shortlist}
    assert len(FakeGateway.requests) == 1
    req = FakeGateway.requests[0]
    h = req["headers"]
    assert req["path"] == path
    assert KEY in h[auth_header]
    assert h["user-agent"] == USER_AGENT  # our identity, not the SDK default
    assert h["x-opencode-session"] == "clippro-job-123"
    assert req["body"]["model"] == model.split(":", 1)[1]
    run = result.runs[0]
    assert (run.tokens_in, run.tokens_out) == (900, 300)
    assert run.cost == pytest.approx((900 * 0.10 + 300 * 0.50) / 1e6)

    body = req["body"]
    if path.endswith("/messages"):
        assert body["max_tokens"] > 0 and body["tools"][0]["name"] == "ScoreBatch"
        assert body["tools"][0]["description"]  # some gateways reject tools without one
        assert ("temperature" in body) is (model != "opencode:claude-haiku-5-5")
        assert "untrusted data" in str(body["system"])
    elif path.endswith("/chat/completions"):
        assert body["tools"][0]["function"]["name"] == "ScoreBatch"  # tool calling, not json_schema
        assert body["tools"][0]["function"]["description"]
        assert body["temperature"] == 0.1
        assert body["thinking"] == {"type": "disabled"}  # DeepSeek: forced tool_choice needs it off
    else:
        assert "temperature" not in body  # reasoning models reject it
        assert body["text"]["format"]["type"] == "json_schema"
