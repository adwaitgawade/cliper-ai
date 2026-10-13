// Animated WebP in the browser: each frame is encoded as a still WebP (natively via canvas where the
// browser supports it, otherwise with libwebp compiled to WebAssembly), then the frames are muxed into an
// animated WebP container (RIFF: VP8X + ANIM + one ANMF per frame).
import type { VideoFrames } from "./edit";
import type { MediaResult, OnProgress } from "./media";

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

let nativeWebp: Promise<boolean> | null = null;

/** Safari's canvas silently falls back to PNG for image/webp, so test what actually comes out. */
function canvasEncodesWebp() {
  nativeWebp ??= (async () => {
    try {
      const c = new OffscreenCanvas(2, 2);
      c.getContext("2d")!.fillRect(0, 0, 2, 2);
      return (await c.convertToBlob({ type: "image/webp", quality: 0.8 })).type === "image/webp";
    } catch {
      return false;
    }
  })();
  return nativeWebp;
}

async function encodeFrame(canvas: AnyCanvas, quality: number): Promise<Uint8Array> {
  if (await canvasEncodesWebp()) {
    const blob =
      "convertToBlob" in canvas
        ? await canvas.convertToBlob({ type: "image/webp", quality })
        : await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("WebP encode failed"))), "image/webp", quality));
    return new Uint8Array(await blob.arrayBuffer());
  }
  const { default: encode } = await import("@jsquash/webp/encode");
  const ctx = canvas.getContext("2d") as Ctx2D;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return new Uint8Array(await encode(image, { quality: Math.round(quality * 100) }));
}

// ---------- RIFF helpers ----------

const fourcc = (s: string) => [...s].map((c) => c.charCodeAt(0));
const u24 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255];
const u32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];

function chunk(id: string, payload: Uint8Array): Uint8Array {
  const pad = payload.length & 1;
  const out = new Uint8Array(8 + payload.length + pad);
  out.set([...fourcc(id), ...u32(payload.length)]);
  out.set(payload, 8);
  return out;
}

/** The image-data chunks (ALPH? + VP8/VP8L) of a still WebP, i.e. everything an ANMF frame needs. */
function frameData(webp: Uint8Array): { bytes: Uint8Array; alpha: boolean } {
  const parts: Uint8Array[] = [];
  let alpha = false;
  let o = 12; // skip "RIFF" size "WEBP"
  while (o + 8 <= webp.length) {
    const id = String.fromCharCode(...webp.subarray(o, o + 4));
    const size = webp[o + 4] | (webp[o + 5] << 8) | (webp[o + 6] << 16) | (webp[o + 7] << 24);
    const end = o + 8 + size + (size & 1);
    if (id === "ALPH" || id === "VP8 " || id === "VP8L") parts.push(webp.subarray(o, end));
    if (id === "ALPH") alpha = true;
    if (id === "VP8L" && webp[o + 8 + 4] & 0x10) alpha = true; // VP8L header alpha_is_used bit
    o = end;
  }
  if (!parts.length) throw new Error("The WebP encoder returned an unexpected format.");
  const total = parts.reduce((n, p) => n + p.length, 0);
  const bytes = new Uint8Array(total);
  let k = 0;
  for (const p of parts) {
    bytes.set(p, k);
    k += p.length;
  }
  return { bytes, alpha };
}

function muxAnimated(frames: { bytes: Uint8Array; alpha: boolean }[], width: number, height: number, frameMs: number): Uint8Array {
  const alpha = frames.some((f) => f.alpha);
  const vp8x = chunk("VP8X", new Uint8Array([0x02 | (alpha ? 0x10 : 0), 0, 0, 0, ...u24(width - 1), ...u24(height - 1)]));
  // Background color (ignored by most viewers) + loop count 0 = forever.
  const anim = chunk("ANIM", new Uint8Array([0, 0, 0, 0, 0, 0]));
  const anmfs = frames.map((f) => {
    const header = new Uint8Array([
      ...u24(0), // X / 2
      ...u24(0), // Y / 2
      ...u24(width - 1),
      ...u24(height - 1),
      ...u24(Math.round(frameMs)),
      0b10, // no blending (each frame is a full image), no disposal
    ]);
    const payload = new Uint8Array(header.length + f.bytes.length);
    payload.set(header);
    payload.set(f.bytes, header.length);
    return chunk("ANMF", payload);
  });
  const bodyLen = 4 + vp8x.length + anim.length + anmfs.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(8 + bodyLen);
  out.set([...fourcc("RIFF"), ...u32(bodyLen), ...fourcc("WEBP")]);
  let o = 12;
  for (const c of [vp8x, anim, ...anmfs]) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

export async function videoToAnimatedWebp(
  frames: VideoFrames,
  file: File,
  opts: { start: number; end: number; fps: number; width: number; quality: number },
  onProgress?: OnProgress,
  signal?: AbortSignal,
): Promise<MediaResult> {
  const width = Math.min(opts.width, frames.width);
  const height = Math.max(2, Math.round((width * frames.height) / frames.width / 2) * 2);
  const count = Math.max(1, Math.round((opts.end - opts.start) * opts.fps));
  const encoded: { bytes: Uint8Array; alpha: boolean }[] = [];
  for (let i = 0; i < count; i++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const canvas = await frames.frame(opts.start + i / opts.fps, width);
    encoded.push(frameData(await encodeFrame(canvas, opts.quality)));
    onProgress?.((i + 1) / count);
    await new Promise((r) => setTimeout(r, 0));
  }
  const bytes = muxAnimated(encoded, width, height, 1000 / opts.fps);
  const name = file.name.replace(/\.[^.]+$/, "") || "video";
  return { blob: new Blob([bytes.buffer as ArrayBuffer], { type: "image/webp" }), filename: `${name}.webp` };
}
