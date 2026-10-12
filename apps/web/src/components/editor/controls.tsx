"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

const HEX6 = /^#[0-9a-fA-F]{6}$/;

/** Native color picker plus a hex field. Value is #RRGGBB. */
export function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const rgb = value.slice(0, 7);
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <label
          className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-md border"
          style={{ background: rgb }}
        >
          <input
            type="color"
            value={rgb}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`${label} picker`}
          />
        </label>
        <Input
          id={id}
          defaultValue={rgb}
          key={rgb}
          onBlur={(e) => {
            const v = e.target.value.trim();
            const hex = v.startsWith("#") ? v : `#${v}`;
            if (HEX6.test(hex)) onChange(hex.toUpperCase());
            else e.target.value = rgb;
          }}
          onKeyDown={(e) =>
            e.key === "Enter" && (e.target as HTMLInputElement).blur()
          }
          className="font-mono uppercase"
          maxLength={7}
        />
      </div>
    </Field>
  );
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  display?: string;
  onChange: (v: number) => void;
}) {
  return (
    <Field>
      <div className="flex items-center justify-between">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-sm tabular-nums text-muted-foreground">
          {display ?? value}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => v != null && onChange(v)}
        aria-label={label}
      />
    </Field>
  );
}
