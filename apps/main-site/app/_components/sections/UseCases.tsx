import type { ReactNode } from "react";
import { Briefcase, Check, Megaphone, Mic, Video } from "../ui/icons";
import { Panel, SectionHeading } from "../ui/primitives";
import { Reveal } from "../ui/Reveal";

const CASES: { icon: ReactNode; who: string; pitch: string; points: string[]; tint: string }[] = [
  {
    icon: <Mic />,
    who: "Podcasters",
    pitch: "Turn every episode into 15+ shorts that send listeners back to the full show.",
    points: ["Multi-speaker tracking", "Chapter-aware clipping", "Audiogram layouts for audio-only shows"],
    tint: "from-[#f9d7e7] to-[#e7dcff]",
  },
  {
    icon: <Video />,
    who: "Creators & streamers",
    pitch: "Clip your streams and long-form while you sleep, and keep every channel fed daily.",
    points: ["Twitch & YouTube VOD import", "Gaming facecam layouts", "Trend-aware hooks"],
    tint: "from-[#d6ecff] to-[#e7dcff]",
  },
  {
    icon: <Briefcase />,
    who: "Agencies",
    pitch: "Run short-form for 30 clients without hiring 30 editors.",
    points: ["Workspaces per client", "Brand kits & approvals", "Bulk export & API"],
    tint: "from-[#fff1c9] to-[#ffe0d1]",
  },
  {
    icon: <Megaphone />,
    who: "Marketing teams",
    pitch: "Repurpose webinars, demos and customer calls into content that actually ships.",
    points: ["Zoom & Riverside import", "LinkedIn-ready 1:1 and 4:5", "SSO & team seats"],
    tint: "from-[#d7f5e6] to-[#d6ecff]",
  },
];

export function UseCases() {
  return (
    <Panel tone="paper">
      <SectionHeading
        eyebrow="Built for"
        title="Anyone with more video than time"
        lead="Whether you publish one episode a week or run a 40-person content studio, ClipPro fits the way you already work."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CASES.map((c, i) => (
          <Reveal
            key={c.who}
            delay={i * 90}
            className={`flex flex-col rounded-3xl bg-gradient-to-br p-6 ${c.tint} transition-transform duration-300 hover:-translate-y-1`}
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-ink text-cream">{c.icon}</span>
            <h3 className="mt-6 font-heading font-soft text-2xl font-semibold tracking-tight">{c.who}</h3>
            <p className="mt-2 flex-1 leading-relaxed text-ink/70">{c.pitch}</p>
            <ul className="mt-6 space-y-2.5 border-t border-ink/10 pt-5 text-sm">
              {c.points.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-stage-light" />
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </Panel>
  );
}
