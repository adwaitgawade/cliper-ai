import pytest
from pydantic import ValidationError

from app.pipeline import caption_config, captions, render
from app.pipeline.composition import build_clip_props
from app.pipeline.reframe.crop import center_crop_path
from app.pipeline.types import Word
from app.schemas.clips import ClipComposition, ClipPatch
from app.schemas.jobs import JobOptions


def test_shared_config_is_consistent():
    cfg = caption_config.load_config()
    assert cfg.default_style in cfg.presets
    for name, preset in cfg.presets.items():
        assert preset.font in cfg.fonts, name
        lo, hi = cfg.limits["max_words"]
        assert lo <= preset.max_words <= hi  # FR-CAP-2: 1-4 words per line


def test_overrides_are_validated_against_the_shared_limits():
    ok = caption_config.CaptionOverrides(text_color="#ff00aa", size=90, font="anton", box_color="#00000080")
    assert ok.as_dict() == {"text_color": "#FF00AA", "size": 90, "font": "anton", "box_color": "#00000080"}
    for bad in ({"text_color": "red"}, {"size": 500}, {"font": "comic_sans"}, {"max_words": 9}, {"weight": 900}):
        with pytest.raises(ValidationError):
            caption_config.CaptionOverrides.model_validate(bad)


def test_patch_and_job_options_accept_overrides():
    assert ClipPatch(caption_overrides={"position_y": 0.5}).caption_overrides is not None
    opts = JobOptions(caption_style="impact", caption_overrides={"highlight_color": "#00ff00"})
    assert opts.caption_style == "impact"
    with pytest.raises(ValidationError):
        JobOptions(caption_style="nope")


def test_ass_colors_and_box_toggle():
    assert captions.ass_color("#FFE500") == "&H0000E5FF"
    assert captions.ass_color("#00000099") == "&H66000000"
    assert captions.style_for("boxed").border_style == 3
    assert captions.style_for("boxed", {"box_color": "#00000000"}).border_style == 1
    style = captions.style_for("clean", {"font": "anton", "size": 100, "uppercase": True})
    assert (style.font, style.size, style.uppercase) == ("Anton", 100, True)
    assert captions.style_for("unknown").name == caption_config.default_style()


def test_clip_props_match_the_composition_schema():
    words = [Word(word=w, start=i, end=i + 0.8) for i, w in enumerate(["zero", "one", "two", "three", "four", "five"])]
    crop = center_crop_path(width=1920, height=1080, fps=60, duration=2, layout="auto")
    props = build_clip_props(
        src="https://example.com/v.mp4",
        source_width=1920,
        source_height=1080,
        source_fps=60,
        start=1.5,
        end=3.5,
        crop=crop,
        words=words,
        caption_style="nope",
        caption_overrides={"size": 90, "font": None},
        profanity_filter=True,
    )
    ClipComposition.model_validate(props)
    assert props["fps"] == 30
    assert [w["word"] for w in props["words"]] == ["one", "two", "three"]  # overlapping [1.5, 3.5]
    assert props["captions"] == {
        "enabled": True,
        "style": caption_config.default_style(),
        "overrides": {"size": 90},
        "profanity_filter": True,
    }
    assert len(props["crop"]["x_offsets"]) == 60 and props["crop"]["segments"][0]["layout"] == "crop"


def test_remotion_and_loudnorm_commands(tmp_path):
    cmd = render.build_remotion_command(
        node="node",
        package_dir=tmp_path,
        props_file=tmp_path / "p.json",
        output=tmp_path / "o.mp4",
        bundle_dir=tmp_path / "b",
        concurrency=2,
    )
    assert cmd[:2] == ["node", str(tmp_path / "scripts" / "render.mjs")]
    assert cmd[cmd.index("--bundle") + 1] == str(tmp_path / "b") and cmd[cmd.index("--concurrency") + 1] == "2"
    loud = render.build_loudnorm_command(ffmpeg="ffmpeg", source=tmp_path / "a.mp4", output=tmp_path / "b.mp4")
    assert loud[loud.index("-c:v") + 1] == "copy"
    assert "loudnorm=I=-14" in loud[loud.index("-af") + 1]
    assert "+faststart" in loud


def test_default_video_package_points_at_the_monorepo_package():
    pkg = render.default_video_package_dir()
    assert (pkg / "scripts" / "render.mjs").exists()
    assert (pkg / "src" / "caption-config.json") == caption_config.config_path()


def test_render_outdated_compares_clip_settings_with_render_params():
    import uuid

    from app.api.routers.clips import render_outdated
    from app.db.models import Clip, Render, RenderStatus

    clip = Clip(
        id=uuid.uuid4(), start_s=1.0, end_s=20.0, layout="auto", caption_style="clean", caption_overrides={"size": 90}
    )
    meta = {
        "start": 1.0,
        "end": 20.0,
        "requested_layout": "auto",
        "layout": "crop",
        "caption_style": "clean",
        "caption_overrides": {"size": 90},
    }
    render = Render(clip_id=clip.id, status=RenderStatus.succeeded, meta=meta)
    assert render_outdated(clip, render) is False
    clip.caption_overrides = {"size": 100}
    assert render_outdated(clip, render) is True
    # Queued or failed renders, and clips never rendered, are not "outdated".
    assert render_outdated(clip, Render(clip_id=clip.id, status=RenderStatus.queued, meta=None)) is False
    assert render_outdated(clip, None) is False
