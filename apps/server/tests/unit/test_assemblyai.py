import json

import httpx
import pytest

from app.pipeline.assemblyai import AssemblyAIError, transcribe_audio_assemblyai


def _transport(final: dict, seen: list[httpx.Request]) -> httpx.MockTransport:
    polls = iter([{"id": "t1", "status": "processing"}, {"id": "t1", **final}])

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        if request.url.path == "/v2/upload":
            return httpx.Response(200, json={"upload_url": "https://cdn.example/audio"})
        if request.url.path == "/v2/transcript":
            return httpx.Response(200, json={"id": "t1", "status": "queued"})
        return httpx.Response(200, json=next(polls))

    return httpx.MockTransport(handler)


def test_maps_words_speakers_and_language(tmp_path):
    wav = tmp_path / "a.wav"
    wav.write_bytes(b"RIFF....")
    seen: list[httpx.Request] = []
    final = {
        "status": "completed",
        "language_code": "en_us",
        "words": [
            {"text": "Hello", "start": 100, "end": 480, "confidence": 0.98, "speaker": "A"},
            {"text": "there.", "start": 500, "end": 900, "confidence": 0.9, "speaker": "B"},
        ],
    }
    progress: list[float] = []
    language, words = transcribe_audio_assemblyai(
        wav,
        api_key="k",
        poll_interval=0,
        speaker_labels=True,
        on_progress=progress.append,
        transport=_transport(final, seen),
    )
    assert language == "en"
    assert [(w.word, w.start, w.end, w.speaker) for w in words] == [
        ("Hello", 0.1, 0.48, "SPEAKER_0"),
        ("there.", 0.5, 0.9, "SPEAKER_1"),
    ]
    assert all(r.headers["Authorization"] == "k" for r in seen)
    assert seen[0].content == b"RIFF...."
    body = json.loads(seen[1].content)
    assert body["audio_url"] == "https://cdn.example/audio"
    assert body["language_detection"] is True and body["speaker_labels"] is True
    assert progress[-1] == 1.0


def test_explicit_language_and_error(tmp_path):
    wav = tmp_path / "a.wav"
    wav.write_bytes(b"x")
    seen: list[httpx.Request] = []
    with pytest.raises(AssemblyAIError, match="bad audio"):
        transcribe_audio_assemblyai(
            wav,
            api_key="k",
            language="es",
            poll_interval=0,
            transport=_transport({"status": "error", "error": "bad audio"}, seen),
        )
    body = json.loads(seen[1].content)
    assert body["language_code"] == "es" and "language_detection" not in body
