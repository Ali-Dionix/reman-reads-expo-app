// The console's colours — day and night, straight off the reader's own rules.
//
// The Reading Desk does not take the theme table's night values: every
// control on `.rr-lr-deck` and every sheet the console opens carries an
// EXPLICIT `html[data-rr-theme="dark"]` override in accountListeningPage.ts
// (lines ~1370–1497), because they are built on ink alphas and white literals
// that theme.ts never maps as a background. So the pairs below are the site's
// own pairs, one line per class, not a mapping of tokens — where a value IS
// a token (the brass note, the brown foot) the screen reads `useTheme()`.
//
// Each entry names its rule. A screen reads `deckInk(night)` once and never
// spells a colour itself.

export type DeckInk = ReturnType<typeof deckInk>;

export const deckInk = (night: boolean) => ({
  /* --- the groove --- */
  /** `.rr-lr-groove-track{background:rgba(11,10,8,.14)}` / night `.16` ivory. */
  track: night ? "rgba(240,229,207,.16)" : "rgba(11,10,8,.14)",
  /** `.rr-lr-groove-track i{background:#0B0A08}` / `#EADFC6`. */
  fill: night ? "#EADFC6" : "#0B0A08",
  /** `.rr-lr-groove-hd` radial-gradient stops (34% 30%): light, mid at 68% (62% at night), rim. */
  stud: night
    ? { hi: "#EADFC6", mid: "#C9A662", midAt: 0.62, rim: "#6B4F2E" }
    : { hi: "#F3E2BC", mid: "#9B7A4D", midAt: 0.68, rim: "#6E563A" },
  /** the stud's `box-shadow:0 0 0 1px` ring. */
  studRing: night ? "rgba(0,0,0,.55)" : "rgba(43,30,16,.4)",
  /** the stud's second shadow, `0 1px 3px rgba(43,30,16,.4)` / `rgba(0,0,0,.6)`. */
  studShadow: night ? "0 1px 3px rgba(0,0,0,.6)" : "0 1px 3px rgba(43,30,16,.4)",
  /** `.rr-lr-groove-tip` — the paper tag while the needle is held; its
   *  `box-shadow:0 2px 6px rgba(43,30,16,.24)` / night `rgba(0,0,0,.6)`. */
  tip: night
    ? { paper: "#1D2537", line: "rgba(244,235,214,.85)", ink: "#EADFC6", shadow: "0 2px 6px rgba(0,0,0,.6)" }
    : { paper: "#FFFFFF", line: "#0B0A08", ink: "#171411", shadow: "0 2px 6px rgba(43,30,16,.24)" },

  /* --- the readout --- */
  /** `.rr-lr-time`, `.rr-lr-clock{color:rgba(11,10,8,.6)}` / `rgba(240,229,207,.62)`. */
  time: night ? "rgba(240,229,207,.62)" : "rgba(11,10,8,.6)",
  /** `.rr-lr-deck-line b{color:#171411}` / `#EADFC6`. */
  band: night ? "#EADFC6" : "#171411",
  /** `.rr-lr-deck-line em{color:rgba(110,86,58,.95)}` / `rgba(210,175,105,.9)`. */
  em: night ? "rgba(210,175,105,.9)" : "rgba(110,86,58,.95)",
  /** `.rr-lr-deck-say{color:rgba(11,10,8,.55)}` / `rgba(240,229,207,.55)`. */
  say: night ? "rgba(240,229,207,.55)" : "rgba(11,10,8,.55)",
  /** `.rr-lr-deck-say.is-bad{color:#7E2D1F}` / `#E6A08C`. */
  sayBad: night ? "#E6A08C" : "#7E2D1F",

  /* --- the five keys --- */
  /** `.rr-lr-jog`, `.rr-lr-sp-step`: `border:1.5px solid rgba(11,10,8,.7);background:#FFFFFF;color:#0B0A08`
   *  / night `background:transparent;border-color:rgba(240,229,207,.6);color:#EADFC6`. */
  jog: night
    ? { ring: "rgba(240,229,207,.6)", fill: "transparent", glyph: "#EADFC6" }
    : { ring: "rgba(11,10,8,.7)", fill: "#FFFFFF", glyph: "#0B0A08" },
  /** `.rr-lr-big{background:#0B0A08;color:#FBF5E4}` / `background:#EADFC6;color:#141B29`. */
  big: night ? { fill: "#EADFC6", glyph: "#141B29" } : { fill: "#0B0A08", glyph: "#FBF5E4" },
  /** `.rr-lr-big{box-shadow:0 3px 9px rgba(43,30,16,.3),0 8px 20px rgba(43,30,16,.16)}`
   *  / night `0 3px 9px rgba(0,0,0,.55),0 8px 20px rgba(0,0,0,.4)`. */
  bigShadow: night
    ? "0 3px 9px rgba(0,0,0,.55), 0 8px 20px rgba(0,0,0,.4)"
    : "0 3px 9px rgba(43,30,16,.3), 0 8px 20px rgba(43,30,16,.16)",
  /** `.rr-lr-nar-face{box-shadow:…,0 1px 4px rgba(43,30,16,.25)}` — an island, unmapped. */
  faceShadow: "0 1px 4px rgba(43,30,16,.25)",
  /** `.rr-lr-speed{border:1.5px solid rgba(11,10,8,.7);color:#0B0A08}` / ivory .6 / `#EADFC6`;
   *  `:hover{background:#0B0A08;color:#FAF7EF}` / `#EADFC6`, `#141B29`. */
  dial: night
    ? { ring: "rgba(240,229,207,.6)", ink: "#EADFC6", hoverFill: "#EADFC6", hoverInk: "#141B29" }
    : { ring: "rgba(11,10,8,.7)", ink: "#0B0A08", hoverFill: "#0B0A08", hoverInk: "#FAF7EF" },
  /** `.rr-lr-nar-face{box-shadow:inset 0 0 0 1px rgba(11,10,8,.28)}` — the face's own rim, unmapped. */
  faceRim: "rgba(11,10,8,.28)",
  /** `.rr-lr-nar-face i{color:#F1E4C4}` — the initial on the label's hue, an island. */
  faceInitial: "#F1E4C4",

  /* --- the sheets --- */
  /** SHEET_BG_DAY `#FFFFFF` / SHEET_BG_NIGHT `linear-gradient(180deg,#1D2537,#141B29)`. */
  stock: night ? ["#1D2537", "#141B29"] : ["#FFFFFF", "#FFFFFF"],
  /** INK_TOP's `#0B0A08` / NGT_TOP's `#F4EBD6` — the jag stroke hugging the tear. */
  jag: night ? "#F4EBD6" : "#0B0A08",
  /** `.rr-lr-sheet-grab::before{background:rgba(11,10,8,.22)}` / `rgba(240,229,207,.28)`. */
  grab: night ? "rgba(240,229,207,.28)" : "rgba(11,10,8,.22)",
  /** `.rr-lr-menu-h{color:#0B0A08}`, `.rr-lr-sp-word`, `.rr-lr-sp-val`, `.rr-lr-lamp-line` / `#F4EBD6`. */
  head: night ? "#F4EBD6" : "#0B0A08",
  /** `.rr-lr-menu-h{border-bottom:1px solid rgba(110,86,58,.3)}` / `rgba(201,166,98,.35)`. */
  headRule: night ? "rgba(201,166,98,.35)" : "rgba(110,86,58,.3)",
  /** `.rr-lr-menu-row{color:#171411;border-top:1px solid rgba(110,86,58,.22)}` / `#EADFC6`, `rgba(201,166,98,.3)`.
   *  `.rr-lr-sw{border-top}` and `.rr-lr-sw-txt b` share the pair. */
  row: night ? "#EADFC6" : "#171411",
  rowRule: night ? "rgba(201,166,98,.3)" : "rgba(110,86,58,.22)",
  /** `.rr-lr-menu-row.is-on{color:#7E2D1F}` / `#D2AF69`. */
  rowOn: night ? "#D2AF69" : "#7E2D1F",
  /** `.rr-lr-sw-txt b{color:#171411}` / `#F4EBD6`. */
  swLabel: night ? "#F4EBD6" : "#171411",
  /** `.rr-lr-sp-sub`, `.rr-lr-sw-txt em{color:rgba(11,10,8,.58)}` / `rgba(240,229,207,.6)`. */
  muted: night ? "rgba(240,229,207,.6)" : "rgba(11,10,8,.58)",
  /** `.rr-lr-sp-chip{border-color:rgba(11,10,8,.26);color:#171411}` / `.3` ivory, `#EADFC6`;
   *  `.is-on{background:#0B0A08;color:#FAF7EF}` / `#EADFC6`, `#141B29`. */
  chip: night
    ? { ring: "rgba(240,229,207,.3)", ink: "#EADFC6", onFill: "#EADFC6", onInk: "#141B29" }
    : { ring: "rgba(11,10,8,.26)", ink: "#171411", onFill: "#0B0A08", onInk: "#FAF7EF" },
  /** `.rr-lr-sp-slider{background:rgba(110,86,58,.07);box-shadow:inset 0 0 0 1px rgba(110,86,58,.2)}`
   *  / ivory .07, brass .28; `.rr-lr-sp-ticks` ink .24 / ivory .26;
   *  `.rr-lr-sp-fill{background:#0B0A08;box-shadow:inset 0 2px 0 #FBF5E4}` / `#EADFC6`, `#141B29`. */
  travel: night
    ? { well: "rgba(240,229,207,.07)", ring: "rgba(201,166,98,.28)", tick: "rgba(240,229,207,.26)", fill: "#EADFC6", lip: "#141B29", shadow: "rgba(0,0,0,.5)" }
    : { well: "rgba(110,86,58,.07)", ring: "rgba(110,86,58,.2)", tick: "rgba(11,10,8,.24)", fill: "#0B0A08", lip: "#FBF5E4", shadow: "rgba(43,30,16,.4)" },
  /** `.rr-lr-sw-tog{border:1.5px solid rgba(11,10,8,.5)}`, knob `#0B0A08`; on: `#0B0A08` / knob `#FBF5E4`
   *  / night ring ivory .5, knob `#EADFC6`; on `#EADFC6` / knob `#141B29`. */
  tog: night
    ? { ring: "rgba(240,229,207,.5)", knob: "#EADFC6", onFill: "#EADFC6", onKnob: "#141B29" }
    : { ring: "rgba(11,10,8,.5)", knob: "#0B0A08", onFill: "#0B0A08", onKnob: "#FBF5E4" },
});
