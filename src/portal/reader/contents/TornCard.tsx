// A torn card — the reader's popup stock, torn on all four edges.
//
// Site: accountListeningPage.ts CARD_BG_DAY / CARD_BG_NIGHT under the
// `.rr-lr-drawer` (and `.rr-lr-menu--rail`) mask. The web cuts the card with
// FIVE mask layers — a solid rect inset 15px/16px, HTEARF along the head
// (the nav tile mirrored, teeth up), HTEAR along the foot, VTEARF down the
// left, VTEAR down the right — and lays the tear's own INK under the same
// masks: each tile's jag polyline stroked 4px wide, so the mask clips the
// outer half and a ~2px line hugs the torn edge exactly.
//
// The card also declares `filter: drop-shadow(6px 10px 16px rgba(54,42,28,.28))`
// — which never shows. CSS paints filter → clip → MASK → opacity, so the
// shadow the filter adds is masked away with everything else outside the
// stock (measured: the deck paper under the drawer's foot is pure #FFFEFC
// on the golden). So no shadow is drawn here either; `shadow` opts back in
// for a card whose mask is not so strict.
//
// React Native has no CSS mask, so the same picture is built the other way
// round: the union of the five mask layers is drawn as five filled shapes in
// one SVG (same stock, so the overlaps are invisible), the ink is the same
// polylines stroked 4px and CLIPPED to that union (the optional shadow is an
// SVG FeDropShadow of the union's silhouette; react-native-svg draws it
// natively since 15.12). The tile point lists are TornEdge's TEETH (HTEAR
// verbatim) and paperMarks.ts's VTEAR.
//
// What is not drawn: the fractal-noise grain (NOISE) — feTurbulence is
// unimplemented natively — as everywhere else in the kit.

import { StyleSheet, View } from "react-native";
import Svg, {
  ClipPath,
  Defs,
  FeDropShadow,
  Filter,
  G,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

import { TEETH, TILE_H, TILE_W } from "../../../ui/TornEdge";
import { fillProps, strokeProps } from "../../../ui/svgPaint";

/** VTEAR — the 16×120 tile's torn profile, y ascending; the tile is filled
 *  from x=0 to this line. VTEARF (the left edge) is its mirror, 16 − x. */
const V_TEETH: readonly (readonly [number, number])[] = [
  [12, 0], [4, 12], [15, 24], [6, 36], [13, 48], [3, 60], [14, 72], [7, 84],
  [13, 96], [5, 108], [12, 120],
];
const V_W = 16;
const V_H = 120;

/** The mask's solid rect: `calc(100% - 30px) calc(100% - 32px)` at 15px 16px. */
const INSET_X = 15;
const INSET_Y = 16;

/** How far past the box the shadow may reach (dx 6 + 3σ). */
const BLEED = 40;

/** The horizontal jag across `width`, as (x, y) pairs with x ascending. The
 *  tile's own y (4..16, measured from the tile's top); the caller places it. */
function jagH(width: number): [number, number][] {
  const pts: [number, number][] = [];
  const tiles = Math.ceil(width / TILE_W);
  for (let k = 0; k < tiles; k++) {
    // TEETH runs x descending, and both ends sit at y=4 — skip the duplicate
    // joint after the first tile
    for (let i = TEETH.length - 1; i >= 0; i--) {
      if (k > 0 && i === TEETH.length - 1) continue;
      const [px, py] = TEETH[i];
      pts.push([k * TILE_W + px, py]);
    }
  }
  return pts;
}

/** The vertical jag down `height`, (x, y) with y ascending; x in tile space. */
function jagV(height: number): [number, number][] {
  const pts: [number, number][] = [];
  const tiles = Math.ceil(height / V_H);
  for (let k = 0; k < tiles; k++) {
    for (let i = 0; i < V_TEETH.length; i++) {
      if (k > 0 && i === 0) continue;
      const [px, py] = V_TEETH[i];
      pts.push([px, k * V_H + py]);
    }
  }
  return pts;
}

const poly = (pts: [number, number][]): string => pts.map(([x, y]) => `${x} ${y}`).join(" L");

export function TornCard({
  width,
  height,
  night,
  id = "rr-tc",
  shadow = false,
}: {
  width: number;
  height: number;
  night: boolean;
  /** Draw the drop-shadow the CSS declares (off: the site masks it away). */
  shadow?: boolean;
  /** Unique per instance — SVG ids are document-global on the web. */
  id?: string;
}) {
  if (width <= 0 || height <= 0) return null;
  const W = width;
  const H = height;

  // the four strips' outlines, in card space
  const top = jagH(W).map(([x, y]) => [x, TILE_H - y] as [number, number]);
  const bot = jagH(W).map(([x, y]) => [x, H - TILE_H + y] as [number, number]);
  const left = jagV(H).map(([x, y]) => [V_W - x, y] as [number, number]);
  const right = jagV(H).map(([x, y]) => [W - V_W + x, y] as [number, number]);

  // the fills (each strip closes onto the card's interior) and the inner rect
  const dTop = `M0 ${TILE_H} L${poly(top)} L${W} ${TILE_H} Z`;
  const dBot = `M0 ${H - TILE_H} L${poly(bot)} L${W} ${H - TILE_H} Z`;
  const dLeft = `M${V_W} 0 L${poly(left)} L${V_W} ${H} Z`;
  const dRight = `M${W - V_W} 0 L${poly(right)} L${W - V_W} ${H} Z`;
  const dRect = `M${INSET_X} ${INSET_Y} H${W - INSET_X} V${H - INSET_Y} H${INSET_X} Z`;
  // the ink: the same polylines, open
  const lTop = `M${poly(top)}`;
  const lBot = `M${poly(bot)}`;
  const lLeft = `M${poly(left)}`;
  const lRight = `M${poly(right)}`;

  const ink = night ? "#F4EBD6" : "#0B0A08";
  const fill = night ? `url(#${id}-paper)` : "#FFFEFB";
  // day: drop-shadow(6px 10px 16px rgba(54,42,28,.28)); night: 6px 10px 18px rgba(0,0,0,.6)
  const shadowSigma = night ? 9 : 8;
  const shadowColor = night ? "#000000" : "#362A1C";
  const shadowAlpha = night ? 0.6 : 0.28;

  return (
    <View pointerEvents="none" style={[styles.wrap, { left: -BLEED, top: -BLEED, width: W + 2 * BLEED, height: H + 2 * BLEED }]}>
      <Svg width={W + 2 * BLEED} height={H + 2 * BLEED} viewBox={`${-BLEED} ${-BLEED} ${W + 2 * BLEED} ${H + 2 * BLEED}`}>
        <Defs>
          <ClipPath id={`${id}-clip`}>
            <Path d={`${dRect} ${dTop} ${dBot} ${dLeft} ${dRight}`} />
          </ClipPath>
          <Filter
            id={`${id}-shadow`}
            x={-BLEED}
            y={-BLEED}
            width={W + 2 * BLEED}
            height={H + 2 * BLEED}
            filterUnits="userSpaceOnUse"
          >
            <FeDropShadow dx={6} dy={10} stdDeviation={shadowSigma} floodColor={shadowColor} floodOpacity={shadowAlpha} />
          </Filter>
          {night ? (
            <LinearGradient id={`${id}-paper`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#1D2537" />
              <Stop offset="1" stopColor="#161D2C" />
            </LinearGradient>
          ) : null}
        </Defs>
        {/* the stock, with its cast shadow: five shapes, one silhouette */}
        <G filter={shadow ? `url(#${id}-shadow)` : undefined}>
          <Path d={dRect} {...fillProps(fill)} />
          <Path d={dTop} {...fillProps(fill)} />
          <Path d={dBot} {...fillProps(fill)} />
          <Path d={dLeft} {...fillProps(fill)} />
          <Path d={dRight} {...fillProps(fill)} />
        </G>
        {/* the tear's ink — the outer half of each stroke falls outside the mask */}
        <G clipPath={`url(#${id}-clip)`} fill="none" {...strokeProps(ink)} strokeWidth={4}>
          <Path d={lTop} />
          <Path d={lBot} />
          <Path d={lLeft} />
          <Path d={lRight} />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute" },
});
