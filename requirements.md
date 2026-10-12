# AI Video Clipping Application: Requirements Document

Version 0.1 (Draft) · October 12, 2026 · Stack: Python, FastAPI, LangChain

## 1. Purpose and Scope

This document specifies the backend for an application that converts long-form videos (podcasts, interviews, talks, tutorials) into short vertical (9:16) clips with speaker-following framing and animated captions, ready for TikTok, Instagram Reels, and YouTube Shorts.

**In scope:** ingestion, transcription, speaker diarization, LLM highlight detection, face-tracking reframing, captions, rendering, job management, storage, and the REST API that a review UI will consume.

**Out of scope (v1):** publishing to social platforms, B-roll or music insertion, dubbing, billing and team features, live-stream input, and the frontend UI itself.

## 2. Goals and Non-Goals

**Goals**

- **G1:** From a video of up to 2 hours, produce N ranked clips (default 8) of 20-60 seconds that start and end on sentence boundaries.
- **G2:** Output 1080×1920 clips where the frame follows the active speaker without visible jitter.
- **G3:** Burn in word-synced captions with selectable styles.
- **G4:** Make every stage resumable, observable, and independently re-runnable.
- **G5:** Stay LLM-provider-agnostic.

**Non-goals**

- Full video editing (timeline, transitions, effects).
- Identifying who people are. Faces are detected and tracked within a single video only, never recognized or matched across videos.

## 3. Users and Use Cases

- **Creator:** uploads a video or pastes a URL, receives ranked clips, trims or restyles them, and downloads the result.
- **Developer / integrator:** drives the same flow through the API and webhooks.

**Use cases**

- **UC1:** Submit a video and receive ranked clips.
- **UC2:** Steer selection with free-text instructions, for example focus on funny moments.
- **UC3:** Adjust one clip (trim, caption style, layout) and re-render it without re-running upstream stages.
- **UC4:** Track progress by polling, server-sent events, or webhook.

## 4. System Architecture

**Pipeline**

```
Ingest → Transcribe + Diarize → Highlight Detection → [per clip] Reframe → Caption → Render → Deliver
```

**Components**

- **API service (FastAPI):** authentication, uploads, job creation, status, results. Stateless and horizontally scalable.
- **Worker service (Celery + Redis):** runs pipeline stages. A GPU pool handles transcription, diarization, and optional audio-visual speaker detection. A CPU pool handles reframing and rendering.
- **LLM layer (LangChain):** the only place LLM calls are made.
- **Storage:** S3-compatible object store (MinIO locally) for media and JSON artifacts, PostgreSQL for metadata, Redis for broker and cache.
- **Media tooling:** ffmpeg, yt-dlp, faster-whisper, pyannote, silero-vad, PySceneDetect, MediaPipe or YuNet, OpenCV.

**Design decisions**

- **D1:** LangChain is used only where an LLM reasons over text (highlight scoring, titles, hashtags). Video and audio processing is plain Python. Forcing media work into chains adds complexity without benefit.
- **D2:** Pipeline orchestration lives in Celery task chains, not in FastAPI `BackgroundTasks`, because video jobs are long, heavy, and must survive restarts.
- **D3:** Every stage reads its input from storage and writes a JSON or media artifact back, so it is idempotent and can be retried or resumed from the last completed stage.
- **D4:** Reframing and rendering run per clip, in parallel, on the cut segment only.
- **D5:** Only transcript text is sent to the LLM. Video and audio never leave our infrastructure.

## 5. Functional Requirements

### 5.1 Ingestion

- **FR-ING-1:** Accept uploads in mp4, mov, mkv, and webm up to 5 GB and 2 hours. Large files use presigned direct-to-storage upload.
- **FR-ING-2:** Accept a video URL via yt-dlp, only after the user attests they have rights to the content.
- **FR-ING-3:** Validate with ffprobe (duration, resolution, codec, audio stream present). Reject invalid files with a clear error code.
- **FR-ING-4:** Extract 16 kHz mono WAV for speech recognition. Keep the original file untouched.
- **FR-ING-5:** Run PySceneDetect and store scene-cut timestamps for use by face tracking.

### 5.2 Transcription and Diarization

- **FR-TRN-1:** Transcribe with faster-whisper using word-level timestamps. Model size is configurable (small by default, large for quality).
- **FR-TRN-2:** Apply voice activity detection (silero-vad) before recognition to skip silence and reduce hallucinated text.
- **FR-TRN-3:** Run pyannote diarization and label every word with a speaker ID.
- **FR-TRN-4:** Segment into sentences using punctuation and pauses longer than 0.7 seconds. Store sentence boundaries.
- **FR-TRN-5:** Detect language automatically and allow an override.
- **FR-TRN-6:** Persist transcript.json containing language, sentences, and words with fields word, start, end, speaker, and confidence.

### 5.2.1 Highlight Detection (LangChain)

- **FR-HLT-1 Candidate generation (deterministic):** Build sliding windows over sentences with configurable minimum and maximum duration (default 20-60 s), always starting and ending on sentence boundaries. Assign each candidate an integer ID.
- **FR-HLT-2 Cheap pre-filter:** Rank candidates by speech rate, audio energy, laughter, and question-and-answer patterns, and keep the top K (default 40 per hour of video) for LLM scoring. This controls cost on long videos.
- **FR-HLT-3 LLM scoring:** Score each candidate through a LangChain chain with structured output. Rubric: hook strength in the first 3 seconds, self-contained meaning, emotion or novelty, clear payoff or ending, and shareability. Each is scored 1-10, with an overall score, a title, a hook line, and a short reason.
- **FR-HLT-4 No LLM timestamps:** The LLM receives candidate IDs and returns scores by ID. It never produces raw timestamps, because LLMs invent them.
- **FR-HLT-5 Chunking:** Long transcripts are split into sentence-aware chunks with overlap and scored in parallel, then merged and ranked globally.
- **FR-HLT-6 Validation in code:** Reject unknown IDs, clips outside the video, and clips outside the duration limits. Snap boundaries to word edges. Remove candidates that overlap an already selected clip by more than 30%.
- **FR-HLT-7 Selection:** Pick the top N by overall score, with an optional spread constraint so clips are not all from one segment.
- **FR-HLT-8 User steering:** Optional free-text instructions are injected into the prompt as a clearly delimited section.
- **FR-HLT-9 Caching:** Cache scores by a hash of transcript, prompt version, and model so re-runs cost nothing.

### 5.3 Reframing (9:16 Conversion)

- **FR-RFM-1:** Run per selected clip on the cut segment only.
- **FR-RFM-2 Detection:** Detect faces at about 10 fps (MediaPipe or YuNet) and interpolate positions between samples.
- **FR-RFM-3 Tracking:** Keep stable face IDs by center-distance or IoU matching (ByteTrack in production). Reset all tracks at scene cuts.
- **FR-RFM-4 Mouth metric:** Compute mouth openness as inner-lip distance divided by face height, so it does not depend on distance from the camera.
- **FR-RFM-5 Active speaker detection levels**, selectable per job:
  - **Level A:** single face, follow it.
  - **Level B:** rolling standard deviation of mouth openness over a 1-second window, gated by voice activity, with hysteresis (minimum hold 1.0 s, switch only when the challenger exceeds the current speaker by a 1.5× margin).
  - **Level C:** audio-visual model (Light-ASD or TalkNet) behind a common interface, GPU only, optional.
- **FR-RFM-6 Diarization mapping:** Correlate each diarized speaker's talk time with each face track's lip-motion score over the clip and solve the assignment once with the Hungarian algorithm. When the per-frame heuristic disagrees with this mapping, the mapping wins.
- **FR-RFM-7 Crop path:**
  - Window width is source height × 9/16. Move horizontally only.
  - Hard cut on speaker change. Smooth panning only within a single speaker.
  - Dead zone: do not move until the face drifts more than about 5% of the crop width from center.
  - Smooth moves with an exponential moving average (alpha about 0.15) or a One Euro filter.
  - Clamp the window to the frame edges.
- **FR-RFM-8 Fallbacks:** No face detected, hold the last position. No face for more than 2 seconds, use center or a saliency crop. Simultaneous speakers, tight two-shots, slides, or screen shares use a wide layout (full frame fitted to width over a blurred copy of itself).
- **FR-RFM-9 Artifact:** Save crop_path.json per clip with per-frame x offsets and layout segments, so rendering is deterministic and the path can be edited.

### 5.4 Captions

- **FR-CAP-1:** Generate captions from word-level timestamps only, never segment-level, to prevent drift.
- **FR-CAP-2:** Produce ASS subtitles with preset styles (font, color, outline, position), 1-4 words per line, and active-word highlighting.
- **FR-CAP-3:** Keep text inside platform safe zones (bottom margin and side margins).
- **FR-CAP-4:** Optional profanity masking. Optional LLM-tagged keyword emphasis (priority 2).
- **FR-CAP-5:** Offer SRT and VTT export.

### 5.5 Rendering

- **FR-RND-1:** Output 1080×1920 H.264/AAC MP4, yuv420p, faststart, frame rate matching the source and capped at 30 fps.
- **FR-RND-2:** Read the source with OpenCV, apply the crop path, pipe raw frames into ffmpeg, mux the original audio, and burn captions in the same pass or a second pass.
- **FR-RND-3:** Normalize loudness (target about -14 LUFS).
- **FR-RND-4:** Generate a thumbnail from the best frame containing the active speaker's face.
- **FR-RND-5:** Generate clip metadata through LangChain: title, description, hashtags.
- **FR-RND-6:** Support NVENC hardware encoding as an option.

### 5.6 Review and Edit

- **FR-REV-1:** Users can trim start and end (snapped to word boundaries), change caption style, force a layout or speaker, and re-render a single clip without re-running upstream stages.
- **FR-REV-2:** Users can delete a clip or request replacement candidates from the stored ranked list.

## 6. API Requirements (FastAPI)

**General:** async endpoints, Pydantic v2 request and response models, auto-generated OpenAPI docs, versioned under /v1, API-key or JWT authentication, per-user rate limits, consistent error envelope with machine-readable codes.

| Method | Path | Purpose |
|---|---|---|
| POST | /v1/videos | Create a video record. Returns a presigned upload URL (or accepts multipart for small files). |
| POST | /v1/videos/from-url | Ingest from a URL with rights attestation. |
| POST | /v1/jobs | Start the pipeline for a video with options. |
| GET | /v1/jobs/{id} | Status, current stage, progress percentage, error details. |
| GET | /v1/jobs/{id}/events | Server-sent events stream of progress. |
| GET | /v1/jobs/{id}/transcript | Transcript JSON. |
| GET | /v1/jobs/{id}/clips | Ranked clips with metadata. |
| GET | /v1/clips/{id} | Clip details with signed download URL. |
| PATCH | /v1/clips/{id} | Edit trim, caption style, or layout. |
| POST | /v1/clips/{id}/render | Re-render one clip. |
| DELETE | /v1/jobs/{id} | Delete the job and all its media. |
| GET | /healthz | Liveness and readiness. |

**Job options**

| Option | Default | Notes |
|---|---|---|
| num_clips | 8 | 1-20 |
| min_duration / max_duration | 20 / 60 s | seconds |
| instructions | none | free text steering selection |
| caption_style | bold_highlight | preset name |
| reframe.asd_level | B | A, B, or C |
| language | auto | ISO code or auto |
| webhook_url | none | called on completion or failure |

**Job states:** queued → ingesting → transcribing → analyzing → reframing → rendering → completed, with failed and canceled as terminal states. Failures record the stage and a retryable flag.

## 7. Data Model

| Entity | Key fields |
|---|---|
| users | id, api_key_hash, created_at |
| videos | id, user_id, storage_key, duration, width, height, fps, rights_attested_at |
| jobs | id, video_id, options, state, stage, progress, error, timestamps |
| artifacts | id, job_id, kind (transcript, scenes, candidates, crop_path), storage_key |
| clips | id, job_id, rank, start, end, score, title, hook, reason, hashtags, layout, caption_style |
| renders | id, clip_id, storage_key, thumbnail_key, status, created_at |
| llm_runs | id, job_id, chain, model, prompt_version, tokens_in, tokens_out, cost, latency |

## 8. LangChain Requirements

- **LC-1:** Build chains with LCEL: a ChatPromptTemplate piped into a chat model bound to a Pydantic schema via structured output.
- **LC-2:** Create models through a single factory (init_chat_model) driven by configuration, so provider and model can change without code changes.
- **LC-3:** Version prompts as files in the repo (prompts/v1/...) and record the version in every llm_run.
- **LC-4:** Use retry (with_retry) on parse and rate-limit errors, and a fallback model (with_fallbacks) for outages. Target schema parse success of at least 99% after retries.
- **LC-5:** Score chunks concurrently using batch execution with a max-concurrency limit.
- **LC-6:** Use temperature 0 to 0.2 for scoring.
- **LC-7:** Attach a callback handler that records tokens, cost, and latency per job. LangSmith tracing is optional and configurable.
- **LC-8:** Use a Redis-backed cache keyed as described in FR-HLT-9.
- **LC-9:** Treat transcript text as untrusted input. Wrap it in delimiters, instruct the model to treat it as data only, and give these chains no tools, so instructions spoken in a video cannot hijack the pipeline.
- **LC-10:** LangGraph is not required for v1. Orchestration stays in Celery.

**Scoring schema (one entry per candidate)**

```python
class CandidateScore(BaseModel):
    candidate_id: int
    hook: int = Field(ge=1, le=10)
    self_contained: int = Field(ge=1, le=10)
    emotion: int = Field(ge=1, le=10)
    payoff: int = Field(ge=1, le=10)
    shareability: int = Field(ge=1, le=10)
    overall: int = Field(ge=1, le=10)
    title: str
    hook_line: str
    reason: str

class ScoreBatch(BaseModel):
    scores: list[CandidateScore]
```

**Other LLM tasks:** clip title and description, hashtags, optional caption keyword emphasis, and optional topic segmentation of the transcript.

## 9. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Target: a 60-minute 1080p video completes end to end in 30 minutes or less on one GPU worker. To be confirmed by benchmarking. |
| Scalability | Separate queues for GPU and CPU stages. Workers scale horizontally. Per-clip stages run in parallel. |
| Reliability | Idempotent stages, exponential-backoff retries, resume from the last completed stage, per-stage timeouts, dead-letter queue. |
| Security | Auth on every route, expiring signed URLs, file-type and size validation, ffmpeg run in a sandboxed container, SSRF protection on URL ingest (block private and link-local IP ranges), secrets via environment or a secret manager. |
| Privacy | Default retention 30 days with auto-delete and delete-on-request. No video or audio sent to third parties. No face recognition or biometric templates stored. |
| Observability | Structured logs tagged with job_id, per-stage timing, Prometheus metrics, per-job LLM cost, error tracking. |
| Cost control | Per-job LLM budget cap. Pre-filtering and caching required. |
| Maintainability | Typed code, linting, 80% or higher unit test coverage on pipeline logic, pinned dependency versions, Docker images per worker type. |

## 10. Technology Stack

| Layer | Choice |
|---|---|
| API | FastAPI, Pydantic v2, Uvicorn |
| Orchestration | LangChain (LLM tasks only), Celery, Redis |
| Database | PostgreSQL with SQLAlchemy and Alembic |
| Storage | S3-compatible (AWS S3 or MinIO) |
| Speech | faster-whisper, silero-vad, pyannote.audio |
| Vision | MediaPipe or YuNet, OpenCV, PySceneDetect, ByteTrack; optional Light-ASD or TalkNet |
| Media | ffmpeg, yt-dlp |
| Captions | ASS subtitles via ffmpeg (Remotion if richer animation is needed later) |
| Ops | Docker, Docker Compose locally, Prometheus, Grafana |

## 11. Suggested Project Structure

```
app/
  api/          routers, dependencies, auth
  core/         config, logging, errors
  db/           models, migrations
  schemas/      Pydantic request and response models
  workers/      Celery app and one task per stage
  pipeline/
    ingest.py
    transcribe.py
    highlights/   candidates.py, prefilter.py, chains.py, validate.py
    reframe/      detect.py, track.py, asd.py, crop.py
    captions.py
    render.py
  llm/          model factory, prompts/v1, callbacks, cache
  storage/      S3 client, signed URLs
tests/
```

## 12. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| LLM invents timestamps | LLM scores by candidate ID only. Code validates and snaps to word boundaries. |
| Clips start or end mid-sentence | Candidates are built from sentence boundaries. |
| LLM cost on long videos | Pre-filter, chunk, cache, per-job budget cap. |
| Face IDs swap | Reset tracks at scene cuts. Use ByteTrack. |
| Jittery crop | Dead zone, smoothing, hard cuts on speaker change, hysteresis. |
| Wrong speaker chosen during cross-talk | Diarization-to-face mapping, wide-layout fallback, optional Level C model. |
| Caption drift | Word-level timestamps only. |
| Whisper hallucinates in silence | VAD before transcription. |
| Prompt injection via transcript | Delimited input, no tools, schema-only output. |
| GPU contention between jobs | Separate queues and worker pools per stage type. |
| Copyright and platform terms | Rights attestation, takedown process, retention limits. |

## 13. Legal and Compliance

- Users must attest they own or have rights to the content before processing. Downloading from third-party platforms may violate their terms, so URL ingest should be gated or limited to permitted sources.
- Provide a takedown contact and process.
- Face detection is used only to position a crop. No identification, no cross-video matching, no stored face embeddings. Counsel should review this against applicable privacy and biometric laws for target markets.

## 14. Milestones

| Milestone | Scope |
|---|---|
| M1: MVP | Upload, transcribe, LangChain highlight scoring, center crop, captions, render. FastAPI and Celery skeleton, Postgres, S3. |
| M2: Single speaker | Scene detection, face detection and tracking, Level A follow with smoothing. |
| M3: Multi speaker | Level B heuristic, diarization mapping, hard cuts, wide-layout fallback. |
| M4: Product API | Clip editing, re-render, webhooks, SSE, thumbnails, titles and hashtags. |
| M5: Hardening | Observability, retention, rate limits, load testing, optional Level C model. |

## 15. Acceptance Criteria

- 100% of clips start and end on sentence boundaries and word edges.
- Median caption timing error of 150 ms or less against the audio.
- No crop movement inside the dead zone, and camera cuts occur only on speaker changes held for at least 1 second.
- Level B active speaker accuracy of at least 85% (frame level) on a labeled two-person test set. Target to be validated.
- LLM schema parse success of at least 99% after retries.
- Killing a worker mid-job still results in a completed job via resume.
- Test corpus includes a two-person podcast, a solo talking head, a panel of three or more, and a screen-share tutorial.

## 16. Open Questions

- Which LLM provider and model should be the default, and what is the cost ceiling per hour of video?
- CPUs or GPU instances?
- This is customer facing application so we need multi-tenant accounts from day one
