import { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { Captions } from "./Captions";
import type { CaptionOverrides, ClipProps } from "./schema";
import { CANVAS } from "./style";

export type CaptionPreviewProps = {
  style: string;
  overrides: CaptionOverrides;
  text: string;
};

export const CAPTION_PREVIEW_FPS = 30;
const WORD_SECONDS = 0.32;

export function captionPreviewDurationInFrames(text: string): number {
  return Math.ceil(
    (0.4 + text.split(/\s+/).length * WORD_SECONDS) * CAPTION_PREVIEW_FPS,
  );
}

/** A frame where the second word is being spoken, for still thumbnails. */
export const CAPTION_PREVIEW_STILL_FRAME = Math.round(
  (0.2 + WORD_SECONDS * 1.5) * CAPTION_PREVIEW_FPS,
);

/**
 * Captions over a plain backdrop, drawn by the same <Captions> the clip renderer uses.
 * Powers the style picker thumbnails.
 */
export const CaptionPreview: React.FC<CaptionPreviewProps> = ({
  style,
  overrides,
  text,
}) => {
  const props = useMemo<ClipProps>(() => {
    const words = text
      .split(/\s+/)
      .filter(Boolean)
      .map((word, i) => ({
        word,
        start: 0.2 + i * WORD_SECONDS,
        end: 0.2 + (i + 0.85) * WORD_SECONDS,
      }));
    const end = 0.4 + words.length * WORD_SECONDS;
    return {
      version: 1,
      src: "",
      source: {
        width: CANVAS.width,
        height: CANVAS.height,
        fps: CAPTION_PREVIEW_FPS,
      },
      start: 0,
      end,
      fps: CAPTION_PREVIEW_FPS,
      crop: {
        crop_width: CANVAS.width,
        crop_height: CANVAS.height,
        x_offsets: [0],
        segments: [],
      },
      words,
      captions: { enabled: true, style, overrides, profanity_filter: false },
    };
  }, [style, overrides, text]);

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(80% 60% at 30% 25%, #4c3a8f 0%, transparent 70%), radial-gradient(70% 50% at 80% 80%, #1f5f57 0%, transparent 70%), #16141f",
      }}
    >
      <Captions props={props} />
    </AbsoluteFill>
  );
};
