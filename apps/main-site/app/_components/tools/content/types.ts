export type ToolCategory = "download" | "transcribe" | "edit";

/** Which in-browser widget renders the tool. "downloader" is a disabled placeholder (needs a server). */
export type ToolWidget =
  | "transcribe-text"
  | "transcribe-subtitles"
  | "video-to-mp3"
  | "resize-vertical"
  | "compress"
  | "trim"
  | "yt-thumbnail"
  | "extract-frame"
  | "rotate"
  | "crop"
  | "volume"
  | "text-overlay"
  | "gif"
  | "downloader";

export type ToolContent = {
  slug: string;
  /** Short name for cards and breadcrumbs, e.g. "Video to MP3 Converter". */
  name: string;
  category: ToolCategory;
  /** "soon" = SEO page is live but the tool itself is disabled. */
  status: "live" | "soon";
  widget: ToolWidget;
  /** One line for tool cards, at most ~110 characters. */
  cardDescription: string;
  seo: {
    /** <title>, at most 60 characters, primary keyword first. " | ClipPro" is appended automatically. */
    title: string;
    /** Meta description, 140–155 characters, includes the primary keyword and a call to action. */
    description: string;
    /** Primary keyword first, then 4–8 secondary/long-tail keywords. */
    keywords: string[];
  };
  /** The page's only H1; contains the primary keyword. */
  h1: string;
  /** 1–2 sentences under the H1. */
  subtitle: string;
  /** Exactly 3 steps; also used for HowTo structured data. */
  steps: { title: string; body: string }[];
  /** 4–6 feature/benefit cards. */
  features: { title: string; body: string }[];
  /** 2–4 long-form H2 sections, 2–3 paragraphs each, 60–120 words per paragraph. */
  sections: { heading: string; paragraphs: string[] }[];
  /** 3–4 audience/use-case cards. */
  useCases: { title: string; body: string }[];
  /** 5–7 FAQs; also used for FAQPage structured data. */
  faqs: { q: string; a: string }[];
  /** 3 related tool slugs, used for internal links. */
  related: string[];
};
