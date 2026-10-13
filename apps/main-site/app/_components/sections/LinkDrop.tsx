"use client";

import { useState } from "react";
import { LINKS } from "../site";
import { ArrowRight, LinkIcon, Star, UploadIcon } from "../ui/icons";
import { Reveal } from "../ui/Reveal";

const SOURCES = ["YouTube", "Zoom", "Vimeo", "Twitch", "Riverside", "Google Drive", "Dropbox", "Rumble"];

// Placeholder studios (fictional) until real customer logos are approved.
const LOGOS = [
  "Northwind Media",
  "LUMEN POD",
  "arcfield",
  "Pulse/Studio",
  "OAKLINE",
  "brightwave",
  "Hollow & Co",
  "TALKSHOP",
  "Meridian",
  "loudhouse",
];

export function LinkDrop() {
  const [url, setUrl] = useState("");

  return (
    <section className="relative overflow-hidden rounded-[22px] bg-paper px-5 pt-16 pb-10 sm:rounded-[28px] sm:px-10 md:pt-20">
      <Reveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-heading font-soft text-3xl font-semibold leading-[1.05] tracking-[-0.035em] text-balance sm:text-5xl">
          Drop a link. Get a week of shorts.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted text-pretty">
          ClipPro watches your long video, finds the moments people will actually stop scrolling for, and hands
          you captioned, reframed clips ready to post.
        </p>

        <form
          className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl border border-ink/10 bg-white p-2 shadow-[0_20px_50px_-20px_rgba(26,21,51,0.35)] sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            window.location.href = LINKS.newVideo(url.trim() || undefined);
          }}
        >
          <label className="flex flex-1 items-center gap-3 px-3">
            <LinkIcon className="shrink-0 text-muted" />
            <span className="sr-only">Video link</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a YouTube, Zoom or Drive link"
              className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-muted/70"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-ink px-6 text-[15px] font-semibold text-cream transition-colors hover:bg-black"
          >
            Get free clips <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted">
          <a href={LINKS.newVideo()} className="inline-flex items-center gap-1.5 font-medium text-ink underline-offset-4 hover:underline">
            <UploadIcon size={16} /> or upload a file
          </a>
          <span className="hidden h-4 w-px bg-ink/15 sm:block" />
          <span>Works with {SOURCES.slice(0, 5).join(", ")} &amp; more</span>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="flex -space-x-2">
            {["#f9a8d4", "#a5b4fc", "#fcd34d", "#86efac", "#c4b5fd"].map((c, i) => (
              <span key={c} className="size-8 rounded-full border-2 border-paper" style={{ background: `linear-gradient(135deg, ${c}, #8c6cff)`, zIndex: 5 - i }} />
            ))}
          </div>
          <div className="text-left text-sm leading-tight">
            <div className="flex items-center gap-0.5 text-[#f5a524]">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={14} />
              ))}
              <span className="ml-1.5 font-semibold text-ink">4.9</span>
            </div>
            <span className="text-muted">Loved by 120,000+ creators</span>
          </div>
        </div>
      </Reveal>

      <div className="mt-16">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Clipping for teams at
        </p>
        <div className="group relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="flex w-max animate-[marquee_40s_linear_infinite] gap-14 group-hover:[animation-play-state:paused]">
            {[...LOGOS, ...LOGOS].map((name, i) => (
              <span
                key={i}
                aria-hidden={i >= LOGOS.length}
                className={`whitespace-nowrap text-2xl text-ink/45 ${
                  i % 3 === 0 ? "font-heading font-semibold italic" : i % 3 === 1 ? "font-bold tracking-tight" : "font-mono font-medium"
                }`}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
