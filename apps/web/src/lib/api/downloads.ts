"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { api, call, type Clip } from "./client";
import { isActiveRender, useClipMutations } from "./hooks";

export type CaptionFormat = "srt" | "vtt" | "ass";

/** Save a URL as a file. Signed media URLs already carry Content-Disposition. */
function saveFile(href: string, filename = "") {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** A rendered file that matches the clip's saved edits, if there is one. */
export function currentRender(clip: Clip) {
  const r = clip.latest_render;
  return r?.status === "succeeded" && r.download_url && !clip.render_outdated
    ? r
    : null;
}

/** Caption files are built from the saved clip on request; no render needed. */
export async function downloadCaptions(clipId: string, fmt: CaptionFormat) {
  const text = await call(
    api.GET("/v1/clips/{clip_id}/captions/{fmt}", {
      params: { path: { clip_id: clipId, fmt } },
      parseAs: "text",
    }),
  );
  const url = URL.createObjectURL(
    new Blob([text as string], { type: "text/plain" }),
  );
  saveFile(url, `clip-${clipId}.${fmt}`);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Download a clip's video. Clips render on demand: with no render matching the saved
 * edits, this starts one and the download begins by itself when it finishes (while the
 * calling component stays mounted; the clip queries poll during a render).
 */
export function useClipDownload(clip: Clip | undefined) {
  const { render } = useClipMutations();
  const waitingFor = useRef<string | null>(null);
  const latest = clip?.latest_render;

  useEffect(() => {
    if (!latest || latest.id !== waitingFor.current) return;
    if (latest.status === "succeeded" && latest.download_url) {
      waitingFor.current = null;
      saveFile(latest.download_url);
    } else if (latest.status === "failed") {
      waitingFor.current = null;
      toast.error("Rendering failed. Try downloading again.");
    }
  }, [latest]);

  /** `fresh` renders even if a render looks current, e.g. right after saving edits. */
  const download = async ({ fresh = false }: { fresh?: boolean } = {}) => {
    if (!clip) return;
    const ready = currentRender(clip);
    if (!fresh && ready) {
      saveFile(ready.download_url!);
      return;
    }
    if (!fresh && latest && isActiveRender(clip)) {
      waitingFor.current = latest.id;
      return;
    }
    try {
      const created = await render.mutateAsync(clip.id);
      waitingFor.current = created.id;
      toast.success(
        "Preparing your clip. The download starts when it's ready, usually in a minute or two.",
      );
    } catch {
      // mutation errors are toasted globally
    }
  };

  return {
    download,
    preparing: render.isPending || (clip ? isActiveRender(clip) : false),
  };
}
