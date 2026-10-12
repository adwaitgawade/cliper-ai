import { Video } from "@remotion/media";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions } from "./Captions";
import type { ClipProps, Layout } from "./schema";

function layoutAt(segments: ClipProps["crop"]["segments"], t: number): Layout {
  const seg =
    segments.find((s) => t >= s.start && t < s.end) ??
    segments[segments.length - 1];
  return seg?.layout ?? "crop";
}

/**
 * One 9:16 clip: the source video cropped (or fitted over a blurred copy for the wide
 * layout), with word-synced captions on top. Rendered by the server and previewed in
 * the browser from the same props.
 */
export const ClipComposition: React.FC<ClipProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { source, crop } = props;
  const t = frame / fps;
  const layout = layoutAt(crop.segments, t);
  const usesWide = crop.segments.some((s) => s.layout === "wide");
  const trimBefore = Math.round(props.start * fps);

  let main: React.CSSProperties;
  if (layout === "wide") {
    const h = (W * source.height) / source.width;
    main = {
      position: "absolute",
      left: 0,
      top: (H - h) / 2,
      width: W,
      height: h,
    };
  } else {
    const scale = H / crop.crop_height;
    const centered = (source.width - crop.crop_width) / 2;
    const x =
      crop.x_offsets[Math.min(frame, crop.x_offsets.length - 1)] ?? centered;
    main = {
      position: "absolute",
      left: -x * scale,
      top: 0,
      width: source.width * scale,
      height: source.height * scale,
    };
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      {usesWide ? (
        <AbsoluteFill style={{ opacity: layout === "wide" ? 1 : 0 }}>
          <Video
            src={props.src}
            trimBefore={trimBefore}
            muted
            objectFit="cover"
            style={{
              width: W,
              height: H,
              filter: "blur(36px) brightness(0.65)",
              transform: "scale(1.15)",
            }}
          />
        </AbsoluteFill>
      ) : null}
      <Video
        src={props.src}
        trimBefore={trimBefore}
        objectFit="fill"
        style={main}
      />
      <Captions props={props} />
    </AbsoluteFill>
  );
};
