import { formatBytes, type MediaResult, type OnProgress } from "./media";
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

/** Same-origin URL that streams a format through the relay; with `name` it downloads as that file. */
export function relayUrl(format: YtdlpFormat, name?: string) {
  const params = new URLSearchParams({ url: format.url, h: encodeURIComponent(JSON.stringify(format.headers)) });
  if (name) params.set("name", name);
  return `/api/relay?${params}`;
}

/** Accepts post, Reel and IGTV links (with or without a username path segment). */
export function isInstagramUrl(input: string) {
  return /^https?:\/\/(?:www\.)?instagram\.com\/(?:[\w.]+\/)?(?:p|reels?|tv)\/[\w-]+/i.test(input.trim());
}

// ---------- Choosing what to offer ----------

export type DownloadOption =
  /** A complete file (video + audio, or a silent video), saved as-is through the relay. */
  | { kind: "file"; label: string; detail: string; format: YtdlpFormat }
  /** Separate video and audio streams, muxed into one MP4 in the browser. */
  | { kind: "mux"; label: string; detail: string; video: YtdlpFormat; audio: YtdlpFormat }
  | { kind: "audio"; label: string; detail: string; format: YtdlpFormat };

// Muxing holds both downloaded streams and the result in memory (about twice the file size).
const MAX_MUX_BYTES = 1024 ** 3;
// Standard qualities; YouTube's in-between ones (e.g. 608p) and tiny ones only add noise.
const LADDER = new Set([4320, 2160, 1440, 1080, 720, 480, 360]);

const hasVideo = (f: YtdlpFormat) => f.vcodec !== "none";
const hasAudio = (f: YtdlpFormat) => f.acodec !== "none";
/** The short side, so a 1080×1920 Short reads as 1080p like YouTube labels it. */
const quality = (f: YtdlpFormat) => (f.width && f.height ? Math.min(f.width, f.height) : null);

// H.264 plays everywhere; AV1 and VP9 in MP4 play in browsers but not in every desktop player.
function codecRank(vcodec: string | null) {
  if (vcodec?.startsWith("avc1")) return 0;
  if (vcodec?.startsWith("av01")) return 1;
  if (vcodec?.startsWith("vp")) return 2;
  return 3;
}

function codecName(vcodec: string | null) {
  return ["H.264", "AV1", "VP9", ""][codecRank(vcodec)];
}

function sizeNote(...formats: YtdlpFormat[]) {
  const sizes = formats.map((f) => f.filesize);
  return sizes.every((s) => s) ? `~${formatBytes(sizes.reduce((a, b) => a! + b!, 0)!)}` : "";
}

/** What to offer for a video: the recommended option first, then one per quality, then audio. */
export function downloadOptions(video: YtdlpVideo): DownloadOption[] {
  const audioOnly = video.formats.filter((f) => !hasVideo(f) && f.acodec);
  // AAC keeps the MP4 widely compatible; "-drc" tracks are YouTube's dynamic-range-compressed variants.
  const audio = [...audioOnly].sort(
    (a, b) =>
      Number(b.acodec!.startsWith("mp4a")) - Number(a.acodec!.startsWith("mp4a")) ||
      Number(a.id.endsWith("-drc")) - Number(b.id.endsWith("-drc")) ||
      (b.tbr ?? 0) - (a.tbr ?? 0),
  )[0];

  const byQuality = new Map<number, DownloadOption>();
  const unknown: DownloadOption[] = [];
  // Without separate audio streams, a video-only file is the complete (silent) video.
  for (const f of video.formats.filter((f) => hasVideo(f) && (hasAudio(f) || !audio))) {
    const q = quality(f);
    const option: DownloadOption = { kind: "file", label: q ? `${q}p` : "MP4", detail: [codecName(f.vcodec), sizeNote(f)].filter(Boolean).join(" · "), format: f };
    if (!q) unknown.push(option);
    else if (!byQuality.has(q)) byQuality.set(q, option);
  }
  if (audio) {
    const videoOnly = video.formats
      .filter((f) => hasVideo(f) && f.acodec === "none" && quality(f))
      .sort((a, b) => codecRank(a.vcodec) - codecRank(b.vcodec) || (b.tbr ?? 0) - (a.tbr ?? 0));
    for (const f of videoOnly) {
      const q = quality(f)!;
      const total = (f.filesize ?? 0) + (audio.filesize ?? 0);
      if (byQuality.has(q) || total > MAX_MUX_BYTES) continue;
      byQuality.set(q, { kind: "mux", label: `${q}p`, detail: [codecName(f.vcodec), sizeNote(f, audio)].filter(Boolean).join(" · "), video: f, audio });
    }
  }

  const sorted = [...byQuality.entries()].sort(([a], [b]) => b - a);
  const standard = sorted.filter(([q]) => LADDER.has(q));
  const options = (standard.length ? standard : sorted).map(([, o]) => o);
  // The main button gets the most compatible complete video: Instagram's original MP4 (reported
  // without a resolution) if there is one, otherwise the best H.264 option.
  const primary =
    (unknown[0] && { ...unknown[0], label: "Best quality" }) ??
    options.find((o) => o.kind !== "audio" && codecRank((o.kind === "mux" ? o.video : o.format).vcodec) === 0);
  const ordered = primary ? [primary, ...options.filter((o) => o !== primary)] : options;
  if (audio) ordered.push({ kind: "audio", label: "Audio only", detail: [audio.ext.toUpperCase(), sizeNote(audio)].filter(Boolean).join(" · "), format: audio });
  return ordered;
}

export function fileName(video: YtdlpVideo, ext: string) {
  const base = video.title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60) || video.id;
  return `${base}.${ext}`;
}

// ---------- Muxing ----------

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
}

/** Downloads a whole stream through the relay (which fetches it upstream in fast chunks). */
async function downloadStream(format: YtdlpFormat, onBytes: (n: number) => void, signal?: AbortSignal) {
  const res = await fetch(relayUrl(format), { signal });
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}). The link may have expired; try again.`);
  const parts: Uint8Array<ArrayBuffer>[] = [];
  const reader = res.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    onBytes(value.byteLength);
  }
  return new Blob(parts);
}

/**
 * Joins a video-only and an audio-only stream into one MP4 without re-encoding: both are
 * downloaded in parallel through the relay, then their packets are copied in timestamp order.
 * Progress: downloading is the first 90%, muxing the rest.
 */
export async function muxToMp4(
  video: YtdlpFormat,
  audio: YtdlpFormat,
  filename: string,
  onProgress?: OnProgress,
  signal?: AbortSignal,
): Promise<MediaResult> {
  const m = await import("mediabunny");
  const expected = (video.filesize ?? 0) + (audio.filesize ?? 0);
  let received = 0;
  const onBytes = (n: number) => {
    received += n;
    if (expected) onProgress?.(0.9 * Math.min(1, received / expected));
  };
  const [vBlob, aBlob] = await Promise.all([downloadStream(video, onBytes, signal), downloadStream(audio, onBytes, signal)]);

  const vInput = new m.Input({ source: new m.BlobSource(vBlob), formats: m.ALL_FORMATS });
  const aInput = new m.Input({ source: new m.BlobSource(aBlob), formats: m.ALL_FORMATS });
  try {
    const [vTrack, aTrack] = await Promise.all([vInput.getPrimaryVideoTrack(), aInput.getPrimaryAudioTrack()]);
    if (!vTrack?.codec || !aTrack?.codec) throw new Error("Couldn't read the video's streams.");
    const [vConfig, aConfig, rotation, duration] = await Promise.all([
      vTrack.getDecoderConfig(),
      aTrack.getDecoderConfig(),
      vTrack.getRotation(),
      vTrack.computeDuration(),
    ]);
    if (!vConfig || !aConfig) throw new Error("Couldn't read the video's codec settings.");

    const output = new m.Output({ format: new m.Mp4OutputFormat({ fastStart: "in-memory" }), target: new m.BufferTarget() });
    const vSource = new m.EncodedVideoPacketSource(vTrack.codec);
    const aSource = new m.EncodedAudioPacketSource(aTrack.codec);
    output.addVideoTrack(vSource, { rotation });
    output.addAudioTrack(aSource);
    await output.start();

    const vPackets = new m.EncodedPacketSink(vTrack).packets();
    const aPackets = new m.EncodedPacketSink(aTrack).packets();
    let v = await vPackets.next();
    let a = await aPackets.next();
    let vFirst = true;
    let aFirst = true;
    while (!v.done || !a.done) {
      checkAbort(signal);
      if (!v.done && (a.done || v.value.timestamp <= a.value.timestamp)) {
        await vSource.add(v.value, vFirst ? { decoderConfig: vConfig } : undefined);
        vFirst = false;
        onProgress?.(0.9 + 0.1 * Math.min(1, v.value.timestamp / Math.max(duration, 0.001)));
        v = await vPackets.next();
      } else if (!a.done) {
        await aSource.add(a.value, aFirst ? { decoderConfig: aConfig } : undefined);
        aFirst = false;
        a = await aPackets.next();
      }
    }
    await output.finalize();
    const buffer = (output.target as unknown as { buffer: ArrayBuffer | null }).buffer;
    if (!buffer) throw new Error("Muxing produced no output.");
    return { blob: new Blob([buffer], { type: "video/mp4" }), filename };
  } finally {
    vInput.dispose();
    aInput.dispose();
  }
}
