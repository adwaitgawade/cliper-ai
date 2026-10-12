"use client";

import { Download, Flame, Loader2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { ClipStatusBadge } from "@/components/jobs/status";
import { Button } from "@/components/ui/button";
import type { Clip } from "@/lib/api/client";
import { formatDuration } from "@/lib/format";

export function ClipCard({ clip }: { clip: Clip }) {
  const video = useRef<HTMLVideoElement>(null);
  const render = clip.latest_render;
  const ready = render?.status === "succeeded" && render.download_url;

  return (
    <div className="group overflow-hidden rounded-xl border bg-card transition hover:shadow-md">
      <Link
        href={`/clips/${clip.id}`}
        className="relative block aspect-[9/16] overflow-hidden stage outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onMouseEnter={() => video.current?.play().catch(() => {})}
        onMouseLeave={() => {
          if (video.current) {
            video.current.pause();
            video.current.currentTime = 0;
          }
        }}
      >
        {ready ? (
          <video
            ref={video}
            src={render.download_url ?? undefined}
            poster={render.thumbnail_url ?? undefined}
            muted
            loop
            playsInline
            preload="none"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-sm text-white/70">
            {clip.status === "failed" ? (
              <>
                <TriangleAlert className="size-6 text-destructive" /> Render
                failed
              </>
            ) : (
              <>
                <Loader2 className="size-6 animate-spin" /> Rendering…
              </>
            )}
          </div>
        )}
        <span className="absolute top-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-white tabular-nums">
          #{clip.rank}
        </span>
        {clip.score != null && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-white tabular-nums">
            <Flame className="size-3 text-orange-400" /> {clip.score.toFixed(1)}
          </span>
        )}
        <span className="absolute right-2 bottom-2 rounded bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white tabular-nums">
          {formatDuration(clip.duration)}
        </span>
      </Link>
      <div className="space-y-2 p-3">
        <Link
          href={`/clips/${clip.id}`}
          className="line-clamp-2 text-sm leading-snug font-medium hover:underline"
        >
          {clip.title || "Untitled clip"}
        </Link>
        {clip.hook && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            “{clip.hook}”
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <ClipStatusBadge status={clip.status} />
          {ready && (
            <Button
              asChild
              variant="ghost"
              size="icon-sm"
              aria-label="Download clip"
            >
              <a href={render.download_url ?? undefined} download>
                <Download />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
