// In-browser editing tools built on Mediabunny: frames, rotate/flip, crop, loudness, text burn-in, GIF.
// Like media.ts, everything runs locally and returns Blobs; nothing is uploaded.
import type { CanvasSink, Input, InputVideoTrack } from "mediabunny";
import type { MediaResult, OnProgress } from "./media";

const baseName = (file: File) => file.name.replace(/\.[^.]+$/, "") || "video";
const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

async function mb() {
  return import("mediabunny");
}

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

export async function canvasToBlob(canvas: AnyCanvas, type: "image/png" | "image/jpeg", quality = 0.92) {
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type, quality });
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't encode the image."))), type, quality),
  );
}

/** Opens a video once and serves decoded frames for previews and captures. */
export class VideoFrames {
  private sinks = new Map<number, CanvasSink>();
  private constructor(
    readonly input: Input,
    readonly track: InputVideoTrack,
    readonly width: number,
    readonly height: number,
    readonly duration: number,
    readonly fps: number,
  ) {}

  static async open(file: File) {
    const m = await mb();
    const input = new m.Input({ source: new m.BlobSource(file), formats: m.ALL_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error("This file has no video track.");
    if (!(await track.canDecode())) throw new Error("Your browser can't decode this video's format.");
    const [width, height, duration, stats] = await Promise.all([
      track.getDisplayWidth(),
      track.getDisplayHeight(),
      input.computeDuration(),
      track.computePacketStats(120),
    ]);
    return new VideoFrames(input, track, width, height, duration, stats.averagePacketRate || 30);
  }

  /** Frame at `t` seconds, scaled to `width` (0 = original size). */
  async frame(t: number, width = 0): Promise<AnyCanvas> {
    let sink = this.sinks.get(width);
    if (!sink) {
      const m = await mb();
      sink = new m.CanvasSink(this.track, width ? { width, height: even((width * this.height) / this.width), fit: "fill" } : {});
      this.sinks.set(width, sink);
    }
    const clamped = Math.min(Math.max(0, t), Math.max(0, this.duration - 0.001));
    const wrapped = (await sink.getCanvas(clamped)) ?? (await sink.getCanvas(0));
    if (!wrapped) throw new Error("Couldn't decode a frame at this time.");
    return wrapped.canvas;
  }
}

async function mp4Convert(
  file: File,
  options: Omit<Parameters<typeof import("mediabunny").Conversion.init>[0], "input" | "output">,
  suffix: string,
  onProgress?: OnProgress,
  signal?: AbortSignal,
): Promise<MediaResult> {
  const m = await mb();
  const input = new m.Input({ source: new m.BlobSource(file), formats: m.ALL_FORMATS });
  const output = new m.Output({ format: new m.Mp4OutputFormat({ fastStart: "in-memory" }), target: new m.BufferTarget() });
  const conversion = await m.Conversion.init({ input, output, ...options });
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
  const buffer = output.target.buffer;
  if (!buffer) throw new Error("Conversion produced no output.");
  return { blob: new Blob([buffer], { type: "video/mp4" }), filename: `${baseName(file)}-${suffix}.mp4` };
}

// ---------- Rotate / flip ----------

export type Rotation = 0 | 90 | 180 | 270;

/**
 * Pure rotations are written as orientation metadata (instant, lossless; players honor it).
 * Mirroring is baked into the pixels, because flip metadata is poorly supported by players.
 */
export function rotateVideo(file: File, rotate: Rotation, flip: boolean, onProgress?: OnProgress, signal?: AbortSignal) {
  return mp4Convert(file, { video: { rotate, flip, allowTransformationMetadata: !flip } }, flip ? "mirrored" : `rotated-${rotate}`, onProgress, signal);
}

// ---------- Crop ----------

export type Rect = { left: number; top: number; width: number; height: number };

/**
 * H.264 needs even dimensions. Rounding offsets and sizes *down* to even numbers keeps the
 * rectangle inside the frame (left + width can only shrink).
 */
export function evenCrop(rect: Rect): Rect {
  const down = (n: number) => Math.floor(n / 2) * 2;
  return { left: down(rect.left), top: down(rect.top), width: Math.max(2, down(rect.width)), height: Math.max(2, down(rect.height)) };
}

export function cropVideo(file: File, rect: Rect, onProgress?: OnProgress, signal?: AbortSignal) {
  return mp4Convert(file, { video: { crop: evenCrop(rect) } }, "cropped", onProgress, signal);
}

/** Finds letterbox/pillarbox bars by sampling a few frames for rows/columns that are almost black everywhere. */
export async function detectBlackBars(frames: VideoFrames): Promise<Rect> {
  const W = 320;
  const H = even((W * frames.height) / frames.width);
  let top = H, bottom = 0, left = W, right = 0;
  for (let i = 1; i <= 6; i++) {
    const c = await frames.frame((frames.duration * i) / 7, W);
    const ctx = c.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    const { data } = ctx.getImageData(0, 0, W, H);
    const lit = (x: number, y: number) => {
      const p = (y * W + x) * 4;
      return 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2] > 28;
    };
    for (let y = 0; y < H; y++) {
      let n = 0;
      for (let x = 0; x < W; x += 2) if (lit(x, y)) n++;
      if (n > W / 50) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    for (let x = 0; x < W; x++) {
      let n = 0;
      for (let y = 0; y < H; y += 2) if (lit(x, y)) n++;
      if (n > H / 50) {
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
  }
  if (bottom <= top || right <= left) return { left: 0, top: 0, width: frames.width, height: frames.height };
  const sx = frames.width / W;
  const sy = frames.height / H;
  return {
    left: Math.round(left * sx),
    top: Math.round(top * sy),
    width: Math.round((right - left + 1) * sx),
    height: Math.round((bottom - top + 1) * sy),
  };
}

// ---------- Loudness (EBU R128 / ITU-R BS.1770) & gain ----------

type Biquad = { b0: number; b1: number; b2: number; a1: number; a2: number };

/** K-weighting filter pair for any sample rate (same design as libebur128). */
function kWeighting(fs: number): [Biquad, Biquad] {
  let f0 = 1681.974450955533;
  const G = 3.999843853973347;
  let Q = 0.7071752369554196;
  let K = Math.tan((Math.PI * f0) / fs);
  const Vh = 10 ** (G / 20);
  const Vb = Vh ** 0.4996667741545416;
  let a0 = 1 + K / Q + K * K;
  const shelf = {
    b0: (Vh + (Vb * K) / Q + K * K) / a0,
    b1: (2 * (K * K - Vh)) / a0,
    b2: (Vh - (Vb * K) / Q + K * K) / a0,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / Q + K * K) / a0,
  };
  f0 = 38.13547087602444;
  Q = 0.5003270373238773;
  K = Math.tan((Math.PI * f0) / fs);
  a0 = 1 + K / Q + K * K;
  const highpass = { b0: 1, b1: -2, b2: 1, a1: (2 * (K * K - 1)) / a0, a2: (1 - K / Q + K * K) / a0 };
  return [shelf, highpass];
}

export type Loudness = { lufs: number; peakDb: number };

const isVideo = async (file: File) => {
  const m = await mb();
  const input = new m.Input({ source: new m.BlobSource(file), formats: m.ALL_FORMATS });
  return Boolean(await input.getPrimaryVideoTrack());
};

/** Integrated loudness (LUFS, gated per BS.1770-4) and sample peak (dBFS) of the primary audio track. */
export async function measureLoudness(file: File, onProgress?: OnProgress, signal?: AbortSignal): Promise<Loudness> {
  const m = await mb();
  const input = new m.Input({ source: new m.BlobSource(file), formats: m.ALL_FORMATS });
  const track = await input.getPrimaryAudioTrack();
  if (!track) throw new Error("This file has no audio track.");
  const duration = await input.computeDuration();
  const sink = new m.AudioSampleSink(track);

  let filters: { f: [Biquad, Biquad]; z: Float64Array }[] = [];
  let fs = 0;
  let step = 0; // samples per 100 ms
  let acc = 0; // weighted energy in current 100 ms step
  let accN = 0;
  const steps: number[] = []; // mean-square per 100 ms
  let peak = 0;
  let plane = new Float32Array(0);

  for await (const sample of sink.samples()) {
    if (signal?.aborted) {
      sample.close();
      throw new DOMException("Aborted", "AbortError");
    }
    if (!fs) {
      fs = sample.sampleRate;
      step = Math.round(fs / 10);
      filters = Array.from({ length: sample.numberOfChannels }, () => ({ f: kWeighting(fs), z: new Float64Array(4) }));
    }
    const n = sample.numberOfFrames;
    if (plane.length < n) plane = new Float32Array(n);
    const energy = new Float64Array(n);
    for (let ch = 0; ch < Math.min(sample.numberOfChannels, filters.length); ch++) {
      sample.copyTo(plane, { planeIndex: ch, format: "f32-planar" });
      const { f, z } = filters[ch];
      for (let i = 0; i < n; i++) {
        const x = plane[i];
        const a = Math.abs(x);
        if (a > peak) peak = a;
        // Two cascaded biquads (transposed direct form II).
        let y = f[0].b0 * x + z[0];
        z[0] = f[0].b1 * x - f[0].a1 * y + z[1];
        z[1] = f[0].b2 * x - f[0].a2 * y;
        const w = y;
        y = f[1].b0 * w + z[2];
        z[2] = f[1].b1 * w - f[1].a1 * y + z[3];
        z[3] = f[1].b2 * w - f[1].a2 * y;
        energy[i] += y * y;
      }
    }
    for (let i = 0; i < n; i++) {
      acc += energy[i];
      if (++accN === step) {
        steps.push(acc / step);
        acc = 0;
        accN = 0;
      }
    }
    onProgress?.(Math.min(1, (sample.timestamp + sample.duration) / (duration || 1)));
    sample.close();
  }

  // 400 ms blocks with 75% overlap, absolute gate at -70 LUFS, then relative gate at -10 LU.
  const loud = (ms: number) => -0.691 + 10 * Math.log10(ms);
  const blocks: number[] = [];
  for (let i = 0; i + 4 <= steps.length; i++) blocks.push((steps[i] + steps[i + 1] + steps[i + 2] + steps[i + 3]) / 4);
  const abs = blocks.filter((b) => loud(b) > -70);
  if (!abs.length) return { lufs: -Infinity, peakDb: 20 * Math.log10(peak || 1e-9) };
  const rel = loud(abs.reduce((s, b) => s + b, 0) / abs.length) - 10;
  const gated = abs.filter((b) => loud(b) > rel);
  return { lufs: loud(gated.reduce((s, b) => s + b, 0) / gated.length), peakDb: 20 * Math.log10(peak || 1e-9) };
}

/** Soft limiter: linear up to the knee, then smoothly approaches the ceiling (never clips). */
function limit(x: number, ceiling: number) {
  const knee = ceiling * 0.8;
  const a = Math.abs(x);
  if (a <= knee) return x;
  const over = (a - knee) / (ceiling - knee);
  return Math.sign(x) * (knee + (ceiling - knee) * Math.tanh(over));
}

/**
 * Apply `gainDb` to the audio with a soft limiter (decoded peaks stay under about -1 dBFS). Video is copied untouched.
 * Video in → MP4 out; audio-only in → MP3 out.
 */
export async function applyGain(file: File, gainDb: number, onProgress?: OnProgress, signal?: AbortSignal): Promise<MediaResult> {
  const m = await mb();
  const gain = 10 ** (gainDb / 20);
  // Limit to -2.5 dBFS before encoding: lossy encoders (AAC/MP3) overshoot heavily limited audio by
  // 1–2 dB, and we want the *decoded* output to stay under -1 dBFS.
  const ceiling = 10 ** (-2.5 / 20);
  const video = await isVideo(file);

  let buf = new Float32Array(0);
  const audio = {
    forceTranscode: true,
    process: (sample: InstanceType<typeof m.AudioSample>) => {
      const n = sample.numberOfFrames;
      const chs = sample.numberOfChannels;
      if (buf.length < n * chs) buf = new Float32Array(n * chs);
      for (let ch = 0; ch < chs; ch++) {
        const plane = buf.subarray(ch * n, ch * n + n);
        sample.copyTo(plane, { planeIndex: ch, format: "f32-planar" });
        for (let i = 0; i < n; i++) plane[i] = limit(plane[i] * gain, ceiling);
      }
      return new m.AudioSample({
        data: buf.slice(0, n * chs),
        format: "f32-planar",
        numberOfChannels: chs,
        sampleRate: sample.sampleRate,
        timestamp: sample.timestamp,
      });
    },
  };

  if (video) return mp4Convert(file, { audio }, gainDb >= 0 ? "louder" : "normalized", onProgress, signal);

  if (!(await m.canEncodeAudio("mp3"))) {
    const { registerMp3Encoder } = await import("@mediabunny/mp3-encoder");
    registerMp3Encoder();
  }
  const input = new m.Input({ source: new m.BlobSource(file), formats: m.ALL_FORMATS });
  const output = new m.Output({ format: new m.Mp3OutputFormat(), target: new m.BufferTarget() });
  const conversion = await m.Conversion.init({
    input,
    output,
    audio: { ...audio, codec: "mp3", quality: new m.Quality({ bitrate: 192_000, bitrateMode: "constant" }) },
  });
  if (!conversion.isValid) throw new Error("This audio file can't be processed in your browser.");
  if (onProgress) conversion.onProgress = onProgress;
  signal?.addEventListener("abort", () => void conversion.cancel(), { once: true });
  await conversion.execute();
  return { blob: new Blob([output.target.buffer!], { type: "audio/mpeg" }), filename: `${baseName(file)}-louder.mp3` };
}

// ---------- Text overlay ----------

export type TextStyle = {
  text: string;
  fontFamily: string;
  bold: boolean;
  /** Font size as a fraction of the video's height. */
  size: number;
  color: string;
  strokeColor: string;
  /** Outline width as a fraction of the font size (0 = none). */
  stroke: number;
  opacity: number;
  box: boolean;
  boxColor: string;
  /** Anchor point of the text block, 0..1 of the frame. */
  x: number;
  y: number;
};

/** Draws the text block; shared by the live preview and the export so they match exactly. */
export function drawText(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, w: number, h: number, s: TextStyle) {
  const lines = s.text.split("\n").filter((l, i, a) => l || a.length === 1);
  if (!s.text.trim()) return;
  const px = Math.max(8, s.size * h);
  ctx.save();
  ctx.globalAlpha = s.opacity;
  ctx.font = `${s.bold ? 700 : 400} ${px}px ${s.fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  const lineH = px * 1.15;
  const widths = lines.map((l) => ctx.measureText(l).width);
  const blockW = Math.max(...widths);
  const blockH = lineH * lines.length;
  const pad = px * 0.35;
  // Keep the whole block inside the frame.
  const cx = Math.min(Math.max(s.x * w, blockW / 2 + pad), w - blockW / 2 - pad);
  const cy = Math.min(Math.max(s.y * h, blockH / 2 + pad), h - blockH / 2 - pad);
  if (s.box) {
    ctx.fillStyle = s.boxColor;
    const r = px * 0.25;
    const bx = cx - blockW / 2 - pad;
    const by = cy - blockH / 2 - pad / 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, blockW + pad * 2, blockH + pad, r);
    ctx.fill();
  }
  ctx.textAlign = "center";
  lines.forEach((line, i) => {
    const ly = cy - blockH / 2 + lineH * (i + 0.5);
    if (s.stroke > 0) {
      ctx.lineWidth = s.stroke * px * 2; // stroke is centered on the glyph edge
      ctx.strokeStyle = s.strokeColor;
      ctx.strokeText(line, cx, ly);
    }
    ctx.fillStyle = s.color;
    ctx.fillText(line, cx, ly);
  });
  ctx.restore();
}

export async function addTextToVideo(file: File, style: TextStyle, onProgress?: OnProgress, signal?: AbortSignal) {
  let ctx: OffscreenCanvasRenderingContext2D | null = null;
  return mp4Convert(
    file,
    {
      video: {
        forceTranscode: true,
        process: (sample) => {
          const w = sample.displayWidth;
          const h = sample.displayHeight;
          if (!ctx || ctx.canvas.width !== w || ctx.canvas.height !== h) {
            ctx = new OffscreenCanvas(w, h).getContext("2d")!;
          }
          sample.draw(ctx, 0, 0);
          drawText(ctx, w, h, style);
          return ctx.canvas;
        },
      },
    },
    "text",
    onProgress,
    signal,
  );
}

// ---------- GIF ----------

export async function videoToGif(
  frames: VideoFrames,
  file: File,
  opts: { start: number; end: number; fps: number; width: number },
  onProgress?: OnProgress,
  signal?: AbortSignal,
): Promise<MediaResult> {
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
  const width = Math.min(opts.width, frames.width);
  const height = even((width * frames.height) / frames.width);
  const count = Math.max(1, Math.round((opts.end - opts.start) * opts.fps));
  const delay = 1000 / opts.fps;
  const gif = GIFEncoder();

  for (let i = 0; i < count; i++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const canvas = await frames.frame(opts.start + i / opts.fps, width);
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    const { data } = ctx.getImageData(0, 0, width, height);
    const palette = quantize(data, 256);
    gif.writeFrame(applyPalette(data, palette), width, height, { palette, delay, repeat: 0 });
    onProgress?.((i + 1) / count);
    // Yield so the page stays responsive between frames.
    await new Promise((r) => setTimeout(r, 0));
  }
  gif.finish();
  return { blob: new Blob([gif.bytes()], { type: "image/gif" }), filename: `${baseName(file)}.gif` };
}
