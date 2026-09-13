// Hairlines. The portal rules everything with dashes, never solid boxes — on
// white paper the chrome is type, dashed rules and discs.
//
// Drawn in SVG rather than with borderStyle: Android's dashed borders are
// unreliable, and a dotted border at 1px frequently renders as solid. The
// dash pattern is Chrome's own for a 1px dashed border: 3px dashes, and the
// gap stretched from 2px so the rule starts AND ends on a dash — Chrome fits
// n = round((L + 2) / 5) dashes into a length L and shares the remainder out
// between them, so a 350px rule runs at a 5.03px period, not 5. Measured
// against the site (the sheet's rules drift a whole dash by the far end
// otherwise), and reproduced here from the rule's own laid-out width.
//
// PIXEL-SNAPPED, like a border. A CSS border is painted on whole device
// pixels — Chrome rounds the box edge — whereas an anti-aliased 1px stroke
// at a fractional y paints as two half-alpha rows. `shape-rendering:
// crispEdges` turns the AA off so the rule lands on one row, the way the
// site's border-top does (measured on /library's wing rules). The prop is
// web-only and falls through untyped; the native rasteriser ignores it.

import { useState, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Line } from "react-native-svg";

import { useTheme } from "../theme/ThemeProvider";

export type RuleKind = "dashed" | "dotted" | "solid" | "brick";

/** shape-rendering, which react-native-svg's types do not carry. */
const CRISP = { shapeRendering: "crispEdges" } as object;

/**
 * A rule. `dashed` is the row kit's `1px dashed rgba(110,86,58,.36)`
 * (.rr-ap-rows, .rr-ap-group-h i, .rr-ap-add, .rr-ap-side-foot); `brick` is
 * the notice's `1px dashed rgba(126,45,31,.42)` (.rr-ap-note). Pass `color`
 * to override either. Horizontal by default; `axis="vertical"` is a
 * `border-left` — sized by its parent (`top`+`bottom` when absolute, or a
 * `height` in `style`) — the orders timeline's `.rr-od-post::before` — with the same dash fit run down the length.
 * `style` may position it absolutely (a `border-top` folded into a box's
 * padding, as the Ask AI page does).
 */
export function Rule({
  kind = "dashed",
  color,
  thickness = 1,
  axis = "horizontal",
  style,
}: {
  kind?: RuleKind;
  color?: string;
  thickness?: number;
  axis?: "horizontal" | "vertical";
  style?: StyleProp<ViewStyle>;
}) {
  const { line, colors } = useTheme();
  const stroke =
    color ??
    (kind === "dotted"
      ? line.dotted
      : kind === "brick"
        ? line.numeral
        : kind === "solid"
          ? colors.ink
          : line.dashed);
  const [len, setLen] = useState(0);
  const dash =
    // Chrome paints a 1px dotted border one pixel on, one off (measured on the
    // contents drawer's leader: dots at x=210,212,214…) — a dot's width for
    // the dot and the same for the gap, at any thickness
    kind === "solid" ? undefined : kind === "dotted" ? `${thickness} ${thickness}` : chromeDashes(len, thickness);
  const vertical = axis === "vertical";

  return (
    <View
      style={[vertical ? { width: thickness } : { height: thickness, width: "100%" }, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        const n = vertical ? height : width;
        setLen((prev) => (prev === n ? prev : n));
      }}
    >
      {vertical ? (
        len > 0 ? (
          <Svg width={thickness} height={len}>
            <Line
              x1={thickness / 2}
              y1={0}
              x2={thickness / 2}
              y2={len}
              stroke={stroke}
              strokeWidth={thickness}
              strokeDasharray={dash}
              {...CRISP}
            />
          </Svg>
        ) : null
      ) : (
        <Svg width="100%" height={thickness}>
          <Line
            x1="0"
            y1={thickness / 2}
            x2="100%"
            y2={thickness / 2}
            stroke={stroke}
            strokeWidth={thickness}
            strokeDasharray={dash}
            {...CRISP}
          />
        </Svg>
      )}
    </View>
  );
}

/**
 * Chrome's dashed-border fit for a straight run: 3w dashes, gaps stretched
 * from 2w so the run starts AND ends on a dash. Exported for a dashed stroke
 * the kit does not draw itself (a timeline spine, a custom outline); a
 * closed outline wants DashedBox's perimeter fit instead.
 */
export function chromeDashes(length: number, w = 1): string {
  const dash = 3 * w;
  if (length < dash * 2 + 2 * w) return `${dash} ${2 * w}`;
  const n = Math.max(2, Math.round((length + 2 * w) / (dash + 2 * w)));
  const gap = (length - dash * n) / (n - 1);
  return `${dash} ${Math.round(gap * 1000) / 1000}`;
}

/**
 * A label with its rule running off to the right — `.rr-ap-group-h`: the
 * brass label, a dashed hairline filling the line, and an optional link at
 * the far end. The children are the label (and the link, if any) already
 * voiced; this only arranges them.
 */
export function RuledLabel({
  children,
  trailing,
  gap = 11,
  kind = "dashed",
  style,
}: {
  children: ReactNode;
  trailing?: ReactNode;
  gap?: number;
  kind?: RuleKind;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap }, style]}>
      {children}
      <Rule kind={kind} style={{ flex: 1, width: undefined }} />
      {trailing}
    </View>
  );
}
