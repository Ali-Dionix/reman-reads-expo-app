// The slab's own colours — accountPage.ts's ".rr-ov-promo" is a THEME ISLAND
// (theme.ts ISLAND_ROOTS): a permanently dark object whose cream type must
// not flip to navy at night. The set is the kit's ISLAND (tokens.ts), shared
// with the profile slab and the product CTA; only the shadows the page's
// own classes set are here, literal as the CSS writes them (box-shadow is
// on the token pass's skip list).

import { ISLAND as KIT_ISLAND, OBJECT } from "../../theme/tokens";

export const ISLAND = KIT_ISLAND;

export const SHADOW = {
  /** .rr-ov-promo */
  slab: KIT_ISLAND.shadow,
  /** .rr-ov-promo-btn — the press's hard brass offset. */
  press: KIT_ISLAND.pressShadow,
  /** .rr-ov-promo-art i — a cream page-edge ring, then two ink drops. */
  jacket: "0 0 0 1px rgba(250,247,239,.16), 0 2px 6px rgba(0,0,0,.55), 0 14px 30px rgba(0,0,0,.45)",
  /** .rr-shf-cover */
  cover: OBJECT.cover.sleeveShadow,
} as const;
