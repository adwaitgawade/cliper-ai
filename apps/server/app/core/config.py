"""Application settings, loaded from environment variables and `.env`."""

import os
from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import quote

from pydantic import Field, computed_field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Supabase dashboard connection strings contain this placeholder for the password.
_PASSWORD_PLACEHOLDER = "[YOUR-PASSWORD]"


class Settings(BaseSettings):
    # CLIPPRO_ENV_FILE="" disables .env loading (tests must never see real credentials).
    model_config = SettingsConfigDict(
        env_file=os.environ.get("CLIPPRO_ENV_FILE", ".env") or None, env_file_encoding="utf-8", extra="ignore"
    )

    env: Literal["dev", "test", "prod"] = "dev"
    log_level: str = "INFO"
    log_json: bool = False
    cors_origins: list[str] = ["http://localhost:3000"]

    # --- Supabase -------------------------------------------------------------
    supabase_url: str = "http://localhost:54321"
    # Only needed to validate legacy HS256 tokens through the Auth server.
    supabase_publishable_key: str | None = None
    supabase_jwt_audience: str = "authenticated"
    jwks_cache_seconds: int = 600

    # --- Database ---------------------------------------------------------------
    # SQLAlchemy URL, e.g. postgresql+psycopg://postgres.<ref>:[YOUR-PASSWORD]@<host>:5432/postgres
    # A plain postgresql:// URL is accepted and rewritten to the psycopg driver.
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/clippro"
    database_password: str | None = None
    db_pool_size: int = 5
    db_max_overflow: int = 5

    # --- Redis / Celery ---------------------------------------------------------
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str | None = None
    celery_result_backend: str | None = None
    # Must exceed the longest single task, otherwise Redis redelivers running tasks.
    celery_visibility_timeout: int = 4 * 3600
    queue_cpu: str = "cpu"
    queue_gpu: str = "gpu"
    queue_default: str = "default"
    # A non-terminal job whose heartbeat is older than this is re-enqueued (resume).
    stale_job_seconds: int = 15 * 60

    # --- Object storage (S3-compatible: SeaweedFS locally, Supabase Storage S3, AWS S3, R2) ----
    s3_endpoint_url: str | None = "http://localhost:9000"
    # Endpoint used in presigned URLs handed to clients, if different from the internal one.
    s3_public_endpoint_url: str | None = None
    s3_region: str = "us-east-1"
    s3_access_key_id: str = "minioadmin"
    s3_secret_access_key: str = "minioadmin"
    s3_bucket: str = "clippro-media"
    s3_force_path_style: bool = True
    presign_ttl_seconds: int = 3600

    # --- Limits -------------------------------------------------------------------
    max_upload_bytes: int = 5 * 1024**3
    max_multipart_upload_bytes: int = 100 * 1024**2
    max_duration_seconds: float = 2 * 3600
    allowed_extensions: list[str] = [".mp4", ".mov", ".mkv", ".webm"]
    retention_days: int = 30
    rate_limit_per_minute: int = 120
    rate_limit_jobs_per_hour: int = 30

    # --- URL ingest -----------------------------------------------------------------
    url_ingest_enabled: bool = True
    # Empty list means any public host is allowed (after SSRF checks).
    url_ingest_allowed_domains: list[str] = []

    # --- Pipeline ---------------------------------------------------------------------
    work_dir: Path = Path("/tmp/clippro")
    ffmpeg_bin: str = "ffmpeg"
    ffprobe_bin: str = "ffprobe"
    video_encoder: Literal["libx264", "h264_nvenc", "h264_videotoolbox"] = "libx264"
    # "assemblyai" uses the hosted pre-recorded API (no GPU needed); "whisper" runs
    # faster-whisper locally.
    transcription_provider: Literal["assemblyai", "whisper"] = "assemblyai"
    assemblyai_api_key: str | None = None
    # https://api.eu.assemblyai.com for EU data residency.
    assemblyai_base_url: str = "https://api.assemblyai.com"
    # Priority list with fallback; ["universal-2"] alone is the cheapest option.
    assemblyai_speech_models: list[str] = ["universal-3-5-pro", "universal-2"]
    # Diarization is a paid add-on.
    assemblyai_speaker_labels: bool = False
    whisper_model: str = "small"
    whisper_device: str = "auto"
    whisper_compute_type: str = "int8"
    stage_timeout_seconds: int = 3 * 3600
    render_timeout_seconds: int = 30 * 60
    # Burned-in captions need an ffmpeg built with libass. Disable only for local
    # development on machines without it; SRT/VTT sidecars are still produced.
    # Only used by the ffmpeg renderer.
    captions_burn_in: bool = True

    # --- Clip renderer -------------------------------------------------------------------
    # "remotion" draws the crop, layout and captions with the shared composition in
    # packages/video (the same code the web editor previews with). "ffmpeg" is the
    # legacy filter-graph renderer with ASS captions, kept for machines without Node.
    renderer: Literal["remotion", "ffmpeg"] = "remotion"
    node_bin: str = "node"
    # packages/video in this repository by default; set in container images.
    video_package_dir: Path | None = None
    # Pre-built bundle (pnpm --filter @repo/video bundle). Bundled on the fly when missing.
    remotion_bundle_dir: Path | None = None
    remotion_concurrency: int | None = None
    # caption-config.json shared with the composition. Defaults to packages/video/src/.
    caption_config_path: Path | None = None
    # Signed source URLs handed to the renderer and the editor preview.
    source_url_ttl_seconds: int = 6 * 3600

    # --- LLM ---------------------------------------------------------------------------
    # "opencode:<model-id>" for the OpenCode gateway, or any "provider:model" that
    # langchain's init_chat_model supports (see app/llm/factory.py). Unset means the
    # deterministic heuristic scorer is used instead of an LLM.
    llm_model: str | None = None
    llm_fallback_model: str | None = None
    opencode_api_key: str | None = None
    # OpenCode Go subscription. Pay-as-you-go Zen balance: https://opencode.ai/zen
    opencode_base_url: str = "https://opencode.ai/zen/go"
    llm_temperature: float = Field(default=0.1, ge=0.0, le=0.2)
    llm_max_concurrency: int = 4
    llm_max_retries: int = 3
    llm_chunk_size: int = 12
    llm_chunk_overlap: int = 2
    llm_budget_usd_per_job: float = 2.0
    # USD per 1M tokens: {"provider:model": [input, output]}
    llm_prices: dict[str, tuple[float, float]] = {}
    llm_cache_ttl_seconds: int = 30 * 24 * 3600
    candidates_per_hour: int = 40

    # --- Webhooks ------------------------------------------------------------------------
    webhook_signing_secret: str | None = None
    webhook_timeout_seconds: float = 10.0

    @model_validator(mode="after")
    def _normalize_database_url(self) -> "Settings":
        url = self.database_url
        if url.startswith("postgres://"):
            url = "postgresql://" + url.removeprefix("postgres://")
        if url.startswith("postgresql://"):
            url = "postgresql+psycopg://" + url.removeprefix("postgresql://")
        if _PASSWORD_PLACEHOLDER in url:
            if not self.database_password:
                raise ValueError("DATABASE_URL contains [YOUR-PASSWORD] but DATABASE_PASSWORD is not set")
            url = url.replace(_PASSWORD_PLACEHOLDER, quote(self.database_password, safe=""))
        self.database_url = url
        return self

    @computed_field  # type: ignore[prop-decorator]
    @property
    def supabase_issuer(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def jwks_url(self) -> str:
        return f"{self.supabase_issuer}/.well-known/jwks.json"

    @property
    def broker_url(self) -> str:
        return self.celery_broker_url or self.redis_url

    @property
    def result_backend(self) -> str:
        return self.celery_result_backend or self.redis_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
