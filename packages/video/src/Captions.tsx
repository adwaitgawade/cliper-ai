import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  activeWordIndex,
  clipWords,
  groupLines,
  lineAt,
  maskProfanity,
} from "./caption-lines";
import { ensureFont } from "./fonts";
import type { ClipProps } from "./schema";
import { CANVAS, resolveStyle, type FontKey } from "./style";

const POP_FRAMES = 4;

export const Captions: React.FC<{ props: ClipProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const { captions } = props;
  const style = useMemo(
    () => resolveStyle(captions.style, captions.overrides),
    [captions.style, captions.overrides],
  );
  ensureFont(style.font as FontKey);

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
  const line = lineAt(lines, t);
  if (!line) return null;
  const active = activeWordIndex(line, t);

  const display = (w: string) => {
    const text = captions.profanity_filter ? maskProfanity(w) : w;
    return style.uppercase ? text.toUpperCase() : text;
  };
  const stroke =
    style.outline_width > 0
      ? `${style.outline_width * 2}px ${style.outline_color}`
      : undefined;
  const shadow =
    style.shadow > 0
      ? `0 ${style.shadow}px ${style.shadow * 3}px rgba(0,0,0,0.65)`
      : undefined;

  return (
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
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                color: lit ? style.highlight_color : style.text_color,
                WebkitTextStroke: stroke,
                paintOrder: "stroke fill",
                textShadow: shadow,
                transform: scale !== 1 ? `scale(${scale})` : undefined,
              }}
            >
              {display(w.word)}
            </span>
          );
        })}
      </div>
    </div>
  );
};
