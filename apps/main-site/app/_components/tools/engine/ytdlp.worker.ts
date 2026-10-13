// Runs yt-dlp (Python) in the browser via Pyodide, off the main thread. Pyodide comes from the
// jsDelivr CDN and yt-dlp from PyPI via micropip; both are cached by the browser after first use.
// yt-dlp's HTTP goes through synchronous XHR to /api/relay (sync XHR is allowed in workers), and
// its YouTube JS challenge solver (yt-dlp-ejs) runs right here instead of in deno/node.
import { BRIDGE_PY } from "./ytdlp-bridge";

export type YtdlpFormat = {
  id: string;
  url: string;
  ext: string;
  width: number | null;
  height: number | null;
  /** "none" = no video track; null = unknown (Instagram often doesn't report codecs). */
  vcodec: string | null;
  acodec: string | null;
  /** Total bitrate in kbps. */
  tbr: number | null;
  filesize: number | null;
  headers: Record<string, string>;
};

export type YtdlpVideo = {
  id: string;
  title: string;
  uploader: string | null;
  thumbnail: string | null;
  duration: number | null;
  formats: YtdlpFormat[];
};

export type YtdlpRequest = { url: string };

export type YtdlpMessage =
  | { type: "log"; message: string }
  | { type: "done"; videos: YtdlpVideo[] }
  | { type: "error"; message: string };

type Pyodide = {
  loadPackage(names: string[]): Promise<void>;
  pyimport(name: string): { install(spec: string): Promise<void> };
  registerJsModule(name: string, module: object): void;
  runPythonAsync(code: string): Promise<unknown>;
  globals: { get(name: string): (url: string) => string };
};

// 0.29.x: Pyodide 314+ refuses classic workers, and Turbopack may bundle this worker as one.
const PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v0.29.5/full/";

type LoadPyodide = () => Promise<Pyodide>;

/** Classic workers load the UMD build with importScripts; module workers import the ESM build. */
async function pyodideLoader(): Promise<LoadPyodide> {
  const scope = self as unknown as { importScripts?: (url: string) => void; loadPyodide?: LoadPyodide };
  try {
    scope.importScripts?.(`${PYODIDE_BASE}pyodide.js`);
    if (scope.loadPyodide) return scope.loadPyodide;
  } catch {
    // Module worker: importScripts exists but throws.
  }
  const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${PYODIDE_BASE}pyodide.mjs`)) as { loadPyodide: LoadPyodide };
  return mod.loadPyodide;
}

const post = (m: YtdlpMessage) => self.postMessage(m);

function send(method: string, url: string, headers: string, body: Uint8Array | null) {
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/relay", false);
  xhr.responseType = "arraybuffer";
  xhr.setRequestHeader("x-relay-url", url);
  xhr.setRequestHeader("x-relay-method", method);
  xhr.setRequestHeader("x-relay-headers", headers);
  try {
    xhr.send(body as Uint8Array<ArrayBuffer> | null);
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err), status: 0, headers: "[]", body: new Uint8Array() };
  }
  if (xhr.status !== 200)
    return { error: `Relay error ${xhr.status}: ${new TextDecoder().decode(xhr.response)}`, status: 0, headers: "[]", body: new Uint8Array() };
  return {
    error: null,
    status: Number(xhr.getResponseHeader("x-relay-status")),
    headers: decodeURIComponent(xhr.getResponseHeader("x-relay-headers") ?? "[]"),
    body: new Uint8Array(xhr.response as ArrayBuffer),
  };
}

/** The JS "runtime" for yt-dlp-ejs: runs the solver program and returns what it printed. */
function runJs(code: string) {
  let out = "";
  const quiet = () => {};
  const console = { log: (...args: unknown[]) => void (out += `${args.join(" ")}\n`), info: quiet, warn: quiet, error: quiet, debug: quiet };
  new Function("console", code)(console);
  return out;
}

// Installs yt-dlp-ejs at exactly the version this yt-dlp release pins.
const INSTALL_EJS = `
import importlib.metadata, micropip
spec = next(r.split(';')[0].strip() for r in importlib.metadata.requires('yt-dlp') if r.startswith('yt-dlp-ejs'))
await micropip.install(spec)
`;

let extractor: Promise<(url: string) => string> | null = null;

function load() {
  extractor ??= (async () => {
    post({ type: "log", message: "Loading Python runtime…" });
    const pyodide = await (await pyodideLoader())();
    post({ type: "log", message: "Installing yt-dlp…" });
    // yt-dlp imports these stdlib modules, which Pyodide ships as separate packages.
    await pyodide.loadPackage(["micropip", "ssl", "sqlite3"]);
    await pyodide.pyimport("micropip").install("yt-dlp");
    await pyodide.runPythonAsync(INSTALL_EJS);
    pyodide.registerJsModule("relay", { send, run_js: runJs, log: (message: string) => post({ type: "log", message }) });
    await pyodide.runPythonAsync(BRIDGE_PY);
    return pyodide.globals.get("extract");
  })();
  extractor.catch(() => (extractor = null));
  return extractor;
}

self.onmessage = async (e: MessageEvent<YtdlpRequest>) => {
  try {
    const extract = await load();
    post({ type: "done", videos: JSON.parse(extract(e.data.url)) as YtdlpVideo[] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    // Show the exception line of a Python traceback, not the whole traceback.
    const lines = message.trim().split("\n");
    post({ type: "error", message: lines.findLast((l) => /^\w+(Error|Exception):/.test(l)) ?? lines.at(-1) ?? message });
  }
};
