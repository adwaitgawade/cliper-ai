import { Composition, type CalculateMetadataFunction } from "remotion";
import { ClipComposition } from "../ClipComposition";
import {
  clipDurationInFrames,
  COMPOSITION_ID,
  type ClipProps,
} from "../schema";
import { CANVAS, DEFAULT_STYLE } from "../style";

const calculateMetadata: CalculateMetadataFunction<ClipProps> = ({
  props,
}) => ({
  fps: props.fps,
  durationInFrames: clipDurationInFrames(props),
});

const words =
  "This is a preview of the ClipPro caption styles rendered by Remotion."
    .split(" ")
    .map((word, i) => ({ word, start: 0.4 + i * 0.35, end: 0.7 + i * 0.35 }));

/** Studio-only sample; real renders always pass input props. */
const sample: ClipProps = {
  version: 1,
  src: "https://remotion.media/video.mp4",
  source: { width: 1920, height: 1080, fps: 30 },
  start: 0,
  end: 6,
  fps: 30,
  crop: {
    crop_width: 606,
    crop_height: 1080,
    x_offsets: [657],
    segments: [{ start: 0, end: 6, layout: "crop" }],
  },
  words,
  captions: {
    enabled: true,
    style: DEFAULT_STYLE,
    overrides: {},
    profanity_filter: false,
  },
};

export const Root: React.FC = () => (
  <Composition
    id={COMPOSITION_ID}
    component={ClipComposition}
    width={CANVAS.width}
    height={CANVAS.height}
    fps={30}
    durationInFrames={180}
    defaultProps={sample}
    calculateMetadata={calculateMetadata}
  />
);
