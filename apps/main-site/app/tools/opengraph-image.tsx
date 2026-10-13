import { ogImage, OG_SIZE } from "../_components/og";
import { TRUST_POINTS } from "../_components/tools/links";
import { TOOLS_PAGE } from "../_components/tools/page-content";

export const alt = "ClipPro free video tools that run in your browser";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({
    eyebrow: "Free tools",
    title: TOOLS_PAGE.h1,
    subtitle: "Transcribe, add subtitles, resize, trim, compress and convert videos. Free, private and fast.",
    chips: TRUST_POINTS,
  });
}
