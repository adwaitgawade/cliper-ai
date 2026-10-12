"use client";

import type { ClipProps } from "@repo/video";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { formatTimecode } from "@/lib/format";

const WINDOW_SECONDS = 30;
const MIN_CLIP = 1;
const MAX_CLIP = 180;

function Nudge({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onChange(value - 0.5)}
          aria-label={`${label} 0.5 seconds earlier`}
        >
          <Minus />
        </Button>
        <span className="w-20 text-center font-mono text-sm tabular-nums">
          {formatTimecode(value)}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onChange(value + 0.5)}
          aria-label={`${label} 0.5 seconds later`}
        >
          <Plus />
        </Button>
      </div>
    </Field>
  );
}

export function TrimPanel({
  saved,
  draft,
  preview,
  videoDuration,
  onChange,
}: {
  saved: { start: number; end: number };
  draft: { start: number; end: number };
  /** Props the server snapped to word edges for the draft trim. */
  preview: ClipProps | undefined;
  videoDuration: number;
  onChange: (range: { start: number; end: number }) => void;
}) {
  const lo = Math.max(0, Math.floor(saved.start - WINDOW_SECONDS));
  const hi = Math.min(videoDuration, Math.ceil(saved.end + WINDOW_SECONDS));
  const clamp = (start: number, end: number) => {
    start = Math.max(0, Math.min(start, videoDuration - MIN_CLIP));
    end = Math.min(videoDuration, Math.max(end, start + MIN_CLIP));
    if (end - start > MAX_CLIP) end = start + MAX_CLIP;
    onChange({
      start: Math.round(start * 10) / 10,
      end: Math.round(end * 10) / 10,
    });
  };
  const changed = draft.start !== saved.start || draft.end !== saved.end;
  const snapped =
    preview &&
    (Math.abs(preview.start - draft.start) > 0.05 ||
      Math.abs(preview.end - draft.end) > 0.05);
  const text = preview?.words
    .filter((w) => w.end > preview.start && w.start < preview.end)
    .map((w) => w.word)
    .join(" ");

  return (
    <FieldGroup>
      <Field>
        <div className="flex items-center justify-between">
          <FieldLabel>Clip range</FieldLabel>
          <span className="text-sm tabular-nums text-muted-foreground">
            {(draft.end - draft.start).toFixed(1)}s
          </span>
        </div>
        <Slider
          min={lo}
          max={hi}
          step={0.1}
          minStepsBetweenThumbs={MIN_CLIP * 10}
          value={[draft.start, draft.end]}
          onValueChange={([s, e]) => s != null && e != null && clamp(s, e)}
          aria-label="Clip range"
        />
        <div className="flex justify-between font-mono text-xs text-muted-foreground tabular-nums">
          <span>{formatTimecode(lo)}</span>
          <span>{formatTimecode(hi)}</span>
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Nudge
          label="Start"
          value={draft.start}
          onChange={(v) => clamp(v, draft.end)}
        />
        <Nudge
          label="End"
          value={draft.end}
          onChange={(v) => clamp(draft.start, v)}
        />
      </div>
      {snapped && (
        <FieldDescription>
          Cuts snap to the nearest word: {formatTimecode(preview.start)} –{" "}
          {formatTimecode(preview.end)}.
        </FieldDescription>
      )}
      {text && (
        <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed">
          {text}
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={!changed}
        onClick={() => onChange({ start: saved.start, end: saved.end })}
      >
        <RotateCcw /> Reset trim
      </Button>
    </FieldGroup>
  );
}
