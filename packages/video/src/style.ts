import config from "./caption-config.json";
import type { CaptionOverrides, HighlightMode } from "./schema";

export type FontKey = keyof typeof config.fonts;
export type PresetName = keyof typeof config.presets;

export interface CaptionPreset {
  label: string;
  description: string;
  font: string;
  weight: number;
  size: number;
  text_color: string;
  highlight_color: string;
  outline_color: string;
  outline_width: number;
  shadow: number;
  box_color: string | null;
  uppercase: boolean;
  max_words: number;
  max_chars: number;
  position_y: number;
  highlight_mode: HighlightMode;
  highlight_scale: number;
  /** Add a matching emoji after one key word per line (see `emoji` in the config). */
  emoji: boolean;
  /** Draw a filled pill behind the spoken word. */
  word_box: boolean;
  word_box_color: string | null;
  /** Soft neon glow around the letters. */
  glow: boolean;
}

export interface ResolvedStyle extends CaptionPreset {
  name: string;
  fontFamily: string;
  /** Title card shown at the top for the first `hook_seconds`; null for none. */
  hook_text: string | null;
  hook_seconds: number;
}

export const CAPTION_CONFIG = config;
export const CANVAS = config.canvas;
export const LIMITS = config.limits;
export const HOOK = config.hook;
export const EMOJI = config.emoji as Record<string, string>;
export const DEFAULT_STYLE = config.default_style as PresetName;
export const PRESETS = config.presets as Record<PresetName, CaptionPreset>;
export const FONTS = config.fonts as Record<
  FontKey,
  { family: string; weights: number[] }
>;

export const PRESET_NAMES = Object.keys(PRESETS) as PresetName[];
export const FONT_KEYS = Object.keys(FONTS) as FontKey[];

const clamp = (v: number, [lo, hi]: number[]) =>
  Math.min(hi as number, Math.max(lo as number, v));

/** The weight of `font` closest to `wanted` (each font only ships a few weights). */
export function nearestWeight(font: FontKey, wanted: number): number {
  const weights = FONTS[font].weights;
  return weights.reduce(
    (best, w) => (Math.abs(w - wanted) < Math.abs(best - wanted) ? w : best),
    weights[0] as number,
  );
}

/** Preset merged with per-clip overrides, clamped to the shared limits. */
export function resolveStyle(
  name: string,
  overrides: CaptionOverrides = {},
): ResolvedStyle {
  const presetName = (name in PRESETS ? name : DEFAULT_STYLE) as PresetName;
  const { hook_text, hook_seconds, ...styleOverrides } = overrides;
  const merged: CaptionPreset = { ...PRESETS[presetName] };
  for (const [k, v] of Object.entries(styleOverrides)) {
    if (v !== undefined && v !== null)
      (merged as unknown as Record<string, unknown>)[k] = v;
  }
  const font = (
    merged.font in FONTS ? merged.font : PRESETS[presetName].font
  ) as FontKey;
  const hook = hookText(hook_text);
  return {
    ...merged,
    name: presetName,
    font,
    weight: nearestWeight(font, PRESETS[presetName].weight),
    fontFamily: FONTS[font].family,
    size: clamp(merged.size, LIMITS.size),
    outline_width: clamp(merged.outline_width, LIMITS.outline_width),
    position_y: clamp(merged.position_y, LIMITS.position_y),
    max_words: Math.round(clamp(merged.max_words, LIMITS.max_words)),
    hook_text: hook,
    hook_seconds: clamp(
      hook_seconds ?? HOOK.default_seconds,
      LIMITS.hook_seconds,
    ),
  };
}

/** Trimmed hook title within the length limit, or null when there is none. */
export function hookText(text: string | null | undefined): string | null {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, HOOK.max_chars) : null;
}
