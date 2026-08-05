// The bottom bar's line glyphs.
//
// Draws the icon parts declared in src/nav/rooms.ts, which are the exact `d`
// attributes from the site's ROOM_ICON table. Stroked in the passed colour,
// never filled — these are drawn lines, not symbols.

import type { ColorValue } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { ICON_VIEWBOX, type IconPart } from "../nav/rooms";

export function RoomIcon({
  parts,
  color,
  size = 24,
}: {
  parts: IconPart[];
  /** ColorValue, not string — react-navigation hands the tab bar an opaque
   *  platform colour, which never survives a String() round-trip. */
  color: ColorValue;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}>
      {parts.map((p, i) => {
        const common = {
          stroke: color,
          strokeWidth: p.width ?? 1.6,
          fill: "none" as const,
          strokeLinecap: "round" as const,
          strokeLinejoin: "round" as const,
        };
        if (p.kind === "path") return <Path key={i} d={p.d} {...common} />;
        if (p.kind === "circle")
          return <Circle key={i} cx={p.cx} cy={p.cy} r={p.r} {...common} />;
        return (
          <Rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={p.rx} {...common} />
        );
      })}
    </Svg>
  );
}
