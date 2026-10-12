"use client";

import { Badge } from "@/components/ui/badge";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Clip } from "@/lib/api/client";

const SCORE_LABELS: [string, string][] = [
  ["hook", "Hook"],
  ["self_contained", "Self-contained"],
  ["emotion", "Emotion"],
  ["payoff", "Payoff"],
  ["shareability", "Shareability"],
];

export function DetailsPanel({
  clip,
  title,
  onTitle,
}: {
  clip: Clip;
  title: string;
  onTitle: (t: string) => void;
}) {
  const scores = (clip.scores ?? {}) as Record<string, number>;
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="clip-title">Title</FieldLabel>
        <Input
          id="clip-title"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          maxLength={200}
        />
        <FieldDescription>
          Used for the download file and your own reference.
        </FieldDescription>
      </Field>
      {clip.hook && (
        <Field>
          <FieldLabel>Opening line</FieldLabel>
          <p className="rounded-lg border bg-muted/40 p-3 text-sm">
            “{clip.hook}”
          </p>
        </Field>
      )}
      {clip.reason && (
        <Field>
          <FieldLabel>Why this moment</FieldLabel>
          <p className="text-sm text-muted-foreground">{clip.reason}</p>
        </Field>
      )}
      {SCORE_LABELS.some(([k]) => typeof scores[k] === "number") && (
        <Field>
          <FieldLabel>Scores</FieldLabel>
          <div className="space-y-2">
            {SCORE_LABELS.filter(([k]) => typeof scores[k] === "number").map(
              ([k, label]) => (
                <div
                  key={k}
                  className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 text-sm"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(scores[k]! / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-right tabular-nums">{scores[k]}</span>
                </div>
              ),
            )}
          </div>
        </Field>
      )}
      {clip.hashtags.length > 0 && (
        <Field>
          <FieldLabel>Hashtags</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {clip.hashtags.map((h) => (
              <Badge key={h} variant="secondary">
                #{h.replace(/^#/, "")}
              </Badge>
            ))}
          </div>
        </Field>
      )}
    </FieldGroup>
  );
}
