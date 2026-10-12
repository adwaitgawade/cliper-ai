import { Captions, Crop, Sparkles } from "lucide-react";
import { Logo } from "@/components/app/logo";

const POINTS = [
  {
    icon: Sparkles,
    text: "AI finds the moments worth sharing, ranked by hook and payoff.",
  },
  {
    icon: Crop,
    text: "Vertical 9:16 framing, ready for Shorts, Reels and TikTok.",
  },
  {
    icon: Captions,
    text: "Word-synced captions you can restyle and preview instantly.",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-6 p-6 md:p-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-zinc-950 text-zinc-50 lg:flex lg:flex-col lg:justify-end lg:p-12">
        <div
          aria-hidden
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(60% 50% at 70% 25%, oklch(0.55 0.23 285 / 0.55), transparent 70%), radial-gradient(45% 40% at 20% 70%, oklch(0.7 0.17 162 / 0.25), transparent 70%)",
          }}
        />
        <div aria-hidden className="absolute top-16 right-16 flex gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="aspect-[9/16] w-28 rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm"
              style={{
                transform: `translateY(${i * 28}px) rotate(${(i - 1) * 4}deg)`,
              }}
            >
              <div className="mx-3 mt-[70%] h-2 rounded bg-white/70" />
              <div className="mx-6 mt-1.5 h-2 rounded bg-[oklch(0.85_0.17_95)]" />
            </div>
          ))}
        </div>
        <div className="relative max-w-md space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight text-balance">
            Long videos in. Scroll-stopping clips out.
          </h2>
          <ul className="space-y-3 text-sm text-zinc-300">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3">
                <Icon className="mt-0.5 size-4 shrink-0 text-[oklch(0.78_0.15_285)]" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
