import { Check, CircleX, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Clip } from "@/lib/api/client";
import { currentRender } from "@/lib/api/downloads";
import { isActiveRender } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

export const PIPELINE_STAGES = [
  { state: "queued", label: "Queued" },
  { state: "ingesting", label: "Preparing video" },
  { state: "transcribing", label: "Transcribing" },
  { state: "analyzing", label: "Finding highlights" },
  { state: "reframing", label: "Preparing clips" },
] as const;

const JOB_LABEL: Record<string, string> = {
  ...Object.fromEntries(PIPELINE_STAGES.map((s) => [s.state, s.label])),
  // Jobs from before on-demand rendering rendered every clip in the pipeline.
  rendering: "Rendering clips",
  completed: "Completed",
  failed: "Failed",
  canceled: "Canceled",
};

const tone = {
  done: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  bad: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
  busy: "bg-primary/12 text-primary",
};

export function JobStateBadge({
  state,
  className,
}: {
  state: string;
  className?: string;
}) {
  const t =
    state === "completed"
      ? tone.done
      : state === "failed"
        ? tone.bad
        : state === "canceled"
          ? tone.muted
          : tone.busy;
  return (
    <Badge variant="secondary" className={cn("gap-1 border-0", t, className)}>
      {state === "completed" ? (
        <Check />
      ) : state === "failed" ? (
        <CircleX />
      ) : state === "canceled" ? null : (
        <Loader2 className="animate-spin" />
      )}
      {JOB_LABEL[state] ?? state}
    </Badge>
  );
}

/**
 * State of the clip's rendered file. Clips render on demand, so a clip that was never
 * rendered (or was edited since) shows no badge: downloading it renders it.
 */
export function ClipStatusBadge({
  clip,
  className,
}: {
  clip: Clip;
  className?: string;
}) {
  const [t, label] = isActiveRender(clip)
    ? [tone.busy, "Rendering"]
    : clip.status === "failed"
      ? [tone.bad, "Render failed"]
      : currentRender(clip)
        ? [tone.done, "Rendered"]
        : [null, null];
  if (!label) return null;
  return (
    <Badge variant="secondary" className={cn("gap-1 border-0", t, className)}>
      {isActiveRender(clip) && <Loader2 className="animate-spin" />}
      {label}
    </Badge>
  );
}

/** Horizontal pipeline progress: done, current and upcoming stages. */
export function StageStepper({
  state,
  failedStage,
}: {
  state: string;
  failedStage?: string | null;
}) {
  const terminal =
    state === "completed" || state === "failed" || state === "canceled";
  const stage = terminal ? failedStage : state;
  // Old jobs could fail while rendering, which is now part of preparing clips.
  const at = stage === "rendering" ? "reframing" : stage;
  const currentIndex =
    state === "completed"
      ? PIPELINE_STAGES.length
      : PIPELINE_STAGES.findIndex((s) => s.state === at);
  return (
    <ol className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-5">
      {PIPELINE_STAGES.map((s, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        const failed = current && state === "failed";
        return (
          <li key={s.state} className="space-y-2">
            <div
              className={cn(
                "h-1.5 rounded-full bg-muted",
                done && "bg-primary",
                current && !terminal && "animate-pulse bg-primary/60",
                failed && "bg-destructive",
              )}
            />
            <div
              className={cn(
                "text-xs text-muted-foreground",
                (done || current) && "text-foreground",
                failed && "text-destructive",
                current && "font-medium",
              )}
            >
              {s.label}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function jobStateLabel(state: string): string {
  return JOB_LABEL[state] ?? state;
}
