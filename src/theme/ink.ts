// Colour and sizing helpers for TRANSCRIBED pages.
//
// The portal's CSS is written in `rgba(<brand rgb>, <alpha>)` and in
// `clamp(min, <n>vw, max)`. Both have no React Native equivalent, and both
// appear dozens of times in a single page, so they get one implementation here
// rather than a hand-converted literal at every call site — a hand-converted
// literal is how a transcription drifts.
//
// `withThemeTokens` on the web maps each brand rgb triplet to its night value
// and leaves the alpha alone. `useInk()` does exactly that.

import { useWindowDimensions } from "react-native";

import { useTheme } from "./ThemeProvider";
import type { Mode } from "./tokens";

type Triplet = readonly [number, number, number];

/** The rgb() triplets the portal's rgba() literals are built from. */
const RGB: Record<string, { light: Triplet; dark: Triplet }> = {
  /** rgba(11,10,8,α) — ink */
  ink: { light: [11, 10, 8], dark: [242, 233, 216] },
  /** rgba(110,86,58,α) — the rules and hairlines */
  brown: { light: [110, 86, 58], dark: [196, 163, 122] },
  /** rgba(126,45,31,α) — red ink */
  brick: { light: [126, 45, 31], dark: [217, 138, 112] },
  /** rgba(155,122,77,α) — brass */
  brass: { light: [155, 122, 77], dark: [201, 166, 98] },
  /** rgba(74,45,22,α) — ink ON THE WOOD SLAB. A lit object: it does not flip,
   *  because the plank behind it does not get darker at night. */
  slab: { light: [74, 45, 22], dark: [74, 45, 22] },
  /** rgba(53,35,21,α) — the slab's body ink. Also lit. */
  slab2: { light: [53, 35, 21], dark: [53, 35, 21] },
};

function rgba(name: keyof typeof RGB, alpha: number, mode: Mode): string {
  const [r, g, b] = RGB[name][mode];
  return `rgba(${r},${g},${b},${alpha})`;
}

export function useInk() {
  const { mode } = useTheme();
  const { width } = useWindowDimensions();

  return {
    mode,
    width,
    /** rgba(<brand>, α) — the same call the CSS makes. */
    ink: (a: number) => rgba("ink", a, mode),
    brown: (a: number) => rgba("brown", a, mode),
    brick: (a: number) => rgba("brick", a, mode),
    brass: (a: number) => rgba("brass", a, mode),
    /** Slab ink — lit object, never flips. */
    slab: (a: number) => rgba("slab", a, mode),
    slab2: (a: number) => rgba("slab2", a, mode),
    /**
     * CSS `clamp(min, <vw>vw, max)`, resolved against the live viewport.
     * The portal sizes the slab's inked labels this way, and they sit on a
     * percentage-positioned overlay — so they have to scale with the screen
     * exactly as they do in the browser, not settle on one fixed px.
     */
    clamp: (min: number, vw: number, max: number) =>
      Math.min(max, Math.max(min, (width * vw) / 100)),
    /** CSS `<n>vw`. */
    vw: (n: number) => (width * n) / 100,
  };
}

/** CSS `letter-spacing: <em>em` at `size`px → RN's absolute px. */
export const em = (size: number, value: number): number =>
  Math.round(size * value * 100) / 100;
