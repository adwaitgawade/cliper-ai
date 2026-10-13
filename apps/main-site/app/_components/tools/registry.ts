import { addTextToVideo } from "./content/add-text-to-video";
import { audioVideoToText } from "./content/audio-video-to-text";
import { cropVideo } from "./content/crop-video";
import { extractFrameFromVideo } from "./content/extract-frame-from-video";
import { loopVideo } from "./content/loop-video";
import { mergeVideos } from "./content/merge-videos";
import { instagramVideoDownloader } from "./content/instagram-video-downloader";
import { rotateVideo } from "./content/rotate-video";
import { subtitleGenerator } from "./content/subtitle-generator";
import { tiktokVideoDownloader } from "./content/tiktok-video-downloader";
import type { ToolCategory, ToolContent } from "./content/types";
import { videoCompressor } from "./content/video-compressor";
import { videoResizer } from "./content/video-resizer";
import { videoSpeedChanger } from "./content/video-speed-changer";
import { videoToGif } from "./content/video-to-gif";
import { videoToWebp } from "./content/video-to-webp";
import { videoToMp3 } from "./content/video-to-mp3";
import { videoTrimmer } from "./content/video-trimmer";
import { videoVolumeBooster } from "./content/video-volume-booster";
import { youtubeShortsDownloader } from "./content/youtube-shorts-downloader";
import { youtubeThumbnailDownloader } from "./content/youtube-thumbnail-downloader";

export type { ToolCategory, ToolContent };

/** Display order on /tools. Adding a tool = add a content file and list it here. */
export const TOOLS: ToolContent[] = [
  audioVideoToText,
  subtitleGenerator,
  videoResizer,
  cropVideo,
  videoTrimmer,
  rotateVideo,
  mergeVideos,
  videoSpeedChanger,
  loopVideo,
  videoToGif,
  videoToWebp,
  addTextToVideo,
  videoCompressor,
  videoVolumeBooster,
  videoToMp3,
  extractFrameFromVideo,
  youtubeThumbnailDownloader,
  instagramVideoDownloader,
  youtubeShortsDownloader,
  tiktokVideoDownloader,
];

export const CATEGORIES: { id: ToolCategory; title: string; blurb: string }[] = [
  { id: "transcribe", title: "Transcription & subtitles", blurb: "Turn speech into text and captions with AI that runs on your device." },
  { id: "edit", title: "Video editing & conversion", blurb: "Resize, trim, compress and convert videos without uploading them." },
  { id: "download", title: "Downloaders", blurb: "Save thumbnails and short-form videos for reference and repurposing." },
];

export function getTool(slug: string) {
  return TOOLS.find((t) => t.slug === slug);
}
