"use client";

import { Player } from "@remotion/player";
import {
  CANVAS,
  ClipComposition,
  clipDurationInFrames,
  type ClipProps,
} from "@repo/video";

/**
 * Live preview of a clip: the exact composition the render worker renders, fed the
 * same props, so what plays here is what gets exported. `ambient` plays it muted on a
 * loop with no controls, for hover previews.
 */
export default function ClipPlayer({
  props,
  ambient = false,
}: {
  props: ClipProps;
  ambient?: boolean;
}) {
  return (
    <Player
      component={ClipComposition}
      inputProps={props}
      durationInFrames={clipDurationInFrames(props)}
      fps={props.fps}
      compositionWidth={CANVAS.width}
      compositionHeight={CANVAS.height}
      controls={!ambient}
      clickToPlay={!ambient}
      doubleClickToFullscreen={!ambient}
      allowFullscreen={!ambient}
      spaceKeyToPlayOrPause={!ambient}
      autoPlay={ambient}
      initiallyMuted={ambient}
      loop={ambient}
      style={{ width: "100%", aspectRatio: "9 / 16" }}
    />
  );
}
