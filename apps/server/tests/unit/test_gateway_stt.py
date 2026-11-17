import json
import shutil
import wave

import httpx
import pytest

from app.pipeline.gateway_stt import GatewaySttError, parse_words, transcribe_audio_gateway

needs_ffmpeg = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="needs ffmpeg")


def _wav(path, seconds: float) -> None:
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(b"\x00\x00" * int(16000 * seconds))


def test_elevenlabs_words_with_speakers_and_offset():
    result = {
        "providerMetadata": {
            "elevenlabs": {
                "words": [
                    {"text": "Hi", "type": "word", "start": 0.1, "end": 0.3, "speaker_id": "speaker_1"},
                    {"text": " ", "type": "spacing", "start": 0.3, "end": 0.35},
                    {"text": "[laughs]", "type": "audio_event", "start": 0.35, "end": 0.6},
                    {"text": "yo.", "type": "word", "start": 0.6, "end": 0.9, "speaker_id": "speaker_0", "logprob": 0},
                ]
            }
        },
        "words": [{"text": "ignored", "startSecond": 0, "endSecond": 1}],
    }
    speakers: dict[str, str] = {}
    words = parse_words(result, offset=60, speakers=speakers)
    assert [(w.word, w.start, w.end, w.speaker) for w in words] == [
        ("Hi", 60.1, 60.3, "SPEAKER_0"),
        ("yo.", 60.6, 60.9, "SPEAKER_1"),
    ]


def test_normalized_words_then_segments():
    words = parse_words({"words": [{"text": "a", "startSecond": 1, "endSecond": 2}]}, offset=0, speakers={})
    assert [(w.word, w.start, w.end) for w in words] == [("a", 1, 2)]
    spread = parse_words({"segments": [{"text": "ab cd", "startSecond": 0, "endSecond": 2}]}, offset=10, speakers={})
    assert [(w.word, w.start, w.end) for w in spread] == [("ab", 10, 11), ("cd", 11, 12)]


@needs_ffmpeg
def test_chunks_requests_and_shifts_timestamps(tmp_path):
    wav = tmp_path / "a.wav"
    _wav(wav, 2.5)
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(
            200, json={"text": "x", "language": "eng", "words": [{"text": "x", "startSecond": 0.2, "endSecond": 0.4}]}
        )

    progress: list[float] = []
    lang, words = transcribe_audio_gateway(
        wav,
        api_key="k",
        language="en",
        chunk_seconds=1,
        on_progress=progress.append,
        transport=httpx.MockTransport(handler),
    )
    assert lang == "en"
    assert [w.start for w in words] == [0.2, 1.2, 2.2]
    assert progress[-1] == 1.0
    req = seen[0]
    assert req.url.path == "/v4/ai/transcription-model"
    assert req.headers["Authorization"] == "Bearer k"
    assert req.headers["ai-model-id"] == "elevenlabs/scribe-v2"
    body = json.loads(req.content)
    assert body["mediaType"] == "audio/ogg" and body["audio"]
    assert body["providerOptions"] == {"elevenlabs": {"languageCode": "en"}}


@needs_ffmpeg
def test_http_error(tmp_path):
    wav = tmp_path / "a.wav"
    _wav(wav, 0.5)
    transport = httpx.MockTransport(lambda r: httpx.Response(402, json={"error": {"message": "no credit"}}))
    with pytest.raises(GatewaySttError, match="402"):
        transcribe_audio_gateway(wav, api_key="k", transport=transport)
