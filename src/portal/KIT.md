# The portal kit

Every portal screen is built from the pieces below, and nothing else draws
chrome. They are transcriptions of `app/data/appShell.ts` (the shell and its
row kit), `app/data/portalShared.ts` (`portalBaseCss`), `app/data/portalNav.ts`
(`PORTAL_NAV`) and `app/data/paperMarks.ts` (the tear tiles and the squiggle),
at the **phone branch** of each rule — mobile is the unqualified state in
appShell.ts, so there is no media query to pick; the ≥901px rail is discarded.

**How to read a site rule into a screen.** Take the class's CSS line, and:
colours come from `useTheme()` — `colors.<role>` for the unscoped lookup,
`bg()/text()/border()` for a scoped one (a role used outside its scope throws
in dev; see `src/theme/tokens.ts`); `rgba(11,10,8,.55)` is `useInk().ink(.55)`
(text) or `.ink(.55,"border")`; `#8C6A3F` is `gold2`, `#6E563A` `brown`,
`#9B7A4D` `brass`, `#7E2D1F` `brick`, `#171411` `ink2`. Inside a **theme
island** (theme.ts ISLAND_ROOTS: a cover, the slab, a reply slip — a thing,
not a surface) use `lit("ink2")` / `litRgba("brass", .38)` for the daylight
value in any mode, `ISLAND` for the permanently dark objects' set and
`OBJECT.cover` for a cover thumb's constants. Type goes through
`<Txt family weight size ls line upper color tone>` — `ls` in em as the CSS
writes it, `line` omitted for `line-height: normal` (Chrome's value is
computed for you) or a unitless factor (snapped to Chrome's 1/64px). Every
`::before`/`::after` is a real `<View>`; every `1px dashed` is a `<Rule>`
(or a `<DashedBox>` when it closes); every round control is a `<Disc>`.
Grounds are `colors.desk` (#FFFFFF by day, #0d1322 by night); bars and
sheets are `colors.white`. Never a hex literal in a screen.

**Chrome's 1/64px.** Layout is kept in LayoutUnits; a unitless line-height's
line box is FLOORED to one, a px value ROUNDED. `TEXT`'s voices and `<Txt
line={1.45}>` go through `snap()` so every kit line lands on the site's
1/64 — eleven rows down a page the fractions still round the same way. A
screen that states a px line-height should pass an exact 1/64 (19.375, not
19.38). `hairline(w)` (DashedBox.tsx) is the same idea for border widths:
Chrome paints 1.5px as 1px at DPR 1 and 1.33px at DPR 3, and the padding box
moves with it.

**The frame.** A screen is `<PortalPage title eyebrow? scroll? home? back?>`
with its content inside `<Wrap>` (the 20px gutters of `.rr-pt-wrap`) and
`<Bleed>` to break back out for a shelf. The top bar sticks and its tear hangs
20px over the content; the tab bar is absolute over the foot; both insets are
already applied to the scroller (`useContentInsets()` if you scroll yourself).
Pass `title="Home"` (or `home`) on the hub — that is what puts the mark in
the bar instead of a back disc. A sub-screen passes its room as `eyebrow` and
its parent as `back` (`/profile/settings` → `eyebrow="Profile" back="/profile"`).
A room with a bar pinned under the top bar passes the head as `lead` and the
bar as `sticky` (Library); a `ref` reaches the scroller.

**The scroller is painted opaque, on purpose.** The site's body IS the desk;
a ScrollView on react-native-web is a composited layer, and Chrome keeps
subpixel (LCD) text only on a layer it can prove opaque. Unpainted, every
glyph on every screen goes greyscale and the rig reads ~2 points of "font
drift" that is not there. Two site pages have a fixed sheet over them
(Listening's `.rr-lr-reader`, Ask AI's picker) and are greyscale THEMSELVES —
those pass `lcd={false}`. A room that scrolls itself (Ask AI, for the
keyboard) follows the same rule by hand. A phone renders both alike.

**What is not drawn, on purpose.** The paper grain (`NOISE`, feTurbulence is
unimplemented natively), the Gaussian half of the tear's drop-shadow (a fan of
translucent copies stands in), and the round "N" at the bottom right of every
golden — that is the Next.js dev-tools badge on the local site, not chrome
(the rig masks that corner on both sides).

| Primitive | Props | Site class | Notes |
| --- | --- | --- | --- |
| `PortalPage` (src/portal) | `title, eyebrow?="Your account", children, scroll?=true, home?, back?="/", contentStyle?, lead?, sticky?, keyboardShouldPersistTaps?, lcd?=true`; forwards a `ScrollView` ref | `.rr-ap-top` + `.rr-pt-content` | Bar 60 + status inset; content padded top `insets.top+60+20`, bottom `64+30+insets.bottom`. With `sticky`: the scroller starts at the bar's box, `lead` first, the sticky child wears the 20px bleed as a transparent strip and pins at `--ap-toph`. |
| `TopBar` | `title, eyebrow?, home?, back?` | `.rr-ap-top`, `.rr-ap-title`, `.rr-ap-top-ctrl` | Mark (32px, ink) on Home; back disc (36) elsewhere. Guest stamp appears when `useSession().guest`. |
| `ThemeDisc` | `size?=36, glyph?=18` | `.rr-pt-theme` | Sun in light, moon in dark; toggles `useTheme()`; pins `rr-theme`. |
| `GuestStamp` | — | `.rr-pt-guest` | ≤760px cut: "GUEST" alone, 700 8px .12em, 6px 8px INSIDE a 1px dashed brick .55 border (so 7px 9px here, the `DashedBox` over the outer pixel), −1.5°. |
| `Wrap` / `Bleed` | `children, style?` | `.rr-pt-wrap` | 20px gutters / −20px to break out. |
| `Head` | `title, em?, sub?, ls?=-0.01` | `.rr-pt-head`, `.rr-pt-h1`, `.rr-pt-h1 em`, `.rr-pt-sub` | App-shell sizes: h1 clamp(26,6.8vw,36)/1.04 Cormorant 500; `em` is the 600 half with globals.css's brass swoosh (max(5px,.13em) tall, −.2em under, 1.5% wider); sub 13.5/1.65 ink .62. Kicker is display:none. |
| `GateSheet` (src/portal) | `open, guest, onClose, onContinue`; `gateHref(key)` | `.rr-im.is-upgrade` (importUpgrade.ts) | The locked panel, full-screen in place; Continue goes out on `/login?next=%2Faccount%3Fadd%3D<key>`. Home's cells and the Library's locked cells. |
| `BottomBar` | (react-navigation tab bar props) | `.rr-pt-bottom`, `.rr-ap-slots`, `.rr-ap-tab`, `.rr-ap-fab` | Five slots from `SLOTS`; squiggle under the live label; centre disc opens `AddSheet`. |
| `AddSheet` | `open, onClose` | `#rr-pt-side`, `.rr-ap-add`, `.rr-ap-add-gate`, `.rr-ap-side-foot`, `.rr-pt-scrim` | Copy verbatim from appShell.ts; rows route Home with `?add=`; foot routes `/orders`, `/hermes`. |
| `TornNav` | `onBrand?` | `.rr-nav5--minimal`, `.rr-nav5-paper` | The public nav /login wears: 44px mark PNG, wordmark, 40px theme disc, `sheet` paper (#fff / #1d263c). |
| `TornSheet` (src/ui/TornEdge) | `edge:"bottom"\|"top", width, height, paper, line, haze, hazeSpread?, wash?, style?` | `.rr-ap-top-paper`, `.rr-ap-nav-paper`, `.rr-ap-sheet-paper` | The two-layer torn paper plus the ink line; absolute, bleeds 32/30px past the box. |
| `sheetPath`, `TEETH`, `TILE_W/H` (TornEdge) | `sheetPath(width, solidY, tileTop, phase, mirror)` | HTEAR / HTEAR_TOP (= TEAR_TOP) | One sheet silhouette from the tile — for a torn strip whose offsets are not a bar's (/login's foot, the footer). |
| `TornHem`, `TornEdge` | `width/length, color, style?` | HTEAR / VTEAR | Older single-colour figures; /sign-in's bottom strip still uses `TornHem`. |
| `Rule` | `kind?="dashed"\|"dotted"\|"solid"\|"brick", color?, thickness?, axis?="horizontal"\|"vertical", style?` | `1px dashed rgba(110,86,58,.36)`; `brick` = `.rr-ap-note`'s | SVG, `shape-rendering: crispEdges` (one pixel row, like a border); Chrome's dash fit (3px dashes, gaps stretched to end on a dash) — `chromeDashes()` exported. Vertical is a `border-left`, sized by `top`+`bottom` or a `height`. `style` may place it absolutely (a border-top folded into padding). |
| `DashedBox` (src/ui) | `color, width?=1, radius?` | any `border: Npx dashed` + `border-radius` | Absolute over its parent; the parent pads for the border. Perimeter dash fit (closes on whole dashes). `hairline(w)` and `useBox()` live here. |
| `RuledLabel` | `children, trailing?, gap?=11, kind?` | `.rr-ap-group-h` | Label, rule running off, optional link. |
| `Squiggle` | `width, color?` | `SQUIGGLE_INK` / `SQUIGGLE_GOLD` | 44×5 tile, ink by day, #c9a662 by night. |
| `Disc` | `size, ring?, ringWidth?=1, dashed?, fill?, tilt?, shadow?, inner?, onPress?, disabled?, a11y…` | `.rr-ap-disc`, `.rr-ap-row-i`, `.rr-ap-add-i`, `.rr-ap-act i`, `.rr-pt-side-shut`, `.rr-ap-fab`, `.rr-hm-step` | Hard offset shadow is a second disc; dashed rings are SVG; `disabled` is .26, unpressable, said in both `accessibilityState` and `aria-disabled` (RNW 0.21 reads only the latter). |
| `Button` (src/ui) | `label, ghost?, onPress?, disabled?, leading?, style?` | `.rr-pt-btn`, `.rr-pt-btn--ghost` | 14px 24px pill; ink ground + paper letters, 700 11px .08em uppercase; ghost: ink2 letters on a 1px ink .3 ring. Pressed wears inkhover / ring .6; `disabled` .5. |
| `Cover` (src/ui) | `art?, spine?, width, dim?, radius?=3, shadow?=true, children?` | `.rr-shf-cover`, `.rr-lr-ac`, the side table | 2:3 sleeve on the spine colour, two ink drops, art from SITE_ORIGIN as RN's Image (a background-image at cover, as shelfCard.ts draws it); `dim` is saturate(.55) brightness(.92) opacity .8 through an sRGB SVG filter. Overlays go in as children. An island: nothing here takes the mode. |
| `Icon` | `name, size?=22, color` | `appIcon(key,size)` | `ICON` table generated verbatim into `src/ui/icons.ts`. |
| `Chevron` | `size?, color, kind?="row"\|"sheet"` | `.rr-ap-row-go` / `CHEV` | 1.6 vs 1.7 stroke. `.rr-pf-stats-h svg{width:15px}` outranks `.rr-pf-stats-go`'s 16 on the site — the stats chevron is 15. |
| `RoomIcon` | `room, color, size?` | — | `Icon` by `RoomKey`. |
| `Group` (src/ui/Rows) | `label, link?, rule?=true, children` | `.rr-ap-group`, `.rr-ap-rows` | 28px above; brass label; rows on a dashed rule. `rule={false}` for a grid body (the rule is the `ul`'s; the head's 9px collapses into the grid's 16). |
| `Row` | `label, note?, noteTone?, value?, valueTone?, icon?, control?, hand?, onPress?, open?, rule?=true, minHeight?=55, disabled?` | `.rr-ap-row` (+ `.is-bare`) | `onPress` draws the chevron; `control` replaces value+chevron; empty grid columns keep their 13px gaps and FILL FROM THE LEFT (a lone chevron ends 13px in). Body 55 + the 1px rule = the site's 56 border-box. `value` max-width is 42vw. `open` turns the chevron 90° and inks the value. |
| `Fold` | `label, note?, noteTone?, value, valueTone?, icon?, children, initiallyOpen?` | `.rr-pf-fold` (`<details>` › `<summary class="rr-ap-row">`) | A Row at 56 with `rule={false}`, the children under it when open, then the rule (the details'). |
| `Switch` | `on, onChange, label, disabled?` | `.rr-ap-sw` | 46×26, ink ring, 18px knob, 20px travel. |
| `Acts` | `acts:[{label, icon, onPress?, soon?, locked?, lockWord?}], columns?=4, disc?=46, rowGap?=18, top?=16` | `.rr-ap-acts`, `.rr-ap-act` | live / soon (dashed ring + tick) / dim / locked (padlock, still pressable). `columns={5}` is Home's add band (65.2px cells at 390, exactly); `disc={52} rowGap={16}` is `.rr-pf-support`. |
| `BandHead` | `title, sub?, link?, band?=true, after?=0` | `.rr-ap-band`, `.rr-ap-band-h` | 30px above; serif 23px; link underlined 1.5px ink. The 2px under the head COLLAPSES on the web into the follower's margin, so it draws none; a follower with no top margin passes `after={2}`. |
| `Seg` | `segments:[{key,label,count?}], selected, onSelect, size?=19, gap?=22, top?=18, count?="super"\|"baseline", countGap?, dim?=.45, role?="tab"\|"radio"` | `.rr-ap-seg`; `.rr-lr-pill` at `size={18} gap={20} top={16} count="baseline" role="radio"` | Serif words, squiggle under the live one, brass count — superscript on the kit's (inline content), on the baseline on the pill (inline-flex, so `super` is moot). `.rr-ly-tab` is NOT this segment (its own padding and a brick count). |
| `Note` | `label, children` | `.rr-ap-note` | Brick dashed rules above and below. |
| `GuestNote` (src/ui) | `onCreateAccount` | `.rr-pf-guestnote` (Profile and Settings carry the same rule) | 18 above, 13/14 inside brick rules; 700 8.5px .22em label; 13px/1.6 ink .7 with the underlined ink link. |
| `Txt` (src/ui/Type) | `family?, weight?, italic?, size, ls?, line?, upper?, color?, tone?` | any `font:` shorthand | `face()` resolves the loaded file; `lh()` Chrome's normal line-height; a unitless `line` is snapped to 1/64px. |
| Voices | `Title Head Row Body Lede Micro Kicker Tab Sub Value Numeral Hand` | `.rr-pt-h1 .rr-ap-band-h h2 .rr-ap-row-l b .rr-pt-sub .rr-ap-band-h p .rr-ap-group-h b .rr-ap-title i .rr-ap-tab b .rr-ap-row-l em .rr-ap-row-v .rr-ap-seg i .rr-ap-row-note` | Presets in `TEXT`, src/theme/type.ts; line-heights via `lineOf(size, factor)`. |
| `useTheme()` | `mode, colors, bg(), text(), border(), line, chrome, toggle, setPref` | theme.ts | `chrome` carries the night-rule constants (tear line, haze, scrim, fab shadow). |
| `useInk()` | `ink(a,scope?) brown brick brass inkLine brownLine brickLine rgba() clamp() vw()` | `rgba(<brand>,α)`, `clamp()` | Triplets flip by scope, alpha kept. |
| `lit(role)`, `litRgba(name, α)`, `ISLAND`, `OBJECT.cover` (src/theme/tokens) | — | theme.ts ISLAND_ROOTS | The daylight value in any mode; the dark objects' set (ink / cream / brass / the shut disc / the brass ring / the shadows); a cover thumb's constants. |
| `ROOMS, SLOTS, SHEET_KEYS, roomByKey` (src/nav/rooms) | — | `PORTAL_NAV`, `SLOTS`, `SHEET_KEYS` | Verbatim; the coverage assertion runs at import. |

**The deck** (`src/lib/audioStore`): one player above the router. `useDeck()`
gives `now, playing, position, duration, loading, finished, spots` and
`playBand(slug, band?, at?)`, `begin(slug)` (the site's beginBook — where the
book was left, or the top if it was played through; a title already on the
platter resumes), `toggle, seekTo, nudge, step, stop, rate, setRate`. The
needle's memory (`ListeningSpot` per slug under `rr-listening`, the site's
`state.listening` shape) is stamped by the provider itself on every band
change, pause, resume and every 5s while playing; `readSpots()`,
`heardSeconds()`, `resumable()` build the Continue-listening shelf.

**The session** (`src/lib/session`): `user, booting, guest, reader` (the
readers row, hydrated once per signed-in reader — card_no, name, langs, the
audio settings), `setUser` (drops the guest pass only when what is stored IS
a guest pass), `startGuest`, `signOut` (a guest's `rr-account-state` leaves
with the guest), `rename` (in memory and on the pass). `useCardNo()` is the
member number as the web paints it. **The working model**
(`src/lib/portalState`): `readState(owner?)`, `writeState(owner, patch)` over
`rr-account-state` — merges, stamped with the owner (`ownerOf(id)`; a guest
is "guest"), so no room clobbers another's slice and no reader sees
another's.

Fonts loaded (`app/_layout.tsx`, mirrored in `FONTS`): Manrope 400/500/600/700/800,
Cormorant Garamond 400/400i/500/500i/600/600i/700, Caveat 500. Ask
`face(family, weight, italic?)` rather than naming a file; it throws on a
weight that is not loaded.
