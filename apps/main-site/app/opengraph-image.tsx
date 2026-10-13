import { ogImage, OG_SIZE } from "./_components/og";

export const alt = "ClipPro: AI that turns long videos into viral short clips";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({
    eyebrow: "AI video clipping",
    title: "Long videos in, viral clips out",
    subtitle: "Turn podcasts, webinars and streams into captioned, vertical shorts for TikTok, Reels and YouTube Shorts.",
    chips: ["AI clipping", "Animated captions", "AI reframe", "Auto-post"],
  });
}
