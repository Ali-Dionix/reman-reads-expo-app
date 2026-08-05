// The deckle — a torn paper edge.
//
// The site draws these with `mask-image` and two SVG tiles (VTEAR 16×120 down
// the sidebar, HTEAR 360×17 along the top bar). React Native has NO CSS mask,
// so the same paths are drawn as FILLED shapes in react-native-svg, in the
// paper's own colour, sitting past the edge of the sheet. The paths are
// byte-identical to portalShared.ts, so the tear reads the same.

import Svg, { Path } from "react-native-svg";
import { View, type StyleProp, type ViewStyle } from "react-native";

/** VTEAR — a 16×120 vertical deckle. */
const TEAR_V = "M0 0H12L4 12 15 24 6 36 13 48 3 60 14 72 7 84 13 96 5 108 12 120H0Z";
const V_W = 16;
const V_H = 120;

/** HTEAR — the navbar's 360×17 horizontal tear. The path IS the paper. */
const TEAR_H =
  "M0 0H360V4L349 9 341 6 332 13 320 8 309 15 301 7 291 11 282 5 271 14 262 9 251 12 " +
  "240 6 229 16 219 8 209 11 198 5 188 13 178 7 167 10 158 15 147 6 137 12 127 8 116 14 " +
  "106 5 96 10 86 16 76 7 66 12 55 6 45 13 35 9 24 15 14 6 6 11 0 4Z";
const H_W = 360;
const H_H = 17;

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
      pointerEvents="none"
      style={[
        { position: "absolute", top: 0, width: V_W, height, [side]: 0 },
        side === "left" ? { transform: [{ scaleX: -1 }] } : null,
        style,
      ]}
    >
      <Svg width={V_W} height={height} viewBox={`0 0 ${V_W} ${height}`}>
        {Array.from({ length: repeats }, (_, i) => (
          <Path key={i} d={TEAR_V} fill={color} translateY={i * V_H} />
        ))}
      </Svg>
    </View>
  );
}

/**
 * The bottom edge of a horizontal band — the portal top bar's torn hem.
 * Sits BELOW the band, in the band's colour, so the sheet appears to end in a
 * ragged line rather than a ruled one.
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
  const repeats = Math.max(1, Math.ceil(width / H_W));
  const total = repeats * H_W;

  return (
    <View
      pointerEvents="none"
      style={[{ height: H_H, width: "100%", overflow: "hidden" }, style]}
    >
      <Svg width={total} height={H_H} viewBox={`0 0 ${total} ${H_H}`}>
        {Array.from({ length: repeats }, (_, i) => (
          <Path key={i} d={TEAR_H} fill={color} translateX={i * H_W} />
        ))}
      </Svg>
    </View>
  );
}
