// Tools that rebuild a video's timeline: speed change, merge, repeat-loop and boomerang.
// They drive Mediabunny's lower-level sinks (read) and sources (write) directly, all in the browser.
import type { AudioSample, Input, Output, VideoSample } from "mediabunny";
import type { MediaResult, OnProgress } from "./media";
import { TimeStretcher } from "./stretch";

const baseName = (file: File) => file.name.replace(/\.[^.]+$/, "") || "video";
const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

async function mb() {
  return import("mediabunny");
}

async function openInput(file: File): Promise<Input> {
  const m = await mb();
  return new m.Input({ source: new m.BlobSource(file), formats: m.ALL_FORMATS });
}

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
}

async function newMp4() {
  const m = await mb();
  return new m.Output({ format: new m.Mp4OutputFormat({ fastStart: "in-memory" }), target: new m.BufferTarget() });
}

async function pickCodecs(output: Output, width: number, height: number) {
  const m = await mb();
  const video = await m.getFirstEncodableVideoCodec(output.format.getSupportedVideoCodecs(), { width, height });
  const audio = await m.getFirstEncodableAudioCodec(output.format.getSupportedAudioCodecs());
  if (!video) throw new Error("Your browser can't encode video. Try the latest Chrome, Edge or Safari on a computer.");
  return { video, audio };
}

async function finish(output: Output, filename: string): Promise<MediaResult> {
  await output.finalize();
  const buffer = (output.target as unknown as { buffer: ArrayBuffer | null }).buffer;
  if (!buffer) throw new Error("Processing produced no output.");
  return { blob: new Blob([buffer], { type: "video/mp4" }), filename };
}

/** Planar float copy of an AudioSample. */
function planesOf(sample: AudioSample): Float32Array[] {
  return Array.from({ length: sample.numberOfChannels }, (_, ch) => {
    const plane = new Float32Array(sample.numberOfFrames);
    sample.copyTo(plane, { planeIndex: ch, format: "f32-planar" });
    return plane;
  });
}

async function makeAudioSample(planes: Float32Array[], sampleRate: number, timestamp: number) {
  const m = await mb();
  const n = planes[0].length;
  const data = new Float32Array(n * planes.length);
  planes.forEach((p, i) => data.set(p, i * n));
  return new m.AudioSample({ data, format: "f32-planar", numberOfChannels: planes.length, sampleRate, timestamp });
}

// ---------- Speed ----------

/**
 * Re-times the video by `speed`. Audio is time-stretched with pitch preserved (or dropped).
 * Speed-ups drop frames so the output never exceeds 60 fps; slow-downs simply hold each frame longer.
 */
export async function changeSpeed(
  file: File,
  speed: number,
  keepAudio: boolean,
  onProgress?: OnProgress,
  signal?: AbortSignal,
): Promise<MediaResult> {
  const m = await mb();
  const input = await openInput(file);
  const vTrack = await input.getPrimaryVideoTrack();
  if (!vTrack) throw new Error("This file has no video track.");
  const aTrack = keepAudio ? await input.getPrimaryAudioTrack() : null;
  const duration = await input.computeDuration();
  const [w, h, rotation] = await Promise.all([vTrack.getCodedWidth(), vTrack.getCodedHeight(), vTrack.getRotation()]);

  const output = await newMp4();
  const codecs = await pickCodecs(output, w, h);
  const videoSource = new m.VideoSampleSource({ codec: codecs.video, quality: new m.Quality("high") });
  output.addVideoTrack(videoSource, { rotation });
  const audioSource = aTrack && codecs.audio ? new m.AudioSampleSource({ codec: codecs.audio, quality: new m.Quality(128_000) }) : null;
  if (audioSource) output.addAudioTrack(audioSource);
  await output.start();

  const audioShare = audioSource ? 0.3 : 0;

  // Audio first (smaller), so the muxer buffers as little as possible.
  if (aTrack && audioSource) {
    let stretcher: TimeStretcher | null = null;
    let sr = 0;
    let inFrames = 0;
    let outFrames = 0;
    const emit = async (planes: Float32Array[], limit = Infinity) => {
      const take = Math.min(planes[0].length, Math.max(0, limit - outFrames));
      if (!take) return;
      const s = await makeAudioSample(planes.map((p) => p.subarray(0, take)), sr, outFrames / sr);
      outFrames += take;
      await audioSource.add(s);
      s.close();
    };
    for await (const sample of new m.AudioSampleSink(aTrack).samples()) {
      checkAbort(signal);
      if (!stretcher) {
        sr = sample.sampleRate;
        stretcher = new TimeStretcher(sample.numberOfChannels, sr, speed);
      }
      const planes = planesOf(sample);
      inFrames += sample.numberOfFrames;
      onProgress?.(audioShare * Math.min(1, (sample.timestamp + sample.duration) / duration));
      sample.close();
      await emit(stretcher.push(planes));
    }
    // Trim the stretcher's padding tail so audio ends exactly where the re-timed video does.
    if (stretcher) await emit(stretcher.flush(), Math.round(inFrames / speed));
    audioSource.close();
  }

  const minGap = 1 / 60 - 1e-4;
  let lastKept = -Infinity;
  for await (const sample of new m.VideoSampleSink(vTrack).samples()) {
    checkAbort(signal);
    const t = sample.timestamp / speed;
    onProgress?.(audioShare + (1 - audioShare) * Math.min(1, sample.timestamp / duration));
    if (t - lastKept < minGap) {
      sample.close();
      continue;
    }
    lastKept = t;
    sample.setTimestamp(t);
    sample.setDuration(Math.max(sample.duration / speed, 1 / 60));
    await videoSource.add(sample);
    sample.close();
  }
  videoSource.close();
  const label = String(speed).replace(".", "_");
  return finish(output, `${baseName(file)}-${label}x.mp4`);
}

/**
 * Streaming resampler to stereo at `outRate` (cubic Hermite interpolation, state carried across chunks).
 * Mono is duplicated to both channels; anything beyond two channels keeps the first two.
 */
class StereoResampler {
  private hist = [new Float32Array(3), new Float32Array(3)];
  private pos = 3;
  private readonly step: number;
  constructor(inRate: number, outRate: number) {
    this.step = inRate / outRate;
  }

  push(planes: Float32Array[]): [Float32Array, Float32Array] {
    const src = [planes[0], planes[1] ?? planes[0]];
    const out: [number[], number[]] = [[], []];
    let next = this.pos;
    for (let c = 0; c < 2; c++) {
      const ext = new Float32Array(3 + src[c].length);
      ext.set(this.hist[c]);
      ext.set(src[c], 3);
      let pos = this.pos;
      while (Math.floor(pos) + 2 < ext.length) {
        const i = Math.floor(pos);
        const t = pos - i;
        const y0 = ext[i - 1];
        const y1 = ext[i];
        const y2 = ext[i + 1];
        const y3 = ext[i + 2];
        const a = (-y0 + 3 * y1 - 3 * y2 + y3) / 2;
        const b = y0 - (5 * y1) / 2 + 2 * y2 - y3 / 2;
        const d = (y2 - y0) / 2;
        out[c].push(((a * t + b) * t + d) * t + y1);
        pos += this.step;
      }
      this.hist[c] = ext.slice(ext.length - 3);
      next = pos - (ext.length - 3);
    }
    this.pos = next;
    return [Float32Array.from(out[0]), Float32Array.from(out[1])];
  }
}

// ---------- Merge ----------

export type MergeSize = { width: number; height: number } | "first";

/** Joins clips end to end at 30 fps; clips of another shape are letterboxed, silent clips get silence. */
export async function mergeVideos(files: File[], size: MergeSize, onProgress?: OnProgress, signal?: AbortSignal): Promise<MediaResult> {
  const m = await mb();
  const inputs = await Promise.all(files.map(openInput));
  const meta = await Promise.all(
    inputs.map(async (input, i) => {
      const video = await input.getPrimaryVideoTrack();
      if (!video) throw new Error(`"${files[i].name}" has no video track.`);
      const audio = await input.getPrimaryAudioTrack();
      return { input, video, audio, duration: await input.computeDuration() };
    }),
  );

  let W: number;
  let H: number;
  if (size === "first") {
    W = even(await meta[0].video.getDisplayWidth());
    H = even(await meta[0].video.getDisplayHeight());
  } else ({ width: W, height: H } = size);

  const output = await newMp4();
  const codecs = await pickCodecs(output, W, H);
  const SR = 48000;
  const videoSource = new m.VideoSampleSource({
    codec: codecs.video,
    quality: new m.Quality("high"),
    sizeChangeBehavior: "contain",
    transform: { width: W, height: H, frameRate: 30, force: true },
  });
  output.addVideoTrack(videoSource, { frameRate: 30 });
  // Every clip is resampled to 48 kHz stereo before encoding: the encoder needs one constant format.
  const audioSource = codecs.audio ? new m.AudioSampleSource({ codec: codecs.audio, quality: new m.Quality(160_000) }) : null;
  if (audioSource) output.addAudioTrack(audioSource);
  await output.start();

  const total = meta.reduce((s, c) => s + c.duration, 0) || 1;
  let offset = 0;

  /** Adds stereo 48 kHz audio for one clip, starting at `offset`, capped/padded to exactly its duration. */
  const addClipAudio = async (clip: (typeof meta)[number]) => {
    const frames = Math.round(clip.duration * SR);
    let written = 0;
    const write = async (planes: [Float32Array, Float32Array]) => {
      const n = Math.min(planes[0].length, frames - written);
      if (n <= 0) return;
      const s = await makeAudioSample([planes[0].subarray(0, n), planes[1].subarray(0, n)], SR, offset + written / SR);
      written += n;
      await audioSource!.add(s);
      s.close();
    };
    if (clip.audio) {
      let resampler: StereoResampler | null = null;
      for await (const sample of new m.AudioSampleSink(clip.audio).samples()) {
        checkAbort(signal);
        resampler ??= new StereoResampler(sample.sampleRate, SR);
        const planes = planesOf(sample);
        sample.close();
        await write(resampler.push(planes));
        if (written >= frames) break;
      }
      if (resampler) await write(resampler.push([new Float32Array(3)]));
    }
    // Silence for clips without sound, or whose audio ends early.
    while (written < frames) {
      const n = Math.min(SR, frames - written);
      await write([new Float32Array(n), new Float32Array(n)]);
    }
  };

  for (const clip of meta) {
    if (audioSource) await addClipAudio(clip);

    for await (const sample of new m.VideoSampleSink(clip.video).samples()) {
      checkAbort(signal);
      if (sample.timestamp >= clip.duration) {
        sample.close();
        break;
      }
      onProgress?.(Math.min(1, (offset + sample.timestamp) / total));
      sample.setTimestamp(offset + sample.timestamp);
      await videoSource.add(sample);
      sample.close();
    }
    offset += clip.duration;
  }
  audioSource?.close();
  videoSource.close();
  return finish(output, `${baseName(files[0])}-merged.mp4`);
}

// ---------- Loop: repeat (lossless) ----------

/** Repeats the clip `times` times by copying its encoded packets with shifted timestamps — no re-encode. */
export async function repeatVideo(file: File, times: number, onProgress?: OnProgress, signal?: AbortSignal): Promise<MediaResult> {
  const m = await mb();
  const input = await openInput(file);
  const vTrack = await input.getPrimaryVideoTrack();
  if (!vTrack) throw new Error("This file has no video track.");
  const aTrack = await input.getPrimaryAudioTrack();
  const vCodec = vTrack.codec;
  if (!vCodec) throw new Error("This video's codec isn't supported.");
  const output = await newMp4();
  if (!output.format.getSupportedVideoCodecs().includes(vCodec)) {
    throw new Error("This video's codec can't be stored in MP4. Convert it to MP4 first (e.g. with the Video Compressor).");
  }

  // One loop lasts as long as the video track; audio is cut to the same length so repeats stay in sync.
  const loopLen = await vTrack.computeDuration();
  const [rotation, vConfig] = await Promise.all([vTrack.getRotation(), vTrack.getDecoderConfig()]);
  const videoSource = new m.EncodedVideoPacketSource(vCodec);
  output.addVideoTrack(videoSource, { rotation });

  const aCodec = aTrack?.codec;
  const audioOk = aTrack && aCodec && output.format.getSupportedAudioCodecs().includes(aCodec);
  const audioSource = audioOk ? new m.EncodedAudioPacketSource(aCodec!) : null;
  const aConfig = audioOk ? await aTrack!.getDecoderConfig() : null;
  if (audioSource) output.addAudioTrack(audioSource);
  await output.start();

  let firstV = true;
  let firstA = true;
  for (let rep = 0; rep < times; rep++) {
    const offset = rep * loopLen;
    if (audioSource && aTrack) {
      for await (const packet of new m.EncodedPacketSink(aTrack).packets()) {
        checkAbort(signal);
        if (packet.timestamp >= loopLen) break;
        await audioSource.add(packet.clone({ timestamp: packet.timestamp + offset }), firstA && aConfig ? { decoderConfig: aConfig } : undefined);
        firstA = false;
      }
    }
    for await (const packet of new m.EncodedPacketSink(vTrack).packets()) {
      checkAbort(signal);
      await videoSource.add(packet.clone({ timestamp: packet.timestamp + offset }), firstV && vConfig ? { decoderConfig: vConfig } : undefined);
      firstV = false;
    }
    onProgress?.((rep + 1) / times);
  }
  audioSource?.close();
  videoSource.close();
  return finish(output, `${baseName(file)}-x${times}.mp4`);
}

// ---------- Loop: boomerang ----------

export const BOOMERANG_MAX_SECONDS = 10;

/**
 * Forward then backward, silent, at most 720p. Reversal decodes one keyframe group (GOP) at a time
 * from the end, so memory is bounded by the longest GOP rather than the whole clip.
 */
export async function boomerang(file: File, onProgress?: OnProgress, signal?: AbortSignal): Promise<MediaResult> {
  const m = await mb();
  const input = await openInput(file);
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error("This file has no video track.");
  const duration = await track.computeDuration();
  if (duration > BOOMERANG_MAX_SECONDS + 0.05) throw new Error(`Boomerang works on clips up to ${BOOMERANG_MAX_SECONDS} seconds. Trim your clip first.`);

  const dw = await track.getDisplayWidth();
  const dh = await track.getDisplayHeight();
  const scale = Math.min(1, 720 / Math.min(dw, dh));
  const W = even(dw * scale);
  const H = even(dh * scale);
  const fps = Math.min(30, (await track.computePacketStats(120)).averagePacketRate || 30);
  const step = 1 / fps;
  const times: number[] = [];
  for (let t = 0; t < duration - step / 2; t += step) times.push(t);

  const output = await newMp4();
  const codecs = await pickCodecs(output, W, H);
  const source = new m.VideoSampleSource({ codec: codecs.video, quality: new m.Quality("high") });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();

  const sink = new m.CanvasSink(track, { width: W, height: H, fit: "fill", poolSize: 0 });
  let index = 0;
  const total = times.length * 2;
  const addFrame = async (image: CanvasImageSource) => {
    const sample: VideoSample = new m.VideoSample(image, { timestamp: index * step, duration: step });
    await source.add(sample);
    sample.close();
    index++;
    onProgress?.(index / total);
  };

  // Forward pass streams straight through.
  for await (const wrapped of sink.canvasesAtTimestamps(times)) {
    checkAbort(signal);
    if (wrapped) await addFrame(wrapped.canvas);
  }

  // Backward pass: find keyframes, then walk GOPs from last to first, reversing each.
  const keys: number[] = [];
  for await (const p of new m.EncodedPacketSink(track).packets(undefined, undefined, { metadataOnly: true })) {
    if (p.type === "key") keys.push(p.timestamp);
  }
  keys.sort((a, b) => a - b);
  if (!keys.length || keys[0] > 0) keys.unshift(0);
  const bounds = [...keys, Infinity];
  for (let g = keys.length - 1; g >= 0; g--) {
    const inGop = times.filter((t) => t >= bounds[g] && t < bounds[g + 1]);
    if (!inGop.length) continue;
    const frames: ImageBitmap[] = [];
    for await (const wrapped of sink.canvasesAtTimestamps(inGop)) {
      checkAbort(signal);
      if (wrapped) frames.push(await createImageBitmap(wrapped.canvas));
    }
    for (let i = frames.length - 1; i >= 0; i--) {
      // Skip the very last frame once so the turnaround doesn't stutter on a duplicated frame.
      if (!(g === keys.length - 1 && i === frames.length - 1)) await addFrame(frames[i]);
      frames[i].close();
    }
  }
  source.close();
  return finish(output, `${baseName(file)}-boomerang.mp4`);
}
