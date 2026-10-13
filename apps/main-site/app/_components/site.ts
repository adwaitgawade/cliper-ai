// Canonical public URL of this marketing site (used for canonical links, sitemap and JSON-LD).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://clippro.ai").replace(/\/$/, "");

export const SITE_NAME = "ClipPro";
export const SITE_TITLE = "ClipPro — Long videos in, viral clips out";

/** The one-sentence definition of ClipPro, reused by meta tags, structured data and llms.txt. */
export const SITE_DESCRIPTION =
  "ClipPro is an AI video clipping tool that turns long videos such as podcasts, webinars and streams into short, captioned, vertical clips for TikTok, Instagram Reels and YouTube Shorts.";

export const CONTACT_EMAIL = "hello@clippro.ai";
export const SALES_EMAIL = "sales@clippro.ai";

/**
 * When the site's copy was last reviewed (YYYY-MM-DD). Shown as "Last updated" on tool pages and used
 * for sitemap lastmod and dateModified in structured data. Bump it whenever content changes.
 */
export const CONTENT_UPDATED = "2026-10-13";

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

// Where the product app (apps/web) lives. Set NEXT_PUBLIC_APP_URL per environment.
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

export const LINKS = {
  signUp: `${APP_URL}/sign-up`,
  signIn: `${APP_URL}/sign-in`,
  newVideo: (url?: string) =>
    `${APP_URL}/sign-in?next=${encodeURIComponent(url ? `/new?url=${encodeURIComponent(url)}` : "/new")}`,
};
