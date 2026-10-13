"use client";

import { useEffect, useRef, useState } from "react";
import {
  compressVideo,
  mediaDuration,
  objectUrl,
  releaseObjectUrl,
  resizeVertical,
  supportsWebCodecs,
  trimVideo,
  videoToMp3,
  type CompressPreset,
  type MediaResult,
} from "../engine/media";
import { clock } from "../engine/transcribe";
import { Dropzone, ErrorNote, PrimaryButton, PrivacyNote, ProgressBar, ResultCard, Segmented, Unsupported } from "./ui";

export type ConvertMode = "video-to-mp3" | "resize-vertical" | "compress" | "trim";

type Stage =
  | { kind: "idle" }
  | { kind: "working"; progress: number }
  | { kind: "done"; result: MediaResult }
  | { kind: "error"; message: string };

const COPY: Record<ConvertMode, { accept: string; hint: string; action: string; working: string }> = {
  "video-to-mp3": { accept: "video/*,audio/*,.mkv", hint: "MP4, MOV, WebM or MKV", action: "Convert to MP3", working: "Extracting audio…" },
  "resize-vertical": { accept: "video/*,.mkv", hint: "MP4, MOV, WebM or MKV", action: "Make it 9:16", working: "Resizing to 1080×1920…" },
  compress: { accept: "video/*,.mkv", hint: "MP4, MOV, WebM or MKV", action: "Compress video", working: "Compressing…" },
  trim: { accept: "video/*,.mkv", hint: "MP4, MOV, WebM or MKV", action: "Trim & export MP4", working: "Exporting your clip…" },
};

export function ConvertWidget({ mode }: { mode: ConvertMode }) {
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [supported, setSupported] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  // Mode-specific options
  const [kbps, setKbps] = useState("192");
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [preset, setPreset] = useState<CompressPreset>("balanced");
  const [downscale, setDownscale] = useState(false);
  const [range, setRange] = useState<[number, number]>([0, 0]);
  const [duration, setDuration] = useState(0);

  // WebCodecs feature detection has to run on the client.
  useEffect(() => {
    const ok = supportsWebCodecs();
    if (!ok) queueMicrotask(() => setSupported(false));
  }, []);

  const copy = COPY[mode];
  const busy = stage.kind === "working";

  async function start() {
    if (!file) return;
    const abort = new AbortController();
    abortRef.current = abort;
    const onProgress = (p: number) => setStage({ kind: "working", progress: p });
    setStage({ kind: "working", progress: 0 });
    try {
      const result =
        mode === "video-to-mp3"
          ? await videoToMp3(file, Number(kbps), onProgress, abort.signal)
          : mode === "resize-vertical"
            ? await resizeVertical(file, fit, onProgress, abort.signal)
            : mode === "compress"
              ? await compressVideo(file, preset, downscale, onProgress, abort.signal)
              : await trimVideo(file, range[0], range[1], onProgress, abort.signal);
      setStage({ kind: "done", result });
    } catch (err) {
      if (abort.signal.aborted) return setStage({ kind: "idle" });
      setStage({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong." });
    }
  }

  if (!supported) return <Unsupported />;

  return (
    <div className="space-y-5">
      {mode === "trim" && file ? (
        <TrimEditor
          file={file}
          range={range}
          duration={duration}
          disabled={busy}
          onChange={setRange}
          onReplace={() => {
            setFile(null);
            setStage({ kind: "idle" });
          }}
        />
      ) : (
        <Dropzone
          accept={copy.accept}
          hint={copy.hint}
          file={file}
          disabled={busy}
          onFile={(f) => {
            setFile(f);
            setStage({ kind: "idle" });
            if (mode === "trim") {
              // Read the duration from the container itself: the <video> preview can't play every format
              // (e.g. MKV in Safari), but Mediabunny can still parse and trim it.
              setDuration(0);
              mediaDuration(f)
                .then((d) => {
                  setDuration(d);
                  setRange([0, d]);
                })
                .catch(() => setStage({ kind: "error", message: "Couldn’t read this video. Is it a valid MP4, MOV, WebM or MKV file?" }));
            }
          }}
        />
      )}

      {stage.kind !== "done" && mode === "video-to-mp3" && (
        <Segmented
          label="Audio quality"
          value={kbps}
          onChange={setKbps}
          options={[
            { value: "128", label: "128 kbps", hint: "Speech, small" },
            { value: "192", label: "192 kbps", hint: "Recommended" },
            { value: "320", label: "320 kbps", hint: "Music, best" },
          ]}
        />
      )}
      {stage.kind !== "done" && mode === "resize-vertical" && (
        <Segmented
          label="How to fit 9:16"
          value={fit}
          onChange={setFit}
          options={[
            { value: "cover", label: "Crop to fill", hint: "Full screen, trims sides" },
            { value: "contain", label: "Fit with bars", hint: "Keeps the whole frame" },
          ]}
        />
      )}
      {stage.kind !== "done" && mode === "compress" && (
        <div className="space-y-3">
          <Segmented
            label="Compression"
            value={preset}
            onChange={setPreset}
            options={[
              { value: "small", label: "Smaller file", hint: "Most savings" },
              { value: "balanced", label: "Balanced", hint: "Recommended" },
              { value: "quality", label: "Best quality", hint: "Light touch" },
            ]}
          />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={downscale} onChange={(e) => setDownscale(e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
            Also downscale to 720p (big savings for 1080p/4K)
          </label>
        </div>
      )}

      {stage.kind === "working" && (
        <div className="space-y-2">
          <ProgressBar label={copy.working} value={stage.progress} />
          <button type="button" onClick={() => abortRef.current?.abort()} className="text-sm font-semibold text-muted hover:text-ink">
            Cancel
          </button>
        </div>
      )}
      {stage.kind === "error" && <ErrorNote>{stage.message}</ErrorNote>}
      {stage.kind === "done" && (
        <ResultCard
          blob={stage.result.blob}
          filename={stage.result.filename}
          original={mode === "compress" ? file?.size : undefined}
          preview={mode === "video-to-mp3" ? "audio" : "video"}
          onReset={() => setStage({ kind: "idle" })}
        />
      )}
      {(stage.kind === "idle" || stage.kind === "error") && (
        <PrimaryButton disabled={!file || (mode === "trim" && range[1] - range[0] < 0.1)} onClick={start}>
          {copy.action}
        </PrimaryButton>
      )}
      <PrivacyNote />
    </div>
  );
}

function TrimEditor({
  file,
  range,
  duration,
  disabled,
  onChange,
  onReplace,
}: {
  file: File;
  range: [number, number];
  duration: number;
  disabled: boolean;
  onChange: (r: [number, number]) => void;
  onReplace: () => void;
}) {
  const url = objectUrl(file);
  const video = useRef<HTMLVideoElement>(null);
  const [start, end] = range;

  // Keep preview playback inside the selected range.
  const onTime = () => {
    const v = video.current;
    if (v && v.currentTime >= end) {
      v.pause();
      v.currentTime = start;
    }
  };

  const setAt = (which: 0 | 1) => {
    const t = video.current?.currentTime ?? 0;
    onChange(which === 0 ? [Math.min(t, end - 0.1), end] : [start, Math.max(t, start + 0.1)]);
  };

  return (
    <div className="space-y-4">
      <video
        ref={video}
        src={url}
        controls
        playsInline
        onTimeUpdate={onTime}
        className="max-h-80 w-full rounded-2xl bg-black"
      />
      {duration > 0 && (
        <fieldset disabled={disabled} className="space-y-3 rounded-2xl bg-cream p-4">
          <div className="relative h-8">
            <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-ink/10" />
            <div
              className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-accent"
              style={{ left: `${(start / duration) * 100}%`, right: `${100 - (end / duration) * 100}%` }}
            />
            {/* Two overlaid native range inputs; only their thumbs take pointer events. */}
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
                  onChange(i === 0 ? [Math.min(v, end - 0.1), end] : [start, Math.max(v, start + 0.1)]);
                  if (video.current) video.current.currentTime = v;
                }}
                className="pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-ink [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-ink"
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button type="button" onClick={() => setAt(0)} className="rounded-lg border border-ink/15 px-3 py-1.5 font-medium hover:border-ink/40">
              Start: <span className="tabular-nums">{clock(start)}</span> · set to playhead
            </button>
            <span className="font-semibold tabular-nums">{clock(end - start)} selected</span>
            <button type="button" onClick={() => setAt(1)} className="rounded-lg border border-ink/15 px-3 py-1.5 font-medium hover:border-ink/40">
              End: <span className="tabular-nums">{clock(end)}</span> · set to playhead
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              releaseObjectUrl(file);
              onReplace();
            }}
            className="text-sm font-semibold text-muted hover:text-ink">
            Choose a different video
          </button>
        </fieldset>
      )}
    </div>
  );
}
