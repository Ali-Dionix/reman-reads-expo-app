// Colour and sizing helpers for TRANSCRIBED pages.
//
// The portal's CSS is written in `rgba(<brand rgb>, <alpha>)` and in
// `clamp(min, <n>vw, max)`. Both have no React Native equivalent, and both
// appear dozens of times in a single page, so they get one implementation here
// rather than a hand-converted literal at every call site — a hand-converted
// literal is how a transcription drifts.
//
// `withThemeTokens` on the web maps each brand rgb triplet to its night value
// and leaves the alpha alone — but only in the SCOPES the token carries.
// rgba(11,10,8,.03) as a hover BACKGROUND stays ink at night, because the ink
// triplet is text/border scoped. `useInk()` takes the scope as a second
// argument for exactly that case; it defaults to "text", which is what nine
// calls in ten are.

import { useWindowDimensions } from "react-native";

import { useTheme } from "./ThemeProvider";
import { rgba as rgbaRole, type Mode, type RgbaName, type Scope } from "./tokens";

type Triplet = readonly [number, number, number];

/** Lit objects — triplets that never flip. Not in theme.ts because the web
 *  simply has no token for them. */
const LIT: Record<string, Triplet> = {
  /** rgba(74,45,22,α) — ink ON THE WOOD SLAB. The plank behind it does not
   *  get darker at night. */
  slab: [74, 45, 22],
  /** rgba(53,35,21,α) — the slab's body ink. Also lit. */
  slab2: [53, 35, 21],
};

const lit = (name: keyof typeof LIT, alpha: number): string => {
  const [r, g, b] = LIT[name];
  return `rgba(${r},${g},${b},${alpha})`;
};

export function useInk() {
  const { mode } = useTheme();
  const { width } = useWindowDimensions();

  const at = (name: RgbaName, scope: Scope) => (a: number) => rgbaRole(name, a, scope, mode);

  return {
    mode,
    width,
    /** rgba(<brand>, α) — the same call the CSS makes, in `scope`. */
    rgba: (name: RgbaName, a: number, scope: Scope = "text") => rgbaRole(name, a, scope, mode),
    /** rgba(11,10,8,α) as text (default) — pass "border" for a hairline. */
    ink: (a: number, scope: Scope = "text") => rgbaRole("ink", a, scope, mode),
    brown: (a: number, scope: Scope = "text") => rgbaRole("brown", a, scope, mode),
    brick: (a: number, scope: Scope = "text") => rgbaRole("brick", a, scope, mode),
    brass: (a: number, scope: Scope = "text") => rgbaRole("brass", a, scope, mode),
    /** The border-scoped forms, pre-bound, for the hairline-heavy row kit. */
    inkLine: at("ink", "border"),
    brownLine: at("brown", "border"),
    brickLine: at("brick", "border"),
    /** Slab ink — lit object, never flips. */
    slab: (a: number) => lit("slab", a),
    slab2: (a: number) => lit("slab2", a),
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

export type { Mode };
