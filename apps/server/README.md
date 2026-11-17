# ClipPro server

FastAPI + Celery backend that turns long-form videos into ranked, captioned 9:16 clips.
It implements milestone **M1** of [`requirements.md`](../../requirements.md): upload, transcription,
LangChain highlight scoring, center crop, captions and rendering, on a multi-tenant base with Supabase auth.

```
Ingest → Transcribe → Highlight detection → [per clip] Reframe + poster → Render on demand
 (cpu)     (gpu)         (default: LLM)          (default)                    (render)
```

## Stack

| Concern | Choice |
|---|---|
| Auth | Supabase Auth, email + password. The frontend signs in with supabase-js. The API verifies the access token against the project's JWKS (ES256/RS256), or through the Auth server for legacy HS256 projects. |
| Database | Supabase Postgres. SQLAlchemy 2 + Alembic. Tables live in a private `app` schema that is not exposed through the Data API, with RLS on as defense in depth. |
| Tenancy | Workspaces with `owner`/`admin`/`member` roles. A personal workspace is created on first request. Every query is scoped through `get_scoped()`. |
| Queue | Celery + Redis (Upstash), with separate `gpu`, `cpu`, `render`, `interactive` and `default` queues. |
| Storage | Cloudflare R2 through the S3 API. |
| LLM | [OpenCode Go](https://opencode.ai/v2/docs/console/go/) (`https://opencode.ai/zen/go`; set `OPENCODE_BASE_URL=https://opencode.ai/zen` for pay-as-you-go) through LangChain `init_chat_model`. Requests carry a `clippro-server` User-Agent and a per-job `x-opencode-session` header. Default `opencode:claude-haiku-5-5` with fallback `opencode:deepseek-v4-flash`. The OpenCode API family (Chat Completions, Responses or Anthropic Messages) is inferred from the model ID. With no model configured, a deterministic heuristic scorer is used. |
| Media | ffmpeg/ffprobe, faster-whisper (silero VAD), yt-dlp. |
| Rendering | [Remotion](https://www.remotion.dev) via the shared composition in [`packages/video`](../../packages/video): it draws the 9:16 crop or wide layout and the captions. The web editor previews the same composition with the same props, so the preview matches the render. ffmpeg then normalizes loudness (video stream copied) and grabs the thumbnail. `RENDERER=ffmpeg` switches back to the filter-graph renderer with ASS captions. |

## Local setup

```bash
cd apps/server
cp .env.example .env              # fill in the Supabase, Upstash and R2 values
uv sync

uv run alembic upgrade head       # creates the app schema in your Supabase database
uv run python -m scripts.smoke_supabase
uv run python -m scripts.llm_check       # scores a tiny transcript with LLM_MODEL (needs AI_GATEWAY_API_KEY for gateway: models)

pnpm install                      # from the repo root: the Remotion renderer in packages/video
pnpm --filter @repo/video bundle  # optional; render.mjs rebuilds the bundle when src/ changes

uv run uvicorn app.main:app --reload                                   # API on :8000, docs at /docs
uv run celery -A app.workers.celery_app worker -Q gpu,cpu,render,interactive,default -c 2  # every queue
# macOS: the prefork pool fails under the spawn start method; add `-P threads`.
uv run celery -A app.workers.celery_app beat     # resume stale jobs, wake waiting jobs, retention, sweeps
```

The render worker runs `node packages/video/scripts/render.mjs`, so it needs Node 22+ and the workspace
dependencies. Remotion downloads Chrome Headless Shell on the first render.

The browser loads source videos from storage for the editor preview and uploads larger files straight to it,
so the R2 bucket must allow CORS (GET and PUT) from the web origin.

Only the legacy ffmpeg renderer (`RENDERER=ffmpeg`) burns ASS captions, which needs an ffmpeg built with
libass (`brew install ffmpeg-full`, or set `CAPTIONS_BURN_IN=false`).

Docker images are built from the repository root (see `docker-compose.yml`), because the worker image
includes `packages/video`, its prebuilt Remotion bundle, Node and Chrome's system libraries.

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
| GET/PATCH/DELETE | `/v1/clips/{id}` | Details with signed URLs, or edit trim (snapped to words), caption style and `caption_overrides`, layout |
| GET | `/v1/clips/{id}/composition` | Remotion props for the editor preview; `?start=&end=&layout=` previews unsaved edits |
| GET | `/v1/caption-styles` | Caption presets, fonts and override limits (`packages/video/src/caption-config.json`) |
| POST | `/v1/clips/{id}/render` | Re-render one clip without re-running upstream stages |
| POST/GET | `/v1/clips/{id}/ai-edits[/{edit_id}]` | Describe an edit in plain language; poll for a proposed draft to load as unsaved changes |
| GET | `/v1/me`, `/v1/workspaces`, `/v1/workspace/members`, `/v1/api-keys` | Account, workspaces, members, API keys |
| GET | `/healthz` (`?ready=true` checks DB, Redis and storage) | Liveness and readiness |

Caption styles: `bold_highlight` (default), `clean`, `karaoke`, `boxed`, `impact`, `subtle`, `pill`, `pop_emoji`,
`neon`, `podcast`, each tweakable per clip (font, size, colors, outline, box, uppercase, words per line, position,
highlight mode, word pill, emoji on key words, neon glow) plus an optional hook title card at the top of the clip.
The ASS export and the `ffmpeg` renderer approximate the pill, glow and hook title, and leave out emoji (libass
can't draw color emoji).

## Workers and queues

| Queue | Work | Typical worker |
|---|---|---|
| `gpu` | Transcription | `worker -Q gpu -c 1` on a GPU host |
| `cpu` | Ingest (download, probe, transcode, audio), posters | `worker -Q cpu,default -c 4` |
| `render` | Clip renders (Remotion, then ffmpeg loudness) | `worker -Q render -c 2`; scale this one for render load |
| `interactive` | AI edits someone is waiting on in the editor | `worker -Q interactive -P threads -c 16` (I/O bound) |
| `default` | LLM scoring, fan-out, finalize, maintenance | with `cpu` |

Renders have their own queue so a burst of downloads never holds up new jobs, and AI edits have theirs so
they answer in seconds while workers render. **Run a worker for `render` and `interactive`** (the Compose file
does): with none, renders and AI edits stay queued.

## Fairness, progress and operations

- **Per-workspace job cap.** At most `WORKSPACE_MAX_ACTIVE_JOBS` (default 2) pipelines per workspace run at
  once. Extra jobs are stored as `waiting` and start by themselves, oldest first, when one of the
  workspace's jobs finishes, fails or is canceled. A transaction-scoped advisory lock serialises admission,
  and a beat task wakes waiting jobs every minute in case a wake-up was lost. The stale-job reaper ignores
  waiting jobs.
- **Per-workspace render slots.** At most `WORKSPACE_MAX_CONCURRENT_RENDERS` (default 2) renders per
  workspace run at once, as Redis leases that expire if a worker dies. A render without a slot goes back
  on the queue after `RENDER_SLOT_RETRY_SECONDS` and stays `queued`. If Redis is down, renders are admitted.
  Set either cap to 0 to disable it.
- **Pushed progress.** Workers publish each job update on the Redis channel `jobs:<id>:events`. The SSE
  endpoint subscribes and reads the job row once when the stream opens, then only every
  `JOB_EVENTS_RESYNC_SECONDS` (default 30) as a safety net, instead of once a second per open tab. Without
  Redis it falls back to polling.
- **Queue wait alerts.** Every message carries `enqueued_at`. A task that waited longer than
  `QUEUE_DELAY_ALERT_SECONDS` (default 300) for a worker raises a `queue_delay` alert with the queue depth.
- **Tracing.** The API request id (`X-Request-ID`) is the trace id: it is bound to every log line of the
  request and travels in a Celery header to every task the request starts, through chains and retries.
- **Alerts.** Queue delays, stage and render crashes, and unhandled API errors are logged as `alert` and,
  when `ALERT_WEBHOOK_URL` is set, posted to it (Slack-compatible `{"text": ...}` with structured fields),
  at most once per `ALERT_DEDUPE_SECONDS` per kind.
- **Shared source cache.** Public-URL videos and their transcripts are cached under `shared/` and reused
  when another workspace submits the same video (YouTube link variants count as the same video). Each
  workspace still gets its own copy, so deletes and retention work as before. Uploads are never shared.
  Entries expire after `SHARED_CACHE_TTL_DAYS`; `SHARED_CACHE_ENABLED=false` turns it off.
- **Orphan sweep.** Every 6 hours, objects under `ws/` whose video, job, clip or render row no longer
  exists are deleted, once older than `ORPHAN_MIN_AGE_HOURS`. Keys outside the documented layout are
  never touched.
- **AI edits.** The model (`AI_EDIT_MODEL`, else `LLM_MODEL`) only proposes typed changes (trim, layout,
  preset, caption tweaks, hook title, title). The worker clamps and validates them against the editor's
  limits and stores the resulting draft; nothing is saved to the clip until the creator saves. Usage is
  recorded in `llm_runs` (chain `clip_edit`) and rate limited per workspace.

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
