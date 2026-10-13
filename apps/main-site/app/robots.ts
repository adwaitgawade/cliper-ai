import type { MetadataRoute } from "next";
import { SITE_URL } from "./_components/site";

// The download relay and the internal Markdown route (served publicly as /<page>.md) aren't pages.
const disallow = ["/api/", "/md/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      // AI assistants are named explicitly so the policy is a decision, not a default. A crawler that matches
      // a named group ignores the "*" group, so each group repeats the disallow list.
      {
        // Search and answer engines that cite pages, plus fetches made on a user's behalf.
        userAgent: ["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Perplexity-User", "Claude-SearchBot", "Claude-User"],
        allow: "/",
        disallow,
      },
      {
        // Model-training crawlers. Allowed so assistants learn what ClipPro is; switch `allow` to `disallow: "/"` to opt out.
        userAgent: ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot"],
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
