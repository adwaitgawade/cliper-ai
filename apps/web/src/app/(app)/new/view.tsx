"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PageTitle, TopBar } from "@/components/app/page-header";
import {
  DEFAULT_JOB_OPTIONS,
  JobOptionsForm,
  toApiOptions,
  type JobOptionsValue,
} from "@/components/jobs/job-options-form";
import { SourcePicker, type Source } from "@/components/videos/source-picker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { useCreateJob, useVideoFromUrl } from "@/lib/api/hooks";
import { uploadVideo } from "@/lib/api/upload";

type Phase =
  | { step: "idle" }
  | { step: "uploading"; progress: number }
  | { step: "starting" };

export default function NewClipsPage() {
  const router = useRouter();
  const [source, setSource] = useState<Source | null>(null);
  const [options, setOptions] = useState<JobOptionsValue>(DEFAULT_JOB_OPTIONS);
  const [attested, setAttested] = useState(false);
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const fromUrl = useVideoFromUrl();
  const createJob = useCreateJob();
  const busy = phase.step !== "idle";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !attested) return;
    setError(null);
    abort.current = new AbortController();
    try {
      let videoId: string;
      if (source.kind === "file") {
        setPhase({ step: "uploading", progress: 0 });
        const video = await uploadVideo(source.file, {
          signal: abort.current.signal,
          onProgress: (p) => setPhase({ step: "uploading", progress: p }),
        });
        videoId = video.id;
      } else {
        setPhase({ step: "starting" });
        videoId = (await fromUrl.mutateAsync(source.url)).id;
      }
      setPhase({ step: "starting" });
      const job = await createJob.mutateAsync({
        videoId,
        options: toApiOptions(options),
      });
      router.push(`/jobs/${job.id}`);
    } catch (err) {
      setPhase({ step: "idle" });
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <>
      <TopBar
        crumbs={[
          { label: "Projects", href: "/dashboard" },
          { label: "New clips" },
        ]}
      />
      <form
        onSubmit={submit}
        className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-8"
      >
        <PageTitle
          title="New clips"
          description="Upload a long video or paste a link. We'll find the best moments and turn them into vertical clips."
        />

        <Card>
          <CardHeader>
            <CardTitle>1. Source video</CardTitle>
            <CardDescription>
              Podcasts, interviews, talks and tutorials up to 2 hours work best.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SourcePicker value={source} onChange={setSource} disabled={busy} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Clip settings</CardTitle>
          </CardHeader>
          <CardContent>
            <fieldset disabled={busy} className="contents">
              <JobOptionsForm value={options} onChange={setOptions} />
            </fieldset>
          </CardContent>
        </Card>

        <div className="space-y-4 rounded-xl border bg-card p-4">
          <Field orientation="horizontal">
            <Checkbox
              id="rights"
              checked={attested}
              onCheckedChange={(c) => setAttested(c === true)}
              disabled={busy}
            />
            <FieldLabel htmlFor="rights" className="font-normal">
              I own this video or have permission to edit and republish it.
            </FieldLabel>
          </Field>

          {phase.step === "uploading" && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span>Uploading…</span>
                <span className="tabular-nums text-muted-foreground">
                  {Math.round(phase.progress * 100)}%
                </span>
              </div>
              <Progress value={phase.progress * 100} />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {phase.step === "uploading" && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => abort.current?.abort()}
              >
                Cancel upload
              </Button>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={!source || !attested || busy}
            >
              {busy ? <Spinner /> : null}
              {phase.step === "uploading"
                ? "Uploading"
                : phase.step === "starting"
                  ? "Starting"
                  : "Find clips"}
              {!busy && <ArrowRight />}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
