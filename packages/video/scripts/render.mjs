// Renders one clip. Called by the Python render task:
//   node render.mjs --props props.json --out clip.mp4 [--bundle dir] [--concurrency n]
// Prints one JSON object per line: {"progress": 0..1} while rendering, then {"done": true}.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { values: args } = parseArgs({
  options: {
    props: { type: "string" },
    out: { type: "string" },
    bundle: { type: "string" },
    concurrency: { type: "string" },
    timeout: { type: "string", default: "120000" },
  },
});
if (!args.props || !args.out) {
  console.error(
    "usage: render.mjs --props <file> --out <file> [--bundle <dir>] [--concurrency <n>]",
  );
  process.exit(2);
}

const emit = (obj) => process.stdout.write(JSON.stringify(obj) + "\n");

const bundleDir = args.bundle ?? path.join(root, "dist", "bundle");
const builtAt = existsSync(path.join(bundleDir, "index.html"))
  ? statSync(path.join(bundleDir, "index.html")).mtimeMs
  : 0;
// Rebuild when the composition source is newer than the bundle (local development).
// Container images ship a prebuilt bundle and no newer sources, so they never rebuild.
const stale = readdirSync(path.join(root, "src"), { recursive: true }).some(
  (f) => statSync(path.join(root, "src", String(f))).mtimeMs > builtAt,
);
const serveUrl = stale
  ? await bundle({
      entryPoint: path.join(root, "src", "remotion", "index.ts"),
      outDir: bundleDir,
    })
  : bundleDir;

const inputProps = JSON.parse(readFileSync(args.props, "utf8"));
const composition = await selectComposition({
  serveUrl,
  id: "Clip",
  inputProps,
});

let last = -1;
await renderMedia({
  composition,
  serveUrl,
  inputProps,
  codec: "h264",
  audioCodec: "aac",
  pixelFormat: "yuv420p",
  crf: 20,
  outputLocation: args.out,
  concurrency: args.concurrency ? Number(args.concurrency) : null,
  timeoutInMilliseconds: Number(args.timeout),
  onProgress: ({ progress }) => {
    const p = Math.floor(progress * 100);
    if (p !== last) {
      last = p;
      emit({ progress: p / 100 });
    }
  },
});
emit({
  done: true,
  frames: composition.durationInFrames,
  fps: composition.fps,
});
