import type { NextConfig } from "next";

// Agents that ask for Markdown get the page's Markdown twin (app/md) at the same URL.
const wantsMarkdown = [{ type: "header" as const, key: "accept", value: "(.*)text/markdown(.*)" }];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async rewrites() {
    return {
      // beforeFiles, so the Accept-header rewrites win over the prerendered HTML pages.
      beforeFiles: [
        { source: "/index.md", destination: "/md" },
        { source: "/pricing.md", destination: "/md/pricing" },
        { source: "/:page(about|privacy|terms).md", destination: "/md/:page" },
        { source: "/tools.md", destination: "/md/tools" },
        { source: "/tools/:slug.md", destination: "/md/tools/:slug" },
        { source: "/", has: wantsMarkdown, destination: "/md" },
        { source: "/:page(about|privacy|terms)", has: wantsMarkdown, destination: "/md/:page" },
        { source: "/tools", has: wantsMarkdown, destination: "/md/tools" },
        { source: "/tools/:slug", has: wantsMarkdown, destination: "/md/tools/:slug" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  turbopack: {
    rules: {
      "*.css": {
        // Leave CSS Modules alone: `as: "*.css"` would re-type them as global CSS.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
