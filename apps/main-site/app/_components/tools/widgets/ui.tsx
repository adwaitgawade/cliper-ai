"use client";

import { useRef, useState, type ReactNode } from "react";
import { formatBytes, objectUrl, releaseObjectUrl } from "../engine/media";
import { Check, UploadIcon } from "../../ui/icons";
import { ClipProPitch } from "../links";

export function Dropzone({
  accept,
  hint,
  file,
  onFile,
  disabled,
}: {
  accept: string;
  hint: string;
  file: File | null;
  onFile: (f: File) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && input.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          input.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f && !disabled) onFile(f);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
        over ? "border-accent bg-accent-soft/40" : "border-ink/15 bg-cream/60 hover:border-accent/60 hover:bg-cream"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <span className="grid size-12 place-items-center rounded-2xl bg-ink text-cream">
        <UploadIcon />
      </span>
      {file ? (
        <div>
          <p className="font-semibold">{file.name}</p>
          <p className="text-sm text-muted">
            {formatBytes(file.size)} · click to choose a different file
          </p>
        </div>
      ) : (
        <div>
          <p className="font-semibold">Drop a file here or click to browse</p>
          <p className="text-sm text-muted">{hint}</p>
        </div>
      )}
    </div>
  );
}

export function ProgressBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-2xl bg-cream p-4" role="status" aria-live="polite">
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        {value !== null && <span className="tabular-nums text-muted">{Math.round(value * 100)}%</span>}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink/10">
        <div
          className={`h-full rounded-full bg-accent transition-[width] duration-300 ${value === null ? "w-1/3 animate-[indeterminate_1.2s_ease-in-out_infinite]" : ""}`}
          style={value === null ? undefined : { width: `${Math.max(2, value * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
      {children}
    </p>
  );
}

export function PrivacyNote() {
  return (
    <p className="flex items-center justify-center gap-2 text-xs text-muted">
      <Check size={14} className="text-emerald-600" /> Processed on your device. Your file is never uploaded.
    </p>
  );
}

export function Unsupported() {
  return (
    <ErrorNote>
      Your browser can’t encode video yet. Please use the latest Chrome, Edge, Safari or Firefox on a desktop computer.
    </ErrorNote>
  );
}

export function ResultCard({
  blob,
  filename,
  original,
  onReset,
  preview,
}: {
  blob: Blob;
  filename: string;
  original?: number;
  onReset: () => void;
  preview?: "video" | "audio" | "image";
}) {
  const url = objectUrl(blob);
  const saved = original ? 1 - blob.size / original : null;

  return (
    <div className="space-y-4 rounded-2xl bg-cream p-5">
      {preview === "video" && <video src={url} controls playsInline className="max-h-80 w-full rounded-xl bg-black" />}
      {preview === "audio" && <audio src={url} controls className="w-full" />}
      {preview === "image" && (
        // eslint-disable-next-line @next/next/no-img-element -- local blob preview
        <img src={url} alt="Result preview" className="mx-auto max-h-80 rounded-xl" />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{filename}</p>
          <p className="text-sm text-muted">
            {formatBytes(blob.size)}
            {saved !== null &&
              (saved > 0 ? ` · ${Math.round(saved * 100)}% smaller than the original` : " · no smaller than the original")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              releaseObjectUrl(blob);
              onReset();
            }}
            className="h-11 rounded-xl px-4 text-sm font-semibold text-muted hover:text-ink">
            Start over
          </button>
          <a
            href={url}
            download={filename}
            className="inline-flex h-11 items-center rounded-xl bg-ink px-5 text-sm font-semibold text-cream hover:bg-black"
          >
            Download
          </a>
        </div>
      </div>
      {/* Highest-intent moment for the soft ClipPro pitch: the user just finished a task. */}
      <ClipProPitch tone="light" className="border-t border-ink/10 pt-4" />
    </div>
  );
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 text-[15px] font-semibold text-cream transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <label
            key={o.value}
            className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm transition-colors ${
              value === o.value ? "border-ink bg-ink text-cream" : "border-ink/15 hover:border-ink/40"
            }`}
          >
            <input type="radio" className="sr-only" checked={value === o.value} onChange={() => onChange(o.value)} />
            <span className="block font-semibold">{o.label}</span>
            {o.hint && <span className={`block text-xs ${value === o.value ? "text-cream/70" : "text-muted"}`}>{o.hint}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const THUMB =
  "pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-ink [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-ink";

/** Two overlaid native range inputs (start/end); only their thumbs take pointer events. */
export function RangeSlider({
  duration,
  range,
  onChange,
  minGap = 0.1,
}: {
  duration: number;
  range: [number, number];
  onChange: (range: [number, number], moved: number) => void;
  minGap?: number;
}) {
  const [start, end] = range;
  return (
    <div className="relative h-8">
      <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-ink/10" />
      <div
        className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-accent"
        style={{ left: `${(start / duration) * 100}%`, right: `${100 - (end / duration) * 100}%` }}
      />
      {([0, 1] as const).map((i) => (
        <input
          key={i}
          type="range"
          min={0}
          max={duration}
          step={0.05}
          value={range[i]}
          aria-label={i === 0 ? "Start time" : "End time"}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(i === 0 ? [Math.min(v, end - minGap), end] : [start, Math.max(v, start + minGap)], v);
          }}
          className={THUMB}
        />
      ))}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums text-muted">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-ink)]"
      />
    </label>
  );
}
