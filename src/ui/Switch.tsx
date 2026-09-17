// `.rr-ap-sw` — the switch, appShell.ts's kit part 2 (appSwitchHtml).
//
// The one control in the kit that keeps a real edge: it is a thing a reader
// operates, and with no border there is nothing to press. Off is white inside
// an ink ring with an ink knob; on is ink filled with a cream knob — the same
// inversion the ink CTA makes. 46×26, a 1px ring at ink .45, an 18px knob
// inset 3, travelling 20px.
//
// Not the platform Switch: iOS's is green and 51px wide, Android's is a
// material pill, and neither is the site's. The knob slides on a spring.

import { useEffect, useRef } from "react";
import { Animated, Pressable } from "react-native";

import { useInk } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { haptic } from "./haptics";

export function Switch({
  on,
  onChange,
  label,
  disabled = false,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  /** aria-label — the row's own label, read with the state. */
  label: string;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const { ink } = useInk();
  const x = useRef(new Animated.Value(on ? 20 : 0)).current;

  useEffect(() => {
    Animated.spring(x, { toValue: on ? 20 : 0, useNativeDriver: true, speed: 18, bounciness: 4 }).start();
  }, [on, x]);

  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onChange(!on);
      }}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on, disabled }}
      hitSlop={6}
      style={{
        width: 46,
        height: 26,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: on ? colors.ink : ink(0.45, "border"),
        backgroundColor: on ? colors.ink : colors.white,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          top: 3,
          left: 3,
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: on ? colors.paper : colors.ink,
          transform: [{ translateX: x }],
        }}
      />
    </Pressable>
  );
}
