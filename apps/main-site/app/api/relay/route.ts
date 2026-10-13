// Same-origin relay for the in-browser yt-dlp (Pyodide) downloader. It only forwards bytes:
// all extraction logic runs in the visitor's browser. Browsers can't read Instagram responses
// cross-origin or set headers like Cookie/User-Agent, so the worker sends them through here.
//
// POST: one raw HTTP exchange for yt-dlp. The target is in `x-relay-url`, the method in
//   `x-relay-method` and the headers (URI-encoded JSON object) in `x-relay-headers`. Redirects are
//   NOT followed: the upstream status/headers come back in `x-relay-status`/`x-relay-headers` on a
//   200 response, so yt-dlp sees each hop and its Set-Cookie headers.
// GET ?url=&h=[&name=]: streams a media file to the browser (as a download when `name` is given),
//   following redirects and fetching whole files upstream in bounded chunks.

import { Agent, request as httpsRequest } from "node:https";
import { Readable } from "node:stream";

const ALLOWED_HOSTS = ["instagram.com", "cdninstagram.com", "fbcdn.net", "youtube.com", "googlevideo.com"];
// Hop-by-hop and transport headers that must not be copied between the two connections.
const DROP_REQUEST = new Set(["host", "connection", "content-length", "accept-encoding", "transfer-encoding"]);
const DROP_RESPONSE = new Set(["content-encoding", "content-length", "transfer-encoding", "connection"]);
const MAX_REDIRECTS = 10;
const CHUNK = 10 * 1024 * 1024;
// Reuses TLS connections across the chunked requests of one download.
const agent = new Agent({ keepAlive: true });

function allowed(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    return ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`)) ? url : null;
  } catch {
    return null;
  }
}

/** Blocks other sites from hot-linking the relay. Browsers always send Sec-Fetch-Site. */
function sameOrigin(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  return site === "same-origin" || site === "none";
}

function outgoingHeaders(encoded: string | null) {
  const headers: Record<string, string> = {};
  if (!encoded) return headers;
  const parsed = JSON.parse(decodeURIComponent(encoded)) as Record<string, string>;
  for (const [name, value] of Object.entries(parsed)) {
    if (!DROP_REQUEST.has(name.toLowerCase())) headers[name] = value;
  }
  return headers;
}

type Upstream = { status: number; headers: [string, string][]; body: ReadableStream<Uint8Array> };

/**
 * node:https rather than fetch(): undici's fetch forces `sec-fetch-mode: cors`, `accept-language`
 * and `accept-encoding`, and Instagram serves a page without the media data to such requests.
 * Without Accept-Encoding the upstream answers uncompressed, so bodies pass through untouched.
 */
function upstreamRequest(url: URL, method: string, headers: Record<string, string>, body?: ArrayBuffer) {
  return new Promise<Upstream>((resolve, reject) => {
    const req = httpsRequest(url, { method, headers, agent, timeout: 30_000 }, (res) => {
      const pairs: [string, string][] = [];
      for (let i = 0; i < res.rawHeaders.length; i += 2) pairs.push([res.rawHeaders[i].toLowerCase(), res.rawHeaders[i + 1]]);
      resolve({ status: res.statusCode ?? 502, headers: pairs, body: Readable.toWeb(res) as ReadableStream<Uint8Array> });
    });
    req.on("timeout", () => req.destroy(new Error("Upstream timed out")));
    req.on("error", reject);
    req.end(body ? Buffer.from(body) : undefined);
  });
}

const header = (up: Upstream, name: string) => up.headers.find(([k]) => k === name)?.[1] ?? null;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const target = allowed(request.headers.get("x-relay-url") ?? "");
  if (!target) return new Response("Host not allowed", { status: 403 });

  const method = (request.headers.get("x-relay-method") ?? "GET").toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  let upstream: Upstream;
  try {
    upstream = await upstreamRequest(target, method, outgoingHeaders(request.headers.get("x-relay-headers")), body);
  } catch (err) {
    return new Response(`Upstream request failed: ${err instanceof Error ? err.message : err}`, { status: 502 });
  }

  // Pairs rather than an object, so repeated headers (Set-Cookie) survive.
  const pairs = upstream.headers.filter(([name]) => !DROP_RESPONSE.has(name));

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "application/octet-stream",
      "cache-control": "no-store",
      "x-relay-status": String(upstream.status),
      "x-relay-headers": encodeURIComponent(JSON.stringify(pairs)),
    },
  });
}

/** `bytes START-END/TOTAL` → TOTAL, or null when the upstream didn't honour the range. */
function totalFromRange(up: Upstream) {
  const m = header(up, "content-range")?.match(/\/(\d+)$/);
  return up.status === 206 && m ? Number(m[1]) : null;
}

/**
 * The rest of a file after its first chunk, fetched CHUNK bytes at a time. YouTube's CDN throttles
 * open-ended requests to roughly playback speed but serves bounded ranges at full speed.
 */
function chunkedBody(first: Upstream, target: URL, headers: Record<string, string>, total: number) {
  let offset = 0;
  let current: ReadableStreamDefaultReader<Uint8Array> | null = first.body.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        if (!current) {
          if (offset >= total) return controller.close();
          const next = await upstreamRequest(target, "GET", { ...headers, range: `bytes=${offset}-${Math.min(offset + CHUNK, total) - 1}` });
          if (next.status !== 206) {
            await next.body.cancel();
            return controller.error(new Error(`Upstream returned ${next.status} for a range request`));
          }
          current = next.body.getReader();
        }
        const { done, value } = await current.read();
        if (done) {
          current = null;
          continue;
        }
        offset += value.byteLength;
        return controller.enqueue(value);
      }
    },
    cancel: () => current?.cancel(),
  });
}

function attachmentHeader(raw: string) {
  const ascii = raw.replace(/[^\w.-]+/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(raw)}`;
}

export async function GET(request: Request) {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const params = new URL(request.url).searchParams;
  let target = allowed(params.get("url") ?? "");
  if (!target) return new Response("Host not allowed", { status: 403 });
  const headers = outgoingHeaders(params.get("h"));
  // Whole-file requests are fetched in chunks (see chunkedBody); a client's own range passes through.
  const clientRange = request.headers.get("range");
  const firstRange = clientRange ?? `bytes=0-${CHUNK - 1}`;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let upstream: Upstream;
    try {
      upstream = await upstreamRequest(target, "GET", { ...headers, range: firstRange });
    } catch (err) {
      return new Response(`Upstream request failed: ${err instanceof Error ? err.message : err}`, { status: 502 });
    }
    const location = header(upstream, "location");
    if (upstream.status >= 300 && upstream.status < 400 && location) {
      // Every hop is checked against the allowlist, so a redirect can't send the relay elsewhere.
      await upstream.body.cancel();
      target = allowed(new URL(location, target).href);
      if (!target) return new Response("Redirect to a host that is not allowed", { status: 403 });
      continue;
    }
    if (upstream.status >= 400) {
      await upstream.body.cancel();
      return new Response(`Upstream returned ${upstream.status}`, { status: 502 });
    }

    const out = new Headers({
      "content-type": header(upstream, "content-type") ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    const name = params.get("name");
    if (name) out.set("content-disposition", attachmentHeader(name));

    const total = totalFromRange(upstream);
    if (!clientRange && total !== null) {
      out.set("content-length", String(total));
      return new Response(chunkedBody(upstream, target, headers, total), { status: 200, headers: out });
    }
    for (const h of ["content-length", "content-range", "accept-ranges", "content-encoding"]) {
      const v = header(upstream, h);
      if (v) out.set(h, v);
    }
    return new Response(upstream.body, { status: upstream.status, headers: out });
  }
  return new Response("Too many redirects", { status: 502 });
}
