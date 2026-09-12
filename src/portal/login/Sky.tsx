// `.rr-lg-sky` — the sun by day, the moon by night.
//
// A phone-only element on the site too: it is display:none above 820px, where
// the Hermes-at-the-door aside carries its own orb, and painted at
// `top:24px; right:clamp(14px,4.6vw,22px); width:clamp(66px,19vw,100px)` below.
//
//   light  radial-gradient(circle at 38% 34%, a, b 56%, c)
//          box-shadow: 0 0 50px glow/.32, 0 0 15px glow2/.5
//   dark   the same orb in moon stops (…82/…76/…72) under three craters,
//          box-shadow: 0 0 44px …/.2, 0 0 14px …/.28
//
// A CSS `circle` gradient with no size is farthest-corner: its radius is the
// distance from (38%,34%) to the far corner, 0.9055 × the orb — so the stops
// are laid on THAT radius, not on the orb's. The two box-shadows are drawn as
// two larger discs each carrying a radial gradient whose alpha follows the
// Gaussian edge coverage a `blur` of that size produces (σ = blur/2, sampled
// at 0, ½σ, σ, 1½σ, 2σ, 3σ). No platform shadow: iOS and Android disagree
// about blur, and the site's is one exact picture.

import { View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { useInk } from "../../theme/ink";
import { CRATERS, type LoginPalette } from "./palette";

/** Coverage of a Gaussian-blurred edge at d = k·σ outside the edge. */
const EDGE = [
  [0, 0.5],
  [0.5, 0.308],
  [1, 0.159],
  [1.5, 0.067],
  [2, 0.023],
  [3, 0],
] as const;

export function Sky({ p }: { p: LoginPalette }) {
  const { clamp, mode } = useInk();
  const size = clamp(66, 19, 100);
  const right = clamp(14, 4.6, 22);
  const r = size / 2;
  const dark = mode === "dark";
  const reach = Math.max(...p.orbGlow.map(([, blur]) => blur * 1.5));
  const box = size + reach * 2;
  const c = box / 2;

  return (
    <View
      style={{
        pointerEvents: "none",
        position: "absolute",
        top: 24 - reach,
        right: right - reach,
        width: box,
        height: box,
        zIndex: 0,
      }}
    >
      <Svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
        <Defs>
          {p.orbGlow.map(([color, blur, alpha], i) => {
            const sigma = blur / 2;
            const R = r + sigma * 3;
            return (
              <RadialGradient
                key={i}
                id={`lg-sky-glow-${mode}-${i}`}
                gradientUnits="userSpaceOnUse"
                cx={c}
                cy={c}
                r={R}
              >
                {EDGE.map(([k, cov]) => (
                  <Stop
                    key={k}
                    offset={(r + k * sigma) / R}
                    stopColor={color}
                    stopOpacity={alpha * cov}
                  />
                ))}
              </RadialGradient>
            );
          })}
          <RadialGradient
            id={`lg-sky-orb-${mode}`}
            gradientUnits="userSpaceOnUse"
            cx={c - r + 0.38 * size}
            cy={c - r + 0.34 * size}
            r={0.9055 * size}
          >
            <Stop offset={0} stopColor={p.orb[0]} />
            <Stop offset={dark ? 0.61 : 0.56} stopColor={p.orb[1]} />
            <Stop offset={1} stopColor={p.orb[2]} />
          </RadialGradient>
        </Defs>
        {p.orbGlow.map(([, blur], i) => (
          <Circle key={i} cx={c} cy={c} r={r + blur * 1.5} fill={`url(#lg-sky-glow-${mode}-${i})`} />
        ))}
        <Circle cx={c} cy={c} r={r} fill={`url(#lg-sky-orb-${mode})`} />
        {dark
          ? CRATERS.map((k, i) => (
              <Circle
                key={i}
                cx={c - r + k.cx * size}
                cy={c - r + k.cy * size}
                r={k.r * size}
                fill={k.fill}
                fillOpacity={k.alpha}
              />
            ))
          : null}
      </Svg>
    </View>
  );
}
