import type { MetadataRoute } from "next";
import { SITE_URL } from "./_components/site";
import { TOOLS } from "./_components/tools/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/tools`, changeFrequency: "weekly", priority: 0.9 },
    ...TOOLS.map((t) => ({
      url: `${SITE_URL}/tools/${t.slug}`,
      changeFrequency: "monthly" as const,
      priority: t.status === "live" ? 0.8 : 0.6,
    })),
  ];
}
