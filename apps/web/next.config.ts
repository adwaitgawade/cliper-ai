import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Remotion composition is shared with the render worker as TypeScript source.
  transpilePackages: ["@repo/video"],
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
