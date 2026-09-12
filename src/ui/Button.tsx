// `.rr-pt-btn` / `.rr-pt-btn--ghost` — the portal's pill button
// (portalShared.ts), the one press every closing band and empty room ends on.
//
//   .rr-pt-btn        inline-flex, centred, gap 8; padding 14px 24px; ink
//                     ground (#0B0A08) and paper letters (#FAF7EF); 700 11px
//                     Manrope .08em uppercase; 1px ink border; a pill.
//                     :hover lifts 2px and goes inkhover — a phone has no
//                     hover; the pressed state wears inkhover instead.
//   .rr-pt-btn--ghost transparent; ink2 letters; 1px ink .3 ring (.6 pressed)
//
// Colours by scope: the fill is `bg("ink")` and the letters `paper` as TEXT,
// so at night the press is the pale ink on the navy desk, as the site's is.

import type { ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";

import { useInk } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { Txt } from "./Type";

export function Button({
  label,
  ghost = false,
  onPress,
  disabled = false,
  leading,
  accessibilityLabel,
  style,
}: {
  label: string;
  /** `.rr-pt-btn--ghost` */
  ghost?: boolean;
  onPress?: () => void;
  /** `:disabled{opacity:.5}` (the Ask AI page's rule); unpressable. */
  disabled?: boolean;
  /** An 8px-gapped glyph before the label (the class's `gap:8px`). */
  leading?: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { bg, border, colors } = useTheme();
  const { ink } = useInk();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={disabled ? { disabled: true } : undefined}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          opacity: disabled ? 0.5 : 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 14,
          paddingHorizontal: 24,
          borderWidth: 1,
          borderRadius: 999,
        },
        ghost
          ? { backgroundColor: "transparent", borderColor: ink(pressed ? 0.6 : 0.3, "border") }
          : { backgroundColor: pressed ? bg("inkhover") : bg("ink"), borderColor: border("ink") },
        style,
      ]}
    >
      {leading ? <View>{leading}</View> : null}
      <Txt weight={700} size={11} ls={0.08} upper color={ghost ? "ink2" : "paper"}>
        {label}
      </Txt>
    </Pressable>
  );
}
