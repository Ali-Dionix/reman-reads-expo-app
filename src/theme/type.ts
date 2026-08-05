// Type, matched to the site.
//
// Three families, same as the web: Cormorant Garamond sets everything that
// speaks, Manrope sets the small engraved labels, Caveat is the marginal hand.
//
// The site's self-hosted .woff2 files CANNOT be reused — React Native reads
// .ttf/.otf only. @expo-google-fonts ships TTFs of the identical families, so
// the faces match even though the files don't.
//
// ONE UNIT TRAP, and it bites every ported label: CSS `letter-spacing: .3em`
// is relative to font size; RN's `letterSpacing` is absolute px. Every tracked
// label here therefore carries a precomputed number — `track(size, em)` is the
// conversion, kept visible so the em value from the CSS stays readable.

import type { TextStyle } from "react-native";

// EXACTLY the eight faces app/_layout.tsx loads — no more. A family named here
// but not loaded there does not throw; it silently falls back to the system
// face, which is the hardest kind of visual bug to spot. Add to both or
// neither.
export const FONTS = {
  serif: "CormorantGaramond_600SemiBold",
  serifRegular: "CormorantGaramond_400Regular",
  serifItalic: "CormorantGaramond_600SemiBold_Italic",
  serifItalicLight: "CormorantGaramond_400Regular_Italic",
  sans: "Manrope_400Regular",
  sansSemi: "Manrope_600SemiBold",
  sansBold: "Manrope_700Bold",
  hand: "Caveat_600SemiBold",
} as const;

/** CSS `letter-spacing: <em>em` at `size`px → RN's absolute px. */
export const track = (size: number, em: number): number =>
  Math.round(size * em * 100) / 100;

/**
 * The portal's voices. Sizes are nudged up from the web's where the web value
 * was tuned for a mouse — a 7.5px label is legible on a 1440px monitor at
 * arm's length and is not on a phone held at 30cm. Tracking ratios are kept.
 */
export const TEXT = {
  /** Room titles. Web: Cormorant 600. */
  title: {
    fontFamily: FONTS.serif,
    fontSize: 30,
    lineHeight: 34,
  } satisfies TextStyle,

  /** Section heads inside a room. */
  head: {
    fontFamily: FONTS.serif,
    fontSize: 21,
    lineHeight: 26,
  } satisfies TextStyle,

  /** Nav labels, list rows. Web: .rr-pt-side-link b, 17px. */
  row: {
    fontFamily: FONTS.serif,
    fontSize: 18,
    lineHeight: 23,
  } satisfies TextStyle,

  /** Running prose. */
  body: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    lineHeight: 21,
  } satisfies TextStyle,

  /** The blurb under a room title — the site sets these in italic serif. */
  lede: {
    fontFamily: FONTS.serifItalicLight,
    fontSize: 16,
    lineHeight: 22,
  } satisfies TextStyle,

  /** Engraved micro-label. Web: Manrope 700 8.5px / .3em. */
  micro: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: track(10, 0.3),
    textTransform: "uppercase",
  } satisfies TextStyle,

  /** The wordmark's kicker. Web: Manrope 600 7.5px / .2em. */
  kicker: {
    fontFamily: FONTS.sansSemi,
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: track(9, 0.2),
    textTransform: "uppercase",
  } satisfies TextStyle,

  /** Folio / page marks. Web: Cormorant italic 12px / .05em. */
  folio: {
    fontFamily: FONTS.serifItalicLight,
    fontSize: 13,
    letterSpacing: track(13, 0.05),
  } satisfies TextStyle,

  /** The numeral inside a punched circle. */
  numeral: {
    fontFamily: FONTS.serifItalic,
    fontSize: 12,
    lineHeight: 14,
  } satisfies TextStyle,

  /** Marginalia, in the hand. */
  hand: {
    fontFamily: FONTS.hand,
    fontSize: 17,
    lineHeight: 21,
  } satisfies TextStyle,
} as const;
