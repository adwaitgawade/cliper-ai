"use client";

import { useState } from "react";
import { rotateVideo, type Rotation } from "../engine/edit";
import { FramePreview, useVideoFrames } from "./frames";
import { JobStatus, useJob } from "./job";
import { Dropzone, ErrorNote, PrimaryButton, PrivacyNote, ProgressBar } from "./ui";

const BOX_W = 560;
const BOX_H = 320;

export function RotateWidget() {
  const [file, setFile] = useState<File | null>(null);
  const { frames, error, loading } = useVideoFrames(file);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [flip, setFlip] = useState(false);
  const job = useJob();

  const turn = (by: 90 | -90) => setRotation((r) => (((r + by + 360) % 360) as Rotation));
  const changed = rotation !== 0 || flip;

  // Size the (pre-rotation) canvas so the rotated result fits the preview box.
  let display = { width: 0, height: 0 };
  if (frames) {
    const sideways = rotation % 180 !== 0;
    const rw = sideways ? frames.height : frames.width;
    const rh = sideways ? frames.width : frames.height;
    const scale = Math.min(BOX_W / rw, BOX_H / rh);
    display = { width: frames.width * scale, height: frames.height * scale };
  }

  return (
    <div className="space-y-5">
      <Dropzone
        accept="video/*,.mkv"
        hint="MP4, MOV, WebM or MKV"
        file={file}
        disabled={job.busy}
        onFile={(f) => {
          setFile(f);
          setRotation(0);
          setFlip(false);
          job.reset();
        }}
      />
      {loading && <ProgressBar label="Opening video…" value={null} />}
      {error && <ErrorNote>{error}</ErrorNote>}

      {frames && job.stage.kind !== "done" && (
        <>
          <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-ink" style={{ height: BOX_H + 32 }}>
            <FramePreview
              frames={frames}
              t={frames.duration * 0.1}
              width={720}
              className="rounded-md transition-transform duration-300"
              style={{ ...display, transform: `rotate(${rotation}deg) scaleX(${flip ? -1 : 1})` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "↺ Rotate left", onClick: () => turn(-90), active: false },
              { label: "↻ Rotate right", onClick: () => turn(90), active: false },
              { label: "⇋ Mirror", onClick: () => setFlip((f) => !f), active: flip },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={b.onClick}
                disabled={job.busy}
                aria-pressed={b.label.includes("Mirror") ? flip : undefined}
                className={`h-11 rounded-xl border text-sm font-semibold transition-colors ${
                  b.active ? "border-ink bg-ink text-cream" : "border-ink/15 hover:border-ink/40"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-muted">
            {!changed
              ? "Rotate or mirror the preview, then save."
              : flip
                ? `Rotation ${rotation}° + mirrored. Mirroring re-encodes the video, so it takes a little longer.`
                : `Rotation ${rotation}°. Saved as an orientation flag: instant and lossless.`}
          </p>
        </>
      )}

      <JobStatus job={job} label="Saving rotated video…" preview="video" />
      {frames && (job.stage.kind === "idle" || job.stage.kind === "error") && (
        <PrimaryButton disabled={!changed} onClick={() => file && job.run((p, s) => rotateVideo(file, rotation, flip, p, s))}>
          Save rotated video
        </PrimaryButton>
      )}
      <PrivacyNote />
    </div>
  );
}
