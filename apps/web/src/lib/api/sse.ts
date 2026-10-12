import { env } from "@/lib/env";
import { authHeaders, toApiError } from "./client";

export interface SseMessage {
  event: string;
  data: string;
}

/**
 * Reads a server-sent event stream with fetch, because EventSource can't send the
 * Authorization header. Resolves when the server closes the stream.
 */
export async function readEventStream(
  path: string,
  onMessage: (msg: SseMessage) => void,
  signal: AbortSignal,
) {
  const res = await fetch(`${env.apiUrl}${path}`, {
    headers: { ...(await authHeaders()), Accept: "text/event-stream" },
    signal,
    cache: "no-store",
  });
  if (!res.ok || !res.body) throw await toApiError(res);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value.replace(/\r\n/g, "\n");
    let boundary;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      let event = "message";
      const data: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith(":")) continue; // keepalive comment
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:"))
          data.push(line.slice(5).replace(/^ /, ""));
      }
      if (data.length) onMessage({ event, data: data.join("\n") });
    }
  }
}
