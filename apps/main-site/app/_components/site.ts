// Canonical public URL of this marketing site (used for canonical links, sitemap and JSON-LD).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://clippro.ai").replace(/\/$/, "");

// Where the product app (apps/web) lives. Set NEXT_PUBLIC_APP_URL per environment.
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

export const LINKS = {
  signUp: `${APP_URL}/sign-up`,
  signIn: `${APP_URL}/sign-in`,
  newVideo: (url?: string) =>
    `${APP_URL}/sign-in?next=${encodeURIComponent(url ? `/new?url=${encodeURIComponent(url)}` : "/new")}`,
};
