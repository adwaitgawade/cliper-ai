// In-browser media processing (Mediabunny + WebCodecs). Nothing here touches a server:
// files are read from disk and results are returned as Blobs.
// Mediabunny is imported lazily so tool pages stay light until a tool is actually used.

export type OnProgress = (progress: number) => void;

export type MediaResult = { blob: Blob; filename: string };

export function supportsWebCodecs() {
  return typeof window !== "undefined" && "VideoEncoder" in window && "AudioEncoder" in window;
}

const baseName = (file: File) => file.name.replace(/\.[^.]+$/, "") || "video";

async function open(file: File) {
  const mb = await import("mediabunny");
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  return { mb, input };
}

type ConversionOptions = Parameters<typeof import("mediabunny").Conversion.init>[0];

async function run(
  options: Omit<ConversionOptions, "output"> & { output: ConversionOptions["output"] },
  onProgress?: OnProgress,
  signal?: AbortSignal,
) {
  const { Conversion } = await import("mediabunny");
  const conversion = await Conversion.init(options);
  if (!conversion.isValid) {
    const reasons = [...new Set(conversion.discardedTracks.map((t) => t.reason.replace(/_/g, " ")))].join(", ");
    throw new Error(`This file can't be converted in your browser (${reasons || "unsupported tracks"}).`);
  }
  if (onProgress) conversion.onProgress = onProgress;
  const abort = () => void conversion.cancel();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    await conversion.execute();
  } finally {
    signal?.removeEventListener("abort", abort);
  }
}

async function mp4Output() {
  const mb = await import("mediabunny");
  return new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target: new mb.BufferTarget() });
}

function bufferOf(output: { target: unknown }) {
  const buffer = (output.target as { buffer: ArrayBuffer | null }).buffer;
  if (!buffer) throw new Error("Conversion produced no output.");
  return buffer;
}

/** Extract the audio track as MP3 at the given bitrate (kbps). */
export async function videoToMp3(file: File, kbps: number, onProgress?: OnProgress, signal?: AbortSignal): Promise<MediaResult> {
  const { mb, input } = await open(file);
  if (!(await mb.canEncodeAudio("mp3"))) {
    const { registerMp3Encoder } = await import("@mediabunny/mp3-encoder");
    registerMp3Encoder();
  }
  if (!(await input.getPrimaryAudioTrack())) throw new Error("This file has no audio track.");
  const output = new mb.Output({ format: new mb.Mp3OutputFormat(), target: new mb.BufferTarget() });
  await run(
    { input, output, video: { discard: true }, audio: { codec: "mp3", quality: new mb.Quality({ bitrate: kbps * 1000, bitrateMode: "constant" }) } },
    onProgress,
    signal,
  );
  return { blob: new Blob([bufferOf(output)], { type: "audio/mpeg" }), filename: `${baseName(file)}.mp3` };
}

/** Make a 1080×1920 vertical video, either center-cropped ("cover") or letterboxed ("contain"). */
export async function resizeVertical(
  file: File,
  fit: "cover" | "contain",
  onProgress?: OnProgress,
  signal?: AbortSignal,
): Promise<MediaResult> {
  const { input } = await open(file);
  if (!(await input.getPrimaryVideoTrack())) throw new Error("This file has no video track.");
  const output = await mp4Output();
  await run({ input, output, video: { width: 1080, height: 1920, fit } }, onProgress, signal);
  return { blob: new Blob([bufferOf(output)], { type: "video/mp4" }), filename: `${baseName(file)}-9x16.mp4` };
}

export type CompressPreset = "small" | "balanced" | "quality";

/**
 * Re-encode to a target bitrate derived from the source's own bitrate, so the output is reliably smaller
 * (quality levels alone map to a fixed quantizer, which can barely shrink already-compressed files).
 * Optionally caps the short side at 720px.
 */
export async function compressVideo(
  file: File,
  preset: CompressPreset,
  downscale720: boolean,
  onProgress?: OnProgress,
  signal?: AbortSignal,
): Promise<MediaResult> {
  const { mb, input } = await open(file);
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error("This file has no video track.");

  const w = await track.getDisplayWidth();
  const h = await track.getDisplayHeight();
  let size: { width?: number; height?: number } = {};
  let pixelRatio = 1;
  if (downscale720 && Math.min(w, h) > 720) {
    // Only ever shrink; the other side follows the original aspect ratio.
    size = w >= h ? { height: 720 } : { width: 720 };
    pixelRatio = (720 / Math.min(w, h)) ** 2;
  }

  const share = { small: 0.35, balanced: 0.55, quality: 0.75 }[preset];
  const audioKbps = { small: 64, balanced: 96, quality: 128 }[preset];
  const { averageBitrate } = await track.computePacketStats(300);
  // Fewer pixels need proportionally fewer bits (sub-linear, like Mediabunny's own scaling).
  const videoBitrate = Math.max(250_000, Math.round(averageBitrate * share * pixelRatio ** 0.95));

  const output = await mp4Output();
  await run(
    {
      input,
      output,
      video: { ...size, quality: new mb.Quality({ bitrate: videoBitrate }), forceTranscode: true },
      audio: { quality: new mb.Quality(audioKbps * 1000) },
    },
    onProgress,
    signal,
  );
  return { blob: new Blob([bufferOf(output)], { type: "video/mp4" }), filename: `${baseName(file)}-compressed.mp4` };
}

/** Cut the [start, end] range (seconds) into a new MP4. */
export async function trimVideo(
  file: File,
  start: number,
  end: number,
  onProgress?: OnProgress,
  signal?: AbortSignal,
): Promise<MediaResult> {
  const { input } = await open(file);
  const output = await mp4Output();
  await run({ input, output, trim: { start, end } }, onProgress, signal);
  return { blob: new Blob([bufferOf(output)], { type: "video/mp4" }), filename: `${baseName(file)}-trimmed.mp4` };
}

export async function mediaDuration(file: File) {
  const { input } = await open(file);
  return input.computeDuration();
}

/** Decode any audio/video file to 16 kHz mono float PCM, the input format Whisper expects. */
export async function decodeForSpeech(file: File, onProgress?: OnProgress, signal?: AbortSignal): Promise<Float32Array> {
  const { mb, input } = await open(file);
  if (!(await input.getPrimaryAudioTrack())) throw new Error("This file has no audio track.");
  const output = new mb.Output({ format: new mb.WavOutputFormat(), target: new mb.BufferTarget() });
  await run(
    {
      input,
      output,
      video: { discard: true },
      audio: { codec: "pcm-f32", numberOfChannels: 1, sampleRate: 16000 },
    },
    onProgress,
    signal,
  );
  return readWavFloat32(bufferOf(output));
}

/** Pull the samples out of a float32 WAV by walking its RIFF chunks to "data". */
function readWavFloat32(buffer: ArrayBuffer): Float32Array {
  const view = new DataView(buffer);
  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const id = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    );
    const size = view.getUint32(offset + 4, true);
    if (id === "data") {
      const start = offset + 8;
      const length = Math.min(size, buffer.byteLength - start) / 4;
      return new Float32Array(buffer.slice(start, start + Math.floor(length) * 4));
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error("Couldn't read the decoded audio.");
}

// One object URL per Blob, created lazily. Released explicitly when the user discards the result;
// anything left is freed by the browser when the page unloads. (Revoking in effect cleanups breaks
// under React Strict Mode, which runs cleanups while the element is still mounted.)
const objectUrls = new WeakMap<Blob, string>();

export function objectUrl(blob: Blob) {
  let url = objectUrls.get(blob);
  if (!url) {
    url = URL.createObjectURL(blob);
    objectUrls.set(blob, url);
  }
  return url;
}

export function releaseObjectUrl(blob: Blob) {
  const url = objectUrls.get(blob);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrls.delete(blob);
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}
