import type { WhisperChunk, WhisperMessage, WhisperModel } from "./whisper.worker";

export type { WhisperChunk, WhisperModel };

/** Run Whisper in a dedicated worker. Terminating the worker is the only way to cancel mid-inference. */
export function transcribe(
  audio: Float32Array,
  options: { model: WhisperModel; language: string | null },
  onMessage: (m: WhisperMessage) => void,
) {
  const worker = new Worker(new URL("./whisper.worker.ts", import.meta.url), { type: "module" });
  const promise = new Promise<WhisperChunk[]>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<WhisperMessage>) => {
      onMessage(e.data);
      if (e.data.type === "done") resolve(e.data.chunks);
      if (e.data.type === "error") reject(new Error(e.data.message));
    };
    worker.onerror = (e) => reject(new Error(e.message || "The transcription worker crashed."));
  }).finally(() => worker.terminate());
  // Transfer the samples instead of copying a potentially huge buffer.
  worker.postMessage({ audio, ...options }, [audio.buffer]);
  return { promise, cancel: () => worker.terminate() };
}

// Languages offered in the picker, as Whisper expects them (full lowercase names).
export const LANGUAGES = [
  "english", "spanish", "portuguese", "french", "german", "italian", "dutch", "hindi", "japanese", "korean",
  "chinese", "arabic", "russian", "turkish", "polish", "indonesian", "vietnamese", "thai", "ukrainian", "swedish",
];

const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, "0");

function stamp(t: number, sep: "," | ".") {
  const ms = Math.round(t * 1000);
  return `${pad(ms / 3_600_000)}:${pad((ms / 60_000) % 60)}:${pad((ms / 1000) % 60)}${sep}${pad(ms % 1000, 3)}`;
}

export function clock(t: number) {
  const s = Math.floor(t);
  return s >= 3600 ? `${pad(s / 3600)}:${pad((s / 60) % 60)}:${pad(s % 60)}` : `${pad(s / 60)}:${pad(s % 60)}`;
}

export function toText(chunks: WhisperChunk[], timestamps: boolean) {
  if (timestamps) return chunks.map((c) => `[${clock(c.start)}] ${c.text}`).join("\n");
  return chunks.map((c) => c.text).join(" ").replace(/\s+/g, " ").trim();
}

/** Split long segments into readable cues (≤ 2 lines × 42 chars), sharing time by text length. */
export function toCues(chunks: WhisperChunk[], maxChars = 84): WhisperChunk[] {
  const cues: WhisperChunk[] = [];
  for (const c of chunks) {
    const groups: string[] = [];
    let line = "";
    for (const word of c.text.split(/\s+/)) {
      if (line && (line + " " + word).length > maxChars) {
        groups.push(line);
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    if (line) groups.push(line);
    const total = groups.reduce((n, g) => n + g.length, 0) || 1;
    let t = c.start;
    for (const g of groups) {
      const d = ((c.end - c.start) * g.length) / total;
      cues.push({ start: t, end: t + d, text: wrap(g) });
      t += d;
    }
  }
  return cues;
}

function wrap(text: string, width = 42) {
  if (text.length <= width) return text;
  const mid = text.lastIndexOf(" ", Math.ceil(text.length / 2) + 6);
  return mid > 0 ? `${text.slice(0, mid)}\n${text.slice(mid + 1)}` : text;
}

export function toSrt(cues: WhisperChunk[]) {
  return cues.map((c, i) => `${i + 1}\n${stamp(c.start, ",")} --> ${stamp(c.end, ",")}\n${c.text}\n`).join("\n");
}

export function toVtt(cues: WhisperChunk[]) {
  return `WEBVTT\n\n${cues.map((c) => `${stamp(c.start, ".")} --> ${stamp(c.end, ".")}\n${c.text}\n`).join("\n")}`;
}

export function downloadText(text: string, filename: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
