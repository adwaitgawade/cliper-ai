"use client";

import { useState } from "react";
import { videoToGif } from "../engine/edit";
import { FramePreview, formatTime, useVideoFrames } from "./frames";
import { JobStatus, useJob } from "./job";
import { Dropzone, ErrorNote, PrimaryButton, PrivacyNote, ProgressBar, RangeSlider, Segmented } from "./ui";

const MAX_SECONDS = 30;

export function GifWidget() {
  const [file, setFile] = useState<File | null>(null);
  const { frames, error, loading } = useVideoFrames(file);
  const [range, setRange] = useState<[number, number] | null>(null);
  const [previewT, setPreviewT] = useState(0);
  const [fps, setFps] = useState("15");
  const [width, setWidth] = useState("480");
  const job = useJob();

  // Default selection: the first 5 seconds.
  const sel: [number, number] | null = range ?? (frames ? [0, Math.min(5, frames.duration)] : null);
  const length = sel ? sel[1] - sel[0] : 0;
  const tooLong = length > MAX_SECONDS;

  return (
    <div className="space-y-5">
      <Dropzone
        accept="video/*,.mkv"
        hint="MP4, MOV, WebM or MKV"
        file={file}
        disabled={job.busy}
        onFile={(f) => {
          setFile(f);
          setRange(null);
          setPreviewT(0);
          job.reset();
        }}
      />
      {loading && <ProgressBar label="Opening video…" value={null} />}
      {error && <ErrorNote>{error}</ErrorNote>}

      {frames && sel && job.stage.kind !== "done" && (
        <>
          <FramePreview frames={frames} t={previewT} className="mx-auto max-h-80 w-full rounded-2xl object-contain" />
          <div className="space-y-3 rounded-2xl bg-cream p-4">
            <RangeSlider
              duration={frames.duration}
              range={sel}
              onChange={(r, moved) => {
                setRange(r);
                setPreviewT(moved);
              }}
            />
            <div className="flex flex-wrap justify-between gap-2 text-sm tabular-nums">
              <span>Start {formatTime(sel[0], true)}</span>
              <span className={`font-semibold ${tooLong ? "text-red-700" : ""}`}>
                {length.toFixed(1)}s selected{tooLong ? ` (max ${MAX_SECONDS}s)` : length > 15 ? " · long GIFs get big" : ""}
              </span>
              <span>End {formatTime(sel[1], true)}</span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Segmented
              label="Frame rate"
              value={fps}
              onChange={setFps}
              options={[
                { value: "10", label: "10 fps", hint: "Smallest" },
                { value: "15", label: "15 fps", hint: "Smooth" },
                { value: "20", label: "20 fps", hint: "Smoothest" },
              ]}
            />
            <Segmented
              label="Width"
              value={width}
              onChange={setWidth}
              options={[
                { value: "320", label: "320px" },
                { value: "480", label: "480px" },
                { value: "640", label: "640px" },
              ]}
            />
          </div>
        </>
      )}

      <JobStatus job={job} label="Encoding GIF frames…" preview="image" />
      {frames && sel && (job.stage.kind === "idle" || job.stage.kind === "error") && (
        <PrimaryButton
          disabled={tooLong || length < 0.2}
          onClick={() =>
            file &&
            job.run((p, s) => videoToGif(frames, file, { start: sel[0], end: sel[1], fps: Number(fps), width: Number(width) }, p, s))
          }
        >
          Create GIF
        </PrimaryButton>
      )}
      <PrivacyNote />
    </div>
  );
}
