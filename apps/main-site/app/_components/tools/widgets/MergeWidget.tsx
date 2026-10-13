"use client";

import { useRef, useState } from "react";
import { formatBytes, mediaDuration } from "../engine/media";
import { mergeVideos, type MergeSize } from "../engine/sequence";
import { UploadIcon } from "../../ui/icons";
import { formatTime } from "./frames";
import { JobStatus, useJob } from "./job";
import { ErrorNote, PrimaryButton, PrivacyNote, Segmented } from "./ui";

const MAX_CLIPS = 20;
type Clip = { id: number; file: File; duration: number | null };

const SIZES: Record<string, MergeSize> = {
  first: "first",
  vertical: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
};

export function MergeWidget() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [size, setSize] = useState("first");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);
  const job = useJob();

  function add(files: FileList | File[]) {
    setError("");
    const room = MAX_CLIPS - clips.length;
    const list = [...files].filter((f) => f.type.startsWith("video/") || /\.(mkv|mov|webm|mp4)$/i.test(f.name));
    if (list.length > room) setError(`You can merge up to ${MAX_CLIPS} clips at a time.`);
    const added = list.slice(0, Math.max(0, room)).map((file) => ({ id: nextId.current++, file, duration: null as number | null }));
    setClips((c) => [...c, ...added]);
    job.reset();
    for (const clip of added) {
      mediaDuration(clip.file)
        .then((d) => setClips((c) => c.map((x) => (x.id === clip.id ? { ...x, duration: d } : x))))
        .catch(() => setError(`Couldn't read "${clip.file.name}". Is it a valid video?`));
    }
  }

  const move = (i: number, by: -1 | 1) =>
    setClips((c) => {
      const next = [...c];
      [next[i], next[i + by]] = [next[i + by], next[i]];
      return next;
    });

  const total = clips.reduce((s, c) => s + (c.duration ?? 0), 0);

  return (
    <div className="space-y-5">
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          add(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-ink/15 bg-cream/60 px-6 py-8 text-center hover:border-accent/60 ${
          job.busy ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <input ref={input} type="file" accept="video/*,.mkv" multiple className="hidden" onChange={(e) => e.target.files && add(e.target.files)} />
        <span className="grid size-11 place-items-center rounded-2xl bg-ink text-cream">
          <UploadIcon />
        </span>
        <p className="font-semibold">{clips.length ? "Add more clips" : "Drop your clips here or click to browse"}</p>
        <p className="text-sm text-muted">Up to {MAX_CLIPS} videos · MP4, MOV, WebM or MKV</p>
      </div>

      {clips.length > 0 && (
        <ol className="divide-y divide-ink/5 overflow-hidden rounded-2xl border border-ink/10 bg-white">
          {clips.map((c, i) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-cream font-semibold tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{c.file.name}</span>
                <span className="text-xs text-muted">
                  {c.duration === null ? "Reading…" : formatTime(c.duration)} · {formatBytes(c.file.size)}
                </span>
              </span>
              <span className="flex shrink-0 gap-1">
                <button type="button" aria-label="Move up" disabled={i === 0 || job.busy} onClick={() => move(i, -1)} className="size-8 rounded-lg border border-ink/15 disabled:opacity-30">
                  ↑
                </button>
                <button type="button" aria-label="Move down" disabled={i === clips.length - 1 || job.busy} onClick={() => move(i, 1)} className="size-8 rounded-lg border border-ink/15 disabled:opacity-30">
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="Remove"
                  disabled={job.busy}
                  onClick={() => setClips((cs) => cs.filter((x) => x.id !== c.id))}
                  className="size-8 rounded-lg border border-ink/15 text-muted hover:text-ink"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
          <li className="flex justify-between px-4 py-2.5 text-xs text-muted">
            <span>{clips.length} clips</span>
            <span className="tabular-nums">Total {formatTime(total)}</span>
          </li>
        </ol>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}

      {job.stage.kind !== "done" && (
        <Segmented
          label="Output size"
          value={size}
          onChange={setSize}
          options={[
            { value: "first", label: "Match first", hint: "Same as clip 1" },
            { value: "vertical", label: "9:16", hint: "1080×1920" },
            { value: "landscape", label: "16:9", hint: "1920×1080" },
            { value: "square", label: "1:1", hint: "1080×1080" },
          ]}
        />
      )}

      <JobStatus job={job} label="Merging clips…" preview="video" />
      {(job.stage.kind === "idle" || job.stage.kind === "error") && (
        <PrimaryButton
          disabled={clips.length < 2 || clips.some((c) => c.duration === null)}
          onClick={() => job.run((p, s) => mergeVideos(clips.map((c) => c.file), SIZES[size], p, s))}
        >
          {clips.length < 2 ? "Add at least 2 clips" : `Merge ${clips.length} clips`}
        </PrimaryButton>
      )}
      <PrivacyNote />
    </div>
  );
}
