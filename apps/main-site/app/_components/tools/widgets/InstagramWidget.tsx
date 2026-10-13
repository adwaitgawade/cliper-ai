"use client";

import { useRef, useState } from "react";
import { formatBytes } from "../engine/media";
import { extractVideos, isInstagramUrl, relayDownloadUrl, type YtdlpFormat, type YtdlpVideo } from "../engine/ytdlp";
import { LinkIcon } from "../../ui/icons";
import { ErrorNote, ProgressBar } from "./ui";

type Stage =
  | { kind: "idle" }
  | { kind: "working"; log: string }
  | { kind: "done"; videos: YtdlpVideo[] }
  | { kind: "error"; message: string };

/**
 * Instagram often returns several MP4 versions without a resolution, which users can't tell apart.
 * Keep the best one, plus lower resolutions only when yt-dlp reports a distinct height for them.
 */
function downloadChoices(formats: YtdlpFormat[]) {
  const [best, ...rest] = formats;
  const seen = new Set([best.height]);
  const smaller = rest.filter((f) => f.height && !seen.has(f.height) && seen.add(f.height));
  return [best, ...smaller];
}

/** Proof of concept: yt-dlp runs in the browser (Pyodide); /api/relay only forwards its HTTP. */
export function InstagramWidget() {
  const [value, setValue] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const cancelRef = useRef<(() => void) | null>(null);

  async function run(url: string) {
    setStage({ kind: "working", log: "Starting…" });
    const job = extractVideos(url, (log) => setStage({ kind: "working", log }));
    cancelRef.current = job.cancel;
    try {
      const videos = await job.promise;
      setStage(videos.some((v) => v.formats.length) ? { kind: "done", videos } : { kind: "error", message: "No downloadable video found in that post." });
    } catch (err) {
      setStage({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong." });
    }
  }

  return (
    <div className="space-y-5">
      <form
        className="flex flex-col gap-2 rounded-2xl border border-ink/10 bg-white p-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (stage.kind === "working") return;
          if (!isInstagramUrl(value)) return setStage({ kind: "error", message: "That doesn’t look like an Instagram post, Reel or video link." });
          run(value.trim());
        }}
      >
        <label className="flex flex-1 items-center gap-3 px-3">
          <LinkIcon className="shrink-0 text-muted" />
          <span className="sr-only">Instagram link</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://www.instagram.com/reel/…"
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
        stage.videos
          .filter((v) => v.formats.length)
          .map((v, i) => (
            <div key={`${v.id}-${i}`} className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-white p-4 sm:flex-row">
              {v.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element -- remote Instagram CDN image; no optimization wanted
                <img src={v.thumbnail} alt="" referrerPolicy="no-referrer" className="aspect-[9/16] w-28 shrink-0 rounded-xl bg-cream object-cover" />
              )}
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="line-clamp-2 font-semibold">{v.title}</p>
                  {v.uploader && <p className="text-sm text-muted">@{v.uploader}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {downloadChoices(v.formats).map((f, n) => (
                    <a
                      key={f.id}
                      href={relayDownloadUrl(f, `instagram-${v.id}`)}
                      download
                      className={
                        n === 0
                          ? "inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-cream hover:bg-black"
                          : "inline-flex h-10 items-center rounded-lg border border-ink/15 px-4 text-sm font-semibold text-ink hover:bg-cream"
                      }
                    >
                      {n === 0 ? "Download MP4" : `${f.height}p`}
                      {n === 0 && f.height ? <span className="ml-2 font-normal opacity-70">{f.height}p</span> : null}
                      {f.filesize ? <span className="ml-2 font-normal opacity-70">{formatBytes(f.filesize)}</span> : null}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}

      <p className="text-center text-xs text-muted">
        Only download videos you own or have permission to reuse. Instagram may block some posts.
      </p>
    </div>
  );
}
