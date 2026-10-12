# syntax=docker/dockerfile:1.7
# Targets: api, worker (CPU: ingest/render/LLM), worker-gpu (transcription on CUDA).

FROM python:3.12-slim-bookworm AS base
COPY --from=ghcr.io/astral-sh/uv:0.11.20 /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PROJECT_ENVIRONMENT=/opt/venv PATH=/opt/venv/bin:$PATH \
    PYTHONUNBUFFERED=1
WORKDIR /srv
COPY pyproject.toml uv.lock ./
# Add provider extras as needed, e.g. --extra anthropic
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev --no-install-project
COPY app ./app
COPY alembic.ini ./
RUN useradd --create-home --uid 10001 clippro && mkdir -p /tmp/clippro && chown clippro /tmp/clippro

FROM base AS api
USER clippro
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]

FROM base AS worker
# Debian's ffmpeg is built with libass (burned-in captions).
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
USER clippro
CMD ["celery", "-A", "app.workers.celery_app", "worker", "-Q", "cpu,default", "-l", "INFO"]

FROM nvidia/cuda:12.6.3-cudnn-runtime-ubuntu24.04 AS worker-gpu
RUN apt-get update && apt-get install -y --no-install-recommends python3.12 python3.12-venv ffmpeg \
    && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.11.20 /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PROJECT_ENVIRONMENT=/opt/venv UV_PYTHON=python3.12 \
    PATH=/opt/venv/bin:$PATH PYTHONUNBUFFERED=1 WHISPER_DEVICE=cuda WHISPER_COMPUTE_TYPE=float16
WORKDIR /srv
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev --no-install-project
COPY app ./app
RUN useradd --create-home --uid 10001 clippro && mkdir -p /tmp/clippro && chown clippro /tmp/clippro
USER clippro
CMD ["celery", "-A", "app.workers.celery_app", "worker", "-Q", "gpu", "-c", "1", "-l", "INFO"]
