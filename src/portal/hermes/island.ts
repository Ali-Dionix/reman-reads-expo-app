// The paper objects on the Ask AI page — `.rr-hm-slip` and `.rr-hm-spec`.
//
// Both are theme ISLANDS on the web (app/data/theme.ts, ISLAND_ROOTS): a
// reply slip and a specimen page are sheets of paper lying on the desk, and
// the island rule re-declares every token to its daylight value inside them,
// so at night they stay white with dark ink while the desk around them goes
// navy. Their colours are therefore constants here, never `colors.*` — the
// same device as tokens.ts's OBJECT. Shadows are never mapped on the web
// either (box-shadow is on the token pass's skip list), so they are literal
// on every surface.
//
// The named roles come through tokens.ts's `lit()` — the daylight column, so
// nothing is retyped; the page's own rgba rules and shadows are the light
// literals from accountHermesPage.ts, verbatim.

import { lit, litRgba } from "../../theme/tokens";

export const ISLAND = {
  /** `background: … #FFFFFF` — the sheet. */
  paper: lit("white"),
  /** `color:#171411` — the slip's and the specimen's running text. */
  ink2: lit("ink2"),
  /** `#8C6A3F` — the slip head and the specimen title. */
  gold2: lit("gold2"),
  /** `#6E563A` — the specimen source line. */
  brown: lit("brown"),
  /** `#7E2D1F` — the AI stamp, and a lit word. */
  brick: lit("brick"),
  /** `.rr-hm-slip` — `border:1px solid rgba(11,10,8,.3)`. */
  slipEdge: litRgba("ink", 0.3),
  /** `.rr-hm-spec` — `border:1px solid rgba(11,10,8,.5)`. */
  specEdge: litRgba("ink", 0.5),
  /** `.rr-hm-slip--hermes` — the ruled line every 26px. */
  slipRule: litRgba("brass", 0.14),
  /** `.rr-hm-spec` — the ruled line every 31px. */
  specRule: litRgba("brass", 0.12),
  /** `.rr-hm-spec-head` — `border-bottom:1px solid rgba(110,86,58,.45)`. */
  specHeadRule: litRgba("brown", 0.45),
  /** `.rr-hm-slip-ai` — `border:1px dashed rgba(126,45,31,.55)`. */
  stampEdge: litRgba("brick", 0.55),
  /** `.rr-hm-slip-src` — `color:rgba(110,86,58,.85)`. */
  slipSrc: litRgba("brown", 0.85),
  /** `.rr-hm-word` — `border-bottom:2px dotted rgba(126,45,31,.65)`. */
  wordLine: litRgba("brick", 0.65),
  /** `.rr-hm-word.is-on` — `background:rgba(155,122,77,.22)`. */
  wordOn: litRgba("brass", 0.22),
  /** `.rr-hm-slip` — `box-shadow:1px 2px 1px rgba(54,42,28,.12),4px 7px 14px rgba(54,42,28,.1)`. */
  slipShadow: "1px 2px 1px rgba(54,42,28,.12), 4px 7px 14px rgba(54,42,28,.1)",
  /** `.rr-hm-spec` — `box-shadow:1px 2px 1px rgba(54,42,28,.14),6px 10px 18px rgba(54,42,28,.12)`. */
  specShadow: "1px 2px 1px rgba(54,42,28,.14), 6px 10px 18px rgba(54,42,28,.12)",
} as const;
