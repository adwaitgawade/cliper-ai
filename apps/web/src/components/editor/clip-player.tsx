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
 * same props, so what plays here is what gets exported.
 */
export default function ClipPlayer({ props }: { props: ClipProps }) {
  return (
    <Player
      component={ClipComposition}
      inputProps={props}
      durationInFrames={clipDurationInFrames(props)}
      fps={props.fps}
      compositionWidth={CANVAS.width}
      compositionHeight={CANVAS.height}
      controls
      clickToPlay
      doubleClickToFullscreen
      allowFullscreen
      spaceKeyToPlayOrPause
      style={{ width: "100%", aspectRatio: "9 / 16" }}
    />
  );
}
