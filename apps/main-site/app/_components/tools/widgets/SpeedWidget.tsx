"use client";

import { useState } from "react";
import { changeSpeed } from "../engine/sequence";
import { JobStatus, useJob } from "./job";
import { Dropzone, PrimaryButton, PrivacyNote, Segmented } from "./ui";

const SPEEDS = [0.25, 0.5, 0.75, 1.25, 1.5, 2, 3, 4];

export function SpeedWidget() {
  const [file, setFile] = useState<File | null>(null);
  const [speed, setSpeed] = useState(2);
  const [audio, setAudio] = useState<"keep" | "mute">("keep");
  const job = useJob();

  return (
    <div className="space-y-5">
      <Dropzone
        accept="video/*,.mkv"
        hint="MP4, MOV, WebM or MKV"
        file={file}
        disabled={job.busy}
        onFile={(f) => {
          setFile(f);
          job.reset();
        }}
      />
      {job.stage.kind !== "done" && (
        <>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Speed</legend>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={speed === s}
                  onClick={() => setSpeed(s)}
                  className={`h-11 rounded-xl border text-sm font-semibold tabular-nums ${
                    speed === s ? "border-ink bg-ink text-cream" : "border-ink/15 hover:border-ink/40"
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              {speed < 1 ? "Slow motion: each frame is held longer. Start from 60 fps footage for the smoothest result." : "Speed-up: output is capped at 60 fps."}
            </p>
          </fieldset>
          <Segmented
            label="Audio"
            value={audio}
            onChange={setAudio}
            options={[
              { value: "keep", label: "Keep, natural pitch", hint: "Time-stretched, no chipmunk effect" },
              { value: "mute", label: "Remove audio", hint: "Silent video" },
            ]}
          />
        </>
      )}
      <JobStatus job={job} label={`Changing speed to ${speed}×…`} preview="video" />
      {(job.stage.kind === "idle" || job.stage.kind === "error") && (
        <PrimaryButton disabled={!file} onClick={() => file && job.run((p, s) => changeSpeed(file, speed, audio === "keep", p, s))}>
          Change speed to {speed}×
        </PrimaryButton>
      )}
      <PrivacyNote />
    </div>
  );
}
