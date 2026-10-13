import type { ToolContent } from "../content/types";
import { ConvertWidget } from "./ConvertWidget";
import { CropWidget } from "./CropWidget";
import { DownloaderWidget } from "./DownloaderWidget";
import { ExtractFrameWidget } from "./ExtractFrameWidget";
import { GifWidget } from "./GifWidget";
import { RotateWidget } from "./RotateWidget";
import { TextOverlayWidget } from "./TextOverlayWidget";
import { ThumbnailWidget } from "./ThumbnailWidget";
import { TranscribeWidget } from "./TranscribeWidget";
import { VolumeWidget } from "./VolumeWidget";

export function ToolWidget({ tool }: { tool: ToolContent }) {
  switch (tool.widget) {
    case "transcribe-text":
      return <TranscribeWidget mode="text" />;
    case "transcribe-subtitles":
      return <TranscribeWidget mode="subtitles" />;
    case "video-to-mp3":
    case "resize-vertical":
    case "compress":
    case "trim":
      return <ConvertWidget mode={tool.widget} />;
    case "yt-thumbnail":
      return <ThumbnailWidget />;
    case "extract-frame":
      return <ExtractFrameWidget />;
    case "rotate":
      return <RotateWidget />;
    case "crop":
      return <CropWidget />;
    case "volume":
      return <VolumeWidget />;
    case "text-overlay":
      return <TextOverlayWidget />;
    case "gif":
      return <GifWidget />;
    case "downloader":
      return <DownloaderWidget platform={tool.name.replace(/ (Video )?Downloader$/, "")} />;
  }
}
