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
    // Lilac frame with rounded panels, matching apps/main-site.
    <div className="grid min-h-svh gap-2 bg-frame p-2 lg:grid-cols-2">
      <div className="flex flex-col gap-6 rounded-2xl bg-background p-6 shadow-sm md:p-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden rounded-2xl bg-stage-gradient text-cream lg:flex lg:flex-col lg:justify-end lg:p-12">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(40% 40% at 72% 30%, rgba(140, 108, 255, 0.45), transparent 70%)",
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
              <div className="mx-6 mt-1.5 h-2 rounded bg-[#facc15]" />
            </div>
          ))}
        </div>
        <div className="relative max-w-md space-y-6">
          <h2 className="font-heading font-soft text-4xl leading-[1.02] font-semibold tracking-[-0.035em] text-balance">
            Long videos in. Scroll-stopping clips out.
          </h2>
          <ul className="space-y-3 text-sm text-cream/70">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3">
                <Icon className="mt-0.5 size-4 shrink-0 text-brand-soft" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
