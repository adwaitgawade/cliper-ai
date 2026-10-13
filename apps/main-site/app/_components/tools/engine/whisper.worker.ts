// Runs OpenAI Whisper locally (transformers.js + ONNX Runtime Web) off the main thread.
// Model weights come from the Hugging Face CDN once and are cached by the browser.
import { pipeline, type AutomaticSpeechRecognitionPipeline, type ProgressInfo } from "@huggingface/transformers";

export type WhisperModel = "tiny" | "base";

export type WhisperRequest = {
  audio: Float32Array; // 16 kHz mono
  model: WhisperModel;
  language: string | null; // Whisper language name, null = auto-detect
};

export type WhisperChunk = { start: number; end: number; text: string };

export type WhisperMessage =
  | { type: "model"; progress: number } // 0..1 download progress
  | { type: "progress"; progress: number; chunks: WhisperChunk[] } // 0..1 transcription progress, chunks so far
  | { type: "done"; chunks: WhisperChunk[] }
  | { type: "error"; message: string };

const SAMPLE_RATE = 16000;
// Audio is fed to the pipeline in ~2-minute slices so we can report progress and stream text.
const SLICE_S = 120;

const loaded = new Map<WhisperModel, Promise<AutomaticSpeechRecognitionPipeline>>();

async function hasWebGPU() {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    return Boolean(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

function load(model: WhisperModel, post: (m: WhisperMessage) => void) {
  let p = loaded.get(model);
  if (!p) {
    p = (async () => {
      const webgpu = await hasWebGPU();
      return (await pipeline("automatic-speech-recognition", `onnx-community/whisper-${model}`, {
        device: webgpu ? "webgpu" : "wasm",
        dtype: webgpu ? { encoder_model: "fp32", decoder_model_merged: "q4" } : "q8",
        progress_callback: (info: ProgressInfo) => {
          if (info.status === "progress_total") post({ type: "model", progress: info.progress / 100 });
        },
      })) as AutomaticSpeechRecognitionPipeline;
    })();
    p.catch(() => loaded.delete(model));
    loaded.set(model, p);
  }
  return p;
}

/** Cut points every ~SLICE_S seconds, nudged to the quietest 50ms within ±3s to avoid splitting words. */
function sliceBoundaries(audio: Float32Array) {
  const cuts = [0];
  const win = SAMPLE_RATE * 0.05;
  for (let target = SLICE_S * SAMPLE_RATE; target < audio.length - SAMPLE_RATE * 5; target += SLICE_S * SAMPLE_RATE) {
    let best = target;
    let bestEnergy = Infinity;
    for (let s = target - 3 * SAMPLE_RATE; s < target + 3 * SAMPLE_RATE; s += win) {
      let e = 0;
      for (let i = s; i < s + win; i++) e += audio[i] * audio[i];
      if (e < bestEnergy) {
        bestEnergy = e;
        best = s;
      }
    }
    cuts.push(Math.round(best));
  }
  cuts.push(audio.length);
  return cuts;
}

self.onmessage = async (event: MessageEvent<WhisperRequest>) => {
  const post = (m: WhisperMessage) => self.postMessage(m);
  try {
    const { audio, model, language } = event.data;
    const asr = await load(model, post);
    post({ type: "model", progress: 1 });

    const cuts = sliceBoundaries(audio);
    const chunks: WhisperChunk[] = [];
    for (let i = 0; i < cuts.length - 1; i++) {
      const offset = cuts[i] / SAMPLE_RATE;
      const out = await asr(audio.subarray(cuts[i], cuts[i + 1]), {
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
        ...(language ? { language, task: "transcribe" } : {}),
      });
      const sliceEnd = cuts[i + 1] / SAMPLE_RATE;
      for (const c of out.chunks ?? [{ timestamp: [0, sliceEnd - offset] as [number, number], text: out.text }]) {
        const text = c.text.trim();
        if (!text) continue;
        const start = offset + (c.timestamp[0] ?? 0);
        const end = Math.min(sliceEnd, offset + (c.timestamp[1] ?? sliceEnd - offset));
        chunks.push({ start, end: Math.max(end, start + 0.5), text });
      }
      post({ type: "progress", progress: (i + 1) / (cuts.length - 1), chunks: [...chunks] });
    }
    post({ type: "done", chunks });
  } catch (err) {
    post({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
