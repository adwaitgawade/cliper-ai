import { ogImage, OG_SIZE } from "../../_components/og";
import { TRUST_POINTS } from "../../_components/tools/links";
import { getTool, TOOLS } from "../../_components/tools/registry";

export const alt = "ClipPro free video tool";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const tool = getTool((await params).slug);
  const live = tool?.status === "live";
  return ogImage({
    eyebrow: live ? "Free tool" : "Coming soon",
    title: tool?.name ?? "Free video tools",
    subtitle: tool?.cardDescription ?? "",
    chips: live ? TRUST_POINTS : [],
  });
}
