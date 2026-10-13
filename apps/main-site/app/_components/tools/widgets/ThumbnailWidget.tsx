"use client";

import { useState } from "react";
import { LinkIcon } from "../../ui/icons";
import { ErrorNote, PrivacyNote } from "./ui";

const SIZES = [
  { key: "maxresdefault", label: "HD", dims: "1280 × 720" },
  { key: "sddefault", label: "SD", dims: "640 × 480" },
  { key: "hqdefault", label: "HQ", dims: "480 × 360" },
  { key: "mqdefault", label: "MQ", dims: "320 × 180" },
];

/** Accepts watch, youtu.be, Shorts, embed and live URLs, or a bare 11-character video ID. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export function ThumbnailWidget() {
  const [value, setValue] = useState("");
  const [id, setId] = useState<string | null>(null);
  const [error, setError] = useState("");
  // YouTube serves a 120×90 placeholder when a size doesn't exist; hide those.
  const [missing, setMissing] = useState<Record<string, boolean>>({});

  const download = async (key: string) => {
    const url = `https://i.ytimg.com/vi/${id}/${key}.jpg`;
    try {
      const blob = await (await fetch(url)).blob();
      const href = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), { href, download: `${id}-${key}.jpg` }).click();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch {
      window.open(url, "_blank", "noopener");
    }
  };

  return (
    <div className="space-y-5">
      <form
        className="flex flex-col gap-2 rounded-2xl border border-ink/10 bg-white p-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = parseYouTubeId(value);
          setMissing({});
          setId(parsed);
          setError(parsed ? "" : "That doesn’t look like a YouTube video or Shorts link.");
        }}
      >
        <label className="flex flex-1 items-center gap-3 px-3">
          <LinkIcon className="shrink-0 text-muted" />
          <span className="sr-only">YouTube link</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=… or /shorts/…"
            className="h-12 w-full bg-transparent text-[15px] outline-none"
          />
        </label>
        <button type="submit" className="h-12 rounded-xl bg-ink px-6 text-[15px] font-semibold text-cream hover:bg-black">
          Get thumbnails
        </button>
      </form>

      {error && <ErrorNote>{error}</ErrorNote>}

      {id && (
        <div className="grid gap-4 sm:grid-cols-2">
          {SIZES.filter((s) => !missing[s.key]).map((s) => (
            <figure key={s.key} className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element -- remote, user-chosen image; no optimization wanted */}
              <img
                src={`https://i.ytimg.com/vi/${id}/${s.key}.jpg`}
                alt={`YouTube thumbnail ${s.label} ${s.dims}`}
                className="aspect-video w-full bg-cream object-cover"
                onLoad={(e) => {
                  if (e.currentTarget.naturalWidth <= 120) setMissing((m) => ({ ...m, [s.key]: true }));
                }}
                onError={() => setMissing((m) => ({ ...m, [s.key]: true }))}
              />
              <figcaption className="flex items-center justify-between gap-3 p-3">
                <span className="text-sm">
                  <span className="font-semibold">{s.label}</span> <span className="text-muted">{s.dims}</span>
                </span>
                <button type="button" onClick={() => download(s.key)} className="h-9 rounded-lg bg-ink px-4 text-sm font-semibold text-cream hover:bg-black">
                  Download
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <PrivacyNote />
    </div>
  );
}
