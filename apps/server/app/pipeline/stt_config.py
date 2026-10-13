"""Speech-to-text engine selection and tuning, read from apps/server/stt.toml.

The file is re-read on every call so edits apply to the next job without restarting workers.
Secrets (ASSEMBLYAI_API_KEY) stay in the environment.
"""

import tomllib
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.core.config import get_settings

Provider = Literal["redux", "assemblyai", "whisper"]


class _Section(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ReduxConfig(_Section):
    model: str = "moondream/parakeet-redux"
    device: Literal["auto", "cuda", "mps", "cpu"] = "auto"
    fallback_language: str = "en"


class AssemblyAIConfig(_Section):
    base_url: str = "https://api.assemblyai.com"
    speech_models: list[str] = ["universal-3-5-pro", "universal-2"]
    speaker_labels: bool = False


class WhisperConfig(_Section):
    model: str = "small"
    device: str = "auto"
    compute_type: str = "auto"


class SttConfig(_Section):
    provider: Provider = "redux"
    redux: ReduxConfig = ReduxConfig()
    assemblyai: AssemblyAIConfig = AssemblyAIConfig()
    whisper: WhisperConfig = WhisperConfig()

    @property
    def model_name(self) -> str:
        """The model actually used, as recorded on the transcript artifact."""
        if self.provider == "assemblyai":
            return ",".join(self.assemblyai.speech_models)
        if self.provider == "whisper":
            return self.whisper.model
        return self.redux.model


def config_path() -> Path:
    # apps/server/app/pipeline/ -> apps/server/stt.toml (/srv/stt.toml in the images).
    return get_settings().stt_config_path or Path(__file__).resolve().parents[2] / "stt.toml"


def load_stt_config(path: Path | None = None) -> SttConfig:
    """Parse the config file; a missing file means all defaults."""
    path = path or config_path()
    if not path.exists():
        return SttConfig()
    with path.open("rb") as f:
        return SttConfig.model_validate(tomllib.load(f))
