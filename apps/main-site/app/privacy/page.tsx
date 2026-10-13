import type { Metadata } from "next";
import { privacyPage } from "../_components/pages/privacy";
import { ContentPageView } from "../_components/pages/ContentPageView";
import { pageMetadata } from "../_components/seo";

export const metadata: Metadata = pageMetadata({ ...privacyPage.seo, path: "/privacy" });

export default function PrivacyPage() {
  return <ContentPageView page={privacyPage} />;
}
