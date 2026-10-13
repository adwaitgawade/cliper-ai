import type { Video } from "@/lib/api/client";

export function videoTitle(video: Video): string {
  if (video.title) return video.title;
  if (video.filename) return video.filename.replace(/\.[^.]+$/, "");
  if (video.source_url) {
    try {
      const u = new URL(video.source_url);
      return u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "");
    } catch {
      return video.source_url;
    }
  }
  return "Untitled video";
}
