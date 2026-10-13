import { aboutPage } from "./about";
import { privacyPage } from "./privacy";
import { termsPage } from "./terms";

export type { ContentPage } from "./types";

/** Text pages served at /<slug>. Adding one = write a content file, list it here and add a page route. */
export const CONTENT_PAGES = [aboutPage, privacyPage, termsPage];

export const getContentPage = (slug: string) => CONTENT_PAGES.find((p) => p.slug === slug);
