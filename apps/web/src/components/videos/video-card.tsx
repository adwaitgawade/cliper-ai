"use client";

import { FileVideo, Info, Link2, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { JobStateBadge } from "@/components/jobs/status";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { TERMINAL_JOB_STATES } from "@/lib/api/hooks";
import type { Job, Video } from "@/lib/api/client";
import { formatDuration, formatRelative } from "@/lib/format";
import { DeleteVideoDialog } from "./delete-video-dialog";
import { videoTitle } from "./title";

// A stable hue per video, so cards are recognizable before a thumbnail exists.
function hue(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function VideoCard({ video, job }: { video: Video; job?: Job }) {
  const [deleting, setDeleting] = useState(false);
  const href = job ? `/jobs/${job.id}` : `/videos/${video.id}`;
  const running = job && !TERMINAL_JOB_STATES.has(job.state);
  const h = hue(video.id);

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card transition hover:shadow-md">
      <Link
        href={href}
        className="block outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div
          className="relative flex aspect-video items-center justify-center"
          style={{
            background: `radial-gradient(70% 90% at 25% 20%, oklch(0.55 0.16 ${h} / 0.55), transparent), radial-gradient(70% 90% at 85% 90%, oklch(0.5 0.14 ${(h + 70) % 360} / 0.45), transparent), oklch(0.2 0.02 ${h})`,
          }}
        >
          {video.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived presigned URL
            <img
              src={video.thumbnail_url}
              alt=""
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
            />
          ) : video.source === "url" ? (
            <Link2 className="size-8 text-white/80" />
          ) : (
            <FileVideo className="size-8 text-white/80" />
          )}
          {video.duration != null && (
            <span className="absolute right-2 bottom-2 rounded bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white tabular-nums">
              {formatDuration(video.duration)}
            </span>
          )}
          {video.status === "invalid" && (
            <span className="absolute top-2 left-2 rounded bg-destructive px-1.5 py-0.5 text-xs font-medium text-white">
              Invalid file
            </span>
          )}
        </div>
        <div className="space-y-2 p-3">
          <div className="truncate pr-8 font-medium" title={videoTitle(video)}>
            {videoTitle(video)}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {job ? (
              <JobStateBadge state={job.state} />
            ) : (
              <span>No clips yet</span>
            )}
            <span className="ml-auto">{formatRelative(video.created_at)}</span>
          </div>
          {running && <Progress value={job.progress} className="h-1" />}
        </div>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-2 bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 hover:text-white focus-visible:opacity-100 data-[state=open]:opacity-100"
            aria-label="Video actions"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/videos/${video.id}`}>
              <Info /> Video details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleting(true)}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteVideoDialog
        video={video}
        open={deleting}
        onOpenChange={setDeleting}
      />
    </div>
  );
}
