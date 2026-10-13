import type { MetadataRoute } from "next";
import { CONTENT_PAGES } from "./_components/pages";
import { CONTENT_UPDATED, SITE_URL } from "./_components/site";
import { TOOLS } from "./_components/tools/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = CONTENT_UPDATED;
  return [
    { url: SITE_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/tools`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    ...TOOLS.map((t) => ({
      url: `${SITE_URL}/tools/${t.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: t.status === "live" ? 0.8 : 0.6,
    })),
    ...CONTENT_PAGES.map((p) => ({
      url: `${SITE_URL}/${p.slug}`,
      lastModified: p.updated,
      changeFrequency: "yearly" as const,
      priority: p.slug === "about" ? 0.5 : 0.3,
    })),
  ];
}
