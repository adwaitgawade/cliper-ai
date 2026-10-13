import type { Metadata } from "next";
import { aboutPage } from "../_components/pages/about";
import { ContentPageView } from "../_components/pages/ContentPageView";
import { pageMetadata } from "../_components/seo";

export const metadata: Metadata = pageMetadata({ ...aboutPage.seo, path: "/about" });

export default function AboutPage() {
  return <ContentPageView page={aboutPage} />;
}
