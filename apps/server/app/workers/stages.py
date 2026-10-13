"""Pipeline stages. Each stage reads its inputs from storage, writes an artifact back,
and skips itself when its artifact already exists, so it is idempotent and a job can
resume from the last completed stage (D3, G4)."""

import json
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

import structlog
from sqlalchemy import delete, func, select, update

from app.core.config import get_settings
from app.core.errors import PipelineError
from app.core.ids import uuid7
from app.db.models import (
    Artifact,
    ArtifactKind,
    Clip,
    ClipStatus,
    Job,
    JobState,
    LlmRun,
    Render,
    RenderStatus,
    Video,
    VideoStatus,
)
from app.db.session import sync_session
from app.llm.cache import NullCache, RedisCache
from app.pipeline import caption_config, captions, composition, media, render
from app.pipeline.highlights import chains
from app.pipeline.highlights.candidates import build_candidates
from app.pipeline.highlights.prefilter import energy_envelope, prefilter, top_k_for_duration
from app.pipeline.highlights.validate import rank_valid, select_clips
from app.pipeline.ingest import download_url
from app.pipeline.reframe.crop import CropPath, center_crop_path
from app.pipeline.transcribe import build_transcript, transcribe_audio
from app.pipeline.types import Transcript
from app.storage.s3 import clip_key, job_key, video_key
from app.workers.context import JobContext, StopJob, save_artifact

log = structlog.get_logger()


def _set_video(video_id: uuid.UUID, **values: Any) -> None:
    with sync_session() as db:
        db.execute(update(Video).where(Video.id == video_id).values(**values))
        db.commit()


# --- ingest -------------------------------------------------------------------------------


def ingest(ctx: JobContext) -> None:
    ctx.enter(JobState.ingesting)
    video = ctx.video
    s = ctx.settings

    if video.status == VideoStatus.pending_download:
        if not video.source_url:
            raise PipelineError("invalid_media", "URL video has no source URL")
        path = download_url(
            video.source_url,
            ctx.workdir / "download",
            max_bytes=s.max_upload_bytes,
            max_duration=s.max_duration_seconds,
            allowed_domains=s.url_ingest_allowed_domains,
        )
        key = video_key(video.workspace_id, video.id, path.suffix.lower())
        ctx.storage.upload_file(path, key)
        size = path.stat().st_size
        path.replace(ctx.workdir / ("source" + path.suffix.lower()))
        _set_video(
            video.id,
            storage_key=key,
            size_bytes=size,
            status=VideoStatus.uploaded,
        )
        ctx.refresh()
        video = ctx.video
    ctx.progress(JobState.ingesting, 0.3, force=True)

    if video.status != VideoStatus.ready or video.duration is None:
        try:
            probe = media.probe(ctx.source_path(), ffprobe=s.ffprobe_bin)
            media.validate(probe, max_duration=s.max_duration_seconds)
        except PipelineError as e:
            if not e.retryable:
                _set_video(video.id, status=VideoStatus.invalid, error=e.to_dict("ingesting"))
            raise
        _set_video(
            video.id,
            status=VideoStatus.ready,
            duration=probe.duration,
            width=probe.width,
            height=probe.height,
            fps=probe.fps,
            probe=probe.to_dict(),
            error=None,
        )
        ctx.refresh()
    ctx.progress(JobState.ingesting, 0.6, force=True)

    if ctx.artifact_key(ArtifactKind.audio) is None:
        wav = media.extract_audio(
            ctx.source_path(), ctx.workdir / "audio.wav", ffmpeg=s.ffmpeg_bin, timeout=s.stage_timeout_seconds
        )
        key = job_key(ctx.job.workspace_id, ctx.job_id, "audio.wav")
        ctx.storage.upload_file(wav, key, "audio/wav")
        ctx.save_artifact(ArtifactKind.audio, key, meta={"sample_rate": 16000, "channels": 1})
    # Scene detection (FR-ING-5) is only needed by face tracking and lands with M2.


# --- transcribe -------------------------------------------------------------------------


def transcribe(ctx: JobContext) -> None:
    if ctx.artifact_key(ArtifactKind.transcript) is not None:
        return
    ctx.enter(JobState.transcribing)
    s = ctx.settings
    wav = ctx.local_artifact(ArtifactKind.audio, "audio.wav")
    language, words = transcribe_audio(
        wav,
        settings=s,
        language=ctx.options.get("language", "auto"),
        on_progress=lambda p: ctx.progress(JobState.transcribing, p),
    )
    if not words:
        raise PipelineError("no_speech", "No speech was detected in the video")
    transcript = build_transcript(language, float(ctx.video.duration or words[-1].end), words)
    path = ctx.workdir / "transcript.json"
    path.write_text(transcript.model_dump_json())
    key = job_key(ctx.job.workspace_id, ctx.job_id, "transcript.json")
    ctx.storage.upload_file(path, key, "application/json")
    ctx.save_artifact(
        ArtifactKind.transcript,
        key,
        meta={
            "language": language,
            "words": len(words),
            "sentences": len(transcript.sentences),
            "provider": s.transcription_provider,
            "model": ",".join(s.assemblyai_speech_models)
            if s.transcription_provider == "assemblyai"
            else s.whisper_model,
        },
    )


# --- analyze ------------------------------------------------------------------------------


def _record_llm_runs(job_id: uuid.UUID, runs: list[Any]) -> Decimal:
    total = Decimal("0")
    with sync_session() as db:
        for r in runs:
            cost = Decimal(str(round(r.cost, 6)))
            total += cost
            db.add(
                LlmRun(
                    id=uuid7(),
                    job_id=job_id,
                    chain=chains.CHAIN_NAME,
                    model=r.model,
                    prompt_version=chains.PROMPT_VERSION,
                    tokens_in=r.tokens_in,
                    tokens_out=r.tokens_out,
                    cost=cost,
                    latency_ms=r.latency_ms,
                    cached=r.cached,
                    error=r.error,
                )
            )
        db.execute(update(Job).where(Job.id == job_id).values(llm_cost_usd=Job.llm_cost_usd + total))
        db.commit()
    return total


def analyze(ctx: JobContext) -> None:
    with sync_session() as db:
        existing = db.execute(select(func.count()).select_from(Clip).where(Clip.job_id == ctx.job_id)).scalar_one()
    if existing and ctx.artifact_key(ArtifactKind.scores) is not None:
        return
    ctx.enter(JobState.analyzing)
    s, opts = ctx.settings, ctx.options
    num_clips = int(opts.get("num_clips", 8))
    min_d, max_d = float(opts.get("min_duration", 20)), float(opts.get("max_duration", 60))
    duration = float(ctx.video.duration or 0)

    transcript = ctx.transcript()
    candidates = build_candidates(transcript.sentences, min_duration=min_d, max_duration=max_d)
    if not candidates:
        raise PipelineError("no_candidates", f"No {min_d:g}-{max_d:g}s segments with complete sentences were found")
    try:
        envelope = energy_envelope(ctx.local_artifact(ArtifactKind.audio, "audio.wav"))
    except (OSError, ValueError):
        envelope = None
    k = top_k_for_duration(duration, s.candidates_per_hour, num_clips)
    shortlist = prefilter(candidates, transcript, envelope=envelope, k=k)
    key = job_key(ctx.job.workspace_id, ctx.job_id, "candidates.json")
    ctx.storage.put_json(key, {"total": len(candidates), "k": k, "candidates": [c.model_dump() for c in shortlist]})
    ctx.save_artifact(ArtifactKind.candidates, key, meta={"total": len(candidates), "shortlisted": len(shortlist)})
    ctx.progress(JobState.analyzing, 0.2, force=True)

    instructions = opts.get("instructions")
    if s.llm_model:
        chain = chains.build_scoring_chain(
            s.llm_model,
            fallback_model=s.llm_fallback_model,
            temperature=s.llm_temperature,
            max_retries=s.llm_max_retries,
            session_id=f"clippro-job-{ctx.job_id}",
        )
        remaining = max(0.0, s.llm_budget_usd_per_job - float(ctx.job.llm_cost_usd or 0))
        result = chains.score_with_llm(
            shortlist,
            transcript,
            chain=chain,
            model=s.llm_model,
            cache=RedisCache(s.redis_url, s.llm_cache_ttl_seconds) if s.redis_url else NullCache(),
            prices=s.llm_prices,
            instructions=instructions,
            chunk_size=s.llm_chunk_size,
            chunk_overlap=s.llm_chunk_overlap,
            max_concurrency=s.llm_max_concurrency,
            budget_usd=remaining,
            on_progress=lambda p: ctx.progress(JobState.analyzing, 0.2 + 0.7 * p),
        )
        _record_llm_runs(ctx.job_id, result.runs)
        scores, model_name = result.scores, s.llm_model
    else:
        log.warning("llm_not_configured_using_heuristic")
        scores, model_name = chains.score_heuristically(shortlist, transcript), chains.HEURISTIC_MODEL

    ranked = rank_valid(shortlist, scores, transcript, video_duration=duration, min_duration=min_d, max_duration=max_d)
    selected = select_clips(ranked, num_clips=num_clips, video_duration=duration)
    if not selected:
        raise PipelineError("no_clips_found", "No valid clips could be selected")

    # The full ranked list is kept so replacement candidates can be offered later (FR-REV-2).
    key = job_key(ctx.job.workspace_id, ctx.job_id, "scores.json")
    ctx.storage.put_json(
        key,
        {
            "model": model_name,
            "prompt_version": chains.PROMPT_VERSION,
            "ranked": [{"candidate_id": c.id, "start": sp[0], "end": sp[1], **sc.model_dump()} for c, sc, sp in ranked],
        },
    )
    caption_style = opts.get("caption_style") or caption_config.default_style()
    caption_overrides = {k: v for k, v in (opts.get("caption_overrides") or {}).items() if v is not None}
    with sync_session() as db:
        db.execute(delete(Clip).where(Clip.job_id == ctx.job_id))
        for sel in selected:
            db.add(
                Clip(
                    id=uuid7(),
                    job_id=ctx.job_id,
                    workspace_id=ctx.job.workspace_id,
                    rank=sel.rank,
                    candidate_id=sel.candidate_id,
                    start_s=sel.start,
                    end_s=sel.end,
                    score=sel.score,
                    scores=sel.scores,
                    title=sel.title,
                    hook=sel.hook,
                    reason=sel.reason,
                    hashtags=[],
                    layout="auto",
                    caption_style=caption_style,
                    caption_overrides=caption_overrides,
                    status=ClipStatus.pending,
                )
            )
        db.commit()
    ctx.save_artifact(ArtifactKind.scores, key, meta={"model": model_name, "selected": len(selected)})


# --- per clip: reframe + caption + render --------------------------------------------


def _crop_path_for(job: Job, video: Video, clip: Clip, storage: Any) -> CropPath:
    """Compute (or reuse) the clip's crop path. Recomputed when trim or layout changes."""
    meta = {"start": clip.start_s, "end": clip.end_s, "layout": clip.layout}
    with sync_session() as db:
        art = db.execute(
            select(Artifact).where(
                Artifact.job_id == job.id, Artifact.clip_id == clip.id, Artifact.kind == ArtifactKind.crop_path
            )
        ).scalar_one_or_none()
    if art is not None and art.meta == meta:
        return CropPath.model_validate(storage.get_json(art.storage_key))
    path = center_crop_path(
        width=int(video.width or 0),
        height=int(video.height or 0),
        fps=float(video.fps or 30),
        duration=clip.end_s - clip.start_s,
        layout=clip.layout,
    )
    key = clip_key(job.workspace_id, job.id, clip.id, "crop_path.json")
    storage.put_json(key, path.model_dump())
    save_artifact(job.id, ArtifactKind.crop_path, key, meta=meta, clip_id=clip.id)
    return path


def render_clip(clip_id: uuid.UUID, render_id: uuid.UUID, *, storage: Any, workdir_root: Path) -> None:
    """Reframe, caption and render one clip into the given render row.

    Used both by the pipeline fan-out and by single-clip re-renders (UC3), so it only
    depends on stored artifacts, never on in-memory pipeline state.
    """
    s = get_settings()
    with sync_session() as db:
        row = db.execute(
            select(Clip, Job, Video)
            .join(Job, Job.id == Clip.job_id)
            .join(Video, Video.id == Job.video_id)
            .where(Clip.id == clip_id)
        ).first()
        if row is None:
            raise StopJob("clip no longer exists")
        clip, job, video = row
        db.execute(update(Render).where(Render.id == render_id).values(status=RenderStatus.running))
        db.execute(update(Clip).where(Clip.id == clip_id).values(status=ClipStatus.rendering))
        db.commit()

    workdir = workdir_root / "jobs" / str(job.id)
    clipdir = workdir / "clips" / str(clip_id) / str(render_id)
    clipdir.mkdir(parents=True, exist_ok=True)

    crop = _crop_path_for(job, video, clip, storage)

    transcript_local = workdir / "transcript.json"
    if not transcript_local.exists():
        with sync_session() as db:
            tkey = db.execute(
                select(Artifact.storage_key).where(
                    Artifact.job_id == job.id, Artifact.kind == ArtifactKind.transcript, Artifact.clip_id.is_(None)
                )
            ).scalar_one()
        storage.download_file(tkey, transcript_local)
    transcript = Transcript.model_validate_json(transcript_local.read_text())
    mask = bool((job.options or {}).get("profanity_filter", False))
    overrides = dict(clip.caption_overrides or {})
    ass, srt, vtt = captions.build_captions(
        transcript.words,
        start=clip.start_s,
        end=clip.end_s,
        style_name=clip.caption_style,
        overrides=overrides,
        mask=mask,
    )
    ass_path = clipdir / "captions.ass"
    ass_path.write_text(ass, encoding="utf-8")
    (clipdir / "captions.srt").write_text(srt, encoding="utf-8")
    (clipdir / "captions.vtt").write_text(vtt, encoding="utf-8")

    output = clipdir / "clip.mp4"
    if s.renderer == "remotion":
        props = composition.build_clip_props(
            src=storage.presign_get(video.storage_key, expires=s.source_url_ttl_seconds, internal=True),
            source_width=int(video.width or 0),
            source_height=int(video.height or 0),
            source_fps=float(video.fps or 30),
            start=clip.start_s,
            end=clip.end_s,
            crop=crop,
            words=transcript.words,
            caption_style=clip.caption_style,
            caption_overrides=overrides,
            profanity_filter=mask,
        )
        raw = clipdir / "remotion.mp4"
        render.render_with_remotion(
            node=s.node_bin,
            package_dir=s.video_package_dir or render.default_video_package_dir(),
            props=props,
            output=raw,
            timeout=s.render_timeout_seconds,
            bundle_dir=s.remotion_bundle_dir,
            concurrency=s.remotion_concurrency,
        )
        render.normalize_loudness(ffmpeg=s.ffmpeg_bin, source=raw, output=output, timeout=s.render_timeout_seconds)
        raw.unlink(missing_ok=True)
    else:
        burn_in = s.captions_burn_in
        if burn_in and not media.has_filter("ass", s.ffmpeg_bin):
            raise PipelineError(
                "ffmpeg_missing_libass",
                "ffmpeg was built without libass, so captions cannot be burned in. Install an ffmpeg with libass.",
            )
        source = workdir / ("source" + Path(video.storage_key).suffix)
        if not source.exists():
            storage.download_file(video.storage_key, source)
        render.render_clip(
            ffmpeg=s.ffmpeg_bin,
            source=source,
            start=clip.start_s,
            end=clip.end_s,
            crop=crop,
            fps=float(video.fps or 30),
            output=output,
            ass_path=ass_path if burn_in else None,
            encoder=s.video_encoder,
            timeout=s.render_timeout_seconds,
        )
    thumb = render.make_thumbnail(
        ffmpeg=s.ffmpeg_bin, video=output, at=min(1.0, (clip.end_s - clip.start_s) / 3), output=clipdir / "thumb.jpg"
    )

    def _key(name: str) -> str:
        return clip_key(job.workspace_id, job.id, clip_id, f"renders/{render_id}/{name}")

    storage.upload_file(output, _key("clip.mp4"), "video/mp4")
    storage.upload_file(thumb, _key("thumb.jpg"), "image/jpeg")
    for name, ctype in (
        ("captions.ass", "text/x-ssa"),
        ("captions.srt", "application/x-subrip"),
        ("captions.vtt", "text/vtt"),
    ):
        storage.upload_file(clipdir / name, _key(name), ctype)

    with sync_session() as db:
        db.execute(
            update(Render)
            .where(Render.id == render_id)
            .values(
                status=RenderStatus.succeeded,
                storage_key=_key("clip.mp4"),
                thumbnail_key=_key("thumb.jpg"),
                finished_at=datetime.now(UTC),
                error=None,
                meta={
                    "captions": {"ass": _key("captions.ass"), "srt": _key("captions.srt"), "vtt": _key("captions.vtt")},
                    "start": clip.start_s,
                    "end": clip.end_s,
                    "layout": crop.segments[0].layout,
                    "requested_layout": clip.layout,
                    "caption_style": clip.caption_style,
                    "caption_overrides": overrides,
                    "renderer": s.renderer,
                    "encoder": s.video_encoder if s.renderer == "ffmpeg" else "remotion-h264",
                    "size_bytes": output.stat().st_size,
                },
            )
        )
        db.execute(update(Clip).where(Clip.id == clip_id).values(status=ClipStatus.ready))
        db.commit()
    # Rendered files are in storage now; keep the shared source/transcript for siblings.
    for p in clipdir.iterdir():
        p.unlink(missing_ok=True)
    clipdir.rmdir()


def mark_render_failed(clip_id: uuid.UUID, render_id: uuid.UUID, error: dict[str, Any]) -> None:
    with sync_session() as db:
        db.execute(
            update(Render)
            .where(Render.id == render_id)
            .values(status=RenderStatus.failed, error=error, finished_at=datetime.now(UTC))
        )
        db.execute(update(Clip).where(Clip.id == clip_id).values(status=ClipStatus.failed))
        db.commit()


def create_render(clip_id: uuid.UUID) -> uuid.UUID:
    render_id = uuid7()
    with sync_session() as db:
        db.add(Render(id=render_id, clip_id=clip_id, status=RenderStatus.queued))
        db.commit()
    return render_id


def webhook_payload(job: Job, clips: list[Clip]) -> dict[str, Any]:
    return json.loads(
        json.dumps(
            {
                "event": f"job.{job.state}",
                "job": {
                    "id": str(job.id),
                    "video_id": str(job.video_id),
                    "state": job.state,
                    "stage": job.stage,
                    "progress": job.progress,
                    "error": job.error,
                    "finished_at": job.finished_at.isoformat() if job.finished_at else None,
                },
                "clips": [
                    {
                        "id": str(c.id),
                        "rank": c.rank,
                        "status": c.status,
                        "start": c.start_s,
                        "end": c.end_s,
                        "title": c.title,
                    }
                    for c in clips
                ],
            },
            default=str,
        )
    )
