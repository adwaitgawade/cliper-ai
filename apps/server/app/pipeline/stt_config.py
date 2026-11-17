"""Speech-to-text engine selection and tuning, read from apps/server/stt.toml.

The file is re-read on every call so edits apply to the next job without restarting workers.
The secret (AI_GATEWAY_API_KEY) stays in the environment.
"""

import tomllib
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

from app.core.config import get_settings

Provider = Literal["gateway", "redux"]


class _Section(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ReduxConfig(_Section):
    model: str = "moondream/parakeet-redux"
    device: Literal["auto", "cuda", "mps", "cpu"] = "auto"
    fallback_language: str = "en"


class GatewayConfig(_Section):
    model: str = "elevenlabs/scribe-v2"
    chunk_seconds: float = 1200
    bitrate_kbps: int = 32
    provider_options: dict[str, dict[str, Any]] = {}


class SttConfig(_Section):
    provider: Provider = "gateway"
    # With provider = "gateway", run Parakeet Redux locally when the gateway is unavailable
    # (no key, or the request fails).
    fallback_to_redux: bool = True
    gateway: GatewayConfig = GatewayConfig()
    redux: ReduxConfig = ReduxConfig()

    @property
    def model_name(self) -> str:
        """The model actually used, as recorded on the transcript artifact."""
        if self.provider == "gateway":
            return self.gateway.model
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
