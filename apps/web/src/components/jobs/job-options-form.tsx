"use client";

import { DEFAULT_STYLE } from "@repo/video";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { CaptionStylePicker } from "@/components/editor/caption-style-picker";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface JobOptionsValue {
  num_clips: number;
  min_duration: number;
  max_duration: number;
  instructions: string;
  caption_style: string;
  language: string;
  asd_level: "A" | "B" | "C";
  profanity_filter: boolean;
  webhook_url: string;
}

export const DEFAULT_JOB_OPTIONS: JobOptionsValue = {
  num_clips: 8,
  min_duration: 20,
  max_duration: 60,
  instructions: "",
  caption_style: DEFAULT_STYLE,
  language: "auto",
  asd_level: "B",
  profanity_filter: false,
  webhook_url: "",
};

/** The JobOptions body for POST /v1/jobs. */
export function toApiOptions(v: JobOptionsValue) {
  return {
    num_clips: v.num_clips,
    min_duration: v.min_duration,
    max_duration: v.max_duration,
    instructions: v.instructions.trim() || null,
    caption_style: v.caption_style,
    language: v.language,
    reframe: { asd_level: v.asd_level },
    profanity_filter: v.profanity_filter,
    webhook_url: v.webhook_url.trim() || null,
  };
}

const LANGUAGES: [string, string][] = [
  ["auto", "Detect automatically"],
  ["en", "English"],
  ["es", "Spanish"],
  ["pt", "Portuguese"],
  ["fr", "French"],
  ["de", "German"],
  ["it", "Italian"],
  ["nl", "Dutch"],
  ["hi", "Hindi"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
  ["zh", "Chinese"],
  ["ar", "Arabic"],
  ["ru", "Russian"],
  ["tr", "Turkish"],
];

const SPEAKER_MODES = [
  { value: "A", title: "Single speaker", body: "Follow one face." },
  { value: "B", title: "Conversation", body: "Switch to whoever is talking." },
  {
    value: "C",
    title: "Precise",
    body: "Audio-visual model; slower, needs a GPU.",
  },
] as const;

export function JobOptionsForm({
  value,
  onChange,
  styleColumns = 6,
}: {
  value: JobOptionsValue;
  onChange: (v: JobOptionsValue) => void;
  styleColumns?: 3 | 6;
}) {
  const [advanced, setAdvanced] = useState(false);
  const set = <K extends keyof JobOptionsValue>(k: K, v: JobOptionsValue[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend>Clips</FieldLegend>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel>Number of clips</FieldLabel>
              <span className="text-sm font-medium tabular-nums">
                {value.num_clips}
              </span>
            </div>
            <Slider
              min={1}
              max={20}
              step={1}
              value={[value.num_clips]}
              onValueChange={([n]) => set("num_clips", n ?? 8)}
              aria-label="Number of clips"
            />
          </Field>
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel>Clip length</FieldLabel>
              <span className="text-sm font-medium tabular-nums">
                {value.min_duration}–{value.max_duration}s
              </span>
            </div>
            <Slider
              min={5}
              max={180}
              step={5}
              minStepsBetweenThumbs={1}
              value={[value.min_duration, value.max_duration]}
              onValueChange={([min, max]) =>
                onChange({
                  ...value,
                  min_duration: min ?? value.min_duration,
                  max_duration: max ?? value.max_duration,
                })
              }
              aria-label="Clip length in seconds"
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="instructions">
            What should the clips focus on?
          </FieldLabel>
          <Textarea
            id="instructions"
            value={value.instructions}
            onChange={(e) => set("instructions", e.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="Optional, e.g. funny moments, product tips, or strong opinions"
          />
        </Field>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Caption style</FieldLegend>
        <FieldDescription>
          You can fine-tune colors, font and position per clip later.
        </FieldDescription>
        <CaptionStylePicker
          value={value.caption_style}
          onChange={(s) => set("caption_style", s)}
          columns={styleColumns}
        />
      </FieldSet>

      <button
        type="button"
        onClick={() => setAdvanced((a) => !a)}
        className="flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={advanced}
      >
        <ChevronDown
          className={cn(
            "size-4 transition-transform",
            advanced && "rotate-180",
          )}
        />
        Advanced options
      </button>

      {advanced && (
        <FieldGroup>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field>
              <FieldLabel>Spoken language</FieldLabel>
              <Select
                value={value.language}
                onValueChange={(l) => set("language", l)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="webhook">Webhook URL</FieldLabel>
              <Input
                id="webhook"
                type="url"
                value={value.webhook_url}
                onChange={(e) => set("webhook_url", e.target.value)}
                placeholder="https://example.com/hooks/clippro"
              />
              <FieldDescription>
                Called when the job completes or fails.
              </FieldDescription>
            </Field>
          </div>

          <FieldSet>
            <FieldLegend variant="label">Speaker framing</FieldLegend>
            <FieldDescription>
              How the vertical frame follows people. Clips are center-cropped
              until face tracking ships.
            </FieldDescription>
            <RadioGroup
              value={value.asd_level}
              onValueChange={(v) =>
                set("asd_level", v as JobOptionsValue["asd_level"])
              }
              className="grid gap-3 sm:grid-cols-3"
            >
              {SPEAKER_MODES.map((m) => (
                <FieldLabel key={m.value} htmlFor={`asd-${m.value}`}>
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>{m.title}</FieldTitle>
                      <FieldDescription>{m.body}</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem value={m.value} id={`asd-${m.value}`} />
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
          </FieldSet>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="profanity">Mask profanity</FieldLabel>
              <FieldDescription>
                Replace swear words in captions with asterisks.
              </FieldDescription>
            </FieldContent>
            <Switch
              id="profanity"
              checked={value.profanity_filter}
              onCheckedChange={(c) => set("profanity_filter", c)}
            />
          </Field>
        </FieldGroup>
      )}
    </FieldGroup>
  );
}
