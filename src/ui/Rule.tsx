// Hairlines. The portal rules everything with dashes and dots, never solids —
// it is a manuscript, and a solid 1px line is a spreadsheet.
//
// Drawn in SVG rather than with borderStyle for the same reason as Numeral:
// Android's dashed borders are unreliable, and a dotted border with a 1px
// width frequently renders as solid.

import Svg, { Line } from "react-native-svg";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

export function Rule({
  kind = "dashed",
  color,
  style,
}: {
  kind?: "dashed" | "dotted";
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { line } = useTheme();
  const stroke = color ?? (kind === "dotted" ? line.dotted : line.dashed);

  return (
    <View style={[{ height: 1, width: "100%" }, style]}>
      <Svg width="100%" height={1}>
        <Line
          x1="0"
          y1="0.5"
          x2="100%"
          y2="0.5"
          stroke={stroke}
          strokeWidth={1}
          strokeDasharray={kind === "dotted" ? "1 3" : "5 4"}
        />
      </Svg>
    </View>
  );
}

/**
 * A section head with its rule running off to the edge — the sidebar's
 * "CONTENTS ————" figure, which the site uses to open every index.
 */
export function RuledLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[{ flexDirection: "row", alignItems: "center", gap: 12 }, style]}
    >
      {children}
      <Rule style={{ flex: 1 }} />
    </View>
  );
}
