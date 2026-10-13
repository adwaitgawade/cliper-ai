import { MARKDOWN_PATHS, markdownForPath } from "../../_components/markdown";
import { SITE_URL } from "../../_components/site";

// Markdown twins of the HTML pages. Reached through the rewrites in next.config.ts
// (`/tools/video-trimmer.md`, or `/tools/video-trimmer` with `Accept: text/markdown`).
export function generateStaticParams() {
  return MARKDOWN_PATHS.map((path) => ({ path }));
}

export async function GET(_: Request, ctx: RouteContext<"/md/[[...path]]">) {
  const path = (await ctx.params).path ?? [];
  const md = markdownForPath(path);
  if (md === null) return new Response("Not found\n", { status: 404 });

  const htmlUrl = path[0] === "pricing" ? `${SITE_URL}/#pricing` : [SITE_URL, ...path].join("/");
  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept",
      // The HTML page stays the canonical, indexable version.
      Link: `<${htmlUrl}>; rel="canonical"`,
    },
  });
}
