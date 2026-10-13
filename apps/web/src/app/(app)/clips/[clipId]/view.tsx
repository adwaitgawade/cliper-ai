"use client";

import type { CaptionOverrides, ClipProps } from "@repo/video";
import {
  ChevronDown,
  CircleAlert,
  Download,
  Film,
  Loader2,
  MonitorPlay,
  Sparkles,
  Trash2,
  Undo2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { TopBar } from "@/components/app/page-header";
import { DetailsPanel } from "@/components/editor/details-panel";
import { LayoutPanel } from "@/components/editor/layout-panel";
import { StylePanel } from "@/components/editor/style-panel";
import { TrimPanel } from "@/components/editor/trim-panel";
import { ClipStatusBadge } from "@/components/jobs/status";
import { videoTitle } from "@/components/videos/title";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Clip, ClipPatch } from "@/lib/api/client";
import {
  downloadCaptions,
  useClipDownload,
  type CaptionFormat,
} from "@/lib/api/downloads";
import {
  isActiveRender,
  useClip,
  useClipMutations,
  useComposition,
  useJob,
  useVideo,
} from "@/lib/api/hooks";
import { formatDuration, formatRelative } from "@/lib/format";
import { useDebounced } from "@/lib/hooks/use-debounced";

// Remotion's Player only runs in the browser.
const ClipPlayer = dynamic(() => import("@/components/editor/clip-player"), {
  ssr: false,
  loading: () => <Skeleton className="aspect-[9/16] w-full rounded-none" />,
});

type Layout = "auto" | "crop" | "wide";

interface Draft {
  start: number;
  end: number;
  layout: Layout;
  caption_style: string;
  caption_overrides: CaptionOverrides;
  title: string;
}

function fromClip(c: Clip): Draft {
  return {
    start: c.start,
    end: c.end,
    layout: c.layout as Layout,
    caption_style: c.caption_style,
    caption_overrides: c.caption_overrides as CaptionOverrides,
    title: c.title ?? "",
  };
}

/** Only the fields that differ from the saved clip. */
function diff(draft: Draft, saved: Draft): ClipPatch {
  const patch: ClipPatch = {};
  if (draft.start !== saved.start) patch.start = draft.start;
  if (draft.end !== saved.end) patch.end = draft.end;
  if (draft.layout !== saved.layout) patch.layout = draft.layout;
  if (draft.caption_style !== saved.caption_style)
    patch.caption_style = draft.caption_style;
  if (
    JSON.stringify(draft.caption_overrides) !==
    JSON.stringify(saved.caption_overrides)
  ) {
    patch.caption_overrides =
      draft.caption_overrides as ClipPatch["caption_overrides"];
  }
  if (draft.title.trim() !== saved.title) patch.title = draft.title.trim();
  return patch;
}

function RenderStatus({
  clip,
  unrendered,
}: {
  clip: Clip;
  unrendered: boolean;
}) {
  const r = clip.latest_render;
  if (!r)
    return (
      <span className="text-sm text-muted-foreground">
        Rendered when you download it
      </span>
    );
  if (isActiveRender(clip)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />{" "}
        {r.status === "queued" ? "Waiting to render…" : "Rendering…"}
      </span>
    );
  }
  if (r.status === "failed") {
    const err = r.error as { message?: string } | null;
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
        <CircleAlert className="size-4" /> Last render failed
        {err?.message ? `: ${err.message}` : ""}. Download to try again.
      </span>
    );
  }
  return (
    <span className="text-sm text-muted-foreground">
      Rendered {formatRelative(r.finished_at ?? r.created_at)}
      {unrendered && " · edited since, so downloading renders it again"}
    </span>
  );
}

/**
 * Video renders on demand; caption files are built on request. Unsaved edits are saved
 * first (`save` returns whether it saved anything) so the download matches the preview.
 */
function Downloads({
  clip,
  save,
  disabled,
}: {
  clip: Clip;
  save: () => Promise<boolean>;
  disabled: boolean;
}) {
  const { download, preparing } = useClipDownload(clip);
  const video = async () => {
    try {
      const saved = await save();
      await download({ fresh: saved });
    } catch {
      // mutation errors are toasted globally
    }
  };
  const captions = async (fmt: CaptionFormat) => {
    try {
      await save();
      await downloadCaptions(clip.id, fmt);
    } catch {
      // request errors are toasted globally
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={disabled || preparing}>
          {preparing ? <Spinner /> : <Download />}
          {preparing ? "Preparing download" : "Download"} <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={video}>
          <Film /> Video (MP4, 1080×1920)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Captions only
        </DropdownMenuLabel>
        {(["srt", "vtt", "ass"] as const).map((f) => (
          <DropdownMenuItem key={f} onSelect={() => captions(f)}>
            {f.toUpperCase()} subtitles
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ClipEditorPage() {
  const { clipId } = useParams<{ clipId: string }>();
  const router = useRouter();
  const clip = useClip(clipId);
  const job = useJob(clip.data?.job_id);
  const video = useVideo(job.data?.video_id ?? "");
  const { patch, remove } = useClipMutations();

  // The draft follows the server copy until the user edits something.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [baseline, setBaseline] = useState<Draft | null>(null);
  if (clip.data) {
    const server = fromClip(clip.data);
    if (!baseline || JSON.stringify(server) !== JSON.stringify(baseline)) {
      const dirty =
        draft && baseline && Object.keys(diff(draft, baseline)).length > 0;
      setBaseline(server);
      if (!dirty) setDraft(server);
    }
  }

  const saved = baseline;
  const changes = draft && saved ? diff(draft, saved) : {};
  const dirty = Object.keys(changes).length > 0;

  // Trim and layout need the server (word snapping, crop path); style is applied locally.
  const pendingRange = useDebounced(
    draft && saved
      ? { start: draft.start, end: draft.end, layout: draft.layout }
      : null,
    350,
  );
  const previewParams = useMemo(() => {
    if (!pendingRange || !saved) return {};
    const p: { start?: number; end?: number; layout?: string } = {};
    if (pendingRange.start !== saved.start || pendingRange.end !== saved.end) {
      p.start = pendingRange.start;
      p.end = pendingRange.end;
    }
    if (pendingRange.layout !== saved.layout) p.layout = pendingRange.layout;
    return p;
  }, [pendingRange, saved]);
  const composition = useComposition(clipId, previewParams);

  const playerProps = useMemo<ClipProps | undefined>(() => {
    if (!composition.data || !draft) return undefined;
    return {
      ...composition.data,
      captions: {
        ...composition.data.captions,
        style: draft.caption_style,
        overrides: draft.caption_overrides,
      },
    };
  }, [composition.data, draft]);

  const [view, setView] = useState<"live" | "rendered">("live");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const r = clip.data?.latest_render;
  const hasRendered = r?.status === "succeeded" && Boolean(r.download_url);
  const unrendered = Boolean(clip.data?.render_outdated);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (clip.isError) throw clip.error;

  /** Save unsaved edits; resolves whether anything was saved. */
  const saveChanges = async () => {
    if (!dirty) return false;
    await patch.mutateAsync({ clipId, body: changes });
    return true;
  };

  const save = async () => {
    try {
      await saveChanges();
      toast.success("Changes saved");
    } catch {
      // mutation errors are toasted globally
    }
  };

  const c = clip.data;
  const busy = patch.isPending;

  return (
    <>
      <TopBar
        crumbs={[
          { label: "Projects", href: "/dashboard" },
          {
            label: video.data ? videoTitle(video.data) : "Video",
            href: job.data ? `/jobs/${job.data.id}` : undefined,
          },
          { label: c ? `Clip #${c.rank}` : "Clip" },
        ]}
      >
        {c && <ClipStatusBadge clip={c} />}
      </TopBar>

      {!c || !draft || !saved ? (
        <div className="grid gap-8 p-4 md:p-8 lg:grid-cols-[minmax(0,380px)_1fr]">
          <Skeleton className="aspect-[9/16] w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <div className="grid flex-1 gap-6 p-4 md:p-8 lg:grid-cols-[minmax(0,400px)_1fr] lg:gap-10">
          <div className="space-y-3 lg:sticky lg:top-18 lg:self-start">
            {hasRendered && (
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={view}
                onValueChange={(v) => v && setView(v as "live" | "rendered")}
                className="w-full"
              >
                <ToggleGroupItem value="live" className="flex-1">
                  <Sparkles /> Live preview
                </ToggleGroupItem>
                <ToggleGroupItem value="rendered" className="flex-1">
                  <MonitorPlay /> Rendered file
                </ToggleGroupItem>
              </ToggleGroup>
            )}
            <div className="relative mx-auto w-full max-w-[min(400px,calc((100svh-15rem)*9/16))] overflow-hidden rounded-2xl border stage shadow-sm">
              {view === "rendered" && hasRendered ? (
                <video
                  key={r!.id}
                  src={r!.download_url!}
                  poster={r!.thumbnail_url ?? undefined}
                  controls
                  playsInline
                  className="aspect-[9/16] w-full"
                />
              ) : playerProps ? (
                <ClipPlayer props={playerProps} />
              ) : composition.isError ? (
                <div className="flex aspect-[9/16] items-center justify-center p-6 text-center text-sm text-white/70">
                  {composition.error.message}
                </div>
              ) : (
                <Skeleton className="aspect-[9/16] w-full rounded-none" />
              )}
              {composition.isFetching && view === "live" && (
                <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
                  <Loader2 className="size-3 animate-spin" /> Updating
                </span>
              )}
            </div>
            <div className="text-center text-xs text-muted-foreground">
              {formatDuration(c.start)} – {formatDuration(c.end)} of source ·{" "}
              {c.duration.toFixed(1)}s
            </div>
          </div>

          <div className="min-w-0 space-y-6">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">
                {draft.title || c.title || "Untitled clip"}
              </h1>
              <RenderStatus clip={c} unrendered={unrendered && !dirty} />
            </div>
            <Tabs defaultValue="captions">
              <TabsList>
                <TabsTrigger value="captions">Captions</TabsTrigger>
                <TabsTrigger value="trim">Trim</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>
              <TabsContent value="captions" className="mt-5">
                <StylePanel
                  styleName={draft.caption_style}
                  overrides={draft.caption_overrides}
                  onChange={(caption_style, caption_overrides) =>
                    setDraft({ ...draft, caption_style, caption_overrides })
                  }
                />
              </TabsContent>
              <TabsContent value="trim" className="mt-5">
                <TrimPanel
                  saved={saved}
                  draft={draft}
                  preview={composition.data}
                  videoDuration={video.data?.duration ?? saved.end + 30}
                  onChange={({ start, end }) =>
                    setDraft({ ...draft, start, end })
                  }
                />
              </TabsContent>
              <TabsContent value="layout" className="mt-5">
                <LayoutPanel
                  value={draft.layout}
                  onChange={(layout) => setDraft({ ...draft, layout })}
                />
              </TabsContent>
              <TabsContent value="details" className="mt-5">
                <DetailsPanel
                  clip={c}
                  title={draft.title}
                  onTitle={(title) => setDraft({ ...draft, title })}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {c && draft && saved && (
        <div className="sticky bottom-0 z-20 border-t bg-background/90 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 md:px-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete clip"
            >
              <Trash2 />
            </Button>
            <span className="text-sm text-muted-foreground">
              {dirty ? "Unsaved changes" : "All changes saved"}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {dirty && (
                <Button
                  variant="ghost"
                  onClick={() => setDraft(saved)}
                  disabled={busy}
                >
                  <Undo2 /> Discard
                </Button>
              )}
              {dirty && (
                <Button variant="outline" onClick={save} disabled={busy}>
                  {busy && <Spinner />} Save
                </Button>
              )}
              <Downloads clip={c} save={saveChanges} disabled={busy} />
            </div>
          </div>
        </div>
      )}

      {c && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this clip?"
          description="The clip and any rendered files will be permanently deleted."
          pending={remove.isPending}
          onConfirm={() =>
            remove.mutate(c, {
              onSuccess: () => {
                toast.success("Clip deleted");
                router.replace(`/jobs/${c.job_id}`);
              },
            })
          }
        />
      )}
    </>
  );
}
