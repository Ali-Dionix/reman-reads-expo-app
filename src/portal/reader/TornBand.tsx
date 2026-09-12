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
// The bands are WHITE by day — a full step off the field so the tear reads as
// paper on board, not cream on cream. At night they are the navy stock the
// shipped design hand-set (#1D2537 under, #151D2D→#0F1524 face).
//
// LIT FROM ABOVE, both of them. The web authors the console's gradient
// reversed *because it then flips the layer* (`transform:scaleY(-1)`), so what
// lands on screen is the same in both bands: the light tone at the top, the
// dark tone at the bottom. A flat face loses that, and — worse — leaves the
// head band's deckle at the field's own colour, where it disappears.
//
// The deckle itself is not a tonal step in the web either: `#FFFEFB` paper on
// an `#FFFEFB` field. What draws it is the paper's DROP SHADOW, which is why
// there is a third hem here, a hair's breadth past the underlayer.

import type { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactElement } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useTheme } from "../../theme/ThemeProvider";

/** HTEAR — the navbar's 360×17 tear tile. The path IS the paper. */
const TEAR =
  "M0 0H360V4L349 9 341 6 332 13 320 8 309 15 301 7 291 11 282 5 271 14 262 9 251 12 " +
  "240 6 229 16 219 8 209 11 198 5 188 13 178 7 167 10 158 15 147 6 137 12 127 8 116 14 " +
  "106 5 96 10 86 16 76 7 66 12 55 6 45 13 35 9 24 15 14 6 6 11 0 4Z";
const TILE_W = 360;
const TILE_H = 17;

/** One torn hem, tiled across `width`. `up` mirrors the tile vertically. */
function Hem({
  width,
  color,
  up,
  style,
}: {
  width: number;
  color: string;
  up?: boolean;
  style?: object;
}) {
  const repeats = Math.max(1, Math.ceil(width / TILE_W));
  const total = repeats * TILE_W;

  return (
    <View
      pointerEvents="none"
      style={[{ height: TILE_H, width: "100%", overflow: "hidden" }, style]}
    >
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
                ? `translate(${i * TILE_W} ${TILE_H}) scale(1 -1)`
                : `translate(${i * TILE_W} 0)`
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

  // ::before is the bright underlayer, ::after the stock face — and the face
  // is a GRADIENT, top-lit in both bands however each one is torn.
  const under = night ? "#1D2537" : "#FFFEFC";
  const faceTop = night ? "#151D2D" : "#FFFEFB";
  const faceBot = night ? "#0F1524" : "#FAF7EE";
  // the first of the paper's drop-shadows: 0 ±1.4px .5px
  const cast = night ? "rgba(224,183,112,.24)" : "rgba(24,12,4,.5)";

  const tearsDown = edge === "bottom";
  // the deckle is cut from whichever end of the face's gradient it sits at
  const hemFace = tearsDown ? faceBot : faceTop;

  const hems: ReactElement = (
    <View style={styles.hems}>
      {/* the cast shadow, a hair past the underlayer's own deckle */}
      <Hem
        width={width}
        color={cast}
        up={!tearsDown}
        style={[styles.under, { top: tearsDown ? 5.4 : -5.4 }]}
      />
      {/* the underlayer peeks ~4px further OUT than the face — below a head
          that tears down, above a console that tears up */}
      <Hem
        width={width}
        color={under}
        up={!tearsDown}
        style={[styles.under, { top: tearsDown ? 4 : -4 }]}
      />
      <Hem width={width} color={hemFace} up={!tearsDown} />
    </View>
  );

  return (
    <View style={style}>
      {!tearsDown ? hems : null}
      <LinearGradient colors={[faceTop, faceBot]}>{children}</LinearGradient>
      {tearsDown ? hems : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hems: { position: "relative" },
  under: { position: "absolute", left: 0, right: 0 },
});
