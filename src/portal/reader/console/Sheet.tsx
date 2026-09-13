// The console's SHEET — `.rr-lr-menu.rr-lr-sheet` (accountListeningPage.ts,
// SHEET_BG_DAY / SHEET_BG_NIGHT / SHEET_MASK), `.rr-lr-sheet-grab`,
// `.rr-lr-sheet-in`, and the menu furniture the lamp and type sheets share:
// `.rr-lr-menu-h`, `.rr-lr-menu-row` (+ `i`, `.is-on`), `.rr-lr-menu-foot`.
//
// "Everything the console opens is a SHEET: white stock run out to both
// margins, torn along its head only, sliding up out of the transport with the
// transport still lit beneath it." The stock is the deck's own tile (HTEARF —
// the nav tear mirrored so the teeth point up), and the tear's INK is the jag
// polyline stroked 4px and clipped to the paper, so a 2px line hugs the torn
// edge exactly (INK_TOP / NGT_TOP). The sheet's bottom sits ON the console's
// face (`bottom:100%` of `.rr-lr-deck`), over the console's own tear.
//
// The sheet's drop-shadow (0 -5px 16px) is NOT drawn: CSS applies `filter`
// before `mask-image`, so the mask clips the shadow away with everything else
// outside the paper — the site shows no haze above its tear either.

import type { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { ClipPath, Defs, G, Path } from "react-native-svg";

import { em } from "../../../theme/ink";
import { useTheme } from "../../../theme/ThemeProvider";
import { FONTS, lh, lineOf } from "../../../theme/type";
import { JAG, TEAR, TILE_H, TILE_W } from "../TornBand";
import { deckInk } from "./ink";

export { TILE_H };

/** `.rr-lr-sheet-in{max-height:min(58vh,470px)}`. */
const innerMax = (windowH: number) => Math.min(470, windowH * 0.58);

/** The torn head: the stock tile, and the jag ink clipped to it. */
function TornHead({ width, stock, jag }: { width: number; stock: string; jag: string }) {
  const repeats = Math.max(1, Math.ceil(width / TILE_W));
  const total = repeats * TILE_W;
  // the tile is flipped about its own centre line so the teeth point up
  const flip = (i: number) => `translate(${i * TILE_W} ${TILE_H}) scale(1 -1)`;
  return (
    <View pointerEvents="none" style={styles.head}>
      <Svg width={total} height={TILE_H} viewBox={`0 0 ${total} ${TILE_H}`}>
        <Defs>
          <ClipPath id="rr-lr-sheet-paper">
            {Array.from({ length: repeats }, (_, i) => (
              <Path key={i} d={TEAR} transform={flip(i)} />
            ))}
          </ClipPath>
        </Defs>
        {Array.from({ length: repeats }, (_, i) => (
          <Path key={i} d={TEAR} fill={stock} transform={flip(i)} />
        ))}
        <G clipPath="url(#rr-lr-sheet-paper)">
          {Array.from({ length: repeats }, (_, i) => (
            <Path key={i} d={JAG} fill="none" stroke={jag} strokeWidth={4} transform={flip(i)} />
          ))}
        </G>
      </Svg>
    </View>
  );
}

export function Sheet({
  open,
  onClose,
  night,
  bottom,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  night: boolean;
  /** Where the console's BOX begins, from the screen's foot — the site's
   *  `bottom:100%` of .rr-lr-deck, under its hanging tear. */
  bottom: number;
  /** The site's aria-label on the menu. */
  label: string;
  children: ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  const ink = deckInk(night);
  if (!open) return null;

  const foot = Math.max(0, bottom);
  // ≤900px: .rr-lr-sheet-in{padding-left/right:clamp(14px,4.6vw,22px)}
  const side = Math.min(22, Math.max(14, width * 0.046));

  return (
    <>
      {/* THE SCRIM — the document click that shuts a menu on the site: a tap
          on NOTHING (the codex's paper, the field) falls through to
          shutMenus(); a tap on a control ACTS and the sheet stays — the
          rail's back arrow, the contents pull, the lamp disc, the console's
          keys. So the scrim stands UNDER the two torn bands (`z-index:3`,
          Reader's styles.band) and over the codex: a sibling of theirs at 2,
          not a child of the sheet's own layer at 5. The codex's turn arrows
          go under it too — at the phone's heights they stand under the
          sheet's paper in any case. */}
      <Pressable
        accessible={false}
        importantForAccessibility="no"
        onPress={onClose}
        style={[styles.scrim, { bottom: foot }]}
      />
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.layer]}>
        {/* NOT a modal view: the site's sheets carry no aria-modal, and the
            console's keys stay live under a standing sheet — a modal flag would
            hide them (and the groove) from VoiceOver while the dial is up */}
        <View style={[styles.sheet, { bottom: foot }]} accessibilityLabel={label}>
          <TornHead width={width} stock={ink.stock[0]} jag={ink.jag} />
          <LinearGradient colors={[ink.stock[0], ink.stock[1]]} style={styles.body}>
            {/* the grabber — a real button that shuts the sheet, 76×26 around a 38×4 bar */}
            <Pressable onPress={onClose} style={styles.grab} accessibilityRole="button" accessibilityLabel="Close">
              <View style={[styles.grabBar, { backgroundColor: ink.grab }]} />
            </Pressable>
            {/* no bounce: iOS bounces a scroller vertically even when its
                content fits, and a bounce that begins under the dial's travel
                would take the drag off it mid-gesture */}
            <ScrollView
              style={{ maxHeight: innerMax(height) }}
              contentContainerStyle={[styles.inner, { paddingHorizontal: side }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
              overScrollMode="never"
            >
              {children}
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </>
  );
}

/* ------------------------------------------------ the menu furniture --- */

/** `.rr-lr-menu-h` — small-caps Cormorant 500 14.5px .16em, ruled under. */
export function MenuHead({ night, children }: { night: boolean; children: string }) {
  const ink = deckInk(night);
  return (
    <View style={[styles.menuH, { borderBottomColor: ink.headRule }]}>
      <Text style={[styles.menuHText, { color: ink.head }]}>{children}</Text>
    </View>
  );
}

/** `.rr-lr-menu-row` — Cormorant 16px, the `i` note in brass off the right
 *  edge, `.is-on` in brick behind a small fisheye; the row under the head
 *  carries no rule of its own (`.rr-lr-menu-h+.rr-lr-menu-row{border-top:0}`). */
export function MenuRow({
  night,
  label,
  note,
  on = false,
  first = false,
  onPress,
  accessibilityLabel,
}: {
  night: boolean;
  label: string;
  note?: string;
  on?: boolean;
  first?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const ink = deckInk(night);
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: on }}
      style={[styles.row, { borderTopWidth: first ? 0 : 1, borderTopColor: ink.rowRule }]}
    >
      {on ? <Text style={[styles.rowOnMark, { color: ink.rowOn }]}>{"◉"}</Text> : null}
      <Text style={[styles.rowLabel, { color: on ? ink.rowOn : ink.row }]}>{label}</Text>
      {note ? <Text style={[styles.rowNote, { color: colors.brass }]}>{note}</Text> : null}
    </Pressable>
  );
}

/** `.rr-lr-menu-foot` — Caveat 500 14px/1.4 in brown, a hair off true. */
export function MenuFoot({ children }: { children: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.foot, { color: colors.brown }]}>{children}</Text>;
}

/* -------------------------------------------------------------- styles --- */

const styles = StyleSheet.create({
  // .rr-lr-menu{z-index:5} — above the bands (`.rr-lr-deck{z-index:3}`, which
  // the frame carries on both TornBands); on the site the sheet is INSIDE the
  // deck and wins by nesting
  layer: { zIndex: 5 },
  // the scrim: over the codex (and the frame's veil at 1), under both bands
  scrim: { position: "absolute", left: 0, right: 0, top: 0, zIndex: 2 },
  sheet: { position: "absolute", left: 0, right: 0 },
  // the tear tile is the TOP 17px OF THE BOX (mask-position 0 0), painted
  // over by nothing; the mask's straight body begins 16px down
  head: { position: "absolute", top: 0, left: 0, right: 0, height: TILE_H },
  body: { marginTop: TILE_H - 1 },
  // .rr-lr-sheet-grab{width:76px;height:26px;margin:9px auto 0} — measured
  // from the box's top, so it starts INSIDE the tear, the bar just under it
  grab: { width: 76, height: 26, marginTop: 9 - (TILE_H - 1), alignSelf: "center", alignItems: "center", justifyContent: "center" },
  grabBar: { width: 38, height: 4, borderRadius: 999 },
  // .rr-lr-sheet-in{padding:4px clamp(16px,4.4vw,34px) 20px} — sides at the ≤900 cut
  inner: { paddingTop: 4, paddingBottom: 20 },

  // .rr-lr-menu-h{margin:0 0 2px;padding-bottom:8px;border-bottom:1px solid}
  menuH: { marginBottom: 2, paddingBottom: 8, borderBottomWidth: 1 },
  // small-caps is unsupported natively; tracked uppercase, the portal's own stand-in
  menuHText: {
    fontFamily: FONTS.serifMedium,
    fontSize: 14.5,
    lineHeight: lh("Cormorant Garamond", 14.5),
    letterSpacing: em(14.5, 0.16),
    fontVariant: ["small-caps"],
  },
  // .rr-lr-menu-row{display:flex;align-items:baseline;gap:9px;padding:9px 2px;font-size:16px}
  row: { flexDirection: "row", alignItems: "baseline", gap: 9, paddingVertical: 9, paddingHorizontal: 2 },
  rowLabel: { fontFamily: FONTS.serifRegular, fontSize: 16, lineHeight: lh("Cormorant Garamond", 16), flexShrink: 1 },
  // .rr-lr-menu-row i{margin-left:auto;font-variant-numeric:tabular-nums}
  rowNote: { marginLeft: "auto", fontFamily: FONTS.serifRegular, fontSize: 16, lineHeight: lh("Cormorant Garamond", 16), fontVariant: ["tabular-nums"] },
  // .rr-lr-menu-row.is-on::before{content:'◉';font-size:9px;transform:translateY(-2px)}
  rowOnMark: { fontSize: 9, lineHeight: 11, transform: [{ translateY: -2 }] },
  // .rr-lr-menu-foot{margin:9px 0 0;font:500 14px/1.4 'Caveat';transform:rotate(-.6deg)}
  foot: { marginTop: 9, fontFamily: FONTS.hand, fontSize: 14, lineHeight: lineOf(14, 1.4), transform: [{ rotate: "-0.6deg" }] },
});
