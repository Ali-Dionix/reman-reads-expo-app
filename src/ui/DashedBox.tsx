// `border: <w>px dashed <c>; border-radius: <r>` — drawn in SVG, sized to the
// box it sits in. Android's dashed borders are not to be trusted, and a
// dashed RADIUS is beyond them entirely: the guest stamp, the Ask AI drop
// zone and companion panel, the AI stamps, the settings' locked pill.
//
// Absolutely positioned over its parent's whole box and takes no touches;
// the parent supplies the padding the border would have occupied. The dash
// fit is Chrome's for a closed outline: 3w dashes and gaps stretched from 2w
// so the perimeter divides into whole dashes (a straight run wants
// Rule.tsx's chromeDashes(), which ends on a dash rather than closing).

import { useState } from "react";
import { PixelRatio, StyleSheet, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

/**
 * A CSS border width as Chrome actually lays it out and paints it: snapped
 * DOWN to whole device pixels, never below one. A 1.5px ring is 1px on a
 * DPR-1 screen and floor(1.5×3) = 4 device px = 1.33px on a DPR-3 phone, and
 * its padding box moves with it — so every fractional border width goes
 * through here, for its stroke AND for the padding that stands in for it.
 */
export const hairline = (w: number): number => {
  const dpr = PixelRatio.get() || 1;
  return Math.max(1, Math.floor(w * dpr)) / dpr;
};

type Box = { w: number; h: number };

/** A box's laid-out size, for a mark that draws itself to fit. */
export function useBox(): [Box, (e: { nativeEvent: { layout: { width: number; height: number } } }) => void] {
  const [box, setBox] = useState<Box>({ w: 0, h: 0 });
  const onLayout = (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((b) => (b.w === width && b.h === height ? b : { w: width, h: height }));
  };
  return [box, onLayout];
}

/** Chrome's dashed fit around a closed outline: whole dashes, gaps shared out. */
function perimeterDashes(perimeter: number, w: number): string {
  const dash = 3 * w;
  if (perimeter < dash * 2 + 2 * w) return `${dash} ${2 * w}`;
  const n = Math.max(2, Math.round((perimeter + 2 * w) / (dash + 2 * w)));
  const gap = (perimeter - dash * n) / n;
  return `${dash} ${Math.round(gap * 1000) / 1000}`;
}

/** `border: <width>px dashed <color>; border-radius: <radius>px`. `radius`
 *  999 (a pill) is clamped to the box's own half-height, as CSS clamps it. */
export function DashedBox({ color, width: cssWidth = 1, radius = 0 }: { color: string; width?: number; radius?: number }) {
  const [box, onLayout] = useBox();
  const width = hairline(cssWidth);
  const inset = width / 2;
  const w = box.w - width;
  const h = box.h - width;
  const r = Math.max(0, Math.min(radius, box.h / 2, box.w / 2) - inset);
  const perimeter = 2 * (w + h) - (8 - 2 * Math.PI) * r;
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]} onLayout={onLayout}>
      {box.w > 0 && box.h > 0 ? (
        <Svg width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`}>
          <Rect
            x={inset}
            y={inset}
            width={w}
            height={h}
            rx={r}
            fill="none"
            stroke={color}
            strokeWidth={width}
            strokeDasharray={perimeterDashes(perimeter, width)}
          />
        </Svg>
      ) : null}
    </View>
  );
}
