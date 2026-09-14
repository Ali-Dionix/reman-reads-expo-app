// The deckle — a torn paper edge, drawn.
//
// The site cuts these with CSS masks: two SVG tiles (HTEAR 360×17 along a
// sheet's bottom edge, HTEAR_TOP its mirror along a top edge, VTEAR 16×120
// down a side) laid over a solid gradient, in two stacked pseudo-layers, with
// `filter: drop-shadow` drawing an ink line along the union's silhouette.
// React Native has NO CSS mask and no pseudo-elements, so the same picture is
// built the other way round: each layer's silhouette is computed as a filled
// SVG polygon from the tile's own point list, and the drop-shadow line is the
// same polygon shifted 3px and filled with ink underneath. The point list is
// paperMarks.ts's HTEAR verbatim; HTEAR_TOP is its mirror (17 − y), which is
// how the site's two tiles relate too.
//
// <TornSheet> is the whole two-layer paper for a bar or sheet with an edge to
// the viewport: the portal top bar (.rr-ap-top-paper), the public nav
// (.rr-nav5-paper), the tab bar (.rr-ap-nav-paper) and the + sheet
// (.rr-ap-sheet-paper). Their geometry is the CSS's, worked out layer by layer
// in the comment over each branch below, so the black line and the white
// teeth land on the same pixels as the web's.
//
// What is NOT drawn: the fractal-noise paper grain (NOISE) — feTurbulence is
// unimplemented in react-native-svg's native filters — and the second
// drop-shadow's Gaussian haze, which is approximated by a fan of translucent
// copies rather than a real blur. Both are under pixelmatch's threshold.

import { memo, useMemo } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { svgPaint } from "./svgPaint";

/* ------------------------------------------------------------ the tiles --- */

/** HTEAR — the 360×17 tile's torn profile, x descending. The tile is filled
 *  from y=0 to this line; y runs 4..16, and both ends sit at 4 so it repeats.
 *  HTEAR_TOP / TEAR_TOP (the rising tile) is its mirror, 17 − y. */
export const TEETH: readonly (readonly [number, number])[] = [
  [360, 4], [349, 9], [341, 6], [332, 13], [320, 8], [309, 15], [301, 7], [291, 11],
  [282, 5], [271, 14], [262, 9], [251, 12], [240, 6], [229, 16], [219, 8], [209, 11],
  [198, 5], [188, 13], [178, 7], [167, 10], [158, 15], [147, 6], [137, 12], [127, 8],
  [116, 14], [106, 5], [96, 10], [86, 16], [76, 7], [66, 12], [55, 6], [45, 13],
  [35, 9], [24, 15], [14, 6], [6, 11], [0, 4],
];
export const TILE_W = 360;
export const TILE_H = 17;

/** VTEAR — a 16×120 vertical deckle. */
const TEAR_V = "M0 0H12L4 12 15 24 6 36 13 48 3 60 14 72 7 84 13 96 5 108 12 120H0Z";
const V_W = 16;
const V_H = 120;

/**
 * One sheet silhouette. `solidY` is the sheet's far edge (its top for a sheet
 * torn along the bottom, its bottom for one torn along the top); `tileTop` is
 * where the 17px tile's box begins; `offset` is the tile's x phase (the CSS
 * mask-position's -53px or 0); `mirror` uses the HTEAR_TOP profile.
 *
 * Exported for a torn strip whose offsets are not a bar's — /login's foot
 * (the footer's paper cut short: ::before top −20 phase −53, ::after top −16
 * phase 0, a 1.5px line) draws its two sheets and its line from this with
 * its own numbers, as the footer proper will.
 */
export function sheetPath(
  width: number,
  solidY: number,
  tileTop: number,
  offset: number,
  mirror: boolean,
): string {
  const kMin = Math.floor((0 - offset) / TILE_W) - 1;
  const kMax = Math.ceil((width - offset) / TILE_W);
  const pts: string[] = [];
  for (let k = kMax; k >= kMin; k--) {
    for (const [px, py] of TEETH) {
      const x = offset + k * TILE_W + px;
      const y = tileTop + (mirror ? TILE_H - py : py);
      pts.push(`${x} ${y}`);
    }
  }
  const xR = offset + (kMax + 1) * TILE_W;
  const xL = offset + kMin * TILE_W;
  return `M${xR} ${solidY} L${pts.join(" L")} L${xL} ${solidY} Z`;
}

/* ------------------------------------------------------------ the sheet --- */

/** How far the drawing hangs past the box on the torn side. */
export const TORN_BLEED = { bottom: 32, top: 30 } as const;

/** The haze fan: offsets and opacities standing in for a Gaussian drop-shadow. */
const HAZE_BAR = [4, 5.2, 6.4, 7.6, 8.8, 10] as const;
const HAZE_SHEET = [5, 8, 11, 14, 17, 20] as const;

/**
 * DRAWN ONCE PER SHAPE. A sheet is sixteen polygons of a hundred-odd points
 * each, and it sits on every screen's top bar and under the tab bar — so it
 * used to be rebuilt, and re-parsed by react-native-svg, on every render of
 * either: twice a second on Home while a recording plays (the deck's tick),
 * and on every tab change. The geometry depends on nothing but the edge, the
 * width, the height and the fan, so it is computed under `useMemo` on those
 * four; and the component is `memo`, so a parent's render with the same
 * props does not reach it at all. The colours are plain props — a theme
 * change re-renders, with the same strings.
 */
export const TornSheet = memo(function TornSheet({
  edge,
  width,
  height,
  paper,
  line,
  haze,
  hazeSpread = "bar",
  wash,
  style,
}: {
  /** Which edge is torn: "bottom" hangs from above (HTEAR), "top" rises from below (HTEAR_TOP). */
  edge: "bottom" | "top";
  width: number;
  /** The element's own box — the bar's height including any safe-area padding. */
  height: number;
  /** Both layers' colour: `white` by day. */
  paper: string;
  /** The ink line drawn along the tear: drop-shadow(0 ±3px 0 <line>). */
  line: string;
  /** The soft second shadow, with its own alpha. */
  haze: string;
  /** "bar" is the bars' 3px blur; "sheet" the + sheet's 16px. */
  hazeSpread?: "bar" | "sheet";
  /** The 5% ink wash along the torn edge of the face layer — set on the bars,
   *  absent on the + sheet. Pass the rgba (CHROME.tearWash). */
  wash?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const hang = edge === "bottom";
  const bleed = hang ? TORN_BLEED.bottom : TORN_BLEED.top;
  const svgH = height + bleed;
  // For a rising sheet the svg starts `bleed` above the box: y' = y + bleed.
  const o = hang ? 0 : bleed;
  const H = height;
  const fan = hazeSpread === "bar" ? HAZE_BAR : HAZE_SHEET;
  const washId = `wash-${edge}-${Math.round(height)}`;
  // opaque paints + alpha on the opacity props — see svgPaint.ts for why
  const hz = svgPaint(haze);
  const wp = svgPaint(wash);

  /* --- hanging sheet (.rr-ap-top-paper / .rr-nav5-paper), box 0..H:
       ::before  top:0 bottom:-20px  → solid to H+4, tile at H+3 (x −53)
       ::after   top:0 bottom:-16px  → solid to H,   tile at H−1 (x 0)
       shadow    ::before + 3px      → tile at H+6
       wash      transparent at H−10 → 5% ink at H+16                    --- */
  /* --- rising sheet (.rr-ap-nav-paper / .rr-ap-sheet-paper), box 0..H:
       ::before  inset:-17px 0 0     → solid from −4, tile at −17 (x −53)
       ::after   top:4px             → solid from 0,  tile at −13 (x 0)
       shadow    ::before − 3px      → tile at −20
       wash      5% ink at −13 → transparent at +13                     --- */
  // THE SHADOW IS OF THE UNION. The filter sits on the container, so the ink
  // line follows the outline of ::before ∪ ::after — where the face layer's
  // tooth (phase 0) reaches past the underlayer's (phase −53), the line
  // follows the face. Each layer is shifted and drawn; the union takes care
  // of itself. Same for the haze.
  const { hazePaths, linePath, beforePath, afterPath } = useMemo(() => {
    const beforeAt = (d: number) =>
      hang
        ? sheetPath(width, 0, H + 3 + d, -53, false)
        : sheetPath(width, svgH, o - 17 - d, -53, true);
    const afterAt = (d: number) =>
      hang
        ? sheetPath(width, 0, H - 1 + d, 0, false)
        : sheetPath(width, svgH, o - 13 - d, 0, true);
    return {
      hazePaths: fan.map((d) => `${beforeAt(d)} ${afterAt(d)}`),
      linePath: `${beforeAt(3)} ${afterAt(3)}`,
      beforePath: beforeAt(0),
      afterPath: afterAt(0),
    };
  }, [hang, width, H, svgH, o, fan]);
  const washY: [number, number] = hang ? [H - 10, H + 16] : [o - 13, o + 13];

  return (
    <View
      style={[
        {
          pointerEvents: "none",
          position: "absolute",
          left: 0,
          right: 0,
          top: hang ? 0 : -bleed,
          height: svgH,
        },
        style,
      ]}
    >
      <Svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`}>
        {wash ? (
          <Defs>
            <LinearGradient
              id={washId}
              gradientUnits="userSpaceOnUse"
              x1={0}
              y1={washY[0]}
              x2={0}
              y2={washY[1]}
            >
              <Stop offset={0} stopColor={wp.color} stopOpacity={hang ? 0 : wp.alpha} />
              <Stop offset={1} stopColor={wp.color} stopOpacity={hang ? wp.alpha : 0} />
            </LinearGradient>
          </Defs>
        ) : null}
        {/* the haze — drawn first, farthest out */}
        {hazePaths.map((d, i) => (
          <Path
            key={i}
            d={d}
            fill={hz.color}
            fillOpacity={hz.alpha * (0.28 - i * 0.04)}
            fillRule="nonzero"
          />
        ))}
        {/* the ink line: the union silhouette, 3px over */}
        <Path d={linePath} fill={line} fillRule="nonzero" />
        {/* ::before — the bright underlayer peeking past the deckle */}
        <Path d={beforePath} fill={paper} />
        {/* ::after — the face */}
        <Path d={afterPath} fill={paper} />
        {wash ? <Path d={afterPath} fill={`url(#${washId})`} /> : null}
      </Svg>
    </View>
  );
});

/* ------------------------------------------------- the older two figures --- */

/** VTEAR down a side — kept for the pages that still draw a sidebar edge. */
export function TornEdge({
  length,
  color,
  side = "right",
  style,
}: {
  /** How far the tear must run, in px. Rounded up to whole 120px tiles. */
  length: number;
  /** The paper's colour — the tear is the sheet's own ragged edge. */
  color: string;
  side?: "left" | "right";
  style?: StyleProp<ViewStyle>;
}) {
  const repeats = Math.max(1, Math.ceil(length / V_H));
  const height = repeats * V_H;

  return (
    <View
      style={[
        { pointerEvents: "none", position: "absolute", top: 0, width: V_W, height, [side]: 0 },
        side === "left" ? { transform: [{ scaleX: -1 }] } : null,
        style,
      ]}
    >
      <Svg width={V_W} height={height} viewBox={`0 0 ${V_W} ${height}`}>
        {Array.from({ length: repeats }, (_, i) => (
          <Path key={i} d={TEAR_V} fill={color} transform={[{ translateY: i * V_H }]} />
        ))}
      </Svg>
    </View>
  );
}

/**
 * A single-colour torn hem, in flow — the HTEAR tile tiled across `width`,
 * filled with the sheet's colour. The older figure; <TornSheet> is what the
 * shell draws now. Kept because /sign-in's bottom strip still uses it.
 */
export function TornHem({
  width,
  color,
  style,
}: {
  width: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[{ pointerEvents: "none", height: TILE_H, width: "100%", overflow: "hidden" }, style]}
    >
      <Svg width={width} height={TILE_H} viewBox={`0 0 ${width} ${TILE_H}`}>
        <Path d={sheetPath(width, 0, 0, 0, false)} fill={color} />
      </Svg>
    </View>
  );
}
