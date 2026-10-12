import { loadFont as anton } from "@remotion/google-fonts/Anton";
import { loadFont as archivoBlack } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as bebasNeue } from "@remotion/google-fonts/BebasNeue";
import { loadFont as inter } from "@remotion/google-fonts/Inter";
import { loadFont as montserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as oswald } from "@remotion/google-fonts/Oswald";
import { loadFont as poppins } from "@remotion/google-fonts/Poppins";
import { loadFont as roboto } from "@remotion/google-fonts/Roboto";
import { FONTS, type FontKey } from "./style";

type Loader = (
  style: "normal",
  options: { weights: string[]; subsets: string[] },
) => { waitUntilDone: () => Promise<unknown> };

const LOADERS: Record<FontKey, Loader> = {
  anton: anton as Loader,
  archivo_black: archivoBlack as Loader,
  bebas_neue: bebasNeue as Loader,
  inter: inter as Loader,
  montserrat: montserrat as Loader,
  oswald: oswald as Loader,
  poppins: poppins as Loader,
  roboto: roboto as Loader,
};

const loaded = new Map<FontKey, Promise<unknown>>();

/**
 * Load a caption font (all weights we ship for it). Idempotent. While rendering, the
 * loader holds the frame with delayRender() until the font is ready, so the first frame
 * never shows a fallback font.
 */
export function ensureFont(font: FontKey): Promise<unknown> {
  let p = loaded.get(font);
  if (!p) {
    p = LOADERS[font]("normal", {
      weights: FONTS[font].weights.map(String),
      subsets: ["latin", "latin-ext"],
    }).waitUntilDone();
    loaded.set(font, p);
  }
  return p;
}
