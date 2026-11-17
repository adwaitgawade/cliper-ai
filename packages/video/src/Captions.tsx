import { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  activeWordIndex,
  clipWords,
  groupLines,
  lineAt,
  lineEmoji,
  maskProfanity,
} from "./caption-lines";
import { EMOJI_FONT_FAMILY, ensureEmojiFont, ensureFont } from "./fonts";
import type { ClipProps } from "./schema";
import {
  CANVAS,
  HOOK,
  nearestWeight,
  resolveStyle,
  type FontKey,
  type ResolvedStyle,
} from "./style";

const POP_FRAMES = 4;
const HOOK_FADE_FRAMES = 6;

/** Title card at the top of the clip for its first seconds. */
const HookTitle: React.FC<{ style: ResolvedStyle; t: number; fps: number }> = ({
  style,
  t,
  fps,
}) => {
  if (!style.hook_text || t >= style.hook_seconds) return null;
  const frame = t * fps;
  const last = style.hook_seconds * fps;
  const opacity = interpolate(
    frame,
    [0, HOOK_FADE_FRAMES, last - HOOK_FADE_FRAMES, last],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <div
      style={{
        position: "absolute",
        left: CANVAS.side_margin,
        right: CANVAS.side_margin,
        top: HOOK.position_y * CANVAS.height,
        transform: `translateY(-50%) scale(${0.96 + 0.04 * opacity})`,
        display: "flex",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: `'${style.fontFamily}'`,
          fontWeight: nearestWeight(style.font as FontKey, HOOK.weight),
          fontSize: HOOK.size,
          lineHeight: 1.15,
          textAlign: "center",
          color: HOOK.text_color,
          backgroundColor: HOOK.box_color,
          padding: "0.28em 0.6em",
          borderRadius: "0.35em",
          boxShadow: "0 0.15em 0.6em rgba(0,0,0,0.35)",
        }}
      >
        {style.hook_text}
      </div>
    </div>
  );
};

export const Captions: React.FC<{ props: ClipProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const { captions } = props;
  const style = useMemo(
    () => resolveStyle(captions.style, captions.overrides),
    [captions.style, captions.overrides],
  );
  ensureFont(style.font as FontKey);
  if (style.emoji) ensureEmojiFont();

  const lines = useMemo(
    () =>
      groupLines(clipWords(props.words, props.start, props.end), {
        maxWords: style.max_words,
        maxChars: style.max_chars,
      }),
    [props.words, props.start, props.end, style.max_words, style.max_chars],
  );

  if (!captions.enabled) return null;
  const t = frame / fps;
  const hook = <HookTitle style={style} t={t} fps={fps} />;
  const line = lineAt(lines, t);
  if (!line) return hook;
  const active = activeWordIndex(line, t);
  const emoji = style.emoji ? lineEmoji(line.words) : null;

  const display = (w: string) => {
    const text = captions.profanity_filter ? maskProfanity(w) : w;
    return style.uppercase ? text.toUpperCase() : text;
  };
  const stroke =
    style.outline_width > 0
      ? `${style.outline_width * 2}px ${style.outline_color}`
      : undefined;
  const dropShadow =
    style.shadow > 0
      ? `0 ${style.shadow}px ${style.shadow * 3}px rgba(0,0,0,0.65)`
      : null;
  const shadowFor = (lit: boolean) => {
    const parts = dropShadow ? [dropShadow] : [];
    if (style.glow) {
      const c = lit ? style.highlight_color : style.text_color;
      parts.push(`0 0 0.12em ${c}`, `0 0 0.35em ${c}`);
      if (lit) parts.push(`0 0 0.8em ${c}`);
    }
    return parts.length ? parts.join(", ") : undefined;
  };
  const pill =
    style.word_box && style.highlight_mode !== "none"
      ? (style.word_box_color ?? style.highlight_color)
      : null;
  // A pill without its own color takes the highlight color, so the word on it keeps
  // the text color to stay readable (same rule as the ASS export).
  const litColor =
    pill !== null && !style.word_box_color
      ? style.text_color
      : style.highlight_color;

  return (
    <>
      {hook}
      <div
        style={{
          position: "absolute",
          left: CANVAS.side_margin,
          right: CANVAS.side_margin,
          top: style.position_y * CANVAS.height,
          transform: "translateY(-50%)",
          display: "flex",
          justifyContent: "center",
          width: width - CANVAS.side_margin * 2,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            columnGap: "0.28em",
            rowGap: "0.05em",
            fontFamily: `'${style.fontFamily}'`,
            fontWeight: style.weight,
            fontSize: style.size,
            lineHeight: 1.15,
            textAlign: "center",
            color: style.text_color,
            backgroundColor: style.box_color ?? undefined,
            padding: style.box_color ? "0.16em 0.42em" : 0,
            borderRadius: style.box_color ? "0.22em" : 0,
          }}
        >
          {line.words.map((w, i) => {
            const isActive = i === active;
            const lit =
              style.highlight_mode === "karaoke"
                ? i <= active
                : style.highlight_mode === "word" && isActive;
            const segStart = i === 0 ? line.start : w.start;
            const pop = isActive
              ? Math.min(1, Math.max(0, ((t - segStart) * fps) / POP_FRAMES))
              : 0;
            const scale =
              isActive && style.highlight_mode !== "none"
                ? 1 + (style.highlight_scale - 1) * pop
                : 1;
            const boxed = pill !== null && isActive;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  color: lit ? litColor : style.text_color,
                  WebkitTextStroke: stroke,
                  paintOrder: "stroke fill",
                  textShadow: shadowFor(lit),
                  transform: scale !== 1 ? `scale(${scale})` : undefined,
                  backgroundColor: boxed ? pill : undefined,
                  // The pill grows with the pop, so it lands with the word.
                  padding: boxed ? "0.02em 0.2em" : undefined,
                  margin: boxed ? "0 -0.2em" : undefined,
                  borderRadius: boxed ? "0.24em" : undefined,
                  opacity: boxed ? 0.6 + 0.4 * pop : undefined,
                }}
              >
                {display(w.word)}
                {emoji?.index === i && (
                  <span
                    style={{
                      fontFamily: `'${EMOJI_FONT_FAMILY}'`,
                      WebkitTextStroke: "0",
                      textShadow: "none",
                      marginLeft: "0.2em",
                    }}
                  >
                    {emoji.emoji}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
};
