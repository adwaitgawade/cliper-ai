# syntax=docker/dockerfile:1.7
# Build context: the repository root, because the render worker ships the shared
# Remotion package (packages/video). See docker-compose.yml.
# Targets: api, worker (CPU: ingest/render/LLM), worker-gpu (transcription on CUDA).

# --- packages/video: Remotion composition, bundle and render script -------------------
FROM node:24-bookworm-slim AS video
RUN npm install -g pnpm@11.25.0
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/typescript-config packages/typescript-config
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/video/package.json packages/video/package.json
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @repo/video
COPY packages/video packages/video
RUN pnpm --filter @repo/video bundle \
    && pnpm --filter @repo/video deploy --prod --legacy /srv/video \
    && cp -r packages/video/dist /srv/video/dist

# --- Python base ----------------------------------------------------------------------
FROM python:3.12-slim-bookworm AS base
COPY --from=ghcr.io/astral-sh/uv:0.11.20 /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PROJECT_ENVIRONMENT=/opt/venv PATH=/opt/venv/bin:$PATH \
    PYTHONUNBUFFERED=1 CAPTION_CONFIG_PATH=/srv/video/src/caption-config.json
WORKDIR /srv
COPY apps/server/pyproject.toml apps/server/uv.lock ./
# Add provider extras as needed, e.g. --extra anthropic
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev --no-install-project
COPY apps/server/app ./app
COPY apps/server/alembic.ini ./
# Caption presets shared with the web editor and the Remotion composition.
COPY packages/video/src/caption-config.json /srv/video/src/caption-config.json
RUN useradd --create-home --uid 10001 clippro && mkdir -p /tmp/clippro && chown clippro /tmp/clippro

FROM base AS api
USER clippro
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]

FROM base AS worker
# ffmpeg for probing, audio and loudness; the rest are Chrome Headless Shell's libraries
# (https://www.remotion.dev/docs/miscellaneous/linux-dependencies).
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
      libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 libxrandr2 libxkbcommon-dev libxfixes3 \
      libxcomposite1 libxdamage1 libpango-1.0-0 libcairo2 libcups2 libatk-bridge2.0-0 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=video /usr/local/bin/node /usr/local/bin/node
COPY --from=video /srv/video /srv/video
ENV VIDEO_PACKAGE_DIR=/srv/video REMOTION_BUNDLE_DIR=/srv/video/dist/bundle
# Download Chrome Headless Shell at build time instead of on the first render.
RUN cd /srv/video && node -e "require('@remotion/renderer').ensureBrowser().then(() => console.log('chrome ready'))" \
    && chown -R clippro /srv/video
USER clippro
CMD ["celery", "-A", "app.workers.celery_app", "worker", "-Q", "cpu,default", "-l", "INFO"]

FROM nvidia/cuda:12.6.3-cudnn-runtime-ubuntu24.04 AS worker-gpu
RUN apt-get update && apt-get install -y --no-install-recommends python3.12 python3.12-venv ffmpeg \
    && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.11.20 /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PROJECT_ENVIRONMENT=/opt/venv UV_PYTHON=python3.12 \
    PATH=/opt/venv/bin:$PATH PYTHONUNBUFFERED=1 WHISPER_DEVICE=cuda WHISPER_COMPUTE_TYPE=float16 \
    CAPTION_CONFIG_PATH=/srv/video/src/caption-config.json
WORKDIR /srv
COPY apps/server/pyproject.toml apps/server/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev --no-install-project
COPY apps/server/app ./app
COPY packages/video/src/caption-config.json /srv/video/src/caption-config.json
RUN useradd --create-home --uid 10001 clippro && mkdir -p /tmp/clippro && chown clippro /tmp/clippro
USER clippro
CMD ["celery", "-A", "app.workers.celery_app", "worker", "-Q", "gpu", "-c", "1", "-l", "INFO"]
