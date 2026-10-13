"use client";

import { useState } from "react";
import { applyGain, measureLoudness, type Loudness } from "../engine/edit";
import { JobStatus, useJob } from "./job";
import { Dropzone, ErrorNote, PrimaryButton, PrivacyNote, ProgressBar, Segmented, Slider } from "./ui";

const TARGET_LUFS = -14;
// Very quiet recordings may need a lot of gain; the limiter keeps peaks safe, but cap it to avoid blowing up noise.
const MAX_NORMALIZE_DB = 30;

type Measure =
  | { kind: "idle" }
  | { kind: "measuring"; progress: number }
  | { kind: "done"; loudness: Loudness }
  | { kind: "error"; message: string };

export function VolumeWidget() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"boost" | "normalize">("boost");
  const [boostDb, setBoostDb] = useState(6);
  const [measure, setMeasure] = useState<Measure>({ kind: "idle" });
  const job = useJob();

  async function analyze(f: File) {
    setMeasure({ kind: "measuring", progress: 0 });
    try {
      const loudness = await measureLoudness(f, (p) => setMeasure({ kind: "measuring", progress: p }));
      setMeasure({ kind: "done", loudness });
    } catch (err) {
      setMeasure({ kind: "error", message: err instanceof Error ? err.message : "Couldn't measure the loudness." });
    }
  }

  const normalizeDb =
    measure.kind === "done" && Number.isFinite(measure.loudness.lufs)
      ? Math.max(-20, Math.min(MAX_NORMALIZE_DB, TARGET_LUFS - measure.loudness.lufs))
      : null;
  const capped = measure.kind === "done" && normalizeDb !== null && TARGET_LUFS - measure.loudness.lufs > MAX_NORMALIZE_DB;
  const gainDb = mode === "boost" ? boostDb : normalizeDb;
  const sign = (v: number) => (Math.abs(v) < 0.05 ? "+0.0 dB" : `${v > 0 ? "+" : ""}${v.toFixed(1)} dB`);

  return (
    <div className="space-y-5">
      <Dropzone
        accept="video/*,audio/*,.mkv,.m4a,.ogg"
        hint="MP4, MOV, WebM, MKV, MP3, WAV, M4A or OGG"
        file={file}
        disabled={job.busy}
        onFile={(f) => {
          setFile(f);
          setMeasure({ kind: "idle" });
          job.reset();
          if (mode === "normalize") analyze(f);
        }}
      />

      {job.stage.kind !== "done" && (
        <>
          <Segmented
            label="Mode"
            value={mode}
            onChange={(m) => {
              setMode(m);
              if (m === "normalize" && file && measure.kind === "idle") analyze(file);
            }}
            options={[
              { value: "boost", label: "Boost", hint: "Turn it up by a set amount" },
              { value: "normalize", label: "Normalize", hint: `Even out to ${TARGET_LUFS} LUFS` },
            ]}
          />
          {mode === "boost" && (
            <Slider label="Volume boost" value={boostDb} min={0} max={20} format={(v) => `+${v} dB`} onChange={setBoostDb} />
          )}
          {mode === "normalize" && measure.kind === "measuring" && <ProgressBar label="Measuring loudness…" value={measure.progress} />}
          {mode === "normalize" && measure.kind === "error" && <ErrorNote>{measure.message}</ErrorNote>}
          {mode === "normalize" && measure.kind === "done" && (
            <p className="rounded-2xl bg-cream p-4 text-sm">
              {Number.isFinite(measure.loudness.lufs) ? (
                <>
                  Current loudness <b className="tabular-nums">{measure.loudness.lufs.toFixed(1)} LUFS</b> (peak{" "}
                  {measure.loudness.peakDb.toFixed(1)} dB) → will apply <b className="tabular-nums">{sign(normalizeDb!)}</b>
                  {capped
                    ? ` (the maximum), bringing it to about ${(measure.loudness.lufs + normalizeDb!).toFixed(1)} LUFS.`
                    : ` to reach ${TARGET_LUFS} LUFS.`}
                </>
              ) : (
                "This file is silent, so there's nothing to normalize."
              )}
            </p>
          )}
          <p className="text-xs text-muted">A soft limiter keeps peaks under −1 dB, so boosted audio won’t clip. Video is copied untouched.</p>
        </>
      )}

      <JobStatus job={job} label="Processing audio…" />
      {(job.stage.kind === "idle" || job.stage.kind === "error") && (
        <PrimaryButton
          disabled={!file || gainDb === null || (mode === "boost" && boostDb === 0)}
          onClick={() => file && gainDb !== null && job.run((p, s) => applyGain(file, gainDb, p, s))}
        >
          {mode === "boost" ? "Boost volume" : "Normalize audio"}
        </PrimaryButton>
      )}
      <PrivacyNote />
    </div>
  );
}
