// Display fonts offered by the text-overlay tool. Imported only by that widget, so other pages don't load them.
import { Anton, Bebas_Neue, Permanent_Marker } from "next/font/google";

const anton = Anton({ weight: "400", subsets: ["latin"] });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"] });
const marker = Permanent_Marker({ weight: "400", subsets: ["latin"] });

export type OverlayFont = { id: string; label: string; family: () => string };

/** Reads a next/font CSS variable defined on <html> (the site's own fonts). */
const cssVar = (name: string, fallback: string) => () =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

export const OVERLAY_FONTS: OverlayFont[] = [
  { id: "anton", label: "Anton", family: () => anton.style.fontFamily },
  { id: "bebas", label: "Bebas Neue", family: () => bebas.style.fontFamily },
  { id: "marker", label: "Permanent Marker", family: () => marker.style.fontFamily },
  { id: "fraunces", label: "Fraunces (serif)", family: cssVar("--font-display", "Georgia, serif") },
  { id: "geist", label: "Geist (sans)", family: cssVar("--font-geist-sans", "Arial, sans-serif") },
  { id: "arial", label: "Arial", family: () => "Arial, Helvetica, sans-serif" },
  { id: "impact", label: "Impact", family: () => "Impact, 'Arial Black', sans-serif" },
  { id: "georgia", label: "Georgia", family: () => "Georgia, 'Times New Roman', serif" },
  { id: "courier", label: "Courier New", family: () => "'Courier New', Courier, monospace" },
];
