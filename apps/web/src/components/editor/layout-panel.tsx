"use client";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const LAYOUTS = [
  {
    value: "auto",
    title: "Automatic",
    body: "Crop to the speaker; fit the whole frame when the source is already vertical.",
    icon: (
      <svg
        viewBox="0 0 32 32"
        className="size-8"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <rect x="3" y="8" width="26" height="16" rx="2" opacity={0.4} />
        <rect x="11.5" y="8" width="9" height="16" rx="1.5" />
        <path
          d="M23 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"
          fill="currentColor"
          stroke="none"
        />
      </svg>
    ),
  },
  {
    value: "crop",
    title: "Fill",
    body: "Crop the frame to 9:16. Best for a single speaker.",
    icon: (
      <svg
        viewBox="0 0 32 32"
        className="size-8"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <rect x="3" y="8" width="26" height="16" rx="2" opacity={0.4} />
        <rect
          x="11.5"
          y="8"
          width="9"
          height="16"
          rx="1.5"
          fill="currentColor"
          fillOpacity={0.2}
        />
      </svg>
    ),
  },
  {
    value: "wide",
    title: "Fit",
    body: "Show the whole frame over a blurred backdrop. Best for groups, slides and screen shares.",
    icon: (
      <svg
        viewBox="0 0 32 32"
        className="size-8"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <rect x="10" y="2" width="12" height="28" rx="2" opacity={0.4} />
        <rect
          x="10"
          y="12"
          width="12"
          height="8"
          rx="1"
          fill="currentColor"
          fillOpacity={0.2}
        />
      </svg>
    ),
  },
] as const;

export function LayoutPanel({
  value,
  onChange,
}: {
  value: string;
  onChange: (layout: "auto" | "crop" | "wide") => void;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as "auto" | "crop" | "wide")}
      className="gap-3"
    >
      {LAYOUTS.map((l) => (
        <FieldLabel key={l.value} htmlFor={`layout-${l.value}`}>
          <Field orientation="horizontal">
            <span className="text-muted-foreground">{l.icon}</span>
            <FieldContent>
              <FieldTitle>{l.title}</FieldTitle>
              <FieldDescription>{l.body}</FieldDescription>
            </FieldContent>
            <RadioGroupItem value={l.value} id={`layout-${l.value}`} />
          </Field>
        </FieldLabel>
      ))}
    </RadioGroup>
  );
}
