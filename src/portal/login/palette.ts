// /login's own palette — loginPage.ts's `--lg-*` custom properties.
//
// The page authors its colours in oklch(), which withThemeTokens never sees
// (it rewrites hex literals only), so the night values are hand-written in
// their own rule on the site and the same is true here: both columns below
// are loginPage.ts's, resolved to sRGB by Chrome itself (a 1×1 canvas in
// srgb, read back) rather than converted by hand. Nothing on this page reads
// a kit token except the navbar, which is the site's public nav and takes no
// page palette.
//
//   light                              dark
//   --lg-bg          oklch(100% 0 0)   oklch(16% .027 262)
//   --lg-ink         oklch(22% .018 64)   oklch(93% .024 80)
//   --lg-muted       oklch(48% .018 65)   oklch(74% .022 76)
//   --lg-faint       oklch(68% .016 72)   oklch(58% .025 71)
//   --lg-line        ink/.16              oklch(88% .03 78/.15)
//   --lg-line-strong ink/.31              …/.31
//   --lg-rule        ink/.46              …/.44
//   --lg-accent      oklch(55% .078 71)   oklch(75% .09 78)
//   --lg-accent-soft oklch(78% .057 76)   oklch(65% .075 78)
//   --lg-button      = ink                oklch(81% .067 78)
//   --lg-button-ink  oklch(91% .04 77)    oklch(17% .025 261)
//   --lg-glow        oklch(85% .06 77/.25) oklch(62% .1 75/.14)
//   --lg-warn        oklch(40% .11 32)    oklch(72% .09 40)

import type { Mode } from "../../theme/tokens";

export type LoginPalette = {
  bg: string;
  ink: string;
  muted: string;
  faint: string;
  line: string;
  lineStrong: string;
  rule: string;
  accent: string;
  accentSoft: string;
  button: string;
  buttonInk: string;
  /** The hero's radial glow: [colour, alpha]. */
  glow: readonly [string, number];
  warn: string;
  /** The sun by day, the moon by night: `.rr-lg-sky`'s three stops. */
  orb: readonly [string, string, string];
  /** `.rr-lg-sky`'s two box-shadows: [colour, blur, alpha]. */
  orbGlow: readonly (readonly [string, number, number])[];
  /** The torn strip at the foot — `.rr-lg-bottom-paper`'s two sheets. */
  paperBack: string;
  paperFace: readonly [string, string, string];
  paperLine: string;
  paperRule: string;
};

const LIGHT: LoginPalette = {
  bg: "#ffffff",
  ink: "#211912",
  muted: "#655c53",
  faint: "#9f978e",
  line: "rgba(31,25,19,0.16)",
  lineStrong: "rgba(32,26,19,0.31)",
  rule: "rgba(33,24,17,0.46)",
  accent: "#8e6a3c",
  accentSoft: "#cdb38f",
  button: "#211912",
  buttonInk: "#f1dfc4",
  glow: ["#e3c7a3", 0.25],
  warn: "#782b1e",
  orb: ["#fffbe6", "#fdd89e", "#cfa168"],
  orbGlow: [
    ["#efc480", 50, 0.32],
    ["#f5d9a9", 15, 0.5],
  ],
  // ::before #FFFFFF; ::after #FFFFFF under a 35px ruling of ink at 5%
  paperBack: "#ffffff",
  paperFace: ["#ffffff", "#ffffff", "#ffffff"],
  paperLine: "#0b0a08",
  paperRule: "rgba(11,10,8,0.05)",
};

const DARK: LoginPalette = {
  bg: "#070d19",
  ink: "#f0e7d6",
  muted: "#b3a99c",
  faint: "#84786b",
  line: "rgba(228,215,195,0.15)",
  lineStrong: "rgba(226,213,194,0.31)",
  rule: "rgba(228,214,194,0.44)",
  accent: "#cda76b",
  accentSoft: "#a98a5a",
  button: "#d9bc90",
  buttonInk: "#090f1a",
  glow: ["#aa8039", 0.14],
  warn: "#d6917a",
  orb: ["#f7eddb", "#c8b8a2", "#837564"],
  orbGlow: [
    ["#cdb99b", 44, 0.2],
    ["#dfd0b4", 14, 0.28],
  ],
  // The footer's night sky: #FFFFFF → white's night (#141b2e), and the face
  // gradient #F7F0DF/#F2E9D3/#F5EDDA → their x- tints (#192236/#171f33/#192236)
  paperBack: "#141b2e",
  paperFace: ["#192236", "#171f33", "#192236"],
  paperLine: "#f2e9d8",
  paperRule: "rgba(242,233,216,0.045)",
};

export const loginPalette = (mode: Mode): LoginPalette => (mode === "dark" ? DARK : LIGHT);

/** The moon's craters — `html[data-rr-theme="dark"] .rr-lg-sky`'s first three
 *  radial-gradients, as fractions of the orb. */
export const CRATERS = [
  { cx: 0.33, cy: 0.3, r: 0.065, fill: "#f8f1e3", alpha: 0.9 },
  { cx: 0.66, cy: 0.32, r: 0.085, fill: "#767264", alpha: 0.22 },
  { cx: 0.44, cy: 0.67, r: 0.105, fill: "#7a7469", alpha: 0.18 },
] as const;
