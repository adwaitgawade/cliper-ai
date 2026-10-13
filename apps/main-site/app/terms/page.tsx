import type { Metadata } from "next";
import { termsPage } from "../_components/pages/terms";
import { ContentPageView } from "../_components/pages/ContentPageView";
import { pageMetadata } from "../_components/seo";

export const metadata: Metadata = pageMetadata({ ...termsPage.seo, path: "/terms" });

export default function TermsPage() {
  return <ContentPageView page={termsPage} />;
}
