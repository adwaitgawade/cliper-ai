import type { YtdlpFormat, YtdlpMessage, YtdlpVideo } from "./ytdlp.worker";

export type { YtdlpFormat, YtdlpVideo };

// One long-lived worker: booting Pyodide + yt-dlp takes seconds, so it is reused across links.
let worker: Worker | null = null;

/** Extract video info for a link with yt-dlp running in a worker. `onLog` receives yt-dlp's progress lines. */
export function extractVideos(url: string, onLog: (line: string) => void) {
  worker ??= new Worker(new URL("./ytdlp.worker.ts", import.meta.url), { type: "module" });
  const w = worker;
  const promise = new Promise<YtdlpVideo[]>((resolve, reject) => {
    w.onmessage = (e: MessageEvent<YtdlpMessage>) => {
      if (e.data.type === "log") onLog(e.data.message);
      if (e.data.type === "done") resolve(e.data.videos);
      if (e.data.type === "error") reject(new Error(e.data.message));
    };
    w.onerror = (e) => {
      worker = null;
      reject(new Error(e.message || "The downloader worker crashed."));
    };
  });
  w.postMessage({ url });
  return {
    promise,
    // Extraction is synchronous inside the worker, so cancelling means discarding it.
    cancel: () => {
      w.terminate();
      if (worker === w) worker = null;
    },
  };
}

/** Same-origin link that streams a format through the relay as a file download. */
export function relayDownloadUrl(format: YtdlpFormat, name: string) {
  const params = new URLSearchParams({
    url: format.url,
    h: encodeURIComponent(JSON.stringify(format.headers)),
    name: `${name}.${format.ext}`,
  });
  return `/api/relay?${params}`;
}

/** Accepts post, Reel and IGTV links (with or without a username path segment). */
export function isInstagramUrl(input: string) {
  return /^https?:\/\/(?:www\.)?instagram\.com\/(?:[\w.]+\/)?(?:p|reels?|tv)\/[\w-]+/i.test(input.trim());
}
