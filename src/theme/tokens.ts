// The Night Scriptorium palette — app/data/theme.ts, transcribed with scopes.
//
// THE 100 NAMED ROLES, NOT THE 75 PARCHMENT TINTS. The site's theme rewrites
// every colour literal it finds into `var(--t-name, <light>)`; the `x-<hex>`
// tints exist because the HTML was authored with hardcoded parchment colours,
// not because the design has 175 colours. The app has no such legacy, so it
// ships the named roles and nothing else. If a screen reaches for a tint that
// is not here, it is almost always one of these — check theme.ts before adding.
//
// SCOPES ARE THE TRAP (docs/APP-FULL-PARITY.md §4). A role is not valid in
// every position: `white` is bg-only, so #ffffff used as TEXT is never mapped
// on the web and stays white at night; `brick` is text/border only, so red
// cloth stays red after dark. The old tokens.ts was a flat light/dark pair
// map and could not say this, which is how a lit object turns navy. Every role
// below carries the site's own `scopes`, and `resolve()` refuses a role used
// outside them: it throws in __DEV__, and in production does what the web
// does — leaves the literal alone, i.e. returns the LIGHT value.
//
// Two roles are the portal's own and are not in theme.ts by name:
//   desk   the portal body — #FFFFFF by day, and #0d1322 restated by hand at
//          night (portalShared.ts's body rule) so the desk does not come up
//          on `white`'s lighter navy.
//   sheet  the public nav's paper (.rr-nav5-paper) — white by day, pinned to
//          #1d263c at night by globals.css.
//
// Keep the columns in step with theme.ts. Light is the source of truth; dark
// is the navy Night Scriptorium — never brown, never a brown-tinted dark.

export type Mode = "light" | "dark";
export type Scope = "text" | "bg" | "border";

type Role = { readonly light: string; readonly dark: string; readonly scopes: readonly Scope[] };

const ALL: readonly Scope[] = ["text", "bg", "border"];
const TB: readonly Scope[] = ["text", "border"];
const BG: readonly Scope[] = ["bg"];
const TX: readonly Scope[] = ["text"];

const role = (light: string, dark: string, scopes: readonly Scope[] = ALL): Role => ({
  light,
  dark,
  scopes,
});

/** HEX_TOKENS from theme.ts — the named roles, in the same order. */
export const ROLES = {
  /* --- surfaces --- */
  paper: role("#faf7ef", "#0d1322"),
  hero: role("#fcfaf4", "#0a0f1c"),
  /** bg-only: white TEXT on a dark panel must never flip to navy. */
  white: role("#ffffff", "#141b2e", BG),
  /** The portal desk. Not a theme.ts role — see the header. */
  desk: role("#ffffff", "#0d1322", BG),
  /** The public nav's paper. Not a theme.ts role — see the header. */
  sheet: role("#ffffff", "#1d263c", BG),
  navpaper: role("#f7f1e2", "#192236", BG),
  cream1: role("#f4ebdd", "#171f33"),
  cream2: role("#fbf6ea", "#1a2338"),
  cream3: role("#efe2cc", "#161e31"),
  cream4: role("#fbf9f2", "#1b2439"),
  cream5: role("#fdfaf0", "#1d263c"),
  /** The field surface — .rr-pf-in's #FFFDF6 sits in this token's band. */
  cream6: role("#fffdf2", "#1e283f"),
  stmt: role("#eee3d1", "#111828"),
  /** The tear reveal — brighter than its neighbours so the deckle still reads
   *  as a cutout at night. */
  tear: role("#f6efdf", "#26314e"),
  drawer1: role("#f2e7cc", "#1e2740"),
  drawer2: role("#ebdcba", "#1a2237"),
  drawer3: role("#e6d4ac", "#151d30"),
  darkbg1: role("#13100c", "#1a2235"),
  darkbg2: role("#100d0a", "#151c2d"),
  darkpanel: role("#1e1a16", "#232e49"),

  /* --- ink --- */
  ink: role("#0b0a08", "#f2e9d8"),
  ink2: role("#171411", "#e8decb"),
  ink2b: role("#17110b", "#e8decb"),
  ink3: role("#18140f", "#e8decb"),
  inkwarm: role("#30271d", "#e3d7c0"),
  inkhover: role("#2a231c", "#e5d9c2"),
  se6ink: role("#211911", "#eadfcb"),
  drawerink1: role("#2e2214", "#ecdfc9"),
  drawerink2: role("#241a0e", "#ecdfc9"),
  drawerink3: role("#241d16", "#ecdfc9"),

  /* --- metal + earth. Gold darks are banded by CONTRAST rank: a gold that
     is louder than another on cream stays louder on navy. --- */
  brown: role("#6e563a", "#c4a37a"),
  brass: role("#9b7a4d", "#c9a662"),
  /** #8C6A3F — the row kit's disc and label gold (theme.ts: gold2-8c6a3f). */
  gold2: role("#8c6a3f", "#d4ad67"),
  gold4: role("#795b38", "#d4ad67"),
  gold6: role("#b98f55", "#bd9868"),
  rrgold: role("#9b7540", "#c9a662"),
  chipbrown1: role("#4a331c", "#d9c39a"),
  chipbrown2: role("#42331f", "#d9c39a"),
  chipbrown3: role("#4a3520", "#d9c39a"),
  chipbrown4: role("#4a3b27", "#d9c39a"),

  /* --- red ink. As a BACKGROUND brick is red silk (ribbons, stamps) and
     keeps its cloth red at night: text/border only. --- */
  brick: role("#7e2d1f", "#d98a70", TB),
  brick2: role("#6d2922", "#b96a52"),
  brick2b: role("#6d2a20", "#b96a52"),
  /** Signal red — the "Unfinished" stamp. Wax-seal cloth as a background. */
  signal: role("#a63b2a", "#e0836a", TX),
  /** Oxblood cloth is an object colour as a background; as TEXT it brightens. */
  oxblood: role("#4a1717", "#d98a70", TX),
} as const satisfies Record<string, Role>;

export type ColorName = keyof typeof ROLES;
export type Colors = Record<ColorName, string>;

/**
 * A role in a position. Throws in development when the role has no such
 * scope; in production it falls back to the web's behaviour and returns the
 * light value (an unmapped literal). `colorsFor()` below is the unscoped
 * lookup that existing callers use — prefer this one for anything new.
 */
export function resolve(name: ColorName, scope: Scope, mode: Mode): string {
  const r = ROLES[name];
  if (!r.scopes.includes(scope)) {
    if (__DEV__) {
      throw new Error(
        `tokens: "${name}" is ${r.scopes.join("/")}-scoped and cannot be used as ${scope}`,
      );
    }
    return r.light;
  }
  return mode === "dark" ? r.dark : r.light;
}

/** The scopes a role carries, for a caller that wants to check first. */
export const scopesOf = (name: ColorName): readonly Scope[] => ROLES[name].scopes;

const LIGHT = Object.fromEntries(
  Object.entries(ROLES).map(([k, v]) => [k, v.light]),
) as Colors;

const DARK = Object.fromEntries(
  Object.entries(ROLES).map(([k, v]) => [k, v.dark]),
) as Colors;

/** Unscoped lookup — every role at its value for `mode`. */
export function colorsFor(mode: Mode): Colors {
  return mode === "dark" ? DARK : LIGHT;
}

/**
 * A role at its DAYLIGHT value, whatever the mode — the theme-island idiom.
 * theme.ts's ISLAND_ROOTS (.rr-ov-promo, .rr-shf-cover, .rr-od-cover,
 * .rr-hm-slip, .rr-hm-spec, the library card) re-declare every token to its
 * light value inside them: a cover's cloth type and a slab's cream letters
 * do not flip when the desk goes navy. `lit("ink2")` names that once, so a
 * screen never calls colorsFor("light") to say it.
 */
export const lit = (name: ColorName): string => ROLES[name].light;

/** `rgba(<role>, α)` inside a theme island — the light triplet, any mode. */
export function litRgba(name: RgbaName, alpha: number): string {
  const t = RGBA[name].light;
  return `rgba(${t[0]},${t[1]},${t[2]},${alpha})`;
}

/* --------------------------------------------------------------- rgba --- */

type Triplet = readonly [number, number, number];
type RgbaRole = { readonly light: Triplet; readonly dark: Triplet; readonly scopes: readonly Scope[] };

const rgb = (light: Triplet, dark: Triplet, scopes: readonly Scope[] = ALL): RgbaRole => ({
  light,
  dark,
  scopes,
});

/**
 * RGBA_TOKENS from theme.ts — the triplets the portal's `rgba(r,g,b,α)`
 * literals are built from. Alpha is preserved; only the triplet flips.
 * Shadows and scrims are never mapped on the web (box-shadow is on the skip
 * list, and rgba(24,15,6,…) has no token), so they are simply absent here.
 */
export const RGBA = {
  ink: rgb([11, 10, 8], [242, 233, 216], TB),
  ink2: rgb([23, 20, 17], [232, 222, 203], TB),
  brown: rgb([110, 86, 58], [196, 163, 122]),
  brass: rgb([155, 122, 77], [201, 166, 98]),
  brass2: rgb([155, 117, 64], [201, 166, 98]),
  brick: rgb([126, 45, 31], [217, 138, 112], TB),
  gold: rgb([126, 91, 48], [197, 162, 105]),
  /** rgba(244,236,216,α) — tape on the library card. */
  tape: rgb([244, 236, 216], [54, 66, 97], BG),
  /** rgba(54,42,28,α) — the card's own shadow-brown, border only. */
  shadowbrown: rgb([54, 42, 28], [124, 138, 167], ["border"]),
} as const satisfies Record<string, RgbaRole>;

export type RgbaName = keyof typeof RGBA;

/** `rgba(<role>, α)` in `scope` — the call the CSS makes. Same refusal as resolve(). */
export function rgba(name: RgbaName, alpha: number, scope: Scope, mode: Mode): string {
  const r = RGBA[name];
  let t: Triplet = r.light;
  if (!r.scopes.includes(scope)) {
    if (__DEV__) {
      throw new Error(
        `tokens: rgba "${name}" is ${r.scopes.join("/")}-scoped and cannot be used as ${scope}`,
      );
    }
  } else if (mode === "dark") {
    t = r.dark;
  }
  return `rgba(${t[0]},${t[1]},${t[2]},${alpha})`;
}

/* ------------------------------------------------------------ objects --- */

/**
 * Object colours — the app's ISLAND_ROOTS.
 *
 * On the web, some subtrees keep their light-mode appearance at night because
 * they are *things* rather than surfaces: the library card, cover art, record
 * labels, oxblood cloth. A red cloth binding does not turn pale because the sun
 * went down. These never take the mode, so they are plain constants.
 */
export const OBJECT = {
  oxblood: "#4a1717",
  cloth: "#7e2d1f",
  clothInk: "#f7f1e2",
  cardPaper: "#fdfaf0",
  cardPaperEdge: "#f7f1e2",
  /** The ink CTA's cream glyph on a permanently dark panel. */
  cream: "#faf7ef",
  /** A cover thumb on a ledger or a shelf (.rr-od-cover, .rr-shf-cover —
   *  ISLAND_ROOTS): the constants every cover draws with. */
  cover: {
    /** `.has-art` background-color, under the art while it loads. */
    artPaper: "#E8D7B9",
    /** `var(--bk,#4A3B27)` — the cloth spine's fallback. */
    cloth: "#4A3B27",
    /** `.rr-od-cover b` — the title set on the cloth. */
    clothInk: "#F3E2BC",
    /** `inset 0 0 0 1px rgba(11,10,8,.2)` — the ring, ink on a lit object. */
    ring: "rgba(11,10,8,.2)",
    /** `1px 2px 4px rgba(54,42,28,.28)` — the ledger thumb's drop shadow. */
    thumbShadow: "1px 2px 4px rgba(54,42,28,.28)",
    /** `.rr-shf-cover` — the shelf sleeve's two ink drops. */
    sleeveShadow: "0 1px 2px rgba(11,10,8,.18), 0 6px 14px rgba(11,10,8,.12)",
  },
} as const;

/**
 * The permanently DARK objects — the subscription slab (.rr-ov-promo, an
 * ISLAND_ROOT), the profile slab (.rr-pf-slab) and the product CTA: an ink
 * ground with cream type that must not flip at night. Built from the light
 * column so nothing is retyped; the alphas are the builders' own.
 */
export const ISLAND = {
  /** #0B0A08 — the slab's ground, and the press's letters. */
  ink: ROLES.ink.light,
  /** #FAF7EF — the slab's type, and the press's ground. */
  cream: OBJECT.cream,
  /** #9B7A4D — the "Roman Reads" eyebrow on the slab. */
  brass: ROLES.brass.light,
  /** rgba(250,247,239,.6) — the slab's supporting line. */
  cream60: "rgba(250,247,239,.6)",
  /** .rr-ov-shut — cream at .72 on ink at .62, ringed cream at .34. */
  shutInk: "rgba(250,247,239,.72)",
  shutGround: "rgba(11,10,8,.62)",
  shutRing: "rgba(250,247,239,.34)",
  /** ::before — the brass ring 4px in from the edge: the DARK brass at .3, both modes. */
  ring: "rgba(201,166,98,.3)",
  /** box-shadow — never mapped on the web. */
  shadow: "0 1px 2px rgba(11,10,8,.22), 0 10px 24px rgba(11,10,8,.18)",
  /** The press's hard brass offset. */
  pressShadow: "3px 3px 0 rgba(155,122,77,.5)",
} as const;

/**
 * Chrome constants the token pass cannot see — the shell's own night rules
 * (`html[data-rr-theme="dark"] .rr-ap-top-paper{filter:…}` and the like).
 */
export const CHROME = {
  /** The tear's drawn ink line: drop-shadow(0 ±3px 0 <this>). */
  tearLine: { light: "#0b0a08", dark: "#f2e9d8" },
  /** The soft haze under that line. */
  tearHaze: { light: "rgba(43,30,16,.1)", dark: "rgba(0,0,0,.4)" },
  /** The + sheet's deeper haze. */
  sheetHaze: { light: "rgba(43,30,16,.22)", dark: "rgba(0,0,0,.5)" },
  /** .rr-pt-scrim — never mapped on the web. */
  scrim: "rgba(24,15,6,.42)",
  /** The centre disc's brass offset, 3px 3px 0 — a shadow, never mapped. */
  fabShadow: "rgba(155,122,77,.42)",
  /** The centre disc's inner ring — the DARK brass at .3, both modes. */
  fabRing: "rgba(201,166,98,.3)",
  /** The 5% ink wash along a torn edge — bg scope, so it stays ink at night. */
  tearWash: "rgba(11,10,8,.05)",
} as const;

/** The parchment sheet: a two-stop warm gradient, exactly the sidebar's. */
export const PAPER_GRADIENT = {
  light: ["#fbf9f2", "#f7f1e2"] as const,
  dark: ["#1b2439", "#192236"] as const,
};

/** Hairlines. The portal rules everything with dashes and dots, never solids. */
export const LINE = {
  /** .rr-ap-rows / .rr-ap-group-h i — 1px dashed rgba(110,86,58,.36) */
  dashed: { light: "rgba(110,86,58,.36)", dark: "rgba(196,163,122,.36)" },
  dotted: { light: "rgba(11,10,8,.30)", dark: "rgba(242,233,216,.30)" },
  /** .rr-ap-note — 1px dashed rgba(126,45,31,.42) */
  numeral: { light: "rgba(126,45,31,.42)", dark: "rgba(217,138,112,.42)" },
} as const;

export const STATUS_BAR_BG = { light: "#ffffff", dark: "#0d1322" } as const;
