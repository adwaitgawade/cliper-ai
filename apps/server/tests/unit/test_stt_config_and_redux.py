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
    assert cfg.provider in ("redux", "assemblyai", "whisper")
    assert cfg.redux.model == "moondream/parakeet-redux"


def test_missing_file_means_defaults(tmp_path):
    assert load_stt_config(tmp_path / "nope.toml") == SttConfig()


def test_overrides_and_model_name(tmp_path):
    path = tmp_path / "stt.toml"
    path.write_text('provider = "assemblyai"\n[assemblyai]\nspeech_models = ["universal-2"]\n')
    cfg = load_stt_config(path)
    assert cfg.provider == "assemblyai"
    assert cfg.model_name == "universal-2"
    assert cfg.whisper.model == "small"


@pytest.mark.parametrize("body", ['provider = "deepgram"\n', '[redux]\nmodle = "typo"\n'])
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


def test_dispatch_follows_config(monkeypatch, tmp_path):
    seen = []
    monkeypatch.setattr(transcribe, "transcribe_audio_redux", lambda *a, **kw: seen.append(("redux", kw)) or ("en", []))
    monkeypatch.setattr(
        transcribe, "transcribe_audio_whisper", lambda *a, **kw: seen.append(("whisper", kw)) or ("en", [])
    )
    s = get_settings()
    transcribe.transcribe_audio(tmp_path / "a.wav", settings=s, stt=SttConfig(provider="redux"))
    transcribe.transcribe_audio(
        tmp_path / "a.wav",
        settings=s,
        stt=SttConfig.model_validate({"provider": "whisper", "whisper": {"model": "tiny"}}),
    )
    assert [name for name, _ in seen] == ["redux", "whisper"]
    assert seen[1][1]["model_size"] == "tiny"


def test_assemblyai_requires_key(monkeypatch, tmp_path):
    monkeypatch.setattr(get_settings(), "assemblyai_api_key", None)
    with pytest.raises(ValueError, match="ASSEMBLYAI_API_KEY"):
        transcribe.transcribe_audio(tmp_path / "a.wav", settings=get_settings(), stt=SttConfig(provider="assemblyai"))
