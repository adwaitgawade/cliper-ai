"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { useWorkspace } from "@/lib/workspace";
import type { ClipProps } from "@repo/video";
import { env } from "@/lib/env";
import {
  api,
  call,
  type Clip,
  type ClipPatch,
  type Job,
  type JobOptions,
  type WorkspaceRole,
} from "./client";
import { readEventStream } from "./sse";

/** Every workspace-scoped query key starts with ["ws", workspaceId]. */
function useKey() {
  const { workspace } = useWorkspace();
  return (...parts: unknown[]) => ["ws", workspace.id, ...parts];
}

export const TERMINAL_JOB_STATES = new Set(["completed", "failed", "canceled"]);
export const isActiveRender = (clip: Clip) =>
  clip.latest_render?.status === "queued" ||
  clip.latest_render?.status === "running";

// --- workspaces, members, API keys ---------------------------------------------------

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      call(api.POST("/v1/workspaces", { body: { name } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useWorkspaceList() {
  const key = useKey();
  return useQuery({
    queryKey: key("workspaces"),
    queryFn: () => call(api.GET("/v1/workspaces")),
  });
}

export function useMembers() {
  const key = useKey();
  return useQuery({
    queryKey: key("members"),
    queryFn: () => call(api.GET("/v1/workspace/members")),
  });
}

export function useMemberMutations() {
  const qc = useQueryClient();
  const key = useKey();
  const invalidate = () => qc.invalidateQueries({ queryKey: key("members") });
  return {
    add: useMutation({
      mutationFn: (body: { email: string; role: WorkspaceRole }) =>
        call(api.POST("/v1/workspace/members", { body })),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ userId, role }: { userId: string; role: WorkspaceRole }) =>
        call(
          api.PATCH("/v1/workspace/members/{user_id}", {
            params: { path: { user_id: userId } },
            body: { role },
          }),
        ),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (userId: string) =>
        call(
          api.DELETE("/v1/workspace/members/{user_id}", {
            params: { path: { user_id: userId } },
          }),
        ),
      onSuccess: invalidate,
    }),
  };
}

export function useApiKeys() {
  const key = useKey();
  return useQuery({
    queryKey: key("api-keys"),
    queryFn: () => call(api.GET("/v1/api-keys")),
  });
}

export function useApiKeyMutations() {
  const qc = useQueryClient();
  const key = useKey();
  const invalidate = () => qc.invalidateQueries({ queryKey: key("api-keys") });
  return {
    create: useMutation({
      mutationFn: (name: string) =>
        call(api.POST("/v1/api-keys", { body: { name } })),
      onSuccess: invalidate,
    }),
    revoke: useMutation({
      mutationFn: (id: string) =>
        call(
          api.DELETE("/v1/api-keys/{key_id}", {
            params: { path: { key_id: id } },
          }),
        ),
      onSuccess: invalidate,
    }),
  };
}

// --- videos ----------------------------------------------------------------------------

export function useVideos() {
  const key = useKey();
  return useInfiniteQuery({
    queryKey: key("videos"),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      call(
        api.GET("/v1/videos", {
          params: { query: { limit: 24, cursor: pageParam } },
        }),
      ),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
}

export function useVideo(videoId: string) {
  const key = useKey();
  return useQuery({
    queryKey: key("video", videoId),
    enabled: Boolean(videoId),
    queryFn: () =>
      call(
        api.GET("/v1/videos/{video_id}", {
          params: { path: { video_id: videoId } },
        }),
      ),
    // Metadata (duration, size) appears once ingest has probed the file.
    refetchInterval: (q) =>
      q.state.data &&
      ["pending_upload", "uploaded", "pending_download"].includes(
        q.state.data.status,
      )
        ? 5000
        : false,
  });
}

export function useDeleteVideo() {
  const qc = useQueryClient();
  const key = useKey();
  return useMutation({
    mutationFn: (videoId: string) =>
      call(
        api.DELETE("/v1/videos/{video_id}", {
          params: { path: { video_id: videoId } },
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("videos") });
      qc.invalidateQueries({ queryKey: key("jobs") });
    },
  });
}

export function useVideoFromUrl() {
  return useMutation({
    mutationFn: (url: string) =>
      call(
        api.POST("/v1/videos/from-url", {
          body: { url, rights_attested: true },
        }),
      ),
  });
}

// --- jobs ------------------------------------------------------------------------------

export function useJobs(
  filter: { videoId?: string; state?: Job["state"] } = {},
) {
  const key = useKey();
  return useInfiniteQuery({
    queryKey: key("jobs", filter),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      call(
        api.GET("/v1/jobs", {
          params: {
            query: {
              limit: 50,
              cursor: pageParam,
              video_id: filter.videoId,
              state: filter.state as never,
            },
          },
        }),
      ),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    // Keep job cards fresh while any of them is still running.
    refetchInterval: (q) =>
      q.state.data?.pages.some((p) =>
        p.items.some((j) => !TERMINAL_JOB_STATES.has(j.state)),
      )
        ? 5000
        : false,
  });
}

export function useJob(jobId: string | undefined) {
  const key = useKey();
  return useQuery({
    queryKey: key("job", jobId),
    enabled: Boolean(jobId),
    queryFn: () =>
      call(
        api.GET("/v1/jobs/{job_id}", { params: { path: { job_id: jobId! } } }),
      ),
  });
}

/**
 * Live job progress over GET /v1/jobs/{id}/events (SSE). Each event updates the cached
 * job; on completion the clips are refetched. Reconnects with backoff if the stream drops.
 */
export function useJobEvents(job: Job | undefined) {
  const qc = useQueryClient();
  const key = useKey();
  const jobId = job?.id;
  const active = job ? !TERMINAL_JOB_STATES.has(job.state) : false;

  useEffect(() => {
    if (!jobId || !active) return;
    const controller = new AbortController();
    let delay = 1000;

    const apply = (data: string) => {
      const ev = JSON.parse(data) as Pick<
        Job,
        "id" | "state" | "stage" | "progress" | "error"
      >;
      qc.setQueryData<Job>(key("job", jobId), (old) =>
        old ? { ...old, ...ev } : old,
      );
      if (ev.state === "rendering" || TERMINAL_JOB_STATES.has(ev.state)) {
        qc.invalidateQueries({ queryKey: key("job-clips", jobId) });
      }
    };

    (async () => {
      while (!controller.signal.aborted) {
        let ended = false;
        try {
          await readEventStream(
            `/v1/jobs/${jobId}/events`,
            (msg) => {
              if (msg.event === "progress") apply(msg.data);
              if (msg.event === "end") {
                apply(msg.data);
                ended = true;
                qc.invalidateQueries({ queryKey: key("job", jobId) });
                qc.invalidateQueries({ queryKey: key("jobs") });
              }
              if (msg.event === "deleted") ended = true;
              delay = 1000;
            },
            controller.signal,
          );
        } catch {
          if (controller.signal.aborted) return;
        }
        if (ended) return;
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 2, 15000);
      }
    })();
    return () => controller.abort();
    // key() is stable for a given workspace
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, active, qc]);
}

export function useJobClips(jobId: string, jobState?: string) {
  const key = useKey();
  return useQuery({
    queryKey: key("job-clips", jobId),
    queryFn: () =>
      call(
        api.GET("/v1/jobs/{job_id}/clips", {
          params: { path: { job_id: jobId } },
        }),
      ),
    refetchInterval: (q) =>
      jobState === "rendering" ||
      q.state.data?.some(isActiveRender) ||
      q.state.data?.some((c) => c.status === "pending")
        ? 4000
        : false,
  });
}

export interface Transcript {
  language: string;
  duration: number;
  sentences: {
    id: number;
    start: number;
    end: number;
    text: string;
    speaker: string;
    word_start: number;
    word_end: number;
  }[];
  words: {
    word: string;
    start: number;
    end: number;
    speaker: string;
    confidence: number;
  }[];
}

export function useTranscript(jobId: string, enabled = true) {
  const key = useKey();
  return useQuery({
    queryKey: key("transcript", jobId),
    enabled,
    staleTime: Infinity,
    queryFn: async () =>
      (await call(
        api.GET("/v1/jobs/{job_id}/transcript", {
          params: { path: { job_id: jobId } },
        }),
      )) as Transcript,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  const key = useKey();
  return useMutation({
    mutationFn: ({
      videoId,
      options,
    }: {
      videoId: string;
      options: Partial<JobOptions>;
    }) =>
      call(
        api.POST("/v1/jobs", {
          body: { video_id: videoId, options: options as JobOptions },
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key("jobs") });
      qc.invalidateQueries({ queryKey: key("videos") });
    },
  });
}

export function useJobMutations() {
  const qc = useQueryClient();
  const key = useKey();
  const store = (job: Job) => {
    qc.setQueryData(key("job", job.id), job);
    qc.invalidateQueries({ queryKey: key("jobs") });
  };
  return {
    cancel: useMutation({
      mutationFn: (jobId: string) =>
        call(
          api.POST("/v1/jobs/{job_id}/cancel", {
            params: { path: { job_id: jobId } },
          }),
        ),
      onSuccess: store,
    }),
    retry: useMutation({
      mutationFn: (jobId: string) =>
        call(
          api.POST("/v1/jobs/{job_id}/retry", {
            params: { path: { job_id: jobId } },
          }),
        ),
      onSuccess: store,
    }),
    remove: useMutation({
      mutationFn: (jobId: string) =>
        call(
          api.DELETE("/v1/jobs/{job_id}", {
            params: { path: { job_id: jobId } },
          }),
        ),
      onSuccess: () => qc.invalidateQueries({ queryKey: key("jobs") }),
    }),
  };
}

// --- clips -----------------------------------------------------------------------------

function storeClip(
  qc: QueryClient,
  key: (...p: unknown[]) => unknown[],
  clip: Clip,
) {
  qc.setQueryData(key("clip", clip.id), clip);
  qc.setQueryData<Clip[]>(key("job-clips", clip.job_id), (old) =>
    old?.map((c) => (c.id === clip.id ? clip : c)),
  );
}

export function useClip(clipId: string) {
  const key = useKey();
  return useQuery({
    queryKey: key("clip", clipId),
    queryFn: () =>
      call(
        api.GET("/v1/clips/{clip_id}", {
          params: { path: { clip_id: clipId } },
        }),
      ),
    refetchInterval: (q) =>
      q.state.data && isActiveRender(q.state.data) ? 3000 : false,
  });
}

/** Composition props for the Player; trim/layout are optional unsaved previews. */
export function useComposition(
  clipId: string,
  preview: { start?: number; end?: number; layout?: string } = {},
) {
  const key = useKey();
  return useQuery({
    queryKey: key("composition", clipId, preview),
    placeholderData: keepPreviousData,
    // The signed source URL lasts hours; don't churn it.
    staleTime: 30 * 60 * 1000,
    queryFn: async () =>
      (await call(
        api.GET("/v1/clips/{clip_id}/composition", {
          params: {
            path: { clip_id: clipId },
            query: {
              start: preview.start,
              end: preview.end,
              layout: preview.layout as never,
            },
          },
        }),
      )) as unknown as ClipProps,
  });
}

export function useClipMutations() {
  const qc = useQueryClient();
  const key = useKey();
  return {
    patch: useMutation({
      mutationFn: ({ clipId, body }: { clipId: string; body: ClipPatch }) =>
        call(
          api.PATCH("/v1/clips/{clip_id}", {
            params: { path: { clip_id: clipId } },
            body,
          }),
        ),
      onSuccess: (clip) => {
        storeClip(qc, key, clip);
        qc.invalidateQueries({ queryKey: key("composition", clip.id) });
      },
    }),
    render: useMutation({
      mutationFn: (clipId: string) =>
        call(
          api.POST("/v1/clips/{clip_id}/render", {
            params: { path: { clip_id: clipId } },
          }),
        ),
      onSuccess: (render, clipId) => {
        qc.setQueryData<Clip>(key("clip", clipId), (old) =>
          old ? { ...old, status: "pending", latest_render: render } : old,
        );
        qc.invalidateQueries({ queryKey: key("clip", clipId) });
        qc.invalidateQueries({ queryKey: key("job-clips") });
      },
    }),
    remove: useMutation({
      mutationFn: (clip: Clip) =>
        call(
          api.DELETE("/v1/clips/{clip_id}", {
            params: { path: { clip_id: clip.id } },
          }),
        ),
      onSuccess: (_, clip) => {
        qc.setQueryData<Clip[]>(key("job-clips", clip.job_id), (old) =>
          old?.filter((c) => c.id !== clip.id),
        );
        qc.removeQueries({ queryKey: key("clip", clip.id) });
      },
    }),
  };
}

// --- captions & health ---------------------------------------------------------------

export function useCaptionStyles() {
  return useQuery({
    queryKey: ["caption-styles"],
    staleTime: Infinity,
    queryFn: () => call(api.GET("/v1/caption-styles")),
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    refetchInterval: 30000,
    retry: false,
    queryFn: async () => {
      try {
        const res = await fetch(`${env.apiUrl}/healthz?ready=true`, {
          cache: "no-store",
        });
        const body = (await res.json()) as {
          status: string;
          checks?: Record<string, string>;
        };
        return { ok: res.ok, ...body };
      } catch {
        return { ok: false, status: "unreachable", checks: undefined };
      }
    },
  });
}
