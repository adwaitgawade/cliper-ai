import type { ReactNode } from "react";
import { Check, LinkIcon } from "../ui/icons";
import { Panel, SectionHeading } from "../ui/primitives";
import { Reveal } from "../ui/Reveal";

export const STEPS: { title: string; body: string; visual: ReactNode }[] = [
  {
    title: "Paste a link or upload",
    body: "Podcasts, webinars, streams, interviews — up to 10 hours long, from YouTube, Zoom, Drive or your desktop.",
    visual: <ImportVisual />,
  },
  {
    title: "AI finds the hooks",
    body: "ClipPro reads the transcript, the faces and the pacing, then scores every moment for how likely it is to hold attention.",
    visual: <ScoreVisual />,
  },
  {
    title: "Polish & publish",
    body: "Tweak captions, swap the crop, add your brand kit — then schedule to TikTok, Reels, Shorts and LinkedIn in one go.",
    visual: <PublishVisual />,
  },
];

export function HowItWorks() {
  return (
    <Panel id="how" tone="cream">
      <SectionHeading
        eyebrow="How it works"
        title="From long video to posted short in three steps"
        lead="No timelines, no keyframes, no exporting five aspect ratios by hand. The average ClipPro user goes from upload to first post in under 6 minutes."
      />
      <div className="grid gap-5 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal key={step.title} delay={i * 120} className="flex flex-col rounded-3xl bg-paper p-3 shadow-[0_1px_0_rgba(18,14,34,0.06)]">
            <div className="relative h-56 overflow-hidden rounded-[18px] bg-stage bg-[radial-gradient(80%_80%_at_50%_0%,var(--color-stage-light),var(--color-stage))] p-5">
              {step.visual}
            </div>
            <div className="flex gap-4 p-4 pt-6">
              <span className="font-heading font-soft text-5xl leading-none font-semibold text-accent/80">{i + 1}</span>
              <div>
                <h3 className="text-xl font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{step.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Panel>
  );
}

function ImportVisual() {
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <div className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2.5 text-xs text-ink shadow-lg">
        <LinkIcon size={14} className="text-muted" />
        <span className="truncate">youtube.com/watch?v=ep-142-full</span>
      </div>
      <div className="rounded-xl bg-white/10 p-3 text-xs text-cream backdrop-blur">
        <div className="mb-2 flex justify-between">
          <span>Analyzing 1h 42m episode…</span>
          <span className="font-semibold">64%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
          <div className="h-full w-[64%] animate-[loading_2.4s_ease-in-out_infinite] rounded-full bg-accent" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-cream/70">
          {["Transcribed", "Speakers found", "Scenes split"].map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
              <Check size={10} /> {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoreVisual() {
  const clips = [
    { at: "8%", w: "11%", score: 97 },
    { at: "34%", w: "9%", score: 91 },
    { at: "61%", w: "13%", score: 88 },
    { at: "83%", w: "8%", score: 84 },
  ];
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="relative h-14 rounded-lg bg-white/5">
        {/* fake waveform */}
        <div className="absolute inset-x-2 inset-y-3 flex items-center gap-[3px]">
          {Array.from({ length: 56 }, (_, i) => (
            <span key={i} className="flex-1 rounded-full bg-white/25" style={{ height: `${25 + Math.abs(Math.sin(i * 1.7) * 70)}%` }} />
          ))}
        </div>
        {clips.map((c) => (
          <span key={c.at} className="absolute inset-y-0 rounded-lg border-2 border-accent bg-accent/25" style={{ left: c.at, width: c.w }}>
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-cream px-1.5 py-0.5 text-[11px] font-bold text-ink shadow">
              {c.score}
            </span>
          </span>
        ))}
      </div>
      <div className="mt-5 flex justify-between text-[10px] text-cream/50">
        <span>00:00</span>
        <span>4 viral moments found</span>
        <span>1:42:10</span>
      </div>
    </div>
  );
}

function PublishVisual() {
  const posts = [
    { app: "TikTok", when: "Tue · 9:00", color: "#25f4ee" },
    { app: "Reels", when: "Tue · 12:30", color: "#ee2a7b" },
    { app: "Shorts", when: "Wed · 18:00", color: "#ff0033" },
    { app: "LinkedIn", when: "Thu · 8:15", color: "#0a66c2" },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      {posts.map((p, i) => (
        <div key={p.app} className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2 text-xs text-cream">
          <span className="size-2.5 rounded-full" style={{ background: p.color }} />
          <span className="font-semibold">{p.app}</span>
          <span className="ml-auto text-cream/60">{p.when}</span>
          <span
            className={`inline-flex size-5 items-center justify-center rounded-full ${i < 2 ? "bg-emerald-400 text-ink" : "bg-white/15"}`}
          >
            {i < 2 && <Check size={12} strokeWidth={3} />}
          </span>
        </div>
      ))}
    </div>
  );
}
