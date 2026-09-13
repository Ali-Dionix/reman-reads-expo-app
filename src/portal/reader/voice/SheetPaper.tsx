// `.rr-lr-sheet` — the paper the narrator sheet is printed on.
//
// The site: `SHEET_BG_DAY` (the jag's 4px ink stroke as the top background
// layer, then the stock) under `SHEET_MASK` (a solid mask from 16px down plus
// the mirrored tear tile HTEARF across the top 17px), and
// `filter:drop-shadow(0 -5px 16px …)` casting up over the codex. The mask
// clips the stroke's outer half, so what shows is a ~2px ink line hugging the
// torn head from inside.
//
// Here the same picture is built from the kit's `sheetPath` (the HTEAR tile's
// point list, mirrored for a rising edge): the paper is the silhouette with
// its tile at y=0; the ink line is the same silhouette filled with ink under a
// paper drawn 2.4px lower, which leaves the inner half of the stroke showing;
// the Gaussian haze is a fan of translucent copies stepped upward, as
// TornSheet does for the shell's bars. The stock is a gradient at night
// (#1D2537 → #141B29) and plain white by day.

import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { sheetPath } from "../../../ui/TornEdge";
import type { Palette } from "./palette";

/** How far the haze reaches above the box. */
export const HAZE_BLEED = 22;

/** The stroke's inner half, measured vertically — 2px perpendicular on the
 *  tile's slopes. */
const INK_DROP = 2;

/** Upward offsets and alphas standing in for a 16px Gaussian at −5px. */
const FAN: readonly (readonly [number, number])[] = [
  [2, 0.09],
  [5, 0.07],
  [8, 0.055],
  [11, 0.04],
  [14, 0.03],
  [18, 0.02],
];

export function SheetPaper({
  width,
  height,
  pal,
}: {
  width: number;
  /** The sheet's own box, tear row included. */
  height: number;
  pal: Palette;
}) {
  const svgH = height + HAZE_BLEED;
  // the svg starts HAZE_BLEED above the box: y' = y + HAZE_BLEED
  const o = HAZE_BLEED;
  const paperAt = (tileTop: number) => sheetPath(width, svgH, o + tileTop, 0, true);
  const paper = paperAt(0);

  return (
    <View style={[styles.wrap, { top: -HAZE_BLEED, height: svgH }]}>
      <Svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`}>
        <Defs>
          <LinearGradient id="rr-vc-stock" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={pal.paperTop} />
            <Stop offset="1" stopColor={pal.paperBot} />
          </LinearGradient>
        </Defs>
        {/* the haze — farthest copy first */}
        {FAN.map(([d, a], i) => (
          <Path key={i} d={paperAt(-d)} fill={pal.haze} fillOpacity={a} />
        ))}
        {/* the ink under the paper: what the mask leaves of the 4px stroke */}
        <Path d={paper} fill={pal.tearInk} />
        {/* the stock, its tile a hair lower so the ink shows along the tear */}
        <Path d={paperAt(INK_DROP)} fill="url(#rr-vc-stock)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, pointerEvents: "none" },
});
