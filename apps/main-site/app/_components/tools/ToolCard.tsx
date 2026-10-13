import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Camera, Captions, Crop, Download, Gif, ImageIcon, Mic, Music, Phone, RotateIcon, Scissors, TypeIcon, Volume, Zap } from "../ui/icons";
import type { ToolContent, ToolWidget } from "./content/types";

export const TOOL_ICONS: Record<ToolWidget, ReactNode> = {
  "transcribe-text": <Mic />,
  "transcribe-subtitles": <Captions />,
  "video-to-mp3": <Music />,
  "resize-vertical": <Phone />,
  compress: <Zap />,
  trim: <Scissors />,
  "yt-thumbnail": <ImageIcon />,
  "extract-frame": <Camera />,
  rotate: <RotateIcon />,
  crop: <Crop />,
  volume: <Volume />,
  "text-overlay": <TypeIcon />,
  gif: <Gif />,
  downloader: <Download />,
};

export function ToolCard({ tool }: { tool: ToolContent }) {
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group flex h-full flex-col rounded-3xl border border-ink/10 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-[0_20px_40px_-24px_rgba(26,21,51,0.45)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-stage text-accent-soft">{TOOL_ICONS[tool.widget]}</span>
        {tool.status === "soon" ? (
          <span className="rounded-full bg-cream px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Coming soon</span>
        ) : (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Free</span>
        )}
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-tight">{tool.name}</h3>
      <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{tool.cardDescription}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
        {tool.status === "soon" ? "Learn more" : "Open tool"}
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
