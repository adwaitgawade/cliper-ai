"use client";

import { ExternalLink, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { PageTitle, TopBar } from "@/components/app/page-header";
import { JobStateBadge } from "@/components/jobs/status";
import {
  DEFAULT_JOB_OPTIONS,
  JobOptionsForm,
  toApiOptions,
} from "@/components/jobs/job-options-form";
import { DeleteVideoDialog } from "@/components/videos/delete-video-dialog";
import { videoTitle } from "@/components/videos/title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TERMINAL_JOB_STATES,
  useCreateJob,
  useJobs,
  useVideo,
} from "@/lib/api/hooks";
import {
  formatBytes,
  formatDate,
  formatDuration,
  formatRelative,
  titleCase,
} from "@/lib/format";

const VIDEO_STATUS: Record<string, string> = {
  pending_upload: "Waiting for upload",
  uploaded: "Uploaded",
  pending_download: "Waiting to download",
  ready: "Ready",
  invalid: "Invalid file",
};

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{children}</dd>
    </div>
  );
}

function RunAgainDialog({
  videoId,
  open,
  onOpenChange,
}: {
  videoId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [options, setOptions] = useState(DEFAULT_JOB_OPTIONS);
  const create = useCreateJob();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Find new clips</DialogTitle>
          <DialogDescription>
            Run the pipeline again on this video with different settings.
          </DialogDescription>
        </DialogHeader>
        <JobOptionsForm
          value={options}
          onChange={setOptions}
          styleColumns={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={create.isPending}
            onClick={() =>
              create.mutate(
                { videoId, options: toApiOptions(options) },
                { onSuccess: (job) => router.push(`/jobs/${job.id}`) },
              )
            }
          >
            {create.isPending && <Spinner />} Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function VideoPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const router = useRouter();
  const video = useVideo(videoId);
  const jobs = useJobs({ videoId });
  const [running, setRunning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (video.isError) throw video.error;
  const v = video.data;
  const jobList = jobs.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <TopBar
        crumbs={[
          { label: "Projects", href: "/dashboard" },
          { label: v ? videoTitle(v) : "Video" },
        ]}
      />
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
        {!v ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <PageTitle
              title={<span className="break-all">{videoTitle(v)}</span>}
              description={`Added ${formatRelative(v.created_at)}`}
              actions={
                <>
                  <Button variant="outline" onClick={() => setDeleting(true)}>
                    <Trash2 /> Delete
                  </Button>
                  <Button
                    onClick={() => setRunning(true)}
                    disabled={v.status === "invalid"}
                  >
                    <Play /> Find clips
                  </Button>
                </>
              }
            />
            <Card>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                  <Meta label="Status">
                    <Badge
                      variant={
                        v.status === "invalid" ? "destructive" : "secondary"
                      }
                    >
                      {VIDEO_STATUS[v.status] ?? v.status}
                    </Badge>
                  </Meta>
                  <Meta label="Duration">{formatDuration(v.duration)}</Meta>
                  <Meta label="Resolution">
                    {v.width && v.height ? `${v.width}×${v.height}` : "–"}
                  </Meta>
                  <Meta label="Frame rate">
                    {v.fps ? `${Math.round(v.fps * 100) / 100} fps` : "–"}
                  </Meta>
                  <Meta label="Size">{formatBytes(v.size_bytes)}</Meta>
                  <Meta label="Source">
                    {v.source === "url" ? "Link" : "Upload"}
                  </Meta>
                  <Meta label="Rights attested">
                    {formatDate(v.rights_attested_at)}
                  </Meta>
                  <Meta label="Deleted automatically">
                    {formatDate(v.expires_at)}
                  </Meta>
                </dl>
                {v.source_url && (
                  <a
                    href={v.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-1 text-sm break-all text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="size-3.5 shrink-0" />{" "}
                    {v.source_url}
                  </a>
                )}
                {v.error && (
                  <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {String(
                      (v.error as { message?: string }).message ??
                        "This file could not be processed.",
                    )}
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.isPending ? (
              <Skeleton className="h-24 w-full" />
            ) : jobList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No runs yet. Click “Find clips” to start one.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Clips
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Style
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      LLM cost
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobList.map((j) => (
                    <TableRow
                      key={j.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/jobs/${j.id}`)}
                    >
                      <TableCell>
                        <Link
                          href={`/jobs/${j.id}`}
                          className="font-medium hover:underline"
                        >
                          {formatDate(j.created_at)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <JobStateBadge state={j.state} />
                          {!TERMINAL_JOB_STATES.has(j.state) && (
                            <Progress value={j.progress} className="h-1 w-16" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {String(j.options.num_clips ?? "–")}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {titleCase(String(j.options.caption_style ?? ""))}
                      </TableCell>
                      <TableCell className="hidden tabular-nums md:table-cell">
                        ${j.llm_cost_usd.toFixed(4)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      {v && (
        <>
          <RunAgainDialog
            videoId={v.id}
            open={running}
            onOpenChange={setRunning}
          />
          <DeleteVideoDialog
            video={v}
            open={deleting}
            onOpenChange={setDeleting}
            onDeleted={() => router.replace("/dashboard")}
          />
        </>
      )}
    </>
  );
}
