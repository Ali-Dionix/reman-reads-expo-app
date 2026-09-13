// The Reading Desk's two bands — `.rr-lr-rail` and `.rr-lr-deck`.
//
// "One running head torn along its lower edge, one console torn along its
// upper edge, and the only two coloured surfaces on screen are those bands —
// everything else is the field and the book."
//
// Two-sheet construction, the portal top bar's: a bright underlayer peeking
// ~4px past the deckle, the stock face over it. The head tears DOWN, the
// console tears UP (the web flips its pseudo layers with scaleY; here the tile
// is drawn mirrored, which is the same picture without the stacking-context
// argument).
//
// THE TWO SHEETS ARE NOT IN PHASE. `.rr-lr-rail-paper::before` masks its tile
// at `-53px 100%` while `::after` masks at `0 100%`, so the underlayer's teeth
// fall between the face's and the deckle reads as two staggered tears — the
// ragged doubled edge every golden shows — not one zigzag with an echo. The
// under hem is therefore tiled 53px to the left, with one tile more so the
// gap that opens at the left edge is covered.
//
// The bands are WHITE by day — `::after` is flat NOISE over #FFFFFF, `::before`
// #FFFEFC — a full step off the field so the tear reads as paper on board.
// (No cream: the standing rule, and the golden measures #FDFEFD at the face.)
// At night they are the navy stock the shipped design hand-set (#1D2537
// under, #151D2D→#0F1524 face, lit from above in both bands — the web
// authors the console's gradient reversed because it then flips the layer).
//
// The deckle itself is not a tonal step in the web: white paper on a white
// field. What draws it is the paper's DROP SHADOW — the filter sits on the
// container, so it shadows the UNION of both sheets — which is why the hems
// below are drawn twice, once in each sheet's phase: the hard cast
// (`0 1.4px .5px rgba(24,12,4,.5)`), the soft brown (`0 3px 2px
// rgba(102,52,20,.26)`, drawn once at .18 — a blur is a fade, not a second
// outline), and the wash (`0 14px 22px rgba(43,30,16,.14)`), which is what
// darkens the head of the leaf under the rail on the golden. A Gaussian of a
// straight edge is a fade, so it is drawn as one.
//
// THE TEAR HANGS OVER THE STAGE. `.rr-lr-rail-paper::after` is the rail's
// box with `bottom:-14px` and its tile masked into the last 17px, so the
// teeth run from 3px inside the rail to 14px past it, over whatever stands
// below (the underlayer, `bottom:-18px`, to 18px). They take no layout: the
// stage begins where the rail's box ends, and the book's top corners sit
// under the deckle — exactly as the golden shows them. The console's is the
// same figure mirrored, `top:-14px` / `top:-18px`.

import type { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactElement } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useTheme } from "../../theme/ThemeProvider";

/** HTEAR — the navbar's 360×17 tear tile. The path IS the paper. Shared
 *  with the sheets (console/Sheet.tsx, voice/SheetPaper.tsx): one copy. */
export const TEAR =
  "M0 0H360V4L349 9 341 6 332 13 320 8 309 15 301 7 291 11 282 5 271 14 262 9 251 12 " +
  "240 6 229 16 219 8 209 11 198 5 188 13 178 7 167 10 158 15 147 6 137 12 127 8 116 14 " +
  "106 5 96 10 86 16 76 7 66 12 55 6 45 13 35 9 24 15 14 6 6 11 0 4Z";
export const TILE_W = 360;
export const TILE_H = 17;
/** JAGH — the same teeth as a polyline, for a stroke along the torn edge. */
export const JAG =
  "M0 4L6 11 14 6 24 15 35 9 45 13 55 6 66 12 76 7 86 16 96 10 106 5 116 14 127 8 137 12 " +
  "147 6 158 15 167 10 178 7 188 13 198 5 209 11 219 8 229 16 240 6 251 12 262 9 271 14 " +
  "282 5 291 11 301 7 309 15 320 8 332 13 341 6 349 9 360 4";
/** `mask-position:-53px 100%` — the underlayer's phase. */
const UNDER_PHASE = -53;

/** One torn hem, tiled across `width`. `up` mirrors the tile vertically;
 *  `offsetX` is the tile's mask-position (negative shifts it left, and one
 *  extra tile covers the gap that opens at the left edge). */
function Hem({
  width,
  color,
  up,
  offsetX = 0,
  style,
}: {
  width: number;
  color: string;
  up?: boolean;
  offsetX?: number;
  style?: object;
}) {
  const repeats = Math.max(1, Math.ceil(width / TILE_W)) + (offsetX < 0 ? 1 : 0);
  const total = repeats * TILE_W;

  return (
    <View style={[styles.hem, style]}>
      <Svg width={total} height={TILE_H} viewBox={`0 0 ${total} ${TILE_H}`}>
        {Array.from({ length: repeats }, (_, i) => (
          <Path
            key={i}
            d={TEAR}
            fill={color}
            // ONE transform attribute string, not a translateX prop: on web
            // react-native-svg passes an unknown `translateX` straight to the
            // DOM (React warns on every render), so the tile offset and the
            // in-place mirror (flip about the tile's own centre line) are one
            // SVG transform.
            transform={
              up
                ? `translate(${i * TILE_W + offsetX} ${TILE_H}) scale(1 -1)`
                : `translate(${i * TILE_W + offsetX} 0)`
            }
          />
        ))}
      </Svg>
    </View>
  );
}

export function TornBand({
  edge,
  children,
  style,
}: {
  /** Which edge the tear runs along. */
  edge: "bottom" | "top";
  children?: ReactNode;
  style?: object;
}) {
  const { mode } = useTheme();
  const { width } = useWindowDimensions();
  const night = mode === "dark";

  // ::before is the bright underlayer, ::after the stock face. By day both
  // are flat white (the face's noise is a texture, not a tone); at night the
  // face is a GRADIENT, top-lit in both bands however each one is torn.
  const under = night ? "#1D2537" : "#FFFEFC";
  const faceTop = night ? "#151D2D" : "#FFFFFF";
  const faceBot = night ? "#0F1524" : "#FFFFFF";
  // the first of the paper's drop-shadows: 0 ±1.4px .5px (night: a gilt rim)
  const cast = night ? "rgba(224,183,112,.24)" : "rgba(24,12,4,.5)";

  const tearsDown = edge === "bottom";
  // the deckle is cut from whichever end of the face's gradient it sits at
  const hemFace = tearsDown ? faceBot : faceTop;
  const dir = tearsDown ? 1 : -1;

  // the soft wash — a straight edge's Gaussian, read off the golden: ~.11 at
  // the underlayer's deckle, gone 34px on (night: 0 10px 20px rgba(0,0,0,.55))
  const wash: readonly [string, string, string, string] = night
    ? ["rgba(0,0,0,.32)", "rgba(0,0,0,.14)", "rgba(0,0,0,.04)", "rgba(0,0,0,0)"]
    : ["rgba(43,30,16,.11)", "rgba(43,30,16,.05)", "rgba(43,30,16,.015)", "rgba(43,30,16,0)"];
  const washUp: readonly [string, string, string, string] = [wash[3], wash[2], wash[1], wash[0]];

  /** A shadow of the UNION of the two sheets: the face's silhouette and,
   *  4px further out and 53px out of phase, the underlayer's. */
  const shadowPair = (color: string, at: number) => (
    <>
      <Hem
        width={width}
        color={color}
        up={!tearsDown}
        offsetX={UNDER_PHASE}
        style={[styles.under, { top: dir * (at + 4) }]}
      />
      <Hem width={width} color={color} up={!tearsDown} style={[styles.under, { top: dir * at }]} />
    </>
  );

  const hems: ReactElement = (
    <View
      style={[
        styles.hems,
        // the face tile's solid part stops 3px short of the box's edge, so
        // the tile itself begins 3px inside it
        tearsDown ? { top: "100%", marginTop: -3 } : { bottom: "100%", marginBottom: -3 },
      ]}
    >
      <LinearGradient
        colors={tearsDown ? wash : washUp}
        locations={tearsDown ? [0, 0.35, 0.7, 1] : [0, 0.3, 0.65, 1]}
        style={[styles.under, { height: 34, top: tearsDown ? 18 : -34 }]}
      />
      {/* the second drop-shadow, 0 3px 2px rgba(102,52,20,.26): a 2px blur
          under a 1px line is a soft darkening, drawn once at .18 3px on —
          day only (the night rail casts a gilt rim and the wash, nothing
          between) */}
      {night ? null : shadowPair("rgba(102,52,20,.18)", 3)}
      {/* the cast shadow, a hair past each sheet's own deckle */}
      {shadowPair(cast, night ? 1 : 1.4)}
      {/* the underlayer peeks ~4px further OUT than the face — below a head
          that tears down, above a console that tears up — and out of phase */}
      <Hem
        width={width}
        color={under}
        up={!tearsDown}
        offsetX={UNDER_PHASE}
        style={[styles.under, { top: dir * 4 }]}
      />
      <Hem width={width} color={hemFace} up={!tearsDown} />
    </View>
  );

  return (
    <View style={[styles.band, style]}>
      <LinearGradient colors={[faceTop, faceBot]}>{children}</LinearGradient>
      {hems}
    </View>
  );
}

const styles = StyleSheet.create({
  // the band is above the stage in paint order, so its overhang lands on the
  // book rather than under it (.rr-lr-rail{z-index:3})
  band: { zIndex: 3 },
  // 17px: the face tile's own height, the box every hem is placed against
  hems: { position: "absolute", left: 0, right: 0, height: TILE_H, pointerEvents: "none" },
  hem: { height: TILE_H, width: "100%", overflow: "hidden", pointerEvents: "none" },
  under: { position: "absolute", left: 0, right: 0 },
});
