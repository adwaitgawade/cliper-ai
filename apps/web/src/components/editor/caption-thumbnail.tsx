"use client";

import {
  CAPTION_PREVIEW_FPS,
  CAPTION_PREVIEW_STILL_FRAME,
  CaptionPreview,
  CANVAS,
  captionPreviewDurationInFrames,
  type CaptionOverrides,
} from "@repo/video";
import { Thumbnail } from "@remotion/player";
import { useMemo } from "react";

const EMPTY: CaptionOverrides = {};

/** A still of a caption style, drawn by the same component the renderer uses. */
export function CaptionThumbnail({
  style,
  overrides = EMPTY,
  text = "Make every second count",
  className,
}: {
  style: string;
  overrides?: CaptionOverrides;
  text?: string;
  className?: string;
}) {
  const inputProps = useMemo(
    () => ({ style, overrides, text }),
    [style, overrides, text],
  );
  return (
    <Thumbnail
      component={CaptionPreview}
      inputProps={inputProps}
      compositionWidth={CANVAS.width}
      compositionHeight={CANVAS.height}
      durationInFrames={captionPreviewDurationInFrames(text)}
      fps={CAPTION_PREVIEW_FPS}
      frameToDisplay={CAPTION_PREVIEW_STILL_FRAME}
      className={className}
      style={{ width: "100%", aspectRatio: "9 / 16", display: "block" }}
    />
  );
}
