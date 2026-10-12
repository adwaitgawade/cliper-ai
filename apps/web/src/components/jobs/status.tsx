import { Check, CircleX, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const PIPELINE_STAGES = [
  { state: "queued", label: "Queued" },
  { state: "ingesting", label: "Preparing video" },
  { state: "transcribing", label: "Transcribing" },
  { state: "analyzing", label: "Finding highlights" },
  { state: "reframing", label: "Reframing" },
  { state: "rendering", label: "Rendering clips" },
] as const;

const JOB_LABEL: Record<string, string> = {
  ...Object.fromEntries(PIPELINE_STAGES.map((s) => [s.state, s.label])),
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

const CLIP_LABEL: Record<string, string> = {
  pending: "Queued",
  rendering: "Rendering",
  ready: "Ready",
  failed: "Render failed",
};

export function ClipStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const t =
    status === "ready" ? tone.done : status === "failed" ? tone.bad : tone.busy;
  return (
    <Badge variant="secondary" className={cn("gap-1 border-0", t, className)}>
      {(status === "pending" || status === "rendering") && (
        <Loader2 className="animate-spin" />
      )}
      {CLIP_LABEL[status] ?? status}
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
  const currentIndex =
    state === "completed"
      ? PIPELINE_STAGES.length
      : PIPELINE_STAGES.findIndex(
          (s) => s.state === (terminal ? failedStage : state),
        );
  return (
    <ol className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-6">
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
