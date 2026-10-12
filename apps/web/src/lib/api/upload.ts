import { env } from "@/lib/env";
import { ApiError, api, authHeaders, call, type Video } from "./client";

/** Files up to this size go through the API as multipart; larger ones upload straight to storage. */
export const MULTIPART_LIMIT = 100 * 1024 ** 2;
export const MAX_UPLOAD_BYTES = 5 * 1024 ** 3;
export const ACCEPTED_TYPES = [".mp4", ".mov", ".mkv", ".webm"];

interface XhrOptions {
  method: "PUT" | "POST";
  url: string;
  headers?: Record<string, string>;
  body: XMLHttpRequestBodyInit;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/** fetch() can't report upload progress, so uploads use XMLHttpRequest. */
function xhr({
  method,
  url,
  headers = {},
  body,
  onProgress,
  signal,
}: XhrOptions): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open(method, url);
    for (const [k, v] of Object.entries(headers)) req.setRequestHeader(k, v);
    req.upload.onprogress = (e) =>
      e.lengthComputable && onProgress?.(e.loaded / e.total);
    req.onload = () => resolve({ status: req.status, text: req.responseText });
    req.onerror = () => reject(new Error("Network error during upload"));
    req.onabort = () =>
      reject(new DOMException("Upload canceled", "AbortError"));
    signal?.addEventListener("abort", () => req.abort(), { once: true });
    req.send(body);
  });
}

function parseError(status: number, text: string): ApiError {
  try {
    const e = JSON.parse(text).error;
    return new ApiError(status, e.code, e.message, e.details, e.request_id);
  } catch {
    return new ApiError(status, `http_${status}`, text || "Upload failed");
  }
}

/**
 * Upload a video. Small files go through POST /v1/videos/upload; large files get a
 * presigned PUT URL from POST /v1/videos, upload directly to storage, then confirm
 * with POST /v1/videos/{id}/complete.
 */
export async function uploadVideo(
  file: File,
  {
    onProgress,
    signal,
  }: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {},
): Promise<Video> {
  if (file.size <= MULTIPART_LIMIT) {
    const form = new FormData();
    form.append("file", file);
    form.append("rights_attested", "true");
    const res = await xhr({
      method: "POST",
      url: `${env.apiUrl}/v1/videos/upload`,
      headers: await authHeaders(),
      body: form,
      onProgress,
      signal,
    });
    if (res.status >= 300) throw parseError(res.status, res.text);
    return JSON.parse(res.text) as Video;
  }

  const created = await call(
    api.POST("/v1/videos", {
      body: {
        filename: file.name,
        size_bytes: file.size,
        content_type: file.type || null,
        rights_attested: true,
      },
    }),
  );
  if (!created.upload) throw new Error("The API did not return an upload URL");
  const put = await xhr({
    method: "PUT",
    url: created.upload.url,
    headers: created.upload.headers,
    body: file,
    onProgress,
    signal,
  });
  if (put.status >= 300)
    throw new Error(`Storage rejected the upload (HTTP ${put.status})`);
  return call(
    api.POST("/v1/videos/{video_id}/complete", {
      params: { path: { video_id: created.video.id } },
    }),
  );
}
