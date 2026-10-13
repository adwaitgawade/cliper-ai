"use client";

import { useRef, useState } from "react";
import type { MediaResult, OnProgress } from "../engine/media";
import { ErrorNote, ProgressBar, ResultCard } from "./ui";

export type JobStage =
  | { kind: "idle" }
  | { kind: "working"; progress: number | null; label?: string }
  | { kind: "done"; result: MediaResult }
  | { kind: "error"; message: string };

/** Runs one cancellable processing job and tracks its progress/result. */
export function useJob() {
  const [stage, setStage] = useState<JobStage>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  async function run(job: (onProgress: OnProgress, signal: AbortSignal) => Promise<MediaResult>) {
    const abort = new AbortController();
    abortRef.current = abort;
    setStage({ kind: "working", progress: 0 });
    try {
      const result = await job((p) => setStage((s) => ({ kind: "working", progress: p, label: s.kind === "working" ? s.label : undefined })), abort.signal);
      setStage({ kind: "done", result });
    } catch (err) {
      if (abort.signal.aborted) return setStage({ kind: "idle" });
      setStage({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong." });
    }
  }

  return {
    stage,
    busy: stage.kind === "working",
    run,
    cancel: () => abortRef.current?.abort(),
    reset: () => setStage({ kind: "idle" }),
  };
}

export function JobStatus({
  job,
  label,
  preview,
  original,
}: {
  job: ReturnType<typeof useJob>;
  label: string;
  preview?: "video" | "audio" | "image";
  original?: number;
}) {
  const { stage } = job;
  if (stage.kind === "working")
    return (
      <div className="space-y-2">
        <ProgressBar label={stage.label ?? label} value={stage.progress} />
        <button type="button" onClick={job.cancel} className="text-sm font-semibold text-muted hover:text-ink">
          Cancel
        </button>
      </div>
    );
  if (stage.kind === "error") return <ErrorNote>{stage.message}</ErrorNote>;
  if (stage.kind === "done")
    return (
      <ResultCard
        blob={stage.result.blob}
        filename={stage.result.filename}
        original={original}
        preview={preview ?? (stage.result.blob.type.startsWith("audio") ? "audio" : stage.result.blob.type.startsWith("image") ? "image" : "video")}
        onReset={job.reset}
      />
    );
  return null;
}
