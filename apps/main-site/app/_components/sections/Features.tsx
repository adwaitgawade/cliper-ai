import type { ReactNode } from "react";
import { HERO_CLIPS } from "../hero/clips";
import { Captions, Calendar, Code, Crop, Film, Gauge, Globe, Palette, Scissors, Sparkles, Zap } from "../ui/icons";
import { Panel, SectionHeading } from "../ui/primitives";
import { Reveal } from "../ui/Reveal";

export function Features() {
  return (
    <Panel id="features" tone="stage">
      <SectionHeading
        dark
        eyebrow="Features"
        title="Everything a clip needs to go viral"
        lead="One upload gives you the moments, the captions, the crop and the schedule. You stay in charge of taste; ClipPro does the grind."
      />

      <div className="grid gap-4 lg:grid-cols-6">
        <Card
          className="lg:col-span-4"
          icon={<Scissors />}
          title="AI clipping"
          body="Finds 30–90 second moments with a hook, a payoff and zero dead air — then trims the ums, the pauses and the throat-clears."
        >
          <ClippingVisual />
        </Card>
        <Card
          className="lg:col-span-2"
          icon={<Gauge />}
          title="Virality score"
          body="Every clip is graded on hook, flow, value and trend fit, so you post the winners first."
        >
          <ScoreVisual />
        </Card>
        <Card
          className="lg:col-span-2"
          icon={<Captions />}
          title="Animated captions"
          body="97% accurate in 30+ languages, with 20 styles and keyword highlights."
        >
          <CaptionVisual />
        </Card>
        <Card
          className="lg:col-span-2"
          icon={<Crop />}
          title="AI reframe"
          body="Speaker tracking keeps faces centered in 9:16, 1:1 or 4:5 — even with two people on camera."
        >
          <ReframeVisual />
        </Card>
        <Card
          className="lg:col-span-2"
          icon={<Film />}
          title="B-roll & emoji"
          body="Contextual B-roll, emoji and sound effects dropped in on the beat. Swap any of them in a click."
        >
          <BrollVisual />
        </Card>
        <Card
          className="lg:col-span-2"
          icon={<Palette />}
          title="Brand kit"
          body="Your fonts, colors, logo, intro and outro — applied to every clip automatically."
        >
          <BrandVisual />
        </Card>
        <Card
          className="lg:col-span-4"
          icon={<Calendar />}
          title="Auto-post & scheduler"
          body="Connect TikTok, Instagram, YouTube, LinkedIn, X and Facebook. Queue a month of posts at the times your audience is online."
        >
          <ScheduleVisual />
        </Card>
      </div>

      <Reveal className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { icon: <Globe size={18} />, label: "30+ caption languages" },
          { icon: <Film size={18} />, label: "XML export to Premiere & DaVinci" },
          { icon: <Zap size={18} />, label: "1080p & 4K exports" },
          { icon: <Code size={18} />, label: "REST API & webhooks" },
        ].map((f) => (
          <div key={f.label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-cream/85">
            <span className="text-accent-soft">{f.icon}</span>
            {f.label}
          </div>
        ))}
      </Reveal>

      <Reveal className="mt-16 grid grid-cols-2 gap-y-10 border-t border-white/10 pt-14 md:grid-cols-4">
        {[
          ["4.2M", "clips created"],
          ["120K", "creators & teams"],
          ["+38%", "avg. lift in views"],
          ["10×", "faster than manual editing"],
        ].map(([n, l]) => (
          <div key={l} className="text-center">
            <div className="font-heading font-soft text-5xl font-semibold tracking-[-0.04em] md:text-6xl">{n}</div>
            <div className="mt-2 text-sm text-cream/60">{l}</div>
          </div>
        ))}
      </Reveal>
    </Panel>
  );
}

function Card({
  icon,
  title,
  body,
  children,
  className = "",
}: {
  icon: ReactNode;
  title: string;
  body: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Reveal
      className={`group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] transition-colors hover:bg-white/[0.07] ${className}`}
    >
      <div className="relative h-60 overflow-hidden border-b border-white/10">{children}</div>
      <div className="p-6">
        <h3 className="flex items-center gap-2.5 text-lg font-semibold">
          <span className="text-accent-soft">{icon}</span>
          {title}
        </h3>
        <p className="mt-2 leading-relaxed text-cream/65">{body}</p>
      </div>
    </Reveal>
  );
}

const poster = (i: number) => `${HERO_CLIPS[i].src}#t=2`;

function ClipThumb({ i, className = "" }: { i: number; className?: string }) {
  return (
    <video
      src={poster(i)}
      muted
      playsInline
      preload="metadata"
      aria-hidden
      className={`h-full w-full bg-[linear-gradient(160deg,#4b3d8f,#1a1533)] object-cover ${className}`}
    />
  );
}

function ClippingVisual() {
  const picks = [
    { i: 5, score: 97, len: "0:41" },
    { i: 0, score: 93, len: "0:58" },
    { i: 4, score: 89, len: "0:33" },
    { i: 1, score: 86, len: "1:12" },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-5 px-6">
      <div className="relative h-9 overflow-hidden rounded-lg bg-white/10">
        <div className="absolute inset-0 flex gap-px">
          {Array.from({ length: 24 }, (_, i) => (
            <span key={i} className="flex-1" style={{ background: `hsl(${250 + ((i * 23) % 60)} 30% ${18 + ((i * 7) % 14)}%)` }} />
          ))}
        </div>
        <span className="absolute inset-y-0 w-16 animate-[scan_3.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-cream/70">Source · 1:42:10</span>
      </div>
      <div className="flex justify-center gap-3">
        {picks.map((p, k) => (
          <div
            key={p.i}
            className="relative aspect-[9/16] w-[17%] max-w-24 overflow-hidden rounded-xl border-2 border-cream/90 shadow-xl transition-transform duration-500 group-hover:-translate-y-1"
            style={{ transitionDelay: `${k * 60}ms` }}
          >
            <ClipThumb i={p.i} />
            <span className="absolute left-1 top-1 rounded-md bg-cream px-1 text-[10px] font-bold text-ink">{p.score}</span>
            <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[9px] font-semibold">{p.len}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreVisual() {
  const r = 52;
  const c = 2 * Math.PI * r;
  const parts = [
    ["Hook", 9.6],
    ["Flow", 9.1],
    ["Value", 8.8],
    ["Trend", 9.4],
  ] as const;
  return (
    <div className="flex h-full items-center justify-center gap-6 px-6">
      <div className="relative size-32 shrink-0">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="url(#score)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${c * 0.97} ${c}`}
          />
          <defs>
            <linearGradient id="score" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#d9cff7" />
              <stop offset="1" stopColor="#8c6cff" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-heading text-4xl font-semibold leading-none">97</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-cream/50">score</div>
          </div>
        </div>
      </div>
      <div className="w-full max-w-36 space-y-2.5 text-xs">
        {parts.map(([k, v]) => (
          <div key={k}>
            <div className="mb-1 flex justify-between text-cream/70">
              <span>{k}</span>
              <span className="font-semibold text-cream">{v}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-accent-soft" style={{ width: `${v * 10}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CaptionVisual() {
  const words = ["This", "is", "the", "part", "nobody", "talks", "about"];
  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative aspect-[9/16] h-[86%] overflow-hidden rounded-2xl border-2 border-cream/90 shadow-2xl">
        <ClipThumb i={0} />
        <div className="absolute inset-x-2 top-[58%] flex flex-wrap justify-center gap-x-1 text-center font-black uppercase leading-tight text-white [text-shadow:0_2px_0_#000,0_0_8px_rgba(0,0,0,0.6)]">
          {words.map((w, i) => (
            <span
              key={i}
              className="animate-[caption-word_3.5s_ease-out_infinite] text-[13px]"
              style={{ animationDelay: `${i * 0.38}s` }}
            >
              {w}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReframeVisual() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="relative aspect-video w-full max-w-72 overflow-hidden rounded-xl bg-[linear-gradient(160deg,#4b3d8f,#1a1533)]">
        {/* two "speakers" */}
        {[28, 70].map((x) => (
          <div key={x} className="absolute bottom-0 -translate-x-1/2" style={{ left: `${x}%` }}>
            <div className="mx-auto size-9 rounded-full bg-[#e9d5c3]" />
            <div className="mt-1 h-12 w-16 rounded-t-3xl bg-[#6d5bd0]" />
          </div>
        ))}
        <div className="absolute inset-y-0 w-[31.6%] animate-[reframe_5s_ease-in-out_infinite] rounded-md border-2 border-cream shadow-[0_0_0_999px_rgba(13,10,26,0.6)]">
          <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 -translate-y-full rounded bg-cream px-1.5 text-[9px] font-bold text-ink">
            9:16
          </span>
          <span className="absolute left-1/2 top-[30%] size-10 -translate-x-1/2 rounded-full border border-dashed border-accent-soft" />
        </div>
      </div>
    </div>
  );
}

function BrollVisual() {
  const tiles = [
    "linear-gradient(135deg,#fbbf24,#f97316)",
    "linear-gradient(135deg,#34d399,#0ea5e9)",
    "linear-gradient(135deg,#f472b6,#8b5cf6)",
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="flex gap-2">
        {tiles.map((bg, i) => (
          <div
            key={i}
            className="aspect-video w-24 rounded-lg border border-white/20 shadow-lg transition-transform duration-500 group-hover:-rotate-2"
            style={{ background: bg, transform: `rotate(${(i - 1) * 4}deg)` }}
          />
        ))}
      </div>
      <div className="flex gap-2 text-2xl">
        {["🔥", "💡", "😂", "🚀"].map((e, i) => (
          <span key={e} className="animate-[pop_2.8s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.3}s` }}>
            {e}
          </span>
        ))}
      </div>
      <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-cream/70">+ whoosh.wav at 0:12</span>
    </div>
  );
}

function BrandVisual() {
  return (
    <div className="flex h-full items-center justify-center gap-4 px-6">
      <div className="grid w-full max-w-64 grid-cols-2 gap-2.5">
        <div className="col-span-2 flex items-center justify-between rounded-xl bg-cream px-4 py-3 text-ink">
          <span className="font-heading text-3xl font-semibold">Aa</span>
          <span className="text-right text-[10px] leading-tight text-muted">
            Fraunces
            <br />
            Geist
          </span>
        </div>
        <div className="flex gap-1.5 rounded-xl bg-white/10 p-3">
          {["#8c6cff", "#f3eee4", "#ee2a7b", "#120e22"].map((c) => (
            <span key={c} className="size-5 rounded-full border border-white/20" style={{ background: c }} />
          ))}
        </div>
        <div className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 p-3 text-[11px] font-semibold">
          <Sparkles size={14} className="text-accent-soft" /> Logo
        </div>
        <div className="col-span-2 flex gap-2 text-[11px]">
          <span className="flex-1 rounded-lg border border-white/15 py-1.5 text-center text-cream/70">Intro · 2s</span>
          <span className="flex-1 rounded-lg border border-white/15 py-1.5 text-center text-cream/70">Outro · 3s</span>
        </div>
      </div>
    </div>
  );
}

function ScheduleVisual() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const apps: Record<string, string> = {
    TikTok: "#25f4ee",
    Reels: "#ee2a7b",
    Shorts: "#ff0033",
    LinkedIn: "#0a66c2",
    X: "#e7e5e4",
  };
  const plan: [number, string, string][] = [
    [0, "TikTok", "9:00"],
    [0, "Reels", "12:30"],
    [1, "Shorts", "18:00"],
    [2, "LinkedIn", "8:15"],
    [2, "TikTok", "19:00"],
    [3, "Reels", "11:00"],
    [4, "X", "10:30"],
    [4, "Shorts", "17:45"],
    [5, "TikTok", "13:00"],
    [6, "Reels", "16:20"],
  ];
  return (
    <div className="flex h-full items-center px-4 sm:px-6">
      <div className="grid w-full grid-cols-7 gap-1 sm:gap-2">
        {days.map((d, di) => (
          <div key={d} className="min-w-0">
            <div className="mb-2 text-center text-[11px] font-medium text-cream/50">{d}</div>
            <div className="flex h-36 flex-col gap-1.5 rounded-xl bg-white/[0.04] p-1.5">
              {plan
                .filter(([day]) => day === di)
                .map(([, app, time]) => (
                  <div
                    key={app + time}
                    title={`${app} · ${time}`}
                    className="h-5 truncate rounded-md text-[10px] font-semibold sm:h-auto sm:px-1.5 sm:py-1"
                    style={{ background: apps[app], color: app === "LinkedIn" || app === "Shorts" ? "#fff" : "#120e22" }}
                  >
                    {/* Colour-only chips on phones, where 7 columns leave no room for labels. */}
                    <span className="hidden sm:inline">{app}</span>
                    <span className="hidden font-normal opacity-70 sm:block">{time}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
