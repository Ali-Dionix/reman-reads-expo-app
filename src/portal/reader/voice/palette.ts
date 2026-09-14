// The narrator sheet's inks — every colour the site's CSS writes for
// `[data-rr-lr-voice-menu]` and its children, as the light/dark pair the
// rules state (`html[data-rr-theme="dark"] .rr-lr-vc-…` in
// app/data/accountListeningPage.ts, lines ~1402–1461).
//
// The reader's palette is hand-set on the site rather than tokenised — the
// listening room writes its night values as literal rules — so the pairs are
// carried here verbatim and picked by mode, never guessed from a role. Where
// a night rule is absent the day value stands (the site's own behaviour).
//
// Two values are Chrome's, not the house's: `.rr-lr-vc-chip` sets
// `appearance:none` and no background, so the button keeps the UA's
// ButtonFace — #EFEFEF by day and #6B6B6B under `color-scheme: dark`. The
// goldens show that grey chip; the phone draws the same one.

export type Palette = ReturnType<typeof paletteFor>;

export function paletteFor(night: boolean) {
  const d = night;
  return {
    /* --- the paper --- */
    // SHEET_BG_DAY #FFFFFF; SHEET_BG_NIGHT linear-gradient(180deg,#1D2537,#141B29)
    paperTop: d ? "#1D2537" : "#FFFFFF",
    paperBot: d ? "#141B29" : "#FFFFFF",
    // INK_TOP / NGT_TOP — the jag's stroke
    tearInk: d ? "#F4EBD6" : "#0B0A08",
    // filter:drop-shadow(0 -5px 16px …)
    haze: d ? "rgba(0,0,0,.6)" : "rgba(54,42,28,.24)",
    // .rr-lr-sheet-grab::before
    grab: d ? "rgba(240,229,207,.28)" : "rgba(11,10,8,.22)",

    /* --- the filter row --- */
    // .rr-lr-vc-find box-shadow ring / its icon colour
    findRing: d ? "rgba(201,166,98,.4)" : "rgba(110,86,58,.32)",
    findIcon: d ? "rgba(240,229,207,.55)" : "rgba(11,10,8,.5)",
    // :focus-within — the ring inks up, and the glass with it
    findFocusRing: d ? "rgba(240,229,207,.7)" : "rgba(11,10,8,.6)",
    findFocusIcon: d ? "#F4EBD6" : "#0B0A08",
    findText: d ? "#EADFC6" : "#171411",
    findPlaceholder: d ? "rgba(240,229,207,.45)" : "rgba(11,10,8,.42)",
    // .rr-lr-vc-chip — ring, ink, and Chrome's ButtonFace under it
    chipRing: d ? "rgba(201,166,98,.4)" : "rgba(110,86,58,.32)",
    chipText: d ? "#EADFC6" : "#171411",
    chipFace: d ? "#6B6B6B" : "#EFEFEF",
    chipOnBg: d ? "#EADFC6" : "#0B0A08",
    chipOnText: d ? "#141B29" : "#FAF7EF",
    // .rr-lr-vc-langmenu
    menuBg: d ? "#1D2537" : "#FFFDF7",
    menuRing: d ? "rgba(201,166,98,.34)" : "rgba(110,86,58,.26)",
    menuShadow: d
      ? "0 2px 6px rgba(0,0,0,.5),0 14px 34px -12px rgba(0,0,0,.7)"
      : "0 2px 6px rgba(43,30,16,.14),0 14px 34px -12px rgba(43,30,16,.4)",
    optText: d ? "#EADFC6" : "#171411",
    optCount: d ? "rgba(240,229,207,.42)" : "rgba(11,10,8,.4)",
    optOnBg: d ? "#EADFC6" : "#0B0A08",
    optOnText: d ? "#141B29" : "#FAF7EF",
    optOnCount: d ? "rgba(20,27,41,.6)" : "rgba(250,247,239,.6)",

    /* --- labels and lines --- */
    // .rr-lr-vc-lab
    lab: d ? "rgba(240,229,207,.5)" : "rgba(11,10,8,.45)",
    // .rr-lr-vc-one
    oneText: d ? "#EADFC6" : "#171411",
    oneRule: d ? "rgba(201,166,98,.3)" : "rgba(110,86,58,.22)",
    // .rr-lr-vc-livesay (+ .is-bad)
    livesay: d ? "rgba(240,229,207,.55)" : "rgba(11,10,8,.55)",
    livesayBad: d ? "#E6A08C" : "#7E2D1F",
    // .rr-lr-vc-none — Caveat, brown
    none: d ? "#D2AF69" : "#6E563A",

    /* --- the discs --- */
    // .rr-lr-nar-pick b / em
    pickName: d ? "#F4EBD6" : "#171411",
    pickLine: d ? "rgba(240,229,207,.62)" : "rgba(11,10,8,.58)",
    // .rr-lr-nar-disc box-shadow inset ring + cast
    discRing: "rgba(11,10,8,.28)",
    discCast: "rgba(43,30,16,.26)",
    // the label's own letter
    discInitial: "#F1E4C4",
    // aria-checked outline
    discOutline: "#9B7A4D",
    // .rr-lr-nar-badge (+ .is-on)
    badgeBg: d ? "#1D2537" : "#FFFFFF",
    badgeInk: d ? "#EADFC6" : "#0B0A08",
    badgeRing: d ? "rgba(240,229,207,.55)" : "rgba(11,10,8,.4)",
    badgeOnBg: d ? "#EADFC6" : "#0B0A08",
    badgeOnInk: d ? "#141B29" : "#FBF5E4",
    badgeOnRing: d ? "#1D2537" : "#FFFFFF",

    /* --- the chip strip --- */
    // .rr-lr-vc-pick box-shadow ring at rest / [aria-checked="true"]
    chipRestRing: d ? "rgba(201,166,98,.35)" : "rgba(110,86,58,.3)",
    chipOnRing: d ? "#EADFC6" : "#0B0A08",

    /* --- the directory --- */
    // .rr-lr-vc-tongue — sticky over the sheet's ground
    tongueBg: d ? "#0D1322" : "#FFFDF7",
    tongue: d ? "rgba(240,229,207,.45)" : "rgba(11,10,8,.42)",
    // .rr-lr-vc-row border-top
    rowRule: d ? "rgba(201,166,98,.3)" : "rgba(110,86,58,.22)",
    rowName: d ? "#F4EBD6" : "#171411",
    rowLine: d ? "rgba(240,229,207,.6)" : "rgba(11,10,8,.58)",
    tag: d ? "rgba(240,229,207,.45)" : "rgba(11,10,8,.42)",
    tagOn: d ? "#F4EBD6" : "#0B0A08",
    // the padlock in the tag column of a reader behind the subscription —
    // the + sheet's `.rr-ap-add-lock{color:#8C6A3F}` (appShell.ts), which
    // the shell's tokeniser turns to the gold2 role's night value
    // (src/theme/tokens.ts); not a rule of this sheet's own
    rowLock: d ? "#D4AD67" : "#8C6A3F",
    // .rr-lr-vc-more
    more: d ? "#D98A70" : "#7E2D1F",

    /* --- the clone tile --- */
    // .rr-lr-cv-row — white and black by day; a warm wash on navy at night
    cvBg: d ? null : "#FFFFFF",
    cvWash: d ? (["rgba(210,175,105,.16)", "rgba(217,138,112,.1)"] as const) : null,
    cvRing: d ? "rgba(201,166,98,.32)" : "#0B0A08",
    cvRingW: d ? 1 : 1.5,
    cvDiscBg: d ? "#1D2537" : "#0B0A08",
    cvDiscRing: d ? "rgba(240,229,207,.45)" : null,
    cvDiscInk: d ? "#EADFC6" : "#FFFFFF",
    cvTitle: d ? "#F4EBD6" : "#0B0A08",
    cvLine: d ? "rgba(240,229,207,.6)" : "rgba(11,10,8,.66)",
    cvBtnBg: d ? "#EADFC6" : "#0B0A08",
    // .rr-lr-cv-note — Caveat, brown; brass at night
    cvNote: d ? "#D2AF69" : "#6E563A",
    cvBtnInk: d ? "#141B29" : "#FFFFFF",
    // .rr-lr-cv-row::after — the house mark, masked in ink at .045; brass at .09 by night
    cvMark: d ? "#D2AF69" : "#0B0A08",
    cvMarkAlpha: d ? 0.09 : 0.045,
  };
}
