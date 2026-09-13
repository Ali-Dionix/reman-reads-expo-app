// The Ask AI page's own small marks — the pieces the kit does not carry.
// (DashedBox and hairline() were lifted into src/ui/DashedBox.tsx.)
//
//   Ruled       the ruled-paper background of a reply slip and a specimen page:
//               `repeating-linear-gradient(0deg, transparent 0 Npx, line Npx
//               (N+1)px)`. 0deg runs bottom-to-top, so the lines are counted
//               up from the BOTTOM of the padding box, which is why this
//               measures itself before it draws.
//   DottedLine  `border-bottom: 2px dotted` under a hard word — 2px squares,
//               2px apart, Chrome's dotted cut at that width.
//
// Both are absolutely positioned inside the box they decorate and take no
// touches. A second paper object with a ruled ground lifts Ruled into the kit.

import { StyleSheet, View } from "react-native";
import Svg, { Line } from "react-native-svg";

import { useBox } from "../../ui/DashedBox";
import { strokeProps } from "../../ui/svgPaint";

/**
 * Ruled paper: a 1px line every `period` px, counted from the bottom of the
 * box this sits in (the CSS gradient's 0deg direction). The first line's top
 * edge is `period` px above the bottom.
 */
export function Ruled({ period, color }: { period: number; color: string }) {
  const [box, onLayout] = useBox();
  const lines: number[] = [];
  for (let top = box.h - period; top >= 0; top -= period) lines.push(top);
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]} onLayout={onLayout}>
      {lines.map((top) => (
        <View key={top} style={{ position: "absolute", left: 0, right: 0, top, height: 1, backgroundColor: color }} />
      ))}
    </View>
  );
}

/** `border-bottom: 2px dotted <color>` (or solid, when the word is lit). */
export function DottedLine({ color, solid = false }: { color: string; solid?: boolean }) {
  const [box, onLayout] = useBox();
  return (
    <View
      style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, pointerEvents: "none" }}
      onLayout={onLayout}
    >
      {box.w > 0 ? (
        <Svg width={box.w} height={2} viewBox={`0 0 ${box.w} 2`}>
          <Line x1={0} y1={1} x2={box.w} y2={1} {...strokeProps(color)} strokeWidth={2} strokeDasharray={solid ? undefined : "2 2"} />
        </Svg>
      ) : null}
    </View>
  );
}
