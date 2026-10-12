"""9:16 crop paths (FR-RFM-7, FR-RFM-9).

M1 uses a static center crop. The artifact format already stores per-frame x offsets
and layout segments, so face-following paths (M2/M3) plug in without changes to
rendering or the API.
"""

import math
from typing import Literal

from pydantic import BaseModel

Layout = Literal["crop", "wide"]
OUTPUT_WIDTH, OUTPUT_HEIGHT = 1080, 1920


class LayoutSegment(BaseModel):
    start: float
    end: float
    layout: Layout


class CropPath(BaseModel):
    version: int = 1
    source_width: int
    source_height: int
    fps: float
    crop_width: int
    crop_height: int
    # One horizontal offset per output frame (the window moves horizontally only).
    x_offsets: list[int]
    segments: list[LayoutSegment]

    @property
    def is_static(self) -> bool:
        return len(set(self.x_offsets)) <= 1 and len({s.layout for s in self.segments}) <= 1


def _even(n: float) -> int:
    v = int(n)
    return v - (v % 2)


def center_crop_path(*, width: int, height: int, fps: float, duration: float, layout: str = "auto") -> CropPath:
    crop_w = min(_even(height * 9 / 16), _even(width))
    crop_h = _even(height)
    # Sources already as narrow as 9:16 (or a forced wide layout) are fitted, not cropped.
    chosen: Layout = "wide" if layout == "wide" or crop_w >= _even(width) else "crop"
    x = max(0, min((width - crop_w) // 2, width - crop_w))
    frames = max(1, math.ceil(duration * min(fps, 30.0)))
    return CropPath(
        source_width=width,
        source_height=height,
        fps=fps,
        crop_width=crop_w,
        crop_height=crop_h,
        x_offsets=[x] * frames,
        segments=[LayoutSegment(start=0.0, end=round(duration, 3), layout=chosen)],
    )
