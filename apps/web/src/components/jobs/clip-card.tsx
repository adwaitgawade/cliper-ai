"use client";

import { Download, Film, Flame } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { ClipStatusBadge } from "@/components/jobs/status";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Clip } from "@/lib/api/client";
import { currentRender, useClipDownload } from "@/lib/api/downloads";
import { useComposition } from "@/lib/api/hooks";
import { formatDuration } from "@/lib/format";

// Remotion's Player only runs in the browser.
const ClipPlayer = dynamic(() => import("@/components/editor/clip-player"), {
  ssr: false,
});

export function ClipCard({ clip }: { clip: Clip }) {
  const [hovered, setHovered] = useState(false);
  const rendered = currentRender(clip);
  // Unrendered clips preview live from the source; only the hovered card plays.
  const composition = useComposition(
    clip.id,
    {},
    { enabled: hovered && !rendered },
  );
  const poster =
    rendered?.thumbnail_url ??
    clip.thumbnail_url ??
    clip.latest_render?.thumbnail_url;
  const { download, preparing } = useClipDownload(clip);

  return (
    <div className="group overflow-hidden rounded-xl border bg-card transition hover:shadow-md">
      <Link
        href={`/clips/${clip.id}`}
        className="relative block aspect-[9/16] overflow-hidden stage outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed, expiring URL
          <img
            src={poster}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-white/50">
            <Film className="size-6" />
          </div>
        )}
        {hovered && (
          <div className="absolute inset-0">
            {rendered ? (
              <video
                src={rendered.download_url ?? undefined}
                poster={poster ?? undefined}
                autoPlay
                muted
                loop
                playsInline
                className="size-full object-cover"
              />
            ) : composition.data ? (
              <ClipPlayer props={composition.data} ambient />
            ) : null}
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
        <div className="flex min-h-7 items-center justify-between gap-2">
          <ClipStatusBadge clip={clip} />
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            aria-label={preparing ? "Preparing download" : "Download clip"}
            title={rendered ? "Download" : "Render and download"}
            onClick={() => download()}
            disabled={preparing}
          >
            {preparing ? <Spinner /> : <Download />}
          </Button>
        </div>
      </div>
    </div>
  );
}
