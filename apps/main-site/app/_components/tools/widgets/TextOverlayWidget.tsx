"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { addTextToVideo, drawText, type TextStyle } from "../engine/edit";
import { OVERLAY_FONTS } from "./fonts";
import { FramePreview, useVideoFrames } from "./frames";
import { JobStatus, useJob } from "./job";
import { Dropzone, ErrorNote, PrimaryButton, PrivacyNote, ProgressBar, Slider } from "./ui";

const POSITIONS: [number, number][] = [
  [0.15, 0.1], [0.5, 0.1], [0.85, 0.1],
  [0.15, 0.5], [0.5, 0.5], [0.85, 0.5],
  [0.15, 0.9], [0.5, 0.9], [0.85, 0.9],
];

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function TextOverlayWidget() {
  const [file, setFile] = useState<File | null>(null);
  const { frames, error, loading } = useVideoFrames(file);
  const job = useJob();

  const [text, setText] = useState("@yourhandle");
  const [fontId, setFontId] = useState("anton");
  const [bold, setBold] = useState(false);
  const [size, setSize] = useState(7); // % of video height
  const [color, setColor] = useState("#ffffff");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [stroke, setStroke] = useState(8); // % of font size
  const [opacity, setOpacity] = useState(90);
  const [box, setBox] = useState(false);
  const [boxColor, setBoxColor] = useState("#000000");
  const [pos, setPos] = useState<[number, number]>([0.5, 0.9]);
  const [fontsReady, setFontsReady] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const font = OVERLAY_FONTS.find((f) => f.id === fontId)!;

  // Web fonts must be loaded before canvas can draw with them; repaint once they are.
  useEffect(() => {
    let alive = true;
    document.fonts.load(`${bold ? 700 : 400} 48px ${font.family()}`).then(() => alive && setFontsReady((n) => n + 1));
    return () => {
      alive = false;
    };
  }, [font, bold]);

  const style: TextStyle = {
    text,
    fontFamily: font.family(),
    bold,
    size: size / 100,
    color,
    strokeColor,
    stroke: stroke / 100,
    opacity: opacity / 100,
    box,
    boxColor: hexToRgba(boxColor, 0.55),
    x: pos[0],
    y: pos[1],
  };
  const styleKey = JSON.stringify(style) + fontsReady;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- styleKey captures every input of `style`
  const overlay = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => drawText(ctx, w, h, style), [styleKey]);

  const place = (e: ReactPointerEvent) => {
    const r = wrap.current!.getBoundingClientRect();
    setPos([Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]);
  };

  return (
    <div className="space-y-5">
      <Dropzone
        accept="video/*,.mkv"
        hint="MP4, MOV, WebM or MKV"
        file={file}
        disabled={job.busy}
        onFile={(f) => {
          setFile(f);
          job.reset();
        }}
      />
      {loading && <ProgressBar label="Opening video…" value={null} />}
      {error && <ErrorNote>{error}</ErrorNote>}

      {frames && job.stage.kind !== "done" && (
        <>
          <div
            ref={wrap}
            className="relative cursor-crosshair touch-none overflow-hidden rounded-2xl"
            onPointerDown={(e) => {
              dragging.current = true;
              (e.target as Element).setPointerCapture(e.pointerId);
              place(e);
            }}
            onPointerMove={(e) => dragging.current && place(e)}
            onPointerUp={() => (dragging.current = false)}
          >
            <FramePreview frames={frames} t={frames.duration * 0.1} overlay={overlay} className="w-full" />
          </div>
          <p className="-mt-3 text-center text-xs text-muted">Click or drag on the preview to place your text.</p>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Your text</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={2}
                  maxLength={200}
                  className="w-full resize-y rounded-xl border border-ink/15 bg-white p-3 text-[15px]"
                />
              </label>
              <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">Font</span>
                  <select value={fontId} onChange={(e) => setFontId(e.target.value)} className="h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-sm">
                    {OVERLAY_FONTS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  aria-pressed={bold}
                  onClick={() => setBold((b) => !b)}
                  className={`h-11 w-11 rounded-xl border text-sm font-bold ${bold ? "border-ink bg-ink text-cream" : "border-ink/15"}`}
                >
                  B
                </button>
              </div>
              <Slider label="Size" value={size} min={2} max={20} format={(v) => `${v}%`} onChange={setSize} />
              <Slider label="Opacity" value={opacity} min={10} max={100} step={5} format={(v) => `${v}%`} onChange={setOpacity} />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <ColorField label="Text color" value={color} onChange={setColor} />
                <ColorField label="Outline color" value={strokeColor} onChange={setStrokeColor} />
              </div>
              <Slider label="Outline width" value={stroke} min={0} max={20} format={(v) => (v ? `${v}%` : "None")} onChange={setStroke} />
              <div className="flex items-end gap-3">
                <label className="flex h-11 items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={box} onChange={(e) => setBox(e.target.checked)} className="size-4 accent-[var(--color-ink)]" />
                  Background box
                </label>
                {box && <ColorField label="Box color" value={boxColor} onChange={setBoxColor} />}
              </div>
              <div>
                <span className="mb-1.5 block text-sm font-semibold">Position</span>
                <div className="grid w-32 grid-cols-3 gap-1">
                  {POSITIONS.map((p, i) => {
                    const active = Math.abs(pos[0] - p[0]) < 0.01 && Math.abs(pos[1] - p[1]) < 0.01;
                    return (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Position ${i + 1}`}
                        onClick={() => setPos(p)}
                        className={`h-8 rounded-md border ${active ? "border-ink bg-ink" : "border-ink/15 bg-white hover:border-ink/40"}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <JobStatus job={job} label="Adding text to every frame…" preview="video" />
      {frames && (job.stage.kind === "idle" || job.stage.kind === "error") && (
        <PrimaryButton
          disabled={!text.trim()}
          onClick={async () => {
            if (!file) return;
            await document.fonts.load(`${bold ? 700 : 400} 48px ${font.family()}`);
            job.run((p, s) => addTextToVideo(file, { ...style, fontFamily: font.family() }, p, s));
          }}
        >
          Add text & export MP4
        </PrimaryButton>
      )}
      <PrivacyNote />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <span className="flex h-11 items-center gap-2 rounded-xl border border-ink/15 bg-white px-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-7 cursor-pointer rounded border-0 bg-transparent p-0" />
        <span className="font-mono text-xs uppercase text-muted">{value}</span>
      </span>
    </label>
  );
}
