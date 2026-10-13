"use client";

import { useRef, useState } from "react";
import {
  downloadOptions,
  extractVideos,
  fileName,
  isInstagramUrl,
  muxToMp4,
  relayUrl,
  type DownloadOption,
  type YtdlpVideo,
} from "../engine/ytdlp";
import { LinkIcon } from "../../ui/icons";
import { JobStatus, useJob } from "./job";
import { parseYouTubeId } from "./ThumbnailWidget";
import { ErrorNote, ProgressBar } from "./ui";

export type DownloaderSite = "instagram" | "youtube";

const SITES: Record<DownloaderSite, { name: string; placeholder: string; invalid: string; normalize: (input: string) => string | null; note: string }> = {
  instagram: {
    name: "Instagram",
    placeholder: "https://www.instagram.com/reel/…",
    invalid: "That doesn’t look like an Instagram post, Reel or video link.",
    normalize: (input) => (isInstagramUrl(input) ? input.trim() : null),
    note: "Only download videos you own or have permission to reuse. Instagram may block some posts.",
  },
  youtube: {
    name: "YouTube",
    placeholder: "https://www.youtube.com/watch?v=… or /shorts/…",
    invalid: "That doesn’t look like a YouTube video or Shorts link.",
    // A canonical watch URL drops playlist and timestamp parameters, so only that video is fetched.
    normalize: (input) => {
      const id = parseYouTubeId(input);
      return id ? `https://www.youtube.com/watch?v=${id}` : null;
    },
    note: "Only download videos you own or have permission to reuse. YouTube may block some videos.",
  },
};

type Stage =
  | { kind: "idle" }
  | { kind: "working"; log: string }
  | { kind: "done"; videos: YtdlpVideo[] }
  | { kind: "error"; message: string };

const primaryClass = "inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-cream hover:bg-black disabled:cursor-not-allowed disabled:bg-ink/40";
const secondaryClass = "inline-flex h-10 items-center rounded-lg border border-ink/15 px-4 text-sm font-semibold text-ink hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50";

/** yt-dlp runs in the browser (Pyodide); /api/relay only forwards its HTTP and the media bytes. */
export function VideoDownloaderWidget({ site }: { site: DownloaderSite }) {
  const config = SITES[site];
  const [value, setValue] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const cancelRef = useRef<(() => void) | null>(null);
  const mux = useJob();

  async function run(url: string) {
    mux.reset();
    setStage({ kind: "working", log: "Starting…" });
    const job = extractVideos(url, (log) => setStage({ kind: "working", log }));
    cancelRef.current = job.cancel;
    try {
      const videos = (await job.promise).filter((v) => downloadOptions(v).length);
      setStage(videos.length ? { kind: "done", videos } : { kind: "error", message: "No downloadable video found at that link." });
    } catch (err) {
      setStage({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong." });
    }
  }

  function optionButton(video: YtdlpVideo, option: DownloadOption, primary: boolean, key: string) {
    const text = (
      <>
        {primary ? (option.kind === "audio" ? "Download audio" : "Download MP4") : option.label}
        {primary && option.kind !== "audio" && <span className="ml-2 font-normal opacity-70">{option.label}</span>}
        {option.detail && <span className="ml-2 font-normal opacity-70">{option.detail}</span>}
      </>
    );
    const className = primary ? primaryClass : secondaryClass;
    if (option.kind === "mux")
      return (
        <button
          key={key}
          type="button"
          disabled={mux.busy}
          className={className}
          onClick={() => mux.run((onProgress, signal) => muxToMp4(option.video, option.audio, fileName(video, "mp4"), onProgress, signal))}
        >
          {text}
        </button>
      );
    return (
      <a key={key} href={relayUrl(option.format, fileName(video, option.format.ext))} download className={className}>
        {text}
      </a>
    );
  }

  return (
    <div className="space-y-5">
      <form
        className="flex flex-col gap-2 rounded-2xl border border-ink/10 bg-white p-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (stage.kind === "working") return;
          const url = config.normalize(value);
          if (!url) return setStage({ kind: "error", message: config.invalid });
          run(url);
        }}
      >
        <label className="flex flex-1 items-center gap-3 px-3">
          <LinkIcon className="shrink-0 text-muted" />
          <span className="sr-only">{config.name} link</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={config.placeholder}
            className="h-12 w-full bg-transparent text-[15px] outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={stage.kind === "working"}
          className="h-12 rounded-xl bg-ink px-6 text-[15px] font-semibold text-cream hover:bg-black disabled:cursor-not-allowed disabled:bg-ink/40"
        >
          Get video
        </button>
      </form>

      {stage.kind === "working" && (
        <div className="space-y-2">
          <ProgressBar label={stage.log} value={null} />
          <button
            type="button"
            onClick={() => {
              cancelRef.current?.();
              setStage({ kind: "idle" });
            }}
            className="text-sm font-semibold text-muted hover:text-ink"
          >
            Cancel
          </button>
        </div>
      )}

      {stage.kind === "error" && <ErrorNote>{stage.message}</ErrorNote>}

      {stage.kind === "done" &&
        stage.videos.map((v, i) => (
          <div key={`${v.id}-${i}`} className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-white p-4 sm:flex-row">
            {v.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element -- remote CDN image; no optimization wanted
              <img
                src={v.thumbnail}
                alt=""
                referrerPolicy="no-referrer"
                className={`${site === "instagram" ? "aspect-[9/16] w-28" : "aspect-video w-full sm:w-48"} shrink-0 rounded-xl bg-cream object-cover`}
              />
            )}
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="line-clamp-2 font-semibold">{v.title}</p>
                {v.uploader && <p className="text-sm text-muted">{site === "instagram" ? `@${v.uploader}` : v.uploader}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {downloadOptions(v).map((option, n) => (
                  optionButton(v, option, n === 0, `${option.kind}-${option.label}-${n}`)
                ))}
              </div>
            </div>
          </div>
        ))}

      <JobStatus job={mux} label="Downloading and joining video and audio…" preview="video" />

      <p className="text-center text-xs text-muted">{config.note}</p>
    </div>
  );
}
