import re

import pytest

from app.core.errors import PipelineError
from app.pipeline import captions
from app.pipeline.reframe.crop import CropPath, LayoutSegment, center_crop_path
from app.pipeline.render import build_render_command, video_filter
from app.pipeline.types import Word
from tests.conftest import make_words


def test_clip_words_shifts_to_clip_time():
    words = make_words(["one two three four five six"])
    inside = captions.clip_words(words, start=words[1].start, end=words[4].end)
    assert [w.word for w in inside] == ["two", "three", "four", "five"]
    assert inside[0].start == 0.0


def test_group_lines_limits_words_and_breaks_on_punctuation():
    words = make_words(["alpha beta gamma delta epsilon.", "zeta eta"])
    lines = captions.group_lines(words, max_words=3, max_chars=40)
    assert [ln.text for ln in lines] == ["alpha beta gamma", "delta epsilon.", "zeta eta"]
    assert all(1 <= len(ln.words) <= 4 for ln in lines)


def test_ass_highlights_each_word_once_per_event():
    words = make_words(["hello big world"])
    style = captions.PRESETS["bold_highlight"]
    ass = captions.build_ass(captions.group_lines(words, max_words=3, max_chars=30), style)
    events = [ln for ln in ass.splitlines() if ln.startswith("Dialogue:")]
    assert len(events) == 3  # one event per active word
    for ev in events:
        assert ev.count(style.highlight) == 1
    assert "PlayResX: 1080" in ass and "PlayResY: 1920" in ass
    assert "HELLO" in ass  # uppercase preset
    # Safe-zone margins are set on the style.
    assert f",{style.margin_l},{style.margin_r},{style.margin_v}," in ass


def test_ass_events_follow_word_timestamps():
    words = [Word(word="a", start=1.0, end=1.4), Word(word="b", start=1.5, end=2.0)]
    ass = captions.build_ass([captions.CaptionLine(words)], captions.PRESETS["clean"])
    times = re.findall(r"Dialogue: 0,([\d:.]+),([\d:.]+)", ass)
    assert times == [("0:00:01.00", "0:00:01.50"), ("0:00:01.50", "0:00:02.25")]


def test_ass_escapes_override_braces():
    words = [Word(word="{\\pos(0,0)}hack", start=0, end=1)]
    ass = captions.build_ass([captions.CaptionLine(words)], captions.PRESETS["clean"])
    assert "{\\pos" not in ass


def test_srt_and_vtt():
    words = make_words(["first line here.", "second"])
    _, srt, vtt = captions.build_captions(words, start=0, end=10, style_name="clean")
    assert srt.startswith("1\n00:00:00,000 --> ")
    assert vtt.startswith("WEBVTT")
    assert "00:00:00.000 -->" in vtt


def test_profanity_mask():
    assert captions.mask_profanity("well shit happens") == "well s*** happens"


def test_center_crop_landscape():
    path = center_crop_path(width=1920, height=1080, fps=30, duration=10)
    assert (path.crop_width, path.crop_height) == (606, 1080)
    assert set(path.x_offsets) == {(1920 - 606) // 2}
    assert len(path.x_offsets) == 300
    assert path.segments[0].layout == "crop"
    assert path.is_static


def test_vertical_source_and_forced_wide_use_wide_layout():
    assert center_crop_path(width=1080, height=1920, fps=30, duration=5).segments[0].layout == "wide"
    assert center_crop_path(width=1920, height=1080, fps=30, duration=5, layout="wide").segments[0].layout == "wide"


def test_frame_count_capped_at_30fps():
    assert len(center_crop_path(width=1920, height=1080, fps=60, duration=2).x_offsets) == 60


def test_video_filter_crop_fps_cap_and_captions():
    path = center_crop_path(width=1920, height=1080, fps=60, duration=5)
    graph = video_filter(path, fps=60, ass_file="captions.ass")
    assert "crop=606:1080:657:0" in graph
    assert "scale=1080:1920" in graph
    assert "fps=30" in graph
    assert "ass=captions.ass" in graph
    assert graph.endswith("format=yuv420p[v]")
    assert "fps=" not in video_filter(path, fps=25, ass_file=None)


def test_wide_filter_blurs_background():
    path = center_crop_path(width=1080, height=1920, fps=30, duration=5)
    assert "boxblur" in video_filter(path, fps=30, ass_file=None)


def test_moving_crop_paths_are_rejected_until_m2():
    path = CropPath(
        source_width=1920,
        source_height=1080,
        fps=30,
        crop_width=606,
        crop_height=1080,
        x_offsets=[0, 10],
        segments=[LayoutSegment(start=0, end=1, layout="crop")],
    )
    with pytest.raises(PipelineError):
        video_filter(path, fps=30, ass_file=None)


def test_render_command_output_spec(tmp_path):
    path = center_crop_path(width=1920, height=1080, fps=30, duration=20)
    cmd = build_render_command(
        ffmpeg="ffmpeg",
        source=tmp_path / "in.mp4",
        start=12.5,
        end=32.5,
        crop=path,
        fps=30,
        output=tmp_path / "out.mp4",
        ass_file=None,
        encoder="h264_nvenc",
    )
    joined = " ".join(cmd)
    assert "-ss 12.500" in joined and "-t 20.000" in joined
    assert "h264_nvenc" in joined
    assert "loudnorm=I=-14" in joined
    assert "+faststart" in joined
    assert "-c:a aac" in joined
