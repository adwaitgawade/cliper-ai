import type { ToolContent } from "../content/types";
import { ConvertWidget } from "./ConvertWidget";
import { DownloaderWidget } from "./DownloaderWidget";
import { ThumbnailWidget } from "./ThumbnailWidget";
import { TranscribeWidget } from "./TranscribeWidget";

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
    case "downloader":
      return <DownloaderWidget platform={tool.name.replace(/ (Video )?Downloader$/, "")} />;
  }
}
