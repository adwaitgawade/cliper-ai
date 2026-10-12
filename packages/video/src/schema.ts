/**
 * Input props for the Clip composition. The API (GET /v1/clips/{id}/composition) and
 * the render task build exactly this JSON, so the Player preview and the server render
 * draw from identical data. Keys are snake_case to match the API.
 */
import { z } from "zod";

export const layoutSchema = z.enum(["crop", "wide"]);
export const highlightModeSchema = z.enum(["word", "karaoke", "none"]);

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/);

export const captionOverridesSchema = z
  .object({
    font: z.string(),
    size: z.number(),
    text_color: hexColor,
    highlight_color: hexColor,
    outline_color: hexColor,
    outline_width: z.number(),
    box_color: hexColor.nullable(),
    uppercase: z.boolean(),
    max_words: z.number().int(),
    position_y: z.number(),
    highlight_mode: highlightModeSchema,
  })
  .partial();

export const clipPropsSchema = z.object({
  version: z.literal(1),
  /** Source video URL (a signed URL in production). */
  src: z.string(),
  source: z.object({ width: z.number(), height: z.number(), fps: z.number() }),
  /** Clip range in source seconds. */
  start: z.number(),
  end: z.number(),
  /** Output frame rate (source rate capped at 30). */
  fps: z.number().positive(),
  crop: z.object({
    crop_width: z.number(),
    crop_height: z.number(),
    /** One horizontal offset (source pixels) per output frame from the clip start. */
    x_offsets: z.array(z.number()),
    /** Clip-relative seconds. */
    segments: z.array(
      z.object({ start: z.number(), end: z.number(), layout: layoutSchema }),
    ),
  }),
  /** Words in source seconds; only those inside [start, end] are shown. */
  words: z.array(
    z.object({
      word: z.string(),
      start: z.number(),
      end: z.number(),
      speaker: z.string().optional(),
    }),
  ),
  captions: z.object({
    enabled: z.boolean(),
    style: z.string(),
    overrides: captionOverridesSchema,
    profanity_filter: z.boolean(),
  }),
});

export type Layout = z.infer<typeof layoutSchema>;
export type HighlightMode = z.infer<typeof highlightModeSchema>;
export type CaptionOverrides = z.infer<typeof captionOverridesSchema>;
export type ClipProps = z.infer<typeof clipPropsSchema>;
export type CaptionWord = ClipProps["words"][number];
export type CropSpec = ClipProps["crop"];

export const COMPOSITION_ID = "Clip";

/** Frames the composition lasts. Python's crop path uses the same rounding. */
export function clipDurationInFrames(
  props: Pick<ClipProps, "start" | "end" | "fps">,
): number {
  return Math.max(1, Math.ceil((props.end - props.start) * props.fps - 1e-6));
}
