// Type, matched to the site.
//
// Three families, same as the web: Cormorant Garamond sets everything that
// speaks, Manrope sets the labels and the running prose, Caveat is the hand.
//
// The site's self-hosted .woff2 files CANNOT be reused — React Native reads
// .ttf/.otf only. @expo-google-fonts ships TTFs of the identical families, so
// the faces match even though the files don't.
//
// THE THIRTEEN FACES, counted from the portal builders on 12 Sep 2026
// (appShell, portalShared, the eight account pages, loginPage, importSheet):
//   Manrope            400 · 500 · 600 · 700 · 800
//   Cormorant Garamond 400 · 400 italic · 500 · 500 italic · 600 · 600 italic · 700
//   Caveat             500   (every Caveat rule on the site is weight 500)
// (Cormorant 700 is /login's ringed "!" — .rr-lg-guidance.is-error::before —
// and .rr-hm-out b; 500 italic is importUpgrade's gate headline, .rr-hm-slip
// <i> and .rr-hm-out.is-idle.)
// EXACTLY these are what app/_layout.tsx loads — no more. A family named here
// but not loaded there does not throw; it silently falls back to the system
// face, which is the hardest kind of visual bug to spot. Add to both or
// neither.
//
// ONE UNIT TRAP, and it bites every ported label: CSS `letter-spacing: .3em`
// is relative to font size; RN's `letterSpacing` is absolute px. Every tracked
// label therefore carries a precomputed number — `track(size, em)` is the
// conversion, kept visible so the em value from the CSS stays readable.
//
// A SECOND ONE: CSS `line-height: normal` is not a number RN knows. Chrome
// computes it from the face's own ascent and descent, each rounded to a whole
// pixel — `lh(face, size)` below reproduces that, measured against the site's
// own files, so a label the CSS leaves at `normal` lands on the same pixel
// here. Pass an explicit lineHeight everywhere; never leave RN to guess.
//
// A THIRD, 1/64px WIDE: Chrome keeps layout in LayoutUnits of 1/64px and
// FLOORS a line box whose line-height came from a unitless factor (the site's
// `12px/1.45` → 17.4 → 17.390625), but ROUNDS one handed to it in px (a
// `lineHeight: 17.4` → 17.40625). Every voice below therefore goes through
// `snap()` — the floored value, exactly representable, so a kit line lands on
// the site's 1/64 and eleven rows down the page the fractions still round
// the same way (measured: three rules and four labels one pixel low without
// it). Same for `line` on <Txt>.

import type { TextStyle } from "react-native";

export const FONTS = {
  serif: "CormorantGaramond_600SemiBold",
  serifMedium: "CormorantGaramond_500Medium",
  serifRegular: "CormorantGaramond_400Regular",
  serifBold: "CormorantGaramond_700Bold",
  serifItalic: "CormorantGaramond_600SemiBold_Italic",
  serifItalicMedium: "CormorantGaramond_500Medium_Italic",
  serifItalicLight: "CormorantGaramond_400Regular_Italic",
  sans: "Manrope_400Regular",
  sansMedium: "Manrope_500Medium",
  sansSemi: "Manrope_600SemiBold",
  sansBold: "Manrope_700Bold",
  sansExtra: "Manrope_800ExtraBold",
  hand: "Caveat_500Medium",
} as const;

export type Family = "Manrope" | "Cormorant Garamond" | "Caveat";

/**
 * A CSS `font:` shorthand's face, by family and weight — `face("Manrope", 700)`
 * is the name to put in `fontFamily`. Throws on a weight the site does not
 * use, so a transcription cannot quietly request a file that is not loaded.
 */
export function face(family: Family, weight: number, italic = false): string {
  const key = `${family}|${weight}|${italic ? "i" : ""}`;
  const hit = FACES[key];
  if (!hit) throw new Error(`type: no loaded face for ${family} ${weight}${italic ? " italic" : ""}`);
  return hit;
}

const FACES: Record<string, string> = {
  "Manrope|400|": FONTS.sans,
  "Manrope|500|": FONTS.sansMedium,
  "Manrope|600|": FONTS.sansSemi,
  "Manrope|700|": FONTS.sansBold,
  "Manrope|800|": FONTS.sansExtra,
  "Cormorant Garamond|400|": FONTS.serifRegular,
  "Cormorant Garamond|400|i": FONTS.serifItalicLight,
  "Cormorant Garamond|500|": FONTS.serifMedium,
  "Cormorant Garamond|500|i": FONTS.serifItalicMedium,
  "Cormorant Garamond|600|": FONTS.serif,
  "Cormorant Garamond|600|i": FONTS.serifItalic,
  "Cormorant Garamond|700|": FONTS.serifBold,
  "Caveat|500|": FONTS.hand,
};

/** CSS `letter-spacing: <em>em` at `size`px → RN's absolute px. Three
 *  decimals: Chrome keeps the sub-pixel value, and a 19-character head at
 *  -.115 rounded to -.11 drifts ~0.1px and flips the AA of a glyph. */
export const track = (size: number, em: number): number =>
  Math.round(size * em * 1000) / 1000;

/** A px line-height as Chrome lays the line box out: floored to 1/64px. */
export const snap = (px: number): number => Math.floor(px * 64) / 64;

/** CSS `<size>px/<factor>` — the unitless line-height, snapped. */
export const lineOf = (size: number, factor: number): number => snap(size * factor);

/** Ascent and descent per em, as Chrome resolves `line-height: normal`. */
const METRICS: Record<Family, readonly [asc: number, desc: number]> = {
  Manrope: [1.065, 0.3],
  "Cormorant Garamond": [0.924, 0.287],
  Caveat: [0.96, 0.3],
};

/** CSS `line-height: normal` for `family` at `size`px, on the site's files. */
export function lh(family: Family, size: number): number {
  const [asc, desc] = METRICS[family];
  return Math.round(asc * size) + Math.round(desc * size);
}

/**
 * The portal's voices — the shell's own type, straight off appShell.ts and
 * portalShared.ts at their phone values. Each carries the class it maps to.
 */
export const TEXT = {
  /** `.rr-pt-h1` at 390px: clamp(26px,6.8vw,36px)/1.04 — 6.8vw is 26.52 —
   *  Cormorant 500. (A screen with the real viewport uses <Head>, which
   *  clamps; this preset is the 390px value.) */
  title: {
    fontFamily: FONTS.serifMedium,
    fontSize: 26.52,
    lineHeight: lineOf(26.52, 1.04),
    letterSpacing: track(26.52, -0.01),
  } satisfies TextStyle,

  /** `.rr-ap-band-h h2` — 600 23px/1.08, -.005em. */
  head: {
    fontFamily: FONTS.serif,
    fontSize: 23,
    lineHeight: lineOf(23, 1.08),
    letterSpacing: track(23, -0.005),
  } satisfies TextStyle,

  /** `.rr-ap-row-l b` — 600 14.5px/1.3 Manrope. */
  row: {
    fontFamily: FONTS.sansSemi,
    fontSize: 14.5,
    lineHeight: lineOf(14.5, 1.3),
  } satisfies TextStyle,

  /** `.rr-pt-sub` — 400 13.5px/1.65 Manrope. */
  body: {
    fontFamily: FONTS.sans,
    fontSize: 13.5,
    lineHeight: lineOf(13.5, 1.65),
  } satisfies TextStyle,

  /** `.rr-ap-band-h p` — 400 12.5px/1.55 Manrope. */
  lede: {
    fontFamily: FONTS.sans,
    fontSize: 12.5,
    lineHeight: lineOf(12.5, 1.55),
  } satisfies TextStyle,

  /** `.rr-ap-group-h b` — 700 9px Manrope, .24em, uppercase. */
  micro: {
    fontFamily: FONTS.sansBold,
    fontSize: 9,
    lineHeight: lh("Manrope", 9),
    letterSpacing: track(9, 0.24),
    textTransform: "uppercase",
  } satisfies TextStyle,

  /** `.rr-ap-title i` — 700 8px Manrope, .22em, uppercase: the eyebrow. */
  kicker: {
    fontFamily: FONTS.sansBold,
    fontSize: 8,
    lineHeight: lh("Manrope", 8),
    letterSpacing: track(8, 0.22),
    textTransform: "uppercase",
  } satisfies TextStyle,

  /** `.rr-ap-tab b` — 600 9.5px Manrope, .01em (700 when lit). */
  tab: {
    fontFamily: FONTS.sansSemi,
    fontSize: 9.5,
    lineHeight: lh("Manrope", 9.5),
    letterSpacing: track(9.5, 0.01),
  } satisfies TextStyle,

  /** `.rr-ap-seg button i` — the brass superscript count. */
  numeral: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    lineHeight: lh("Manrope", 10),
  } satisfies TextStyle,

  /** `.rr-ap-row-note` — 500 14px/1.35 Caveat. */
  hand: {
    fontFamily: FONTS.hand,
    fontSize: 14,
    lineHeight: lineOf(14, 1.35),
  } satisfies TextStyle,

  /** `.rr-ap-row-l em` / `.rr-ap-add-t em` — 400 12px/1.45 Manrope. */
  sub: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    lineHeight: lineOf(12, 1.45),
  } satisfies TextStyle,

  /** `.rr-ap-row-v` — 600 12.5px Manrope, the row's reported value. */
  value: {
    fontFamily: FONTS.sansSemi,
    fontSize: 12.5,
    lineHeight: lh("Manrope", 12.5),
  } satisfies TextStyle,
} as const;
