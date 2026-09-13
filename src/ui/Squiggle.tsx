// The pen-stroke under a word — paperMarks.ts's SQUIGGLE_INK / SQUIGGLE_GOLD,
// the site's one "this is the live one" mark. Under the open tab's label
// (.rr-ap-tab.is-on b::after), under the selected segment (.rr-ap-seg), under
// the Library's shelf tabs.
//
// A 44×5 tile repeated along x (`repeat-x 0 50%/44px 5px`), stroked 1.4 with
// round caps: ink by day, the DARK brass #C9A662 by night — the gold tile is
// a separate data URL on the web because a mask cannot see the token pass, so
// the night colour is stated here the same way.

import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useTheme } from "../theme/ThemeProvider";
import { svgPaint } from "./svgPaint";

const TILE_W = 44;
const TILE_H = 5;
const STROKE = "M1 3.5C7 1.2 12 4.6 17 3.2S26 1.4 31 3.4 40 4.4 43 2.4";

export const SQUIGGLE_COLOR = { light: "#0b0a08", dark: "#c9a662" } as const;

export function Squiggle({
  width,
  color,
  style,
}: {
  /** The box the stroke fills — the label's width. Whole tiles are drawn past it and clipped. */
  width: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { mode } = useTheme();
  const stroke = color ?? SQUIGGLE_COLOR[mode];
  const n = Math.max(1, Math.ceil(width / TILE_W));
  const paint = svgPaint(stroke);

  return (
    <View
      style={[{ pointerEvents: "none", width, height: TILE_H, overflow: "hidden" }, style]}
    >
      <Svg width={n * TILE_W} height={TILE_H} viewBox={`0 0 ${n * TILE_W} ${TILE_H}`}>
        {Array.from({ length: n }, (_, i) => (
          <Path
            key={i}
            d={STROKE}
            fill="none"
            stroke={paint.color}
            strokeOpacity={paint.alpha}
            strokeWidth={1.4}
            strokeLinecap="round"
            transform={`translate(${i * TILE_W} 0)`}
          />
        ))}
      </Svg>
    </View>
  );
}
