"use client";

import {
  FONT_KEYS,
  FONTS,
  LIMITS,
  ensureFont,
  resolveStyle,
  type CaptionOverrides,
  type FontKey,
  type HighlightMode,
} from "@repo/video";
import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CaptionStylePicker } from "./caption-style-picker";
import { ColorField, SliderField } from "./controls";

const NO_BOX = "#00000000";

function splitAlpha(hex: string | null): { rgb: string; alpha: number } {
  if (!hex) return { rgb: "#000000", alpha: 0 };
  return {
    rgb: hex.slice(0, 7),
    alpha: hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1,
  };
}

function withAlpha(rgb: string, alpha: number): string {
  return `${rgb}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`.toUpperCase();
}

export function StylePanel({
  styleName,
  overrides,
  onChange,
}: {
  styleName: string;
  overrides: CaptionOverrides;
  onChange: (styleName: string, overrides: CaptionOverrides) => void;
}) {
  const s = resolveStyle(styleName, overrides);
  const set = (patch: CaptionOverrides) =>
    onChange(styleName, { ...overrides, ...patch });
  const box = splitAlpha(s.box_color === NO_BOX ? null : s.box_color);
  const boxOn = Boolean(s.box_color) && s.box_color !== NO_BOX && box.alpha > 0;

  // Load every caption font so the picker shows each name in its own face.
  useEffect(() => {
    FONT_KEYS.forEach((f) => void ensureFont(f));
  }, []);

  return (
    <FieldGroup>
      <Field>
        <FieldLabel>Preset</FieldLabel>
        <CaptionStylePicker
          value={styleName}
          onChange={(name) => onChange(name, {})}
          columns={3}
        />
        <FieldDescription>
          Switching presets clears your tweaks below.
        </FieldDescription>
      </Field>

      <FieldSeparator>Tweaks</FieldSeparator>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel>Font</FieldLabel>
          <Select value={s.font} onValueChange={(font) => set({ font })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_KEYS.map((f) => (
                <SelectItem key={f} value={f}>
                  <span
                    style={{ fontFamily: `'${FONTS[f as FontKey].family}'` }}
                  >
                    {FONTS[f as FontKey].family}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <SliderField
          label="Size"
          value={s.size}
          min={LIMITS.size[0]!}
          max={LIMITS.size[1]!}
          onChange={(size) => set({ size })}
        />
        <ColorField
          id="text-color"
          label="Text"
          value={s.text_color}
          onChange={(text_color) => set({ text_color })}
        />
        <ColorField
          id="highlight-color"
          label="Highlight"
          value={s.highlight_color}
          onChange={(highlight_color) => set({ highlight_color })}
        />
        <ColorField
          id="outline-color"
          label="Outline"
          value={s.outline_color}
          onChange={(outline_color) => set({ outline_color })}
        />
        <SliderField
          label="Outline width"
          value={s.outline_width}
          min={LIMITS.outline_width[0]!}
          max={LIMITS.outline_width[1]!}
          onChange={(outline_width) => set({ outline_width })}
        />
      </div>

      <Field>
        <FieldLabel>Word highlight</FieldLabel>
        <ToggleGroup
          type="single"
          variant="outline"
          value={s.highlight_mode}
          onValueChange={(v) =>
            v && set({ highlight_mode: v as HighlightMode })
          }
          className="w-full"
        >
          <ToggleGroupItem value="word" className="flex-1">
            Active word
          </ToggleGroupItem>
          <ToggleGroupItem value="karaoke" className="flex-1">
            Karaoke
          </ToggleGroupItem>
          <ToggleGroupItem value="none" className="flex-1">
            None
          </ToggleGroupItem>
        </ToggleGroup>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <SliderField
          label="Words per line"
          value={s.max_words}
          min={LIMITS.max_words[0]!}
          max={LIMITS.max_words[1]!}
          onChange={(max_words) => set({ max_words })}
        />
        <SliderField
          label="Vertical position"
          value={s.position_y}
          min={LIMITS.position_y[0]!}
          max={LIMITS.position_y[1]!}
          step={0.01}
          display={`${Math.round(s.position_y * 100)}% from top`}
          onChange={(position_y) => set({ position_y })}
        />
      </div>

      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="uppercase">All caps</FieldLabel>
        </FieldContent>
        <Switch
          id="uppercase"
          checked={s.uppercase}
          onCheckedChange={(uppercase) => set({ uppercase })}
        />
      </Field>

      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="box">Background box</FieldLabel>
          <FieldDescription>A solid box behind each line.</FieldDescription>
        </FieldContent>
        <Switch
          id="box"
          checked={boxOn}
          onCheckedChange={(on) =>
            set({
              box_color: on ? withAlpha(box.rgb, box.alpha || 0.6) : NO_BOX,
            })
          }
        />
      </Field>
      {boxOn && (
        <div className="grid gap-5 sm:grid-cols-2">
          <ColorField
            id="box-color"
            label="Box color"
            value={box.rgb}
            onChange={(rgb) => set({ box_color: withAlpha(rgb, box.alpha) })}
          />
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel>Box opacity</FieldLabel>
              <span className="text-sm tabular-nums text-muted-foreground">
                {Math.round(box.alpha * 100)}%
              </span>
            </div>
            <Slider
              min={0.1}
              max={1}
              step={0.05}
              value={[box.alpha]}
              onValueChange={([a]) =>
                a != null && set({ box_color: withAlpha(box.rgb, a) })
              }
              aria-label="Box opacity"
            />
          </Field>
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={Object.keys(overrides).length === 0}
        onClick={() => onChange(styleName, {})}
      >
        <RotateCcw /> Reset to preset
      </Button>
    </FieldGroup>
  );
}
