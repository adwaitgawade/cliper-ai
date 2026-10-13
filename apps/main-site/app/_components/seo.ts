import type { Metadata } from "next";
import { FEATURES } from "./sections/Features";
import { PLANS } from "./sections/pricing-data";
import { CONTACT_EMAIL, CONTENT_UPDATED, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";

/** Stable JSON-LD ids, so pages can reference the site-wide Organization and WebSite nodes. */
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** Path of a page's Markdown twin (served for AI agents; see the rewrites in next.config.ts). */
export const markdownPath = (path: string) => (path === "/" ? "/index.md" : `${path}.md`);

/**
 * Per-page metadata. Next replaces (not merges) nested objects like `openGraph` between layout and page,
 * so every page builds the full set here. OG images come from the colocated `opengraph-image.tsx` files.
 */
export function pageMetadata({
  title,
  absoluteTitle = false,
  description,
  path,
  keywords,
}: {
  title: string;
  /** Skip the layout's "%s | ClipPro" template. */
  absoluteTitle?: boolean;
  description: string;
  path: string;
  keywords?: string[];
}): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords,
    alternates: { canonical: path, types: { "text/markdown": markdownPath(path) } },
    openGraph: { title, description, url: path, type: "website", siteName: SITE_NAME, locale: "en_US" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORG_ID,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/apple-icon`,
  description: SITE_DESCRIPTION,
  email: CONTACT_EMAIL,
  contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: CONTACT_EMAIL },
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: "en",
  publisher: { "@id": ORG_ID },
};

/** The ClipPro product itself, with one Offer per priced plan (straight from the pricing table). */
export const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${SITE_URL}/#software`,
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "MultimediaApplication",
  applicationSubCategory: "AI video editor",
  operatingSystem: "Web browser",
  featureList: Object.values(FEATURES).map((f) => `${f.title}: ${f.body}`),
  publisher: { "@id": ORG_ID },
  dateModified: CONTENT_UPDATED,
  offers: PLANS.filter((p) => p.monthly !== null).map((p) => ({
    "@type": "Offer",
    name: p.name,
    description: `${p.blurb} ${p.credits}.`,
    price: String(p.monthly),
    priceCurrency: "USD",
    url: `${SITE_URL}/#pricing`,
  })),
};

export const breadcrumbJsonLd = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    item: `${SITE_URL}${it.path === "/" ? "" : it.path}`,
  })),
});

export const faqJsonLd = (faqs: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});
