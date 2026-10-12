"use client";

import { Clapperboard, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { PageTitle, TopBar } from "@/components/app/page-header";
import { VideoCard } from "@/components/videos/video-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { Job } from "@/lib/api/client";
import { useJobs, useVideos } from "@/lib/api/hooks";
import { useWorkspace } from "@/lib/workspace";

export default function DashboardPage() {
  const { workspace } = useWorkspace();
  const videos = useVideos();
  const jobs = useJobs();

  // Jobs are listed newest first, so the first one seen per video is its latest.
  const latestJob = useMemo(() => {
    const map = new Map<string, Job>();
    for (const page of jobs.data?.pages ?? []) {
      for (const job of page.items)
        if (!map.has(job.video_id)) map.set(job.video_id, job);
    }
    return map;
  }, [jobs.data]);

  const items = videos.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <TopBar crumbs={[{ label: "Projects" }]}>
        <Button asChild size="sm">
          <Link href="/new">
            <Plus /> New clips
          </Link>
        </Button>
      </TopBar>
      <div className="space-y-6 p-4 md:p-8">
        <PageTitle
          title="Projects"
          description={`Videos in ${workspace.name}. Files are kept for 30 days.`}
        />

        {videos.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-video rounded-xl" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : videos.isError ? (
          <p className="text-sm text-destructive">
            Couldn&apos;t load videos: {videos.error.message}
          </p>
        ) : items.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Clapperboard />
              </EmptyMedia>
              <EmptyTitle>No videos yet</EmptyTitle>
              <EmptyDescription>
                Upload a podcast, interview or talk and ClipPro will cut it into
                ranked, captioned vertical clips.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/new">
                  <Plus /> Create your first clips
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {items.map((v) => (
                <VideoCard key={v.id} video={v} job={latestJob.get(v.id)} />
              ))}
            </div>
            {videos.hasNextPage && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => videos.fetchNextPage()}
                  disabled={videos.isFetchingNextPage}
                >
                  {videos.isFetchingNextPage && <Spinner />} Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
