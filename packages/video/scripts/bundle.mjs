// Pre-builds the Remotion bundle that render.mjs serves. Run after changing src/.
import { bundle } from "@remotion/bundler";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, "dist", "bundle");

await bundle({
  entryPoint: path.join(root, "src", "remotion", "index.ts"),
  outDir,
});
console.log(outDir);
