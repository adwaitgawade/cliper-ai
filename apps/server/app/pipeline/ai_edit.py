"""AI editing: turn a plain-language request into changes to a clip's editor draft.

The model reads the draft and the transcript around the clip and returns an `EditPlan`:
optional, typed fields (trim, layout, preset, caption tweaks, hook title, title). It
never writes the draft itself. `apply_plan` applies the plan here, deterministically:
trims snap to word edges and respect the clip length limits, numbers are clamped to the
editor's limits, colors and fonts are checked, and anything that can't be applied is
reported back as ignored. The result is validated as a `ClipDraft` before the editor
sees it, and nothing is saved: the editor loads it as unsaved changes.
"""

import json
import re
import uuid
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout
from datetime import UTC, datetime
from decimal import Decimal
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

import structlog
from langchain_core.exceptions import OutputParserException
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable, RunnableConfig, RunnableLambda
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_serializer, field_validator, model_validator
from sqlalchemy import select, update

from app.core.config import get_settings
from app.core.ids import uuid7
from app.db.models import AiEdit, AiEditStatus, Artifact, ArtifactKind, Clip, Job, LlmRun, Video
from app.db.session import sync_session
from app.llm.callbacks import UsageCallbackHandler, UsageRecord
from app.llm.factory import make_chat_model, structured_output_kwargs
from app.pipeline import caption_config
from app.pipeline.caption_config import CaptionOverrides, HighlightMode
from app.pipeline.highlights.chains import sanitize
from app.pipeline.trim import MAX_CLIP_SECONDS, MIN_CLIP_SECONDS, snap_end, snap_start
from app.pipeline.types import Transcript

log = structlog.get_logger()

CHAIN_NAME = "clip_edit"
PROMPT_VERSION = "v1"
PROMPTS_DIR = Path(__file__).resolve().parents[1] / "llm" / "prompts"
CONTEXT_SECONDS = 45.0
MAX_TRANSCRIPT_LINES = 120
Layout = Literal["auto", "crop", "wide"]
_HEX = re.compile(r"^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")
_SHORT_HEX = re.compile(r"^#?([0-9a-fA-F]{3})$")
_NO_BOX = "#00000000"
_DEFAULT_BOX = "#00000099"
_HOOK_KEYS = ("hook_text", "hook_seconds")


class ClipDraft(BaseModel):
    """The editable state of a clip, as the editor holds it."""

    start: float = Field(ge=0)
    end: float = Field(gt=0)
    layout: Layout
    caption_style: str
    caption_overrides: CaptionOverrides = Field(default_factory=CaptionOverrides)
    title: str = Field(default="", max_length=200)

    @field_validator("caption_style")
    @classmethod
    def _known_style(cls, v: str) -> str:
        if v not in caption_config.preset_names():
            raise ValueError(f"unknown caption style; choose one of {sorted(caption_config.preset_names())}")
        return v

    @model_validator(mode="after")
    def _order(self) -> "ClipDraft":
        if self.start >= self.end:
            raise ValueError("start must be before end")
        return self

    @field_serializer("caption_overrides")
    def _overrides(self, v: CaptionOverrides) -> dict[str, Any]:
        # Only the fields that are set, exactly as clips store them.
        return v.as_dict()


def draft_from_clip(clip: Clip) -> ClipDraft:
    return ClipDraft(
        start=clip.start_s,
        end=clip.end_s,
        layout=clip.layout if clip.layout in ("auto", "crop", "wide") else "auto",
        caption_style=clip.caption_style
        if clip.caption_style in caption_config.preset_names()
        else caption_config.default_style(),
        caption_overrides=CaptionOverrides.model_validate(clip.caption_overrides or {}),
        title=clip.title or "",
    )


# --- what the model returns ---------------------------------------------------------------


class CaptionChanges(BaseModel):
    """Caption tweaks. Loosely typed on purpose: apply_plan validates and clamps."""

    model_config = ConfigDict(extra="ignore")

    font: str | None = None
    size: float | None = None
    text_color: str | None = None
    highlight_color: str | None = None
    outline_color: str | None = None
    outline_width: float | None = None
    box: bool | None = Field(default=None, description="Dark box behind each caption line")
    box_color: str | None = None
    uppercase: bool | None = None
    max_words: int | None = None
    position_y: float | None = None
    highlight_mode: HighlightMode | None = None
    emoji: bool | None = None
    word_box: bool | None = None
    word_box_color: str | None = None
    glow: bool | None = None


class EditPlan(BaseModel):
    """The model's proposal. Every field except `summary` is optional: null means
    'leave as is'."""

    model_config = ConfigDict(extra="ignore")

    summary: str = Field(description="One or two sentences for the creator about what changed")
    trim_start: float | None = Field(default=None, description="New start, seconds relative to the current start")
    trim_end: float | None = Field(default=None, description="New end, seconds relative to the current start")
    layout: Layout | None = None
    caption_preset: str | None = None
    caption_style: CaptionChanges | None = None
    reset_caption_style: bool = False
    hook_title: str | None = None
    hook_seconds: float | None = None
    remove_hook_title: bool = False
    title: str | None = None


# --- applying a plan -----------------------------------------------------------------------


class Applied(BaseModel):
    draft: ClipDraft
    applied: list[str]
    ignored: list[str]


def _clamp(v: float, lo: float, hi: float) -> float:
    return min(hi, max(lo, v))


def _color(v: str) -> str | None:
    v = v.strip()
    if m := _SHORT_HEX.match(v):
        v = "#" + "".join(c * 2 for c in m.group(1))
    if not _HEX.match(v):
        return None
    return ("#" + v.lstrip("#")).upper()


def _font_key(v: str) -> str | None:
    fonts = caption_config.load_config().fonts
    wanted = v.strip().lower().replace(" ", "_")
    for key, spec in fonts.items():
        if wanted in (key, spec.family.lower().replace(" ", "_")):
            return key
    return None


def _preset_key(v: str) -> str | None:
    presets = caption_config.load_config().presets
    wanted = v.strip().lower().replace(" ", "_").replace("-", "_")
    for key, p in presets.items():
        if wanted in (key, p.label.lower().replace(" ", "_").replace("-", "_")):
            return key
    return None


def _fmt(t: float) -> str:
    m, s = divmod(max(0.0, t), 60)
    return f"{int(m)}:{s:04.1f}"


def _apply_trim(
    plan: EditPlan, base: ClipDraft, draft: ClipDraft, transcript: Transcript, duration: float
) -> tuple[str | None, str | None]:
    """Returns (applied note, ignored note)."""
    start = base.start + plan.trim_start if plan.trim_start is not None else draft.start
    end = base.start + plan.trim_end if plan.trim_end is not None else draft.end
    start, end = _clamp(start, 0, duration), _clamp(end, 0, duration)
    if transcript.words:
        start, end = snap_start(start, transcript), snap_end(end, transcript)
    if end - start > MAX_CLIP_SECONDS:
        # Longest cut that still ends on a word.
        ends = [w.end for w in transcript.words if start < w.end <= start + MAX_CLIP_SECONDS]
        end = max(ends) if ends else start + MAX_CLIP_SECONDS
    if end - start < MIN_CLIP_SECONDS:
        return None, f"Trim skipped: the clip would be shorter than {MIN_CLIP_SECONDS:g}s"
    start, end = round(start, 3), round(end, 3)
    if (start, end) == (draft.start, draft.end):
        return None, None
    draft.start, draft.end = start, end
    return f"Trimmed to {_fmt(start)}-{_fmt(end)} ({end - start:.1f}s)", None


def _apply_caption_changes(changes: CaptionChanges, overrides: dict[str, Any]) -> tuple[list[str], list[str]]:
    applied: list[str] = []
    ignored: list[str] = []
    limits = caption_config.load_config().limits
    for name in ("size", "outline_width", "position_y"):
        value = getattr(changes, name)
        if value is not None:
            lo, hi = limits[name]
            overrides[name] = round(_clamp(float(value), lo, hi), 3)
            applied.append(f"{name.replace('_', ' ').capitalize()} set to {overrides[name]:g}")
    if changes.max_words is not None:
        lo, hi = limits["max_words"]
        overrides["max_words"] = int(_clamp(changes.max_words, lo, hi))
        applied.append(f"Up to {overrides['max_words']} words per line")
    for name in ("text_color", "highlight_color", "outline_color", "word_box_color"):
        value = getattr(changes, name)
        if value is None:
            continue
        color = _color(value)
        if color is None:
            ignored.append(f"{name.replace('_', ' ').capitalize()} '{value}' is not a hex color")
            continue
        overrides[name] = color
        applied.append(f"{name.replace('_', ' ').capitalize()} set to {color}")
    if changes.font is not None:
        key = _font_key(changes.font)
        if key is None:
            ignored.append(f"Font '{changes.font}' is not available")
        else:
            overrides["font"] = key
            applied.append(f"Font set to {caption_config.load_config().fonts[key].family}")
    if changes.box is False:
        overrides["box_color"] = _NO_BOX
        applied.append("Caption box removed")
    elif changes.box is True or changes.box_color is not None:
        color = _color(changes.box_color) if changes.box_color else _DEFAULT_BOX
        if color is None:
            ignored.append(f"Box color '{changes.box_color}' is not a hex color")
        else:
            overrides["box_color"] = color
            applied.append(f"Caption box set to {color}")
    for name, on, off in (
        ("uppercase", "All caps on", "All caps off"),
        ("emoji", "Emoji on key words", "Emoji off"),
        ("word_box", "Pill behind the spoken word", "Word pill off"),
        ("glow", "Neon glow on", "Glow off"),
    ):
        value = getattr(changes, name)
        if value is not None:
            overrides[name] = bool(value)
            applied.append(on if value else off)
    if changes.highlight_mode is not None:
        overrides["highlight_mode"] = changes.highlight_mode
        applied.append(f"Word highlight: {changes.highlight_mode}")
    return applied, ignored


def apply_plan(plan: EditPlan, base: ClipDraft, transcript: Transcript, *, video_duration: float) -> Applied:
    draft = base.model_copy(deep=True)
    applied: list[str] = []
    ignored: list[str] = []
    overrides = draft.caption_overrides.as_dict()

    if plan.trim_start is not None or plan.trim_end is not None:
        done, skipped = _apply_trim(plan, base, draft, transcript, video_duration)
        applied += [done] if done else []
        ignored += [skipped] if skipped else []

    if plan.layout is not None and plan.layout != draft.layout:
        draft.layout = plan.layout
        applied.append(f"Layout set to {plan.layout}")

    if plan.caption_preset:
        key = _preset_key(plan.caption_preset)
        if key is None:
            ignored.append(f"Caption preset '{plan.caption_preset}' does not exist")
        else:
            draft.caption_style = key
            # A preset switch drops tweaks (as in the editor) but keeps the hook title.
            overrides = {k: v for k, v in overrides.items() if k in _HOOK_KEYS}
            applied.append(f"Caption preset: {caption_config.load_config().presets[key].label}")

    if plan.reset_caption_style:
        overrides = {k: v for k, v in overrides.items() if k in _HOOK_KEYS}
        applied.append("Caption tweaks reset to the preset")

    if plan.caption_style is not None:
        done_list, skipped_list = _apply_caption_changes(plan.caption_style, overrides)
        applied += done_list
        ignored += skipped_list

    if plan.remove_hook_title:
        if overrides.pop("hook_text", None) is not None:
            applied.append("Hook title removed")
        overrides.pop("hook_seconds", None)
    elif plan.hook_title is not None:
        text = caption_config.hook_text(plan.hook_title)
        if text:
            overrides["hook_text"] = text
            applied.append(f'Hook title: "{text}"')
    if plan.hook_seconds is not None and overrides.get("hook_text"):
        lo, hi = caption_config.load_config().limits["hook_seconds"]
        overrides["hook_seconds"] = round(_clamp(plan.hook_seconds, lo, hi), 1)
        applied.append(f"Hook title shows for {overrides['hook_seconds']:g}s")

    if plan.title is not None and plan.title.strip() and plan.title.strip()[:200] != draft.title:
        draft.title = plan.title.strip()[:200]
        applied.append(f'Title: "{draft.title}"')

    try:
        draft.caption_overrides = CaptionOverrides.model_validate(overrides)
    except ValidationError as e:
        # Defense in depth: every value above is already clamped and checked.
        log.warning("ai_edit_overrides_invalid", errors=e.error_count())
        ignored.append("Some caption changes were out of range and were skipped")
        draft.caption_overrides = base.caption_overrides
    return Applied(draft=ClipDraft.model_validate(draft.model_dump()), applied=applied, ignored=ignored)


# --- prompting -----------------------------------------------------------------------------


@lru_cache
def load_prompt() -> ChatPromptTemplate:
    base = PROMPTS_DIR / PROMPT_VERSION / CHAIN_NAME
    return ChatPromptTemplate.from_messages(
        [("system", (base / "system.md").read_text()), ("human", (base / "human.md").read_text())]
    )


def transcript_excerpt(transcript: Transcript, start: float, end: float) -> str:
    lines = []
    for s in transcript.sentences:
        if s.end < start - CONTEXT_SECONDS or s.start > end + CONTEXT_SECONDS:
            continue
        mark = ">" if s.end > start and s.start < end else " "
        lines.append(f"{mark} [{s.start - start:+.1f} to {s.end - start:+.1f}] {sanitize(s.text)}")
    if len(lines) > MAX_TRANSCRIPT_LINES:
        inside = [i for i, line in enumerate(lines) if line.startswith(">")]
        center = inside[len(inside) // 2] if inside else len(lines) // 2
        lo = max(0, center - MAX_TRANSCRIPT_LINES // 2)
        lines = lines[lo : lo + MAX_TRANSCRIPT_LINES]
    return "\n".join(lines) or "(no speech in this part of the video)"


def build_prompt_input(
    instruction: str, base: ClipDraft, transcript: Transcript, *, video_duration: float
) -> dict[str, Any]:
    cfg = caption_config.load_config()
    lim = cfg.limits
    draft = base.model_dump(mode="json", exclude={"start", "end"})
    draft["caption_overrides"] = base.caption_overrides.as_dict()
    return {
        "min_seconds": f"{MIN_CLIP_SECONDS:g}",
        "max_seconds": f"{MAX_CLIP_SECONDS:g}",
        "fonts": ", ".join(f"{k} ({f.family})" for k, f in cfg.fonts.items()),
        "size_min": f"{lim['size'][0]:g}",
        "size_max": f"{lim['size'][1]:g}",
        "outline_min": f"{lim['outline_width'][0]:g}",
        "outline_max": f"{lim['outline_width'][1]:g}",
        "words_min": f"{lim['max_words'][0]:g}",
        "words_max": f"{lim['max_words'][1]:g}",
        "pos_min": f"{lim['position_y'][0]:g}",
        "pos_max": f"{lim['position_y'][1]:g}",
        "hook_min_s": f"{lim['hook_seconds'][0]:g}",
        "hook_max_s": f"{lim['hook_seconds'][1]:g}",
        "hook_max": str(cfg.hook.max_chars),
        "presets": "\n".join(f"- {k}: {p.description}" for k, p in cfg.presets.items()),
        "clip_start": f"{base.start:.1f}",
        "clip_end": f"{base.end:.1f}",
        "clip_duration": f"{base.end - base.start:.1f}",
        "video_duration": f"{video_duration:.1f}",
        "draft": json.dumps(draft, ensure_ascii=False),
        "transcript": transcript_excerpt(transcript, base.start, base.end),
        "instruction": sanitize(instruction.strip()),
    }


def _require(result: Any) -> EditPlan:
    if result is None:
        raise OutputParserException("Model returned no structured output")
    return result


def _structured(model_name: str, session_id: str, timeout: float) -> Runnable[dict[str, Any], EditPlan]:
    model = make_chat_model(model_name, temperature=0.1, max_retries=1, session_id=session_id, timeout=timeout)
    return (
        load_prompt()
        | model.with_structured_output(EditPlan, **structured_output_kwargs(model_name))
        | RunnableLambda(_require)
    ).with_retry(retry_if_exception_type=(OutputParserException, ValidationError), stop_after_attempt=2)


def edit_model() -> tuple[str | None, str | None]:
    s = get_settings()
    if s.ai_edit_model:
        return s.ai_edit_model, None
    return s.llm_model, s.llm_fallback_model


def plan_edit(prompt_input: dict[str, Any], *, session_id: str) -> tuple[EditPlan, UsageRecord]:
    """Ask the model for an edit plan. Raises when no model is configured, and
    TimeoutError past AI_EDIT_TIMEOUT_SECONDS.

    The deadline is enforced here rather than by Celery, because the interactive worker
    runs the threads pool, where Celery time limits don't apply. Each HTTP request also
    has its own timeout, so an abandoned call ends soon after the deadline."""
    model, fallback = edit_model()
    if not model:
        raise RuntimeError("AI editing needs AI_EDIT_MODEL or LLM_MODEL")
    deadline = float(get_settings().ai_edit_timeout_seconds)
    per_request = max(10.0, deadline / 3)
    chain = _structured(model, session_id, per_request)
    if fallback:
        chain = chain.with_fallbacks([_structured(fallback, session_id, per_request)])
    usage = UsageCallbackHandler(model, get_settings().llm_prices)
    config = RunnableConfig(callbacks=[usage], run_name=CHAIN_NAME)
    pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="ai-edit")
    try:
        plan = pool.submit(chain.invoke, prompt_input, config).result(timeout=deadline)
    except FutureTimeout as e:
        raise TimeoutError(f"AI edit took longer than {deadline:g}s") from e
    finally:
        pool.shutdown(wait=False, cancel_futures=True)
    return plan, usage.record


# --- worker entry point ----------------------------------------------------------------------


def _finish(edit_id: uuid.UUID, **values: Any) -> None:
    with sync_session() as db:
        db.execute(update(AiEdit).where(AiEdit.id == edit_id).values(finished_at=datetime.now(UTC), **values))
        db.commit()


def _fail(edit_id: uuid.UUID, code: str, message: str) -> str:
    _finish(edit_id, status=AiEditStatus.failed, error={"code": code, "message": message})
    return "failed"


def _record_run(job_id: uuid.UUID, record: UsageRecord) -> Decimal:
    cost = Decimal(str(round(record.cost, 6)))
    with sync_session() as db:
        db.add(
            LlmRun(
                id=uuid7(),
                job_id=job_id,
                chain=CHAIN_NAME,
                model=record.model,
                prompt_version=PROMPT_VERSION,
                tokens_in=record.tokens_in,
                tokens_out=record.tokens_out,
                cost=cost,
                latency_ms=record.latency_ms,
                cached=False,
                error=record.error,
            )
        )
        db.commit()
    return cost


def run_edit(edit_id: uuid.UUID) -> str:
    """Plan, apply and store one AI edit. Returns the final status."""
    from celery.exceptions import SoftTimeLimitExceeded

    from app.storage.s3 import get_storage

    with sync_session() as db:
        row = db.execute(
            select(AiEdit, Clip, Video)
            .join(Clip, Clip.id == AiEdit.clip_id)
            .join(Job, Job.id == Clip.job_id)
            .join(Video, Video.id == Job.video_id)
            .where(AiEdit.id == edit_id)
        ).first()
        if row is None:
            return "skipped"
        edit, clip, video = row
        if edit.status != AiEditStatus.queued:
            return "skipped"
        tkey = db.execute(
            select(Artifact.storage_key).where(
                Artifact.job_id == clip.job_id, Artifact.kind == ArtifactKind.transcript, Artifact.clip_id.is_(None)
            )
        ).scalar_one_or_none()
        db.execute(update(AiEdit).where(AiEdit.id == edit_id).values(status=AiEditStatus.running))
        db.commit()
    structlog.contextvars.bind_contextvars(ai_edit_id=str(edit_id), clip_id=str(clip.id))
    if tkey is None:
        return _fail(edit_id, "transcript_not_ready", "The transcript for this clip isn't available.")

    try:
        transcript = Transcript.model_validate(get_storage().get_json(tkey))
        base = ClipDraft.model_validate(edit.base)
        duration = float(video.duration or transcript.duration)
        prompt_input = build_prompt_input(edit.instruction, base, transcript, video_duration=duration)
        plan, usage = plan_edit(prompt_input, session_id=f"clippro-ai-edit-{edit_id}")
        cost = _record_run(clip.job_id, usage)
        result = apply_plan(plan, base, transcript, video_duration=duration)
    except (SoftTimeLimitExceeded, TimeoutError):
        return _fail(edit_id, "timeout", "The AI took too long to answer. Try again.")
    except Exception as e:
        log.warning("ai_edit_failed", error=type(e).__name__, exc_info=True)
        return _fail(edit_id, "ai_failed", "The AI couldn't plan this edit. Try rephrasing it.")

    _finish(
        edit_id,
        status=AiEditStatus.succeeded,
        proposal=result.draft.model_dump(mode="json"),
        summary=plan.summary.strip()[:500],
        changes={"applied": result.applied, "ignored": result.ignored},
        model=usage.model,
        cost=cost,
    )
    log.info("ai_edit_done", applied=len(result.applied), ignored=len(result.ignored))
    return "succeeded"
