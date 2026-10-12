"use client";

import { PRESETS, PRESET_NAMES } from "@repo/video";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CaptionThumbnail } from "./caption-thumbnail";

/** Grid of caption presets, each previewed with the real caption renderer. */
export function CaptionStylePicker({
  value,
  onChange,
  columns = 3,
}: {
  value: string;
  onChange: (style: string) => void;
  columns?: 2 | 3 | 6;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Caption style"
      className={cn(
        "grid gap-3",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 6 && "grid-cols-3 sm:grid-cols-6",
      )}
    >
      {PRESET_NAMES.map((name) => {
        const selected = value === name;
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(name)}
            className={cn(
              "group relative overflow-hidden rounded-xl border text-left outline-none transition",
              "focus-visible:ring-3 focus-visible:ring-ring/50",
              selected
                ? "border-primary ring-2 ring-primary"
                : "hover:border-foreground/30",
            )}
          >
            <CaptionThumbnail style={name} className="pointer-events-none" />
            <div className="flex items-center justify-between gap-1 bg-card px-2 py-1.5 text-xs font-medium">
              <span className="truncate">{PRESETS[name].label}</span>
              {selected && <Check className="size-3.5 shrink-0 text-primary" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
