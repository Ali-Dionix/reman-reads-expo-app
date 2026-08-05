// `.rr-lg-sky` — the sun, and the moon.
//
// The celestial body in the login hero's top-right corner. It is a
// PHONE-ONLY element on the web too: `.rr-lg-sky{display:none}` at desktop
// width, where the Hermes-at-the-door aside carries its own orb
// (`.rr-lg-art::before`) instead. Below 820px the aside is blanked and this
// takes over — so on a phone it is always the one you see.
//
// Light is a sun: a warm three-stop orb with a broad glow. Dark is a moon: the
// same orb, paler and cooler, with three craters laid over it — a bright rim
// spot at 33%/30% and two shadowed hollows at 66%/32% and 44%/67%.
//
// Both are radial gradients, which React Native has no CSS equivalent for, so
// this is react-native-svg's RadialGradient — the same construction, drawn
// rather than declared. The glow is a shadow on the wrapper, since an SVG
// blur filter is expensive on Android and this is a static bloom.

import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { useInk } from "../theme/ink";

/** loginPage.ts's orb palette, converted from oklch to sRGB. */
const SUN = { a: "#fffbe6", b: "#fdd89e", c: "#cfa168", glow: "#efc37e" } as const;
const MOON = { a: "#f7eddb", b: "#c8b8a2", c: "#837564", glow: "#cfbb9a" } as const;

/** The moon's craters — cx/cy/r as fractions of the orb, per the CSS. */
const CRATERS = [
  { cx: 0.33, cy: 0.3, r: 0.065, fill: "#f8f1e3", o: 0.9 },
  { cx: 0.66, cy: 0.32, r: 0.085, fill: "#787165", o: 0.22 },
  { cx: 0.44, cy: 0.67, r: 0.105, fill: "#7a7369", o: 0.18 },
] as const;

export function Sky() {
  const { clamp, mode } = useInk();

  // width: clamp(66px,19vw,100px); right: clamp(14px,4.6vw,22px)
  const size = clamp(66, 19, 100);
  const right = clamp(14, 4.6, 22);
  const r = size / 2;
  const dark = mode === "dark";
  const p = dark ? MOON : SUN;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.sky,
        {
          top: 24,
          right,
          width: size,
          height: size,
          borderRadius: r,
          shadowColor: p.glow,
          shadowOpacity: dark ? 0.2 : 0.32,
          shadowRadius: dark ? 22 : 26,
          shadowOffset: { width: 0, height: 0 },
          elevation: 0,
        },
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          {/* circle at 38% 34% — the light falls from the upper left */}
          <RadialGradient id="orb" cx="38%" cy="34%" r="72%">
            <Stop offset="0" stopColor={p.a} />
            <Stop offset={dark ? "0.61" : "0.56"} stopColor={p.b} />
            <Stop offset="1" stopColor={p.c} />
          </RadialGradient>
        </Defs>

        <Circle cx={r} cy={r} r={r} fill="url(#orb)" />

        {dark
          ? CRATERS.map((c, i) => (
              <Circle
                key={i}
                cx={c.cx * size}
                cy={c.cy * size}
                r={c.r * size}
                fill={c.fill}
                opacity={c.o}
              />
            ))
          : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  sky: { position: "absolute", zIndex: 0 },
});
