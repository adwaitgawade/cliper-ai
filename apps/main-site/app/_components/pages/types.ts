/**
 * A text page (About, Privacy, Terms). Strings may contain Markdown-style links, `[label](/path)` or
 * `[label](mailto:…)`, which become real links in HTML and stay as-is in the Markdown twin.
 */
export type Block = string | { list: string[] };

export type ContentPage = {
  /** URL path segment, e.g. "privacy". */
  slug: string;
  /** Short name for breadcrumbs and the footer. */
  name: string;
  /** schema.org type of the page. */
  schemaType: "AboutPage" | "WebPage";
  seo: { title: string; description: string };
  eyebrow: string;
  h1: string;
  subtitle: string;
  /** YYYY-MM-DD. For legal pages this is the effective date. */
  updated: string;
  updatedLabel: "Last updated" | "Effective";
  /** Show an "On this page" list of section links (long legal pages). */
  toc?: boolean;
  /** Optional cards above the article, e.g. "what we make". */
  cards?: { title: string; body: string; href: string; cta: string }[];
  sections: { id: string; heading: string; blocks: Block[] }[];
};
