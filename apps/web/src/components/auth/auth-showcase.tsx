"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    title: "Long videos in. Scroll-stopping clips out.",
    body: "AI finds the moments worth sharing, ranked by hook and payoff.",
  },
  {
    title: "Framed for vertical, automatically.",
    body: "9:16 crops ready for Shorts, Reels and TikTok.",
  },
  {
    title: "Captions that keep people watching.",
    body: "Word-synced captions you can restyle and preview instantly.",
  },
];

const INTERVAL_MS = 6000;

// Rotating taglines over the stage panel; dots switch slides and restart the timer.
export function AuthShowcase() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(
      () => setIndex((i) => (i + 1) % SLIDES.length),
      INTERVAL_MS,
    );
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div className="relative space-y-8 text-center">
      <div className="grid">
        {SLIDES.map((s, i) => (
          <div
            key={s.title}
            aria-hidden={i !== index}
            className={cn(
              "col-start-1 row-start-1 mx-auto max-w-md space-y-3 transition-all duration-700",
              i === index
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0",
            )}
          >
            <h2 className="font-heading font-soft text-[2.1rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance">
              {s.title}
            </h2>
            <p className="mx-auto max-w-xs text-sm text-pretty text-cream/65">
              {s.body}
            </p>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show slide ${i + 1}`}
            aria-current={i === index}
            className={cn(
              "h-1 rounded-full transition-all duration-500",
              i === index
                ? "w-10 bg-cream"
                : "w-6 bg-cream/30 hover:bg-cream/50",
            )}
          />
        ))}
      </div>
    </div>
  );
}
