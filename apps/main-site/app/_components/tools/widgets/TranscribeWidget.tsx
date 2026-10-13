"use client";

import { useRef, useState } from "react";
import { decodeForSpeech } from "../engine/media";
import {
  clock,
  downloadText,
  LANGUAGES,
  toCues,
  toSrt,
  toText,
  toVtt,
  transcribe,
  type WhisperChunk,
  type WhisperModel,
} from "../engine/transcribe";
import { Dropzone, ErrorNote, PrimaryButton, PrivacyNote, ProgressBar, Segmented } from "./ui";

type Stage =
  | { kind: "idle" }
  | { kind: "working"; label: string; progress: number | null; partial: WhisperChunk[] }
  | { kind: "done"; chunks: WhisperChunk[] }
  | { kind: "error"; message: string };

const ACCEPT = "video/*,audio/*,.mkv,.m4a,.ogg";

export function TranscribeWidget({ mode }: { mode: "text" | "subtitles" }) {
  const [file, setFile] = useState<File | null>(null);
  const [model, setModel] = useState<WhisperModel>("base");
  const [language, setLanguage] = useState("");
  const [timestamps, setTimestamps] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  const cancelRef = useRef<() => void>(() => {});

  const busy = stage.kind === "working";
  const base = file?.name.replace(/\.[^.]+$/, "") || "transcript";

  async function start() {
    if (!file) return;
    const abort = new AbortController();
    let cancelWorker = () => {};
    cancelRef.current = () => {
      abort.abort();
      cancelWorker();
      setStage({ kind: "idle" });
    };
    try {
      setStage({ kind: "working", label: "Extracting audio…", progress: 0, partial: [] });
      const audio = await decodeForSpeech(file, (p) => setStage((s) => (s.kind === "working" ? { ...s, progress: p } : s)), abort.signal);
      if (abort.signal.aborted) return;
      if (audio.length < 16000 * 0.5) throw new Error("The audio is too short to transcribe.");

      setStage({ kind: "working", label: "Loading the AI model (one-time download, then cached)…", progress: 0, partial: [] });
      const job = transcribe(audio, { model, language: language || null }, (m) => {
        if (m.type === "model" && m.progress < 1) {
          setStage({ kind: "working", label: "Loading the AI model (one-time download, then cached)…", progress: m.progress, partial: [] });
        } else if (m.type === "model") {
          setStage({ kind: "working", label: "Transcribing on your device…", progress: 0, partial: [] });
        } else if (m.type === "progress") {
          setStage({ kind: "working", label: "Transcribing on your device…", progress: m.progress, partial: m.chunks });
        }
      });
      cancelWorker = job.cancel;
      const chunks = await job.promise;
      setStage(chunks.length ? { kind: "done", chunks } : { kind: "error", message: "No speech was detected in this file." });
    } catch (err) {
      if (abort.signal.aborted) return;
      setStage({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong." });
    }
  }

  const text = stage.kind === "done" ? toText(stage.chunks, timestamps) : "";
  const cues = stage.kind === "done" ? toCues(stage.chunks) : [];

  return (
    <div className="space-y-5">
      <Dropzone
        accept={ACCEPT}
        hint="MP4, MOV, WebM, MKV, MP3, WAV, M4A or OGG"
        file={file}
        disabled={busy}
        onFile={(f) => {
          setFile(f);
          setStage({ kind: "idle" });
        }}
      />

      {stage.kind !== "done" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Segmented<WhisperModel>
            label="Model"
            value={model}
            onChange={setModel}
            options={[
              { value: "tiny", label: "Fast", hint: "~40 MB, quick drafts" },
              { value: "base", label: "Accurate", hint: "~80 MB, recommended" },
            ]}
          />
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Spoken language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={busy}
              className="h-[58px] w-full rounded-xl border border-ink/15 bg-white px-3 text-sm capitalize"
            >
              <option value="">Auto-detect</option>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {stage.kind === "working" && (
        <div className="space-y-3">
          <ProgressBar label={stage.label} value={stage.progress} />
          {stage.partial.length > 0 && (
            <p className="max-h-32 overflow-y-auto rounded-2xl bg-cream/60 p-4 text-sm leading-relaxed text-muted">
              {toText(stage.partial, false)}
            </p>
          )}
          <button type="button" onClick={() => cancelRef.current()} className="text-sm font-semibold text-muted hover:text-ink">
            Cancel
          </button>
        </div>
      )}

      {stage.kind === "error" && <ErrorNote>{stage.message}</ErrorNote>}

      {stage.kind === "done" && mode === "text" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={timestamps} onChange={(e) => setTimestamps(e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
              Show timestamps
            </label>
            <span className="text-xs text-muted">{text.split(/\s+/).filter(Boolean).length.toLocaleString()} words</span>
          </div>
          <textarea readOnly value={text} className="h-64 w-full resize-y rounded-2xl border border-ink/10 bg-white p-4 text-[15px] leading-relaxed" />
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="h-11 rounded-xl border border-ink/15 text-sm font-semibold hover:border-ink/40"
            >
              {copied ? "Copied!" : "Copy text"}
            </button>
            <button type="button" onClick={() => downloadText(text, `${base}.txt`)} className="h-11 rounded-xl bg-ink text-sm font-semibold text-cream hover:bg-black">
              Download .txt
            </button>
            <button type="button" onClick={() => setStage({ kind: "idle" })} className="h-11 rounded-xl text-sm font-semibold text-muted hover:text-ink">
              Start over
            </button>
          </div>
        </div>
      )}

      {stage.kind === "done" && mode === "subtitles" && (
        <div className="space-y-3">
          <ol className="max-h-72 divide-y divide-ink/5 overflow-y-auto rounded-2xl border border-ink/10 bg-white text-sm">
            {cues.map((c, i) => (
              <li key={i} className="flex gap-4 px-4 py-2.5">
                <span className="w-24 shrink-0 font-mono text-xs leading-5 text-muted">
                  {clock(c.start)} → {clock(c.end)}
                </span>
                <span className="whitespace-pre-line">{c.text}</span>
              </li>
            ))}
          </ol>
          <div className="grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={() => downloadText(toSrt(cues), `${base}.srt`, "application/x-subrip")} className="h-11 rounded-xl bg-ink text-sm font-semibold text-cream hover:bg-black">
              Download .srt
            </button>
            <button type="button" onClick={() => downloadText(toVtt(cues), `${base}.vtt`, "text/vtt")} className="h-11 rounded-xl border border-ink/15 text-sm font-semibold hover:border-ink/40">
              Download .vtt
            </button>
            <button type="button" onClick={() => setStage({ kind: "idle" })} className="h-11 rounded-xl text-sm font-semibold text-muted hover:text-ink">
              Start over
            </button>
          </div>
        </div>
      )}

      {(stage.kind === "idle" || stage.kind === "error") && (
        <PrimaryButton disabled={!file} onClick={start}>
          {mode === "text" ? "Transcribe to text" : "Generate subtitles"}
        </PrimaryButton>
      )}
      <PrivacyNote />
    </div>
  );
}
