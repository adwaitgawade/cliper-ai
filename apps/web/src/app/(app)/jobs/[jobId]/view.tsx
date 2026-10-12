"use client";

import {
  Ban,
  CircleAlert,
  Clapperboard,
  MoreHorizontal,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { PageTitle, TopBar } from "@/components/app/page-header";
import { ClipCard } from "@/components/jobs/clip-card";
import { JobStateBadge, StageStepper } from "@/components/jobs/status";
import { TranscriptView } from "@/components/jobs/transcript-view";
import { videoTitle } from "@/components/videos/title";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Job } from "@/lib/api/client";
import {
  TERMINAL_JOB_STATES,
  useJob,
  useJobClips,
  useJobEvents,
  useJobMutations,
  useVideo,
} from "@/lib/api/hooks";
import { formatDate, formatDuration, titleCase } from "@/lib/format";

const BEFORE_TRANSCRIPT = new Set(["queued", "ingesting", "transcribing"]);

function JobError({ job }: { job: Job }) {
  const err = job.error as {
    code?: string;
    message?: string;
    stage?: string;
    retryable?: boolean;
  } | null;
  if (!err) return null;
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>
        {err.stage
          ? `Failed while ${titleCase(err.stage).toLowerCase()}`
          : "This run failed"}
      </AlertTitle>
      <AlertDescription>
        <p>{err.message ?? "Unknown error"}</p>
        <p className="font-mono text-xs opacity-80">
          {err.code}
          {err.retryable ? " · retrying should help" : ""}
        </p>
      </AlertDescription>
    </Alert>
  );
}

function Details({ job }: { job: Job }) {
  const o = job.options as Record<string, unknown>;
  const rows: [string, React.ReactNode][] = [
    ["Clips requested", String(o.num_clips)],
    ["Clip length", `${o.min_duration}–${o.max_duration}s`],
    ["Caption style", titleCase(String(o.caption_style))],
    ["Language", String(o.language).toUpperCase()],
    [
      "Speaker framing",
      `Level ${(o.reframe as { asd_level?: string })?.asd_level ?? "B"}`,
    ],
    ["Profanity masking", o.profanity_filter ? "On" : "Off"],
    ["Instructions", (o.instructions as string) || "–"],
    ["Webhook", (o.webhook_url as string) || "–"],
    ["LLM cost", `$${job.llm_cost_usd.toFixed(4)}`],
    ["Attempts", String(job.attempt)],
    ["Created", formatDate(job.created_at)],
    ["Started", formatDate(job.started_at)],
    ["Finished", formatDate(job.finished_at)],
    [
      "Job ID",
      <span key="id" className="font-mono text-xs">
        {job.id}
      </span>,
    ],
  ];
  return (
    <Card>
      <CardContent>
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export default function JobPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const job = useJob(jobId);
  useJobEvents(job.data);
  const clips = useJobClips(jobId, job.data?.state);
  const video = useVideo(job.data?.video_id ?? "");
  const { cancel, retry, remove } = useJobMutations();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (job.isError) throw job.error;
  const j = job.data;
  const title = video.data ? videoTitle(video.data) : "Video";
  const running = j && !TERMINAL_JOB_STATES.has(j.state);
  const clipList = clips.data ?? [];

  return (
    <>
      <TopBar
        crumbs={[
          { label: "Projects", href: "/dashboard" },
          { label: title, href: j ? `/videos/${j.video_id}` : undefined },
          { label: "Clips" },
        ]}
      />
      <div className="space-y-6 p-4 md:p-8">
        {!j ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <PageTitle
              title={<span className="break-all">{title}</span>}
              description={
                <span className="inline-flex flex-wrap items-center gap-2">
                  <JobStateBadge state={j.state} />
                  {video.data?.duration != null && (
                    <span>{formatDuration(video.data.duration)} source</span>
                  )}
                  <span>· started {formatDate(j.created_at)}</span>
                </span>
              }
              actions={
                <>
                  {running && (
                    <Button
                      variant="outline"
                      onClick={() => cancel.mutate(j.id)}
                      disabled={cancel.isPending}
                    >
                      {cancel.isPending ? <Spinner /> : <Ban />} Cancel
                    </Button>
                  )}
                  {(j.state === "failed" || j.state === "canceled") && (
                    <Button
                      onClick={() => retry.mutate(j.id)}
                      disabled={retry.isPending}
                    >
                      {retry.isPending ? <Spinner /> : <RotateCcw />} Resume
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="More actions"
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/videos/${j.video_id}`}>
                          <Clapperboard /> Video and other runs
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setConfirmDelete(true)}
                      >
                        <Trash2 /> Delete run
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              }
            />

            {(running || j.state === "failed") && (
              <Card>
                <CardContent className="space-y-4">
                  <StageStepper
                    state={j.state}
                    failedStage={(j.error as { stage?: string } | null)?.stage}
                  />
                  {running && (
                    <div className="flex items-center gap-3">
                      <Progress value={j.progress} className="flex-1" />
                      <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">
                        {j.progress}%
                      </span>
                    </div>
                  )}
                  <JobError job={j} />
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="clips">
              <TabsList>
                <TabsTrigger value="clips">
                  Clips{clipList.length ? ` (${clipList.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>
              <TabsContent value="clips" className="mt-4">
                {clipList.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
                    {clipList.map((c) => (
                      <ClipCard key={c.id} clip={c} />
                    ))}
                  </div>
                ) : clips.isPending ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
                    {Array.from({ length: 4 }, (_, i) => (
                      <Skeleton key={i} className="aspect-[9/16] rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <Empty className="border border-dashed">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Clapperboard />
                      </EmptyMedia>
                      <EmptyTitle>
                        {running ? "Clips are on the way" : "No clips"}
                      </EmptyTitle>
                      <EmptyDescription>
                        {running
                          ? "We'll show each clip here as soon as the highlights are picked."
                          : "This run didn't produce any clips."}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </TabsContent>
              <TabsContent value="transcript" className="mt-4">
                <TranscriptView
                  jobId={j.id}
                  clips={clipList}
                  ready={!BEFORE_TRANSCRIPT.has(j.state)}
                />
              </TabsContent>
              <TabsContent value="details" className="mt-4">
                <Details job={j} />
              </TabsContent>
            </Tabs>

            <ConfirmDialog
              open={confirmDelete}
              onOpenChange={setConfirmDelete}
              title="Delete this run?"
              description="All clips, renders and the transcript from this run will be permanently deleted. The source video is kept."
              pending={remove.isPending}
              onConfirm={() =>
                remove.mutate(j.id, {
                  onSuccess: () => {
                    toast.success("Run deleted");
                    router.replace(`/videos/${j.video_id}`);
                  },
                })
              }
            />
          </>
        )}
      </div>
    </>
  );
}
