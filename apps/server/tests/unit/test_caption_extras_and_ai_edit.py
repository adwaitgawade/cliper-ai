import pytest
from pydantic import ValidationError

from app.pipeline import ai_edit, caption_config, captions
from app.pipeline.ai_edit import CaptionChanges, ClipDraft, EditPlan, apply_plan
from app.pipeline.types import Word
from tests.conftest import make_transcript

# --- caption extras ---------------------------------------------------------------------------


def _words(text: str) -> list[Word]:
    return [Word(word=w, start=i * 0.4, end=i * 0.4 + 0.35) for i, w in enumerate(text.split())]


def test_new_presets_and_fields_are_consistent():
    cfg = caption_config.load_config()
    assert {"pill", "pop_emoji", "neon", "podcast"} <= set(cfg.presets)
    assert cfg.presets["pill"].word_box and cfg.presets["pop_emoji"].emoji and cfg.presets["neon"].glow
    assert not cfg.presets["bold_highlight"].word_box
    for emoji in cfg.emoji.values():
        assert emoji and not emoji.isascii()
    assert cfg.limits["hook_seconds"] == (1, 10)


def test_overrides_accept_extras_and_validate_them():
    o = caption_config.CaptionOverrides(
        emoji=True, word_box=True, word_box_color="#00b84a", glow=True, hook_text="  Wait   for it ", hook_seconds=4
    )
    assert o.as_dict() == {
        "emoji": True,
        "word_box": True,
        "word_box_color": "#00B84A",
        "glow": True,
        "hook_text": "Wait for it",
        "hook_seconds": 4,
    }
    assert caption_config.CaptionOverrides(hook_text="   ").hook_text is None
    for bad in ({"hook_seconds": 30}, {"word_box_color": "green"}, {"hook_text": "x" * 81}):
        with pytest.raises(ValidationError):
            caption_config.CaptionOverrides.model_validate(bad)


def test_hook_overrides_do_not_leak_into_the_preset():
    p = caption_config.resolve("clean", {"hook_text": "Hi", "glow": True})
    assert p.glow and not hasattr(p, "hook_text")
    assert caption_config.resolve_hook({"hook_text": "Hi", "hook_seconds": 99}) == ("Hi", 10.0)
    assert caption_config.resolve_hook({}) == (None, caption_config.load_config().hook.default_seconds)


def test_line_emoji_picks_the_first_keyword_only():
    assert captions.line_emoji(_words("we made MONEY, fast")) == (2, "💰")
    assert captions.line_emoji(_words("nothing to see")) is None


def test_ass_draws_pill_glow_and_hook():
    ass, srt, _ = captions.build_captions(
        _words("we made money fast and it was insane"),
        start=0,
        end=4,
        style_name="neon",
        overrides={"word_box": True, "hook_text": "How we got rich"},
    )
    assert "Style: Hook," in ass
    assert "Dialogue: 1,0:00:00.00,0:00:03.00,Hook,,0,0,0,,{\\fad(200,200)}How we got rich" in ass
    assert "\\bord" in ass and "\\3c" in ass  # pill
    assert "{\\blur4}" in ass  # glow
    # The pill takes the highlight color (no pill color set), so the word stays white.
    style = captions.style_for("neon", {"word_box": True})
    assert style.highlight == captions.ass_color("#FFFFFF")
    assert style.word_box == captions.ass_color("#39F3FF")
    assert "How we got rich" not in srt  # sidecars carry speech only


def test_plain_presets_keep_the_previous_ass_output():
    ass, _, _ = captions.build_captions(_words("hello there friend"), start=0, end=2, style_name="bold_highlight")
    assert "Hook" not in ass and "\\blur" not in ass and "\\3c" not in ass


# --- AI edit: applying a plan ----------------------------------------------------------------

SENTENCES = [
    "Why do most startups fail?",
    "The answer surprised me.",
    "It is not money.",
    "Founders build things nobody wants.",
    "So we talked to customers first.",
    "That saved us two years.",
]


@pytest.fixture
def transcript():
    return make_transcript(SENTENCES, word_s=0.5, gap_s=0.5)


def _base(transcript, **kw) -> ClipDraft:
    s = transcript.sentences
    return ClipDraft(start=s[1].start, end=s[3].end, layout="auto", caption_style="bold_highlight", title="Old", **kw)


def test_trim_is_relative_to_the_current_start_and_snaps_to_words(transcript):
    base = _base(transcript)
    first = transcript.sentences[0]
    plan = EditPlan(summary="Start at the question", trim_start=first.start - base.start + 0.07)
    out = apply_plan(plan, base, transcript, video_duration=transcript.duration)
    assert out.draft.start == first.start and out.draft.end == base.end
    assert out.applied and out.applied[0].startswith("Trimmed to")
    assert out.ignored == []


def test_impossible_trim_is_reported_not_applied(transcript):
    base = _base(transcript)
    plan = EditPlan(summary="x", trim_start=1.0, trim_end=1.2)
    out = apply_plan(plan, base, transcript, video_duration=transcript.duration)
    assert (out.draft.start, out.draft.end) == (base.start, base.end)
    assert out.ignored and "shorter" in out.ignored[0]


def test_caption_changes_are_clamped_and_checked(transcript):
    plan = EditPlan(
        summary="Bigger yellow captions",
        caption_style=CaptionChanges(
            size=999,
            highlight_color="ff0",
            text_color="bright red",
            font="Bebas Neue",
            box=True,
            max_words=10,
            emoji=True,
            glow=False,
        ),
    )
    out = apply_plan(plan, _base(transcript), transcript, video_duration=transcript.duration)
    o = out.draft.caption_overrides.as_dict()
    _, hi = caption_config.load_config().limits["size"]
    assert o["size"] == hi and o["highlight_color"] == "#FFFF00" and o["font"] == "bebas_neue"
    assert o["box_color"] == "#00000099" and o["max_words"] == 4 and o["emoji"] is True and o["glow"] is False
    assert "text_color" not in o
    assert any("bright red" in note for note in out.ignored)


def test_preset_switch_drops_tweaks_but_keeps_the_hook(transcript):
    base = _base(
        transcript,
        caption_overrides=caption_config.CaptionOverrides(size=100, hook_text="Watch this", hook_seconds=4),
    )
    plan = EditPlan(summary="Use the pill look", caption_preset="Pill", caption_style=CaptionChanges(uppercase=False))
    out = apply_plan(plan, base, transcript, video_duration=transcript.duration)
    assert out.draft.caption_style == "pill"
    assert out.draft.caption_overrides.as_dict() == {"hook_text": "Watch this", "hook_seconds": 4, "uppercase": False}


def test_unknown_preset_and_hook_title_handling(transcript):
    plan = EditPlan(summary="x", caption_preset="sparkles", hook_title=" How we 10x'd   ", hook_seconds=30, title="New")
    out = apply_plan(plan, _base(transcript), transcript, video_duration=transcript.duration)
    o = out.draft.caption_overrides.as_dict()
    assert out.draft.caption_style == "bold_highlight" and any("sparkles" in n for n in out.ignored)
    assert o["hook_text"] == "How we 10x'd" and o["hook_seconds"] == 10
    assert out.draft.title == "New"
    removed = apply_plan(
        EditPlan(summary="x", remove_hook_title=True), out.draft, transcript, video_duration=transcript.duration
    )
    assert "hook_text" not in removed.draft.caption_overrides.as_dict()


def test_draft_serializes_only_set_overrides(transcript):
    base = _base(transcript, caption_overrides=caption_config.CaptionOverrides(glow=True))
    assert base.model_dump(mode="json")["caption_overrides"] == {"glow": True}
    with pytest.raises(ValidationError):
        ClipDraft(start=5, end=4, layout="auto", caption_style="bold_highlight")
    with pytest.raises(ValidationError):
        ClipDraft(start=1, end=4, layout="auto", caption_style="nope")


def test_prompt_marks_the_clip_and_sanitizes_text(transcript):
    base = _base(transcript)
    data = ai_edit.build_prompt_input("make it <b>pop</b>", base, transcript, video_duration=transcript.duration)
    lines = data["transcript"].splitlines()
    inside = [line for line in lines if line.startswith(">")]
    assert len(inside) == 3 and "The answer surprised me." in inside[0]
    assert lines[0].startswith("  [-")  # the sentence before the clip, at a negative offset
    assert "<" not in data["instruction"]
    prompt = ai_edit.load_prompt().format_messages(**data)
    assert "pill:" in prompt[0].content and "<creator_request>" in prompt[1].content


def test_plan_edit_enforces_its_own_deadline(monkeypatch):
    """The interactive worker uses the threads pool, where Celery time limits don't apply."""
    import time

    from langchain_core.runnables import RunnableLambda

    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "ai_edit_model", "opencode:test-model")
    monkeypatch.setattr(get_settings(), "ai_edit_timeout_seconds", 1)
    monkeypatch.setattr(ai_edit, "_structured", lambda *a: RunnableLambda(lambda _: time.sleep(3)))
    started = time.monotonic()
    with pytest.raises(TimeoutError):
        ai_edit.plan_edit({}, session_id="s")
    assert time.monotonic() - started < 2.5
