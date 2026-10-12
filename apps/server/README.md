# ClipPro server

FastAPI + Celery backend that turns long-form videos into ranked, captioned 9:16 clips.
It implements milestone **M1** of [`requirements.md`](../../requirements.md): upload, transcription,
LangChain highlight scoring, center crop, captions and rendering, on a multi-tenant base with Supabase auth.

```
Ingest → Transcribe → Highlight detection → [per clip] Reframe → Caption → Render → Deliver
 (cpu)     (gpu)         (default: LLM)          (cpu, parallel chord)              (default)
```

## Stack

| Concern | Choice |
|---|---|
| Auth | Supabase Auth, email + password. The frontend signs in with supabase-js. The API verifies the access token against the project's JWKS (ES256/RS256), or through the Auth server for legacy HS256 projects. |
| Database | Supabase Postgres. SQLAlchemy 2 + Alembic. Tables live in a private `app` schema that is not exposed through the Data API, with RLS on as defense in depth. |
| Tenancy | Workspaces with `owner`/`admin`/`member` roles. A personal workspace is created on first request. Every query is scoped through `get_scoped()`. |
| Queue | Celery + Redis, with separate `gpu`, `cpu` and `default` queues. |
| Storage | Any S3-compatible store: SeaweedFS locally (docker-compose), or Supabase Storage (S3 protocol), AWS S3 or R2. |
| LLM | [OpenCode Go](https://opencode.ai/v2/docs/console/go/) (`https://opencode.ai/zen/go`; set `OPENCODE_BASE_URL=https://opencode.ai/zen` for pay-as-you-go) through LangChain `init_chat_model`. Requests carry a `clippro-server` User-Agent and a per-job `x-opencode-session` header. Default `opencode:claude-haiku-5-5` with fallback `opencode:deepseek-v4-flash`. The OpenCode API family (Chat Completions, Responses or Anthropic Messages) is inferred from the model ID. With no model configured, a deterministic heuristic scorer is used. |
| Media | ffmpeg/ffprobe, faster-whisper (silero VAD), yt-dlp. |

## Local setup

```bash
cd apps/server
cp .env.example .env              # fill in the Supabase values
uv sync
docker compose up -d redis s3 s3-init

uv run alembic upgrade head       # creates the app schema in your Supabase database
uv run python -m scripts.smoke_supabase
uv run python -m scripts.llm_check       # scores a tiny transcript with LLM_MODEL (needs OPENCODE_API_KEY)

uv run uvicorn app.main:app --reload                                   # API on :8000, docs at /docs
uv run celery -A app.workers.celery_app worker -Q gpu,cpu,default -c 2 # one worker for every queue
uv run celery -A app.workers.celery_app beat                           # resume stale jobs, retention
```

**ffmpeg needs libass** to burn in captions. Homebrew's default `ffmpeg` formula is built without it, so
use `brew install ffmpeg-full`, set `CAPTIONS_BURN_IN=false` for local development, or run the Docker
worker (Debian's ffmpeg includes libass).

### Supabase project settings

- **Auth > Providers > Email**: enabled. Leave "Confirm email" on in production.
- **Auth > JWT Keys**: asymmetric signing keys (ES256) let the API verify tokens locally. Legacy HS256
  projects also work if `SUPABASE_PUBLISHABLE_KEY` is set, at the cost of one Auth call per request.
- **Database**: use the *Session pooler* connection string (port 5432). Transaction mode (6543) also works,
  because prepared statements are disabled.
- Deleting a user in Supabase cascades to all of their data (`app.users` → `auth.users`).

### Frontend usage

```ts
const { data } = await supabase.auth.signInWithPassword({ email, password })
await fetch(`${API}/v1/me`, { headers: { Authorization: `Bearer ${data.session.access_token}` } })
// Team workspace: add `X-Workspace-Id: <id>`. Integrators: `X-API-Key: cp_...`
```

## API

All routes are under `/v1`. OpenAPI docs are served at `/docs`. Errors share one envelope:
`{"error": {"code", "message", "details", "request_id"}}`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/videos` | Create a video and get a presigned PUT URL. Then call `POST /v1/videos/{id}/complete` |
| POST | `/v1/videos/upload` | Multipart upload for small files (≤100 MB) |
| POST | `/v1/videos/from-url` | Ingest from a URL (rights attestation, SSRF-guarded) |
| GET/DELETE | `/v1/videos[/{id}]` | List, get, or delete a video with all its jobs and media |
| POST | `/v1/jobs` | Start the pipeline with options (`num_clips`, durations, `instructions`, `caption_style`, …) |
| GET | `/v1/jobs/{id}` · `/events` (SSE) · `/transcript` · `/clips` | Status, progress stream, results |
| POST | `/v1/jobs/{id}/cancel` · `/retry` | Cancel, or resume from the last completed stage |
| DELETE | `/v1/jobs/{id}` | Delete the job and its media |
| GET/PATCH/DELETE | `/v1/clips/{id}` | Details with signed URLs, or edit trim (snapped to words), caption style, layout |
| POST | `/v1/clips/{id}/render` | Re-render one clip without re-running upstream stages |
| GET | `/v1/me`, `/v1/workspaces`, `/v1/workspace/members`, `/v1/api-keys` | Account, workspaces, members, API keys |
| GET | `/healthz` (`?ready=true` checks DB, Redis and storage) | Liveness and readiness |

Caption styles: `bold_highlight` (default), `clean`, `karaoke`, `boxed`.

## Reliability model

- Every stage writes an artifact (`audio`, `transcript`, `candidates`, `scores`, `crop_path`) and skips
  itself when that artifact exists, so stages are idempotent and resumable.
- Tasks use `acks_late` and `reject_on_worker_lost`. A heartbeat thread keeps `jobs.heartbeat_at` fresh,
  and the beat task `requeue_stale_jobs` resumes jobs whose worker died, incrementing `attempt` so any
  zombie task from the old attempt exits.
- Failures record `{code, message, stage, retryable}`. Transient errors retry with exponential backoff.
- LLM scoring: candidate IDs only (never timestamps), structured output with parse retries, an optional
  fallback model, concurrent chunk batches, a Redis cache keyed by payload, prompt version and model, a
  per-job budget cap, and token, cost and latency recorded in `llm_runs`.

## Tests

```bash
uv run pytest                 # unit + integration (local Postgres at /tmp socket, moto S3, ffmpeg)
uv run pytest -m slow         # also runs real faster-whisper on macOS `say` speech
uv run pytest --cov           # coverage
uv run ruff check . && uv run mypy app
```

Integration tests create a throwaway `clippro_test` database (override with `TEST_DATABASE_URL`). They
apply `scripts/local_supabase_stub.sql`, a minimal `auth.users` table and roles, and then run the real
Alembic migrations.

## Not yet implemented (later milestones)

- **M2**: scene detection, face detection and tracking, Level A follow with smoothing, and the OpenCV
  frame-pipe renderer for moving crop paths (the `crop_path.json` format already supports them).
- **M3**: pyannote diarization, Level B active speaker, diarization-to-face mapping, wide-layout fallback.
- **M4**: LLM titles, descriptions and hashtags, face-based thumbnails, replacement candidates endpoint.
  The ranked list is already stored in `scores.json`.
- **M5**: Prometheus metrics, a dead-letter queue, load tests, Level C model. Retention purge and basic
  rate limits already exist.
- URL ingest checks the target host against private ranges, but yt-dlp can follow redirects. Run workers
  with restricted egress in production.
