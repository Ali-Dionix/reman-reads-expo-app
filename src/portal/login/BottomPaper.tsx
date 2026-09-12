// `.rr-lg-bottom-paper` — the torn strip at the foot of /login.
//
// The site footer's paper cut short: two sheets masked with TEAR_TOP (the
// 360×17 rising tile, navOverride.ts) over `linear-gradient(#000,#000)` sized
// `100% calc(100% - 16px)` and bottom-aligned, so each sheet is solid from
// 16px under its own top edge and torn above that. The two sheets differ only
// in where they start and the tile's phase:
//
//   ::before  top:-20px   tile phase −53px   flat paper (#FFFFFF / white's night)
//   ::after   top:-16px   tile phase 0       paper + 35px ruling at 5% ink (+ grain)
//             — at night the footer's sky: a #F7F0DF/#F2E9D3/#F5EDDA gradient
//             (their x- tints after dark) with STARS over it
//   filter    drop-shadow(0 -1.5px 0 ink)   — the drawn cut edge, of the UNION
//             + drop-shadow(0 -3px 3px rgba(0,0,0,.4)) at night only
//
// The strip is `--lg-paper-h` tall (clamp(34px,4.6vh,46px)) and bleeds 20px
// above its box. The kit's <TornSheet edge="top"> is the tab bar's geometry
// (−17/+4, a 3px line) and cannot be asked for these offsets, so the sheets
// are cut here from the kit's own tile — TornEdge's sheetPath() over HTEAR
// mirrored, which IS TEAR_TOP — with this strip's numbers. NOISE
// (feTurbulence) is not drawn.

import { View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";

import { sheetPath } from "../../ui/TornEdge";
import type { LoginPalette } from "./palette";

/** STARS — footerOverride.ts's 280×280 tile, [cx, cy, r, opacity]. */
const STARS: readonly (readonly [number, number, number, number])[] = [
  [24, 33, 1, 0.55], [118, 55, 1.2, 0.7], [205, 68, 1, 0.5], [249, 30, 0.8, 0.45],
  [90, 146, 1.1, 0.6], [192, 150, 0.9, 0.5], [22, 187, 1, 0.55], [129, 196, 1.2, 0.65],
  [233, 205, 1, 0.5], [55, 262, 0.9, 0.45],
];
const STAR_TILE = 280;

/** How far the drawing hangs above the strip's box. */
export const PAPER_BLEED = 20;

/** A sheet torn along its top: the tile at `tileTop`, solid down to `bottom`. */
const risingSheet = (width: number, tileTop: number, bottom: number, phase: number): string =>
  sheetPath(width, bottom, tileTop, phase, true);

export function BottomPaper({
  width,
  height,
  p,
  dark,
}: {
  width: number;
  /** `--lg-paper-h` (+ the home-indicator inset on a phone). */
  height: number;
  p: LoginPalette;
  dark: boolean;
}) {
  const H = height + PAPER_BLEED;
  // svg y = page y − (stripTop − 20): ::before's tile sits at 0, ::after's at 4
  const before = (d: number) => risingSheet(width, 0 - d, H, -53);
  const after = (d: number) => risingSheet(width, 4 - d, H, 0);
  const afterBox = { top: 4, h: H - 4 };
  const stars: { cx: number; cy: number; r: number; o: number }[] = [];
  if (dark) {
    for (let kx = 0; kx * STAR_TILE < width; kx++) {
      for (let ky = 0; ky * STAR_TILE < afterBox.h; ky++) {
        for (const [cx, cy, r, o] of STARS) {
          const y = afterBox.top + ky * STAR_TILE + cy;
          const x = kx * STAR_TILE + cx;
          if (y <= H && x <= width) stars.push({ cx: x, cy: y, r, o });
        }
      }
    }
  }

  return (
    <View
      style={{ pointerEvents: "none", position: "absolute", left: 0, right: 0, bottom: 0, height, zIndex: 0 }}
    >
      <Svg
        width={width}
        height={H}
        viewBox={`0 0 ${width} ${H}`}
        style={{ position: "absolute", left: 0, top: -PAPER_BLEED }}
      >
        <Defs>
          <LinearGradient
            id={`lg-paper-face-${dark ? "n" : "d"}`}
            gradientUnits="userSpaceOnUse"
            x1={0}
            y1={afterBox.top}
            x2={0}
            y2={H}
          >
            <Stop offset={0} stopColor={p.paperFace[0]} />
            <Stop offset={0.58} stopColor={p.paperFace[1]} />
            <Stop offset={1} stopColor={p.paperFace[2]} />
          </LinearGradient>
        </Defs>
        {/* night: drop-shadow(0 -3px 3px rgba(0,0,0,.4)) — a short fan stands in for the blur */}
        {dark
          ? [3, 4.5, 6].map((d, i) => (
              <Path
                key={i}
                d={`${before(d)} ${after(d)}`}
                fill="#000000"
                fillOpacity={0.4 * (0.5 - i * 0.15)}
                fillRule="nonzero"
              />
            ))
          : null}
        {/* the cut edge: the union silhouette, 1.5px up */}
        <Path d={`${before(2)} ${after(2)}`} fill={p.paperLine} fillRule="nonzero" />
        {/* ::before — the back sheet */}
        <Path d={before(0)} fill={p.paperBack} />
        {/* ::after — the face */}
        <Path d={after(0)} fill={`url(#lg-paper-face-${dark ? "n" : "d"})`} />
        {/* the 35px ruling: one line, 34px up from the foot */}
        <Line
          x1={0}
          y1={H - 34.5}
          x2={width}
          y2={H - 34.5}
          stroke={p.paperRule}
          strokeWidth={1}
        />
        {stars.map((s, i) => (
          <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#f2e9d8" fillOpacity={s.o} />
        ))}
      </Svg>
    </View>
  );
}
