import globals from "globals";
import { config } from "@repo/eslint-config/react-internal";

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  { ignores: ["dist/**"] },
  { files: ["scripts/**"], languageOptions: { globals: globals.node } },
];
