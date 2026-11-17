from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.config import get_settings
from app.pipeline import redux, transcribe
from app.pipeline.stt_config import SttConfig, load_stt_config
from app.pipeline.types import DEFAULT_SPEAKER

REPO_CONFIG = Path(__file__).resolve().parents[2] / "stt.toml"


def test_repo_config_parses():
    cfg = load_stt_config(REPO_CONFIG)
    assert cfg.provider in ("gateway", "redux")
    assert cfg.redux.model == "moondream/parakeet-redux"


def test_missing_file_means_defaults(tmp_path):
    assert load_stt_config(tmp_path / "nope.toml") == SttConfig()


def test_overrides_and_model_name(tmp_path):
    path = tmp_path / "stt.toml"
    path.write_text('provider = "redux"\n[redux]\nmodel = "custom/redux"\n')
    cfg = load_stt_config(path)
    assert cfg.provider == "redux"
    assert cfg.model_name == "custom/redux"
    assert cfg.gateway.model == "elevenlabs/scribe-v2"


@pytest.mark.parametrize("body", ['provider = "assemblyai"\n', 'provider = "whisper"\n', '[redux]\nmodle = "typo"\n'])
def test_invalid_config_is_rejected(tmp_path, body):
    path = tmp_path / "stt.toml"
    path.write_text(body)
    with pytest.raises(ValidationError):
        load_stt_config(path)


RESULT = {
    "text": "Hello there. Bye.",
    "segments": [
        {
            "start": 0.32,
            "end": 1.2,
            "text": "Hello there.",
            "words": [
                {"start": 0.32, "end": 0.6, "word": "Hello"},
                {"start": 0.6, "end": 1.2, "word": " there."},
            ],
        },
        {
            "start": 1.5,
            "end": 1.9,
            "text": "Bye.",
            "words": [{"start": 1.5, "end": 1.9, "word": "Bye."}, {"word": " "}],
        },
    ],
}


class FakeSpeech:
    def __init__(self):
        self.calls = []

    def transcribe(self, **kw):
        self.calls.append(kw)
        return RESULT


def test_redux_maps_words(monkeypatch, tmp_path):
    speech = FakeSpeech()
    monkeypatch.setattr(redux, "_load_model", lambda model, device: speech)
    progress: list[float] = []
    language, words = redux.transcribe_audio_redux(
        tmp_path / "a.wav", language="auto", fallback_language="de", on_progress=progress.append
    )
    assert language == "de"
    assert [w.word for w in words] == ["Hello", "there.", "Bye."]
    assert (words[1].start, words[1].end) == (0.6, 1.2)
    assert all(w.speaker == DEFAULT_SPEAKER for w in words)
    assert speech.calls == [{"audio": str(tmp_path / "a.wav"), "timestamps": "word"}]
    assert progress[-1] == 1.0


def test_redux_keeps_requested_language(monkeypatch, tmp_path):
    monkeypatch.setattr(redux, "_load_model", lambda model, device: FakeSpeech())
    language, _ = redux.transcribe_audio_redux(tmp_path / "a.wav", language="fr")
    assert language == "fr"


def _fake_engines(monkeypatch, *, gateway_error: Exception | None = None):
    seen: list[str] = []

    def gateway(*a, **kw):
        seen.append("gateway")
        if gateway_error:
            raise gateway_error
        return "en", []

    monkeypatch.setattr(transcribe, "transcribe_audio_gateway", gateway)
    monkeypatch.setattr(transcribe, "transcribe_audio_redux", lambda *a, **kw: seen.append("redux") or ("en", []))
    return seen


def test_dispatch_follows_config(monkeypatch, tmp_path):
    seen = _fake_engines(monkeypatch)
    s = get_settings()
    monkeypatch.setattr(s, "ai_gateway_api_key", "k")
    _, _, used = transcribe.transcribe_audio(tmp_path / "a.wav", settings=s, stt=SttConfig(provider="redux"))
    assert used.provider == "redux"
    _, _, used = transcribe.transcribe_audio(tmp_path / "a.wav", settings=s, stt=SttConfig(provider="gateway"))
    assert used.provider == "gateway"
    assert seen == ["redux", "gateway"]


def test_gateway_failure_falls_back_to_redux(monkeypatch, tmp_path):
    seen = _fake_engines(monkeypatch, gateway_error=RuntimeError("gateway down"))
    s = get_settings()
    monkeypatch.setattr(s, "ai_gateway_api_key", "k")
    _, _, used = transcribe.transcribe_audio(tmp_path / "a.wav", settings=s, stt=SttConfig(provider="gateway"))
    assert seen == ["gateway", "redux"]
    assert used.provider == "redux" and used.model_name == "moondream/parakeet-redux"


def test_missing_gateway_key_falls_back_to_redux(monkeypatch, tmp_path):
    seen = _fake_engines(monkeypatch)
    monkeypatch.setattr(get_settings(), "ai_gateway_api_key", None)
    _, _, used = transcribe.transcribe_audio(tmp_path / "a.wav", settings=get_settings(), stt=SttConfig())
    assert seen == ["redux"] and used.provider == "redux"


def test_gateway_failure_raises_without_fallback(monkeypatch, tmp_path):
    _fake_engines(monkeypatch, gateway_error=RuntimeError("gateway down"))
    monkeypatch.setattr(get_settings(), "ai_gateway_api_key", "k")
    with pytest.raises(RuntimeError, match="gateway down"):
        transcribe.transcribe_audio(
            tmp_path / "a.wav", settings=get_settings(), stt=SttConfig(provider="gateway", fallback_to_redux=False)
        )
    monkeypatch.setattr(get_settings(), "ai_gateway_api_key", None)
    with pytest.raises(ValueError, match="AI_GATEWAY_API_KEY"):
        transcribe.transcribe_audio(
            tmp_path / "a.wav", settings=get_settings(), stt=SttConfig(provider="gateway", fallback_to_redux=False)
        )
