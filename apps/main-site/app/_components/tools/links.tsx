import Link from "next/link";
import type { ReactNode } from "react";
import { LINKS } from "../site";
import { ArrowRight } from "../ui/icons";

/** The one trust line used on every tool. */
export const TRUST_POINTS = ["No upload", "No sign-up", "No watermark", "Runs on your device"];

export const CLIPPRO_PITCH = "Want AI to turn your long video into viral clips automatically?";

/**
 * Hand-written "what next" suggestions per tool. Rendered under each tool (crawlable internal links
 * with descriptive anchors) — e.g. "Just made a GIF? Now…".
 */
export const NEXT_STEPS: Record<string, { slug: string; label: string }[]> = {
  "audio-video-to-text": [
    { slug: "subtitle-generator", label: "Need captions instead? Generate an SRT or VTT file" },
    { slug: "video-to-mp3", label: "Pull the audio out as an MP3" },
    { slug: "video-trimmer", label: "Cut out the part you want to quote" },
  ],
  "subtitle-generator": [
    { slug: "add-text-to-video", label: "Add a title or @handle on top of your video" },
    { slug: "video-resizer", label: "Make it vertical for TikTok, Reels and Shorts" },
    { slug: "audio-video-to-text", label: "Want a plain-text transcript? Convert audio to text" },
  ],
  "video-resizer": [
    { slug: "crop-video", label: "Want to pick the exact frame yourself? Crop your video" },
    { slug: "add-text-to-video", label: "Add your @handle as a watermark" },
    { slug: "video-compressor", label: "Shrink the file before you upload it" },
  ],
  "crop-video": [
    { slug: "video-resizer", label: "Need 1080×1920 automatically? Resize for TikTok" },
    { slug: "rotate-video", label: "Shot it sideways? Rotate or flip it" },
    { slug: "video-compressor", label: "Make the cropped file smaller" },
  ],
  "video-trimmer": [
    { slug: "merge-videos", label: "Join your trimmed clips into one video" },
    { slug: "video-to-gif", label: "Turn the cut into a GIF" },
    { slug: "video-resizer", label: "Make it vertical for Shorts and Reels" },
  ],
  "rotate-video": [
    { slug: "crop-video", label: "Crop away anything you don't want in frame" },
    { slug: "video-trimmer", label: "Trim the start and end" },
    { slug: "video-compressor", label: "Compress it for sharing" },
  ],
  "merge-videos": [
    { slug: "video-volume-booster", label: "Even out the loudness across your clips" },
    { slug: "add-text-to-video", label: "Add a title or watermark to the final cut" },
    { slug: "video-compressor", label: "Shrink the merged file" },
  ],
  "video-speed-changer": [
    { slug: "loop-video", label: "Loop your slow-mo or boomerang it" },
    { slug: "video-to-gif", label: "Turn the sped-up clip into a GIF" },
    { slug: "merge-videos", label: "Combine it with your other clips" },
  ],
  "loop-video": [
    { slug: "video-to-gif", label: "Make it a looping GIF instead" },
    { slug: "video-to-webp", label: "Or a smaller animated WebP" },
    { slug: "video-speed-changer", label: "Speed it up or slow it down" },
  ],
  "video-to-gif": [
    { slug: "video-to-webp", label: "GIF too big? Make an animated WebP instead" },
    { slug: "video-trimmer", label: "Cut a tighter moment first" },
    { slug: "add-text-to-video", label: "Add a caption before converting" },
  ],
  "video-to-webp": [
    { slug: "video-to-gif", label: "Need maximum compatibility? Make a GIF" },
    { slug: "video-trimmer", label: "Trim the clip first for a smaller file" },
    { slug: "loop-video", label: "Want a boomerang? Make one" },
  ],
  "add-text-to-video": [
    { slug: "subtitle-generator", label: "Need full captions? Generate subtitles" },
    { slug: "video-resizer", label: "Make it vertical for TikTok and Reels" },
    { slug: "merge-videos", label: "Join it with your other clips" },
  ],
  "video-compressor": [
    { slug: "video-trimmer", label: "Even smaller: trim what you don't need" },
    { slug: "video-to-mp3", label: "Only need the sound? Save it as MP3" },
    { slug: "rotate-video", label: "Shot it sideways? Rotate it before sharing" },
  ],
  "video-volume-booster": [
    { slug: "audio-video-to-text", label: "Now transcribe it to text" },
    { slug: "subtitle-generator", label: "Add subtitles for viewers watching on mute" },
    { slug: "video-to-mp3", label: "Export the audio as MP3" },
  ],
  "video-to-mp3": [
    { slug: "audio-video-to-text", label: "Turn the audio into a transcript" },
    { slug: "video-volume-booster", label: "Too quiet? Boost or normalize it" },
    { slug: "video-trimmer", label: "Trim the video before extracting" },
  ],
  "extract-frame-from-video": [
    { slug: "youtube-thumbnail-downloader", label: "Compare with existing YouTube thumbnails" },
    { slug: "video-to-gif", label: "Want motion? Turn the moment into a GIF" },
    { slug: "rotate-video", label: "Footage sideways? Rotate it first" },
  ],
  "youtube-thumbnail-downloader": [
    { slug: "extract-frame-from-video", label: "Grab a frame from your own video for a thumbnail" },
    { slug: "video-resizer", label: "Make a vertical version for Shorts" },
    { slug: "video-trimmer", label: "Trim your next upload" },
  ],
  "instagram-video-downloader": [
    { slug: "video-resizer", label: "Resize your own clips for Reels" },
    { slug: "video-trimmer", label: "Trim a clip to the best moment" },
    { slug: "add-text-to-video", label: "Add your @handle as a watermark" },
  ],
  "youtube-shorts-downloader": [
    { slug: "video-resizer", label: "Turn a landscape video into a Short" },
    { slug: "youtube-thumbnail-downloader", label: "Save a video's thumbnail" },
    { slug: "subtitle-generator", label: "Add captions to your Shorts" },
  ],
  "tiktok-video-downloader": [
    { slug: "video-resizer", label: "Resize videos to TikTok's 9:16" },
    { slug: "video-speed-changer", label: "Speed up or slow down a clip" },
    { slug: "loop-video", label: "Make a boomerang for your next post" },
  ],
};

/** Phrases in article text that refer to another tool. Matched case-insensitively; longest first. */
const ALIASES: [string, string][] = [
  ["video trimmer", "video-trimmer"],
  ["video resizer", "video-resizer"],
  ["video compressor", "video-compressor"],
  ["video to mp3 converter", "video-to-mp3"],
  ["video to mp3", "video-to-mp3"],
  ["subtitle generator", "subtitle-generator"],
  ["srt generator", "subtitle-generator"],
  ["audio to text converter", "audio-video-to-text"],
  ["audio to text", "audio-video-to-text"],
  ["volume booster", "video-volume-booster"],
  ["youtube thumbnail downloader", "youtube-thumbnail-downloader"],
  ["thumbnail downloader", "youtube-thumbnail-downloader"],
  ["video to gif converter", "video-to-gif"],
  ["gif maker", "video-to-gif"],
  ["video to webp converter", "video-to-webp"],
  ["animated webp maker", "video-to-webp"],
  ["video speed changer", "video-speed-changer"],
  ["loop video maker", "loop-video"],
  ["video joiner", "merge-videos"],
  ["video cropper", "crop-video"],
  ["extract frame tool", "extract-frame-from-video"],
].sort((a, b) => b[0].length - a[0].length) as [string, string][];

const ALIAS_RE = new RegExp(`\\b(${ALIASES.map(([p]) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "gi");

/**
 * Turns the first mention of each *other* tool into a link. `linked` is shared across a page's
 * paragraphs so every target is linked at most once (natural density, no link stuffing).
 */
export function linkifyTools(text: string, currentSlug: string, linked: Set<string>, tone: "light" | "dark" = "light"): ReactNode[] {
  const linkClass =
    tone === "dark"
      ? "font-medium text-cream underline decoration-accent-soft/50 underline-offset-4 hover:decoration-accent-soft"
      : "font-medium text-stage-light underline decoration-accent/40 underline-offset-4 hover:decoration-accent";
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(ALIAS_RE)) {
    const slug = ALIASES.find(([p]) => p === match[0].toLowerCase())?.[1];
    if (!slug || slug === currentSlug || linked.has(slug)) continue;
    linked.add(slug);
    out.push(text.slice(last, match.index));
    out.push(
      <Link key={match.index} href={`/tools/${slug}`} className={linkClass}>
        {match[0]}
      </Link>,
    );
    last = match.index + match[0].length;
  }
  out.push(text.slice(last));
  return out;
}

/** "Keep going" suggestions + the soft ClipPro pitch, shown right under every tool. */
export function NextSteps({ slug }: { slug: string }) {
  const steps = NEXT_STEPS[slug] ?? [];
  return (
    <div className="mx-auto mt-6 max-w-3xl text-left">
      {steps.length > 0 && (
        <nav aria-label="Next steps" className="rounded-[20px] border border-white/10 bg-white/[0.06] p-4 sm:p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-cream/55">Keep going</p>
          <ul className="grid gap-2 sm:grid-cols-3">
            {steps.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/tools/${s.slug}`}
                  className="group flex h-full items-start justify-between gap-2 rounded-xl bg-white/[0.06] px-3.5 py-3 text-sm text-cream/85 transition-colors hover:bg-white/[0.12] hover:text-cream"
                >
                  {s.label}
                  <ArrowRight size={16} className="mt-0.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <ClipProPitch className="mt-4" />
    </div>
  );
}

export function ClipProPitch({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <p className={`text-center text-sm ${tone === "dark" ? "text-cream/70" : "text-muted"} ${className}`}>
      {CLIPPRO_PITCH}{" "}
      <a href={LINKS.signUp} className={`font-semibold underline underline-offset-4 ${tone === "dark" ? "text-cream" : "text-ink"}`}>
        Try ClipPro free
      </a>
    </p>
  );
}
