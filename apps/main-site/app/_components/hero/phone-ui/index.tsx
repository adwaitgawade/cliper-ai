import type { HeroClip } from "../clips";
import { InstagramUI } from "./Instagram";
import { ShortsUI } from "./Shorts";
import { TikTokUI } from "./TikTok";

/** The app interface for a clip's platform; it wipes in together with the clip. */
export function PlatformUI({ clip, live }: { clip: HeroClip; live: boolean }) {
  switch (clip.platform) {
    case "tiktok":
      return <TikTokUI clip={clip} live={live} />;
    case "youtube":
      return <ShortsUI clip={clip} live={live} />;
    default:
      return <InstagramUI clip={clip} live={live} />;
  }
}
