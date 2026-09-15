// The Listening Room's night field, in one place.
//
// The reader paints it behind the codex. (The theme reveal used to paint a
// second copy inside its disc; since 15 Sep 2026 the reveal works from
// pictures of the screen — src/theme/ThemeStage.tsx — and this is the one
// drawing there is.)
//
// `html[data-rr-theme="dark"] .rr-lr-cx{background:${STARS},linear-gradient(180deg,#0C1220,#070C15)}`

import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";

/** The site-wide STARS tile (280px), the same nineteen points of cream. */
const STAR_DOTS: Array<[number, number, number, number]> = [
  [24, 33, 1, 0.55], [71, 12, 0.7, 0.4], [118, 55, 1.2, 0.7], [163, 21, 0.6, 0.35],
  [205, 68, 1, 0.5], [249, 30, 0.8, 0.45], [37, 109, 0.7, 0.4], [90, 146, 1.1, 0.6],
  [141, 113, 0.6, 0.3], [192, 150, 0.9, 0.5], [240, 118, 0.7, 0.35], [22, 187, 1, 0.55],
  [75, 224, 0.6, 0.3], [129, 196, 1.2, 0.65], [184, 237, 0.8, 0.4], [233, 205, 1, 0.5],
  [262, 262, 0.6, 0.3], [55, 262, 0.9, 0.45],
];

/** The star tile alone, over whatever it is laid on. */
export function Starfield({ id = "rr-stars" }: { id?: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <Pattern id={id} width={280} height={280} patternUnits="userSpaceOnUse">
          {STAR_DOTS.map(([cx, cy, r, o], i) => (
            <Circle key={i} cx={cx} cy={cy} r={r} fill="#f2e9d8" opacity={o} />
          ))}
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** The settling navy with the stars over it — the whole field, ready to lay. */
export function NightField({ id }: { id?: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={["#0C1220", "#070C15"]} style={StyleSheet.absoluteFill} />
      <Starfield id={id} />
    </View>
  );
}
