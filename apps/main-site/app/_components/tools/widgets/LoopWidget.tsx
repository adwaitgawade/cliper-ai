"use client";

import { useState } from "react";
import { mediaDuration } from "../engine/media";
import { BOOMERANG_MAX_SECONDS, boomerang, repeatVideo } from "../engine/sequence";
import { formatTime } from "./frames";
import { JobStatus, useJob } from "./job";
import { Dropzone, PrimaryButton, PrivacyNote, Segmented, Slider } from "./ui";

export function LoopWidget() {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [mode, setMode] = useState<"repeat" | "boomerang">("repeat");
  const [times, setTimes] = useState(3);
  const job = useJob();

  const tooLong = mode === "boomerang" && duration !== null && duration > BOOMERANG_MAX_SECONDS + 0.05;

  return (
    <div className="space-y-5">
      <Dropzone
        accept="video/*,.mkv"
        hint="MP4, MOV, WebM or MKV"
        file={file}
        disabled={job.busy}
        onFile={(f) => {
          setFile(f);
          setDuration(null);
          job.reset();
          mediaDuration(f).then(setDuration, () => setDuration(null));
        }}
      />
      {job.stage.kind !== "done" && (
        <>
          <Segmented
            label="Loop style"
            value={mode}
            onChange={setMode}
            options={[
              { value: "repeat", label: "Repeat", hint: "Lossless, keeps audio" },
              { value: "boomerang", label: "Boomerang", hint: `Forward + back, ≤${BOOMERANG_MAX_SECONDS}s` },
            ]}
          />
          {mode === "repeat" && (
            <Slider label="Play it" value={times} min={2} max={10} format={(v) => `${v} times`} onChange={setTimes} />
          )}
          {duration !== null && (
            <p className={`text-sm ${tooLong ? "text-red-700" : "text-muted"}`}>
              {mode === "repeat"
                ? `Result: ${formatTime(duration * times)} (${formatTime(duration)} × ${times}). Copied without re-encoding, so quality is untouched.`
                : tooLong
                  ? `This clip is ${formatTime(duration)}. Boomerang works on clips up to ${BOOMERANG_MAX_SECONDS} seconds, so trim it first.`
                  : `Result: ${formatTime(duration * 2)}, silent, up to 720p.`}
            </p>
          )}
        </>
      )}
      <JobStatus job={job} label={mode === "repeat" ? "Building your loop…" : "Making a boomerang…"} preview="video" />
      {(job.stage.kind === "idle" || job.stage.kind === "error") && (
        <PrimaryButton
          disabled={!file || tooLong}
          onClick={() => file && job.run((p, s) => (mode === "repeat" ? repeatVideo(file, times, p, s) : boomerang(file, p, s)))}
        >
          {mode === "repeat" ? `Loop ${times}×` : "Make boomerang"}
        </PrimaryButton>
      )}
      <PrivacyNote />
    </div>
  );
}
