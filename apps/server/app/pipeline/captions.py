"""Word-synced captions (FR-CAP-1..5).

Captions are built only from word-level timestamps. ASS output highlights the active
word. SRT and VTT exports carry the same lines without styling.
"""

import re
from dataclasses import dataclass

from app.pipeline.types import Word

PLAY_RES_X, PLAY_RES_Y = 1080, 1920


@dataclass(frozen=True)
class CaptionStyle:
    name: str
    font: str
    size: int
    primary: str  # ASS colours are &HAABBGGRR
    highlight: str
    outline_color: str
    back_color: str
    outline: float
    shadow: float
    bold: bool
    uppercase: bool
    max_words: int
    max_chars: int
    border_style: int  # 1 = outline + shadow, 3 = opaque box
    # Safe zones: platform UI covers the bottom ~25% and the right edge.
    margin_v: int = 560
    margin_l: int = 90
    margin_r: int = 90
    highlight_scale: int = 108


PRESETS: dict[str, CaptionStyle] = {
    "bold_highlight": CaptionStyle(
        name="bold_highlight",
        font="Arial",
        size=86,
        primary="&H00FFFFFF",
        highlight="&H0000E5FF",
        outline_color="&H00000000",
        back_color="&H80000000",
        outline=6,
        shadow=2,
        bold=True,
        uppercase=True,
        max_words=3,
        max_chars=18,
        border_style=1,
    ),
    "clean": CaptionStyle(
        name="clean",
        font="Helvetica",
        size=70,
        primary="&H00FFFFFF",
        highlight="&H00FFC864",
        outline_color="&H00202020",
        back_color="&H00000000",
        outline=3,
        shadow=0,
        bold=False,
        uppercase=False,
        max_words=4,
        max_chars=24,
        border_style=1,
        highlight_scale=100,
    ),
    "karaoke": CaptionStyle(
        name="karaoke",
        font="Arial",
        size=80,
        primary="&H00FFFFFF",
        highlight="&H0000FF7F",
        outline_color="&H00000000",
        back_color="&H80000000",
        outline=5,
        shadow=1,
        bold=True,
        uppercase=False,
        max_words=4,
        max_chars=22,
        border_style=1,
    ),
    "boxed": CaptionStyle(
        name="boxed",
        font="Arial",
        size=72,
        primary="&H00FFFFFF",
        highlight="&H0000E5FF",
        outline_color="&H99000000",
        back_color="&H99000000",
        outline=14,
        shadow=0,
        bold=True,
        uppercase=False,
        max_words=3,
        max_chars=20,
        border_style=3,
        highlight_scale=100,
    ),
}
DEFAULT_STYLE = "bold_highlight"

_PROFANITY = {"fuck", "fucking", "shit", "bitch", "asshole", "bastard", "dick", "cunt", "motherfucker"}


def mask_profanity(text: str) -> str:
    def _mask(m: re.Match[str]) -> str:
        w = m.group(0)
        return w[0] + "*" * (len(w) - 1) if w.lower() in _PROFANITY else w

    return re.sub(r"[A-Za-z]+", _mask, text)


@dataclass
class CaptionLine:
    words: list[Word]  # times relative to the clip start

    @property
    def start(self) -> float:
        return self.words[0].start

    @property
    def end(self) -> float:
        return self.words[-1].end

    @property
    def text(self) -> str:
        return " ".join(w.word for w in self.words)


def clip_words(words: list[Word], start: float, end: float) -> list[Word]:
    """Words inside [start, end], shifted so the clip starts at 0."""
    out = []
    for w in words:
        if w.end <= start or w.start >= end:
            continue
        out.append(w.model_copy(update={"start": max(0.0, w.start - start), "end": min(end, w.end) - start}))
    return out


def group_lines(words: list[Word], *, max_words: int, max_chars: int, max_gap: float = 0.6) -> list[CaptionLine]:
    lines: list[CaptionLine] = []
    current: list[Word] = []
    for w in words:
        if current:
            text_len = len(" ".join(x.word for x in current)) + 1 + len(w.word)
            prev = current[-1]
            if (
                len(current) >= max_words
                or text_len > max_chars
                or w.start - prev.end > max_gap
                or prev.word.rstrip("\"')").endswith((".", "?", "!", ","))
            ):
                lines.append(CaptionLine(current))
                current = []
        current.append(w)
    if current:
        lines.append(CaptionLine(current))
    return lines


def _ts_ass(t: float) -> str:
    cs = max(0, round(t * 100))
    h, rem = divmod(cs, 360000)
    m, rem = divmod(rem, 6000)
    s, cs = divmod(rem, 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def _ts_srt(t: float, sep: str = ",") -> str:
    ms = max(0, round(t * 1000))
    h, rem = divmod(ms, 3600000)
    m, rem = divmod(rem, 60000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


def _ass_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("{", "(").replace("}", ")").replace("\n", " ")


def _display(word: str, style: CaptionStyle, profanity: bool) -> str:
    text = mask_profanity(word) if profanity else word
    return _ass_escape(text.upper() if style.uppercase else text)


def build_ass(lines: list[CaptionLine], style: CaptionStyle, *, mask: bool = False) -> str:
    header = (
        "[Script Info]\nScriptType: v4.00+\n"
        f"PlayResX: {PLAY_RES_X}\nPlayResY: {PLAY_RES_Y}\n"
        "WrapStyle: 2\nScaledBorderAndShadow: yes\nYCbCr Matrix: TV.709\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, "
        "Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, "
        "MarginR, MarginV, Encoding\n"
        f"Style: Default,{style.font},{style.size},{style.primary},{style.highlight},{style.outline_color},"
        f"{style.back_color},{-1 if style.bold else 0},0,0,0,100,100,0,0,{style.border_style},{style.outline},"
        f"{style.shadow},2,{style.margin_l},{style.margin_r},{style.margin_v},1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )
    events = []
    for li, line in enumerate(lines):
        next_start = lines[li + 1].start if li + 1 < len(lines) else line.end + 0.4
        line_end = min(line.end + 0.25, next_start)
        for wi, word in enumerate(line.words):
            seg_start = line.start if wi == 0 else word.start
            seg_end = line.words[wi + 1].start if wi + 1 < len(line.words) else line_end
            if seg_end <= seg_start:
                continue
            parts = []
            for k, w in enumerate(line.words):
                text = _display(w.word, style, mask)
                if k == wi:
                    scale = style.highlight_scale
                    text = f"{{\\c{style.highlight}&\\fscx{scale}\\fscy{scale}}}{text}{{\\r}}"
                parts.append(text)
            events.append(f"Dialogue: 0,{_ts_ass(seg_start)},{_ts_ass(seg_end)},Default,,0,0,0,,{' '.join(parts)}")
    return header + "\n".join(events) + "\n"


def build_srt(lines: list[CaptionLine], *, mask: bool = False) -> str:
    blocks = []
    for i, line in enumerate(lines, 1):
        text = mask_profanity(line.text) if mask else line.text
        blocks.append(f"{i}\n{_ts_srt(line.start)} --> {_ts_srt(line.end)}\n{text}\n")
    return "\n".join(blocks)


def build_vtt(lines: list[CaptionLine], *, mask: bool = False) -> str:
    blocks = ["WEBVTT\n"]
    for line in lines:
        text = mask_profanity(line.text) if mask else line.text
        blocks.append(f"{_ts_srt(line.start, '.')} --> {_ts_srt(line.end, '.')}\n{text}\n")
    return "\n".join(blocks)


def build_captions(
    words: list[Word], *, start: float, end: float, style_name: str, mask: bool = False
) -> tuple[str, str, str]:
    """Return (ass, srt, vtt) for the clip [start, end]."""
    style = PRESETS.get(style_name, PRESETS[DEFAULT_STYLE])
    lines = group_lines(clip_words(words, start, end), max_words=style.max_words, max_chars=style.max_chars)
    return build_ass(lines, style, mask=mask), build_srt(lines, mask=mask), build_vtt(lines, mask=mask)
