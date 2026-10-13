"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { cropVideo, detectBlackBars, evenCrop, type Rect } from "../engine/edit";
import { FramePreview, useVideoFrames } from "./frames";
import { JobStatus, useJob } from "./job";
import { Dropzone, ErrorNote, PrimaryButton, PrivacyNote, ProgressBar } from "./ui";

const PRESETS = [
  { label: "Free", ratio: 0 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "1:1", ratio: 1 },
  { label: "4:5", ratio: 4 / 5 },
  { label: "16:9", ratio: 16 / 9 },
];
const MIN = 32;

type Drag = { mode: "move" | "nw" | "ne" | "sw" | "se"; x: number; y: number; rect: Rect };

/** Largest centered rect with the given aspect ratio. */
function fitRatio(w: number, h: number, ratio: number): Rect {
  if (!ratio) return { left: 0, top: 0, width: w, height: h };
  const width = Math.min(w, h * ratio);
  const height = width / ratio;
  return { left: (w - width) / 2, top: (h - height) / 2, width, height };
}

export function CropWidget() {
  const [file, setFile] = useState<File | null>(null);
  const { frames, error, loading } = useVideoFrames(file);
  const [rect, setRect] = useState<Rect | null>(null);
  const [ratio, setRatio] = useState(0);
  const [detecting, setDetecting] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const job = useJob();

  // The crop starts as the full frame once the video is open.
  const crop = rect ?? (frames ? { left: 0, top: 0, width: frames.width, height: frames.height } : null);

  // One handler for the box and its corner handles; `data-mode` says which was grabbed.
  const onDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (!crop) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const mode = (e.currentTarget.dataset.mode ?? "move") as Drag["mode"];
    drag.current = { mode, x: e.clientX, y: e.clientY, rect: crop };
  };

  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || !frames || !box.current) return;
    const scale = frames.width / box.current.clientWidth;
    const dx = (e.clientX - d.x) * scale;
    const dy = (e.clientY - d.y) * scale;
    const W = frames.width;
    const H = frames.height;
    let { left, top, width, height } = d.rect;

    if (d.mode === "move") {
      left = Math.min(Math.max(0, left + dx), W - width);
      top = Math.min(Math.max(0, top + dy), H - height);
    } else {
      const east = d.mode.includes("e");
      const south = d.mode.includes("s");
      const right = left + width;
      const bottom = top + height;
      let nw = Math.max(MIN, east ? width + dx : width - dx);
      let nh = Math.max(MIN, south ? height + dy : height - dy);
      if (ratio) {
        // Lock aspect: follow the dominant drag direction.
        if (Math.abs(dx) > Math.abs(dy)) nh = nw / ratio;
        else nw = nh * ratio;
      }
      // Clamp against the frame edges on the dragged sides.
      const maxW = east ? W - left : right;
      const maxH = south ? H - top : bottom;
      if (nw > maxW) {
        nw = maxW;
        if (ratio) nh = nw / ratio;
      }
      if (nh > maxH) {
        nh = maxH;
        if (ratio) nw = nh * ratio;
      }
      width = nw;
      height = nh;
      left = east ? left : right - nw;
      top = south ? top : bottom - nh;
    }
    setRect({ left, top, width, height });
  };

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const exported = crop ? evenCrop(crop) : null;
  const out = exported ? { w: exported.width, h: exported.height } : null;

  return (
    <div className="space-y-5">
      <Dropzone
        accept="video/*,.mkv"
        hint="MP4, MOV, WebM or MKV"
        file={file}
        disabled={job.busy}
        onFile={(f) => {
          setFile(f);
          setRect(null);
          setRatio(0);
          job.reset();
        }}
      />
      {loading && <ProgressBar label="Opening video…" value={null} />}
      {error && <ErrorNote>{error}</ErrorNote>}

      {frames && crop && job.stage.kind !== "done" && (
        <>
          <div
            ref={box}
            className="relative touch-none overflow-hidden rounded-2xl select-none"
            onPointerMove={onMove}
            onPointerUp={() => (drag.current = null)}
          >
            <FramePreview frames={frames} t={frames.duration * 0.1} className="w-full" />
            <div
              className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(13,10,26,0.6)]"
              style={{
                left: pct(crop.left, frames.width),
                top: pct(crop.top, frames.height),
                width: pct(crop.width, frames.width),
                height: pct(crop.height, frames.height),
              }}
              data-mode="move"
              onPointerDown={onDown}
            >
              {/* rule-of-thirds guides */}
              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }, (_, i) => (
                  <span key={i} className="border border-white/20" />
                ))}
              </div>
              {(["nw", "ne", "sw", "se"] as const).map((c) => (
                <span
                  key={c}
                  data-mode={c}
                  onPointerDown={onDown}
                  aria-hidden
                  className={`absolute size-4 rounded-full border-2 border-white bg-ink ${c[0] === "n" ? "top-1" : "bottom-1"} ${
                    c[1] === "w" ? "left-1" : "right-1"
                  } ${c === "nw" || c === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize"}`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setRatio(p.ratio);
                  setRect(fitRatio(frames.width, frames.height, p.ratio));
                }}
                className={`h-10 rounded-xl border px-4 text-sm font-semibold ${
                  ratio === p.ratio ? "border-ink bg-ink text-cream" : "border-ink/15 hover:border-ink/40"
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              disabled={detecting}
              onClick={async () => {
                setDetecting(true);
                try {
                  setRatio(0);
                  setRect(await detectBlackBars(frames));
                } finally {
                  setDetecting(false);
                }
              }}
              className="h-10 rounded-xl border border-accent/40 bg-accent-soft/40 px-4 text-sm font-semibold hover:border-accent"
            >
              {detecting ? "Detecting…" : "Remove black bars"}
            </button>
            {out && (
              <span className="ml-auto text-sm tabular-nums text-muted">
                Output: {out.w} × {out.h}px
              </span>
            )}
          </div>
        </>
      )}

      <JobStatus job={job} label="Cropping…" preview="video" />
      {frames && crop && (job.stage.kind === "idle" || job.stage.kind === "error") && (
        <PrimaryButton
          disabled={crop.width >= frames.width - 1 && crop.height >= frames.height - 1}
          onClick={() => file && job.run((p, s) => cropVideo(file, crop, p, s))}
        >
          Crop & export MP4
        </PrimaryButton>
      )}
      <PrivacyNote />
    </div>
  );
}
