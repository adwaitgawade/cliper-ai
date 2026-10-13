import { llmsTxt } from "../_components/markdown";

// https://llmstxt.org — prerendered at build time (no request data is read).
export function GET() {
  return new Response(llmsTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
