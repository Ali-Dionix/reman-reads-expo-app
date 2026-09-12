// The two soft washes on /login's phone branch, as SVG radial gradients.
//
//   HeroGlow    `.rr-lg-hero::before` at ≤820px —
//               radial-gradient(circle at 72% 84%, var(--lg-glow), transparent 26%)
//               over the whole hero. A `circle` with no size is farthest-corner,
//               so 26% is 26% of the distance from (72%,84%) to (0,0).
//   WindowGlow  `.rr-lg-mobile-window::before` — inset:4% 13% 2%, an ellipse
//               (border-radius:50%) carrying
//               radial-gradient(circle at 58% 44%, var(--lg-glow), transparent 65%)
//               under filter:blur(8px). The blur is not drawn; the gradient is
//               already transparent well inside the ellipse on every side but
//               the top, where the 8px of softening is a few rows of a 15%
//               wash and under the rig's threshold.

import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from "react-native-svg";

export function HeroGlow({ width, height, color, alpha, id }: { width: number; height: number; color: string; alpha: number; id: string }) {
  const cx = 0.72 * width;
  const cy = 0.84 * height;
  const far = Math.hypot(cx, cy);
  const r = far * 0.26;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ pointerEvents: "none", position: "absolute", left: 0, top: 0 }}
    >
      <Defs>
        <RadialGradient id={id} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={r}>
          <Stop offset={0} stopColor={color} stopOpacity={alpha} />
          <Stop offset={1} stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill={`url(#${id})`} />
    </Svg>
  );
}

export function WindowGlow({ width, height, color, alpha, id }: { width: number; height: number; color: string; alpha: number; id: string }) {
  const x0 = 0.13 * width;
  const y0 = 0.04 * height;
  const w = width - 2 * x0;
  const h = height - y0 - 0.02 * height;
  const cx = x0 + 0.58 * w;
  const cy = y0 + 0.44 * h;
  const far = Math.max(
    Math.hypot(cx - x0, cy - y0),
    Math.hypot(x0 + w - cx, cy - y0),
    Math.hypot(cx - x0, y0 + h - cy),
    Math.hypot(x0 + w - cx, y0 + h - cy),
  );
  const r = far * 0.65;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ pointerEvents: "none", position: "absolute", left: 0, top: 0 }}
    >
      <Defs>
        <RadialGradient id={id} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={r}>
          <Stop offset={0} stopColor={color} stopOpacity={alpha} />
          <Stop offset={1} stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={x0 + w / 2} cy={y0 + h / 2} rx={w / 2} ry={h / 2} fill={`url(#${id})`} />
    </Svg>
  );
}
