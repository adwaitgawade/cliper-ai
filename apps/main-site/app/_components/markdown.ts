/**
 * Plain-Markdown versions of the site's pages for AI assistants and agents (llms.txt convention).
 * Everything is built from the same data the HTML pages render, so the two can't drift apart.
 * Deliberately left out: the placeholder stats, ratings and testimonials on the home page.
 */
import { CONTENT_PAGES, getContentPage, type ContentPage } from "./pages";
import { FEATURES } from "./sections/Features";
import { HOME_FAQS } from "./sections/Faq";
import { STEPS } from "./sections/HowItWorks";
import { PLANS, PRICING_FOOTNOTE, PRICING_NOTE } from "./sections/pricing-data";
import { CASES } from "./sections/UseCases";
import { markdownPath } from "./seo";
import { CONTACT_EMAIL, CONTENT_UPDATED, LINKS, SALES_EMAIL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";
import { TOOLS_FAQS, TOOLS_PAGE } from "./tools/page-content";
import { CATEGORIES, getTool, TOOLS, type ToolContent } from "./tools/registry";

const url = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;
const toolPath = (t: ToolContent) => `/tools/${t.slug}`;
const meta = (path: string) => `Canonical page: ${url(path)}\nLast updated: ${CONTENT_UPDATED}`;
const faqs = (items: { q: string; a: string }[]) => items.map((f) => `### ${f.q}\n\n${f.a}`).join("\n\n");
const join = (...blocks: (string | false | undefined)[]) => blocks.filter(Boolean).join("\n\n") + "\n";

export function homeMarkdown() {
  return join(
    `# ${SITE_NAME}: long videos in, viral clips out`,
    `> ${SITE_DESCRIPTION}`,
    meta("/"),
    "## What ClipPro does",
    "ClipPro watches your long video, finds the moments people will actually stop scrolling for, and hands you captioned, reframed clips ready to post. Paste a link (YouTube, Zoom, Vimeo, Twitch, Riverside, Google Drive, Dropbox, Rumble) or upload an MP4, MOV, MKV or WebM file up to 10 hours long.",
    "## How it works",
    STEPS.map((s, i) => `${i + 1}. **${s.title}.** ${s.body}`).join("\n"),
    "## Features",
    Object.values(FEATURES)
      .map((f) => `- **${f.title}:** ${f.body}`)
      .join("\n"),
    "## Who it's for",
    CASES.map((c) => `- **${c.who}:** ${c.pitch} (${c.points.join(", ")})`).join("\n"),
    `## Pricing\n\n${pricingBody("###")}`,
    `## Frequently asked questions\n\n${faqs(HOME_FAQS)}`,
    `## Free tools\n\nClipPro also offers ${TOOLS.length} free video and audio tools that run entirely in the browser (no upload, no sign-up, no watermark): ${url("/tools")}`,
    `## Contact\n\n- Support: ${CONTACT_EMAIL}\n- Sales: ${SALES_EMAIL}\n- Sign up: ${LINKS.signUp}`,
  );
}

function pricingBody(planHeading: "##" | "###") {
  const plans = PLANS.map((p) => {
    const price =
      p.monthly === null
        ? `Custom pricing, contact ${SALES_EMAIL}`
        : p.monthly === 0
          ? "$0 (free forever)"
          : `$${p.monthly}/month billed monthly, or $${p.annual}/month billed annually ($${p.annual! * 12}/year)`;
    return `${planHeading} ${p.name}\n\n${p.blurb}\n\n- Price: ${price}\n- Credits: ${p.credits}\n${p.features.map((f) => `- ${f}`).join("\n")}`;
  }).join("\n\n");
  return `${PRICING_NOTE}\n\n${plans}\n\n${PRICING_FOOTNOTE}`;
}

export function pricingMarkdown() {
  return join(`# ${SITE_NAME} pricing`, `> ${SITE_DESCRIPTION}`, meta("/#pricing"), pricingBody("##"));
}

export function toolsIndexMarkdown() {
  return join(
    `# ${TOOLS_PAGE.h1}`,
    `> ${TOOLS_PAGE.description}`,
    meta("/tools"),
    ...CATEGORIES.map((cat) => {
      const tools = TOOLS.filter((t) => t.category === cat.id);
      return `## ${cat.title}\n\n${cat.blurb}\n\n${tools.map(toolLine).join("\n")}`;
    }),
    "## Why browser-based",
    TOOLS_PAGE.why.map((w) => `- **${w.title}:** ${w.body}`).join("\n"),
    `## Frequently asked questions\n\n${faqs(TOOLS_FAQS)}`,
  );
}

const toolLine = (t: ToolContent) =>
  `- [${t.name}](${url(toolPath(t))})${t.status === "soon" ? " (coming soon)" : ""}: ${t.cardDescription}`;

export function toolMarkdown(t: ToolContent) {
  const live = t.status === "live";
  const related = t.related.map(getTool).filter((r) => r !== undefined);
  return join(
    `# ${t.h1}`,
    `> ${t.subtitle}`,
    meta(toolPath(t)),
    live
      ? "Price: free. Runs in your web browser; files are processed on your device and never uploaded. No sign-up, no watermark."
      : "Status: coming soon. This page explains what the tool will do and what to use in the meantime.",
    `## How to use the ${t.name}`,
    t.steps.map((s, i) => `${i + 1}. **${s.title}.** ${s.body}`).join("\n"),
    `## ${live ? "Features" : "What it will do"}`,
    t.features.map((f) => `- **${f.title}:** ${f.body}`).join("\n"),
    ...t.sections.map((s) => `## ${s.heading}\n\n${s.paragraphs.join("\n\n")}`),
    `## Who uses the ${t.name}`,
    t.useCases.map((u) => `- **${u.title}:** ${u.body}`).join("\n"),
    `## ${t.name} FAQ\n\n${faqs(t.faqs)}`,
    related.length > 0 && `## Related free tools\n\n${related.map(toolLine).join("\n")}`,
  );
}

/** About, Privacy, Terms. Relative `[label](/path)` links in the copy become absolute URLs. */
export function contentPageMarkdown(page: ContentPage) {
  const abs = (text: string) => text.replace(/\]\(\//g, `](${SITE_URL}/`);
  return join(
    `# ${page.h1}`,
    `> ${page.subtitle}`,
    `Canonical page: ${url(`/${page.slug}`)}\n${page.updatedLabel}: ${page.updated}`,
    ...page.sections.map(
      (s) =>
        `## ${s.heading}\n\n${s.blocks.map((b) => abs(typeof b === "string" ? b : b.list.map((i) => `- ${i}`).join("\n"))).join("\n\n")}`,
    ),
  );
}

/** https://llmstxt.org — a short, link-first map of the site. */
export function llmsTxt() {
  const md = (path: string) => url(markdownPath(path));
  return join(
    `# ${SITE_NAME}`,
    `> ${SITE_DESCRIPTION} ${SITE_NAME} also publishes free, browser-based video and audio tools (transcription, subtitles, resizing, trimming, compression, conversion) that never upload your files.`,
    [
      "Key facts:",
      `- Product: AI clipping, virality score, animated captions in 30+ languages, AI reframe to 9:16 / 1:1 / 4:5, B-roll, brand kits, auto-posting to TikTok, Instagram, YouTube, LinkedIn, X and Facebook.`,
      `- Pricing: free plan (${PLANS.find((p) => p.monthly === 0)?.credits}); paid plans from $${Math.min(...PLANS.flatMap((p) => (p.annual ? [p.annual] : [])))}/month billed annually. ${PRICING_NOTE}`,
      `- Free tools: ${TOOLS.filter((t) => t.status === "live").length} live tools at ${url("/tools")}, all free with no sign-up, processing locally in the browser.`,
      `- Contact: ${CONTACT_EMAIL}`,
    ].join("\n"),
    "Every page is also available as Markdown: append `.md` to its path (the home page is `/index.md`), or request it with `Accept: text/markdown`.",
    [
      "## Product\n",
      `- [${SITE_NAME} overview](${md("/")}): what ClipPro does, how it works, features, use cases and FAQ`,
      `- [Pricing](${url("/pricing.md")}): plans, prices, credits and what each plan includes`,
    ].join("\n"),
    `## Free tools\n\n- [All free tools](${md("/tools")}): overview of every tool by category\n${TOOLS.map(
      (t) => `- [${t.name}](${md(toolPath(t))})${t.status === "soon" ? " (coming soon)" : ""}: ${t.cardDescription}`,
    ).join("\n")}`,
    `## Company\n\n${CONTENT_PAGES.map((p) => `- [${p.name}](${md(`/${p.slug}`)}): ${p.seo.description}`).join("\n")}`,
    `## Optional\n\n- [Full site content](${url("/llms-full.txt")}): every page above in a single Markdown file\n- [Sitemap](${url("/sitemap.xml")})`,
  );
}

/** Every page's Markdown in one file, so an agent can read the whole site in a single request. */
export function llmsFullTxt() {
  return [homeMarkdown(), toolsIndexMarkdown(), ...TOOLS.map(toolMarkdown), ...CONTENT_PAGES.map(contentPageMarkdown)].join(
    "\n---\n\n",
  );
}

/** Resolves a site path ("", "pricing", "about", "tools", "tools/<slug>", …) to its Markdown, or null. */
export function markdownForPath(path: string[]): string | null {
  const [first, second, ...rest] = path;
  if (rest.length) return null;
  if (!first) return homeMarkdown();
  if (first === "pricing" && !second) return pricingMarkdown();
  const page = getContentPage(first);
  if (page) return second ? null : contentPageMarkdown(page);
  if (first !== "tools") return null;
  if (!second) return toolsIndexMarkdown();
  const tool = getTool(second);
  return tool ? toolMarkdown(tool) : null;
}

export const MARKDOWN_PATHS: string[][] = [
  [],
  ["pricing"],
  ...CONTENT_PAGES.map((p) => [p.slug]),
  ["tools"],
  ...TOOLS.map((t) => ["tools", t.slug]),
];
