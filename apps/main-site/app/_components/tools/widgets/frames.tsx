"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { VideoFrames } from "../engine/edit";

type FramesState = { file: File; frames: VideoFrames | null; error: string | null };

/** Opens `file` for frame access. Previews decode with Mediabunny, so they work even for formats <video> can't play. */
export function useVideoFrames(file: File | null) {
  const [state, setState] = useState<FramesState | null>(null);

  useEffect(() => {
    if (!file) return;
    let alive = true;
    VideoFrames.open(file).then(
      (frames) => alive && setState({ file, frames, error: null }),
      (err: unknown) => alive && setState({ file, frames: null, error: err instanceof Error ? err.message : "Couldn't open this video." }),
    );
    return () => {
      alive = false;
    };
  }, [file]);

  // Ignore results that belong to a previously selected file.
  const current = state && state.file === file ? state : null;
  return { frames: current?.frames ?? null, error: current?.error ?? null, loading: Boolean(file) && !current };
}

/**
 * Draws the frame at `t` into a canvas. Only the latest request is painted, so fast scrubbing never shows stale frames.
 * `overlay` draws on top (e.g. text), in the canvas's own pixel space.
 */
export function FramePreview({
  frames,
  t,
  width = 960,
  overlay,
  className = "",
  style,
}: {
  frames: VideoFrames;
  t: number;
  width?: number;
  overlay?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const request = useRef(0);
  const w = Math.min(width, frames.width);
  const h = Math.round((w * frames.height) / frames.width);

  useEffect(() => {
    const id = ++request.current;
    frames
      .frame(t, w)
      .then((source) => {
        const el = canvas.current;
        if (!el || id !== request.current) return;
        const ctx = el.getContext("2d")!;
        ctx.clearRect(0, 0, el.width, el.height);
        ctx.drawImage(source, 0, 0, el.width, el.height);
        overlay?.(ctx, el.width, el.height);
      })
      .catch(() => {});
  }, [frames, t, w, overlay]);

  return <canvas ref={canvas} width={w} height={h} className={`block bg-black ${className}`} style={style} />;
}

export function formatTime(t: number, withMs = false) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${String(m).padStart(2, "0")}:${withMs ? s.toFixed(3).padStart(6, "0") : String(Math.floor(s)).padStart(2, "0")}`;
}
