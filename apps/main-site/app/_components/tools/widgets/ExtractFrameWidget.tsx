"use client";

import { useState } from "react";
import { canvasToBlob } from "../engine/edit";
import { objectUrl, releaseObjectUrl } from "../engine/media";
import { FramePreview, formatTime, useVideoFrames } from "./frames";
import { Dropzone, ErrorNote, PrimaryButton, PrivacyNote, ProgressBar, Segmented } from "./ui";

type Shot = { t: number; blob: Blob; name: string };

export function ExtractFrameWidget() {
  const [file, setFile] = useState<File | null>(null);
  const { frames, error, loading } = useVideoFrames(file);
  const [t, setT] = useState(0);
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const [shots, setShots] = useState<Shot[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState("");

  const step = frames ? 1 / frames.fps : 1 / 30;
  const base = file?.name.replace(/\.[^.]+$/, "") || "frame";

  async function capture() {
    if (!frames) return;
    setCapturing(true);
    setCaptureError("");
    try {
      const canvas = await frames.frame(t, 0); // original resolution
      const blob = await canvasToBlob(canvas, format === "png" ? "image/png" : "image/jpeg", 0.95);
      const stamp = formatTime(t, true).replace(/[:.]/g, "-");
      setShots((s) => [{ t, blob, name: `${base}-${stamp}.${format}` }, ...s]);
    } catch (err) {
      setCaptureError(err instanceof Error ? err.message : "Couldn't capture this frame.");
    } finally {
      setCapturing(false);
    }
  }

  return (
    <div className="space-y-5">
      <Dropzone
        accept="video/*,.mkv"
        hint="MP4, MOV, WebM or MKV"
        file={file}
        onFile={(f) => {
          shots.forEach((s) => releaseObjectUrl(s.blob));
          setShots([]);
          setT(0);
          setFile(f);
        }}
      />
      {loading && <ProgressBar label="Opening video…" value={null} />}
      {error && <ErrorNote>{error}</ErrorNote>}

      {frames && (
        <div className="space-y-4">
          <FramePreview frames={frames} t={t} className="mx-auto max-h-96 w-full rounded-2xl object-contain" />
          <div className="space-y-3 rounded-2xl bg-cream p-4">
            <input
              type="range"
              min={0}
              max={frames.duration}
              step={step}
              value={t}
              aria-label="Frame position"
              onChange={(e) => setT(Number(e.target.value))}
              className="w-full accent-[var(--color-ink)]"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex gap-2">
                <button type="button" onClick={() => setT((v) => Math.max(0, v - step))} className="rounded-lg border border-ink/15 px-3 py-1.5 font-medium hover:border-ink/40">
                  ‹ Prev frame
                </button>
                <button type="button" onClick={() => setT((v) => Math.min(frames.duration, v + step))} className="rounded-lg border border-ink/15 px-3 py-1.5 font-medium hover:border-ink/40">
                  Next frame ›
                </button>
              </div>
              <span className="font-mono tabular-nums">
                {formatTime(t, true)} / {formatTime(frames.duration)}
              </span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Segmented
              label="Image format"
              value={format}
              onChange={setFormat}
              options={[
                { value: "png", label: "PNG", hint: "Lossless" },
                { value: "jpg", label: "JPG", hint: "Smaller file" },
              ]}
            />
            <span className="text-sm text-muted sm:pb-3">
              Full resolution: {frames.width} × {frames.height}
            </span>
          </div>
          <PrimaryButton onClick={capture} disabled={capturing}>
            {capturing ? "Capturing…" : "Capture frame"}
          </PrimaryButton>
          {captureError && <ErrorNote>{captureError}</ErrorNote>}
        </div>
      )}

      {shots.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {shots.map((s) => (
            <figure key={s.name} className="overflow-hidden rounded-xl border border-ink/10 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={objectUrl(s.blob)} alt={`Frame at ${formatTime(s.t, true)}`} className="aspect-video w-full bg-black object-contain" />
              <figcaption className="flex items-center justify-between gap-2 p-2 text-xs">
                <span className="font-mono tabular-nums">{formatTime(s.t, true)}</span>
                <a href={objectUrl(s.blob)} download={s.name} className="rounded-md bg-ink px-2.5 py-1 font-semibold text-cream hover:bg-black">
                  Download
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <PrivacyNote />
    </div>
  );
}
