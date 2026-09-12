// `.rr-ap-seg` — segmented tabs, appShell.ts's kit part 3: serif words with
// the pen-stroke under the live one, so "which of these am I looking at" is
// answered the same way everywhere in the portal as it is in the tab bar.
//
//   .rr-ap-seg{display:flex;align-items:baseline;gap:22px;margin:18px 0 0;padding:0 2px 2px;overflow-x:auto}
//   button   600 19px/1.1 Cormorant, ink .45 (ink when selected), padding:4px 0 9px
//   ::after  the squiggle, bottom:2px, 5px tall
//   i        700 10px Manrope superscript count, brass, margin-left 3
//
// THE ROOMS CUT IT THEIR OWN WAY, and the knobs are those cuts:
//   .rr-lr-pill   (listening)  18px, gap 20, 16px above; the label is an
//                 inline-flex with align-items:baseline, so the count's
//                 vertical-align:super has NO effect — the count sits on the
//                 label's baseline, 4px after it: `count="baseline"`.
//   .rr-ly-tab    (library)    is NOT this segment: its own padding (2px 0 0,
//                 no side padding), a centred count that turns brick when lit,
//                 and the pill era's night dim — src/portal/library/Bar.tsx.
//   the kit's own: the button's content is INLINE, so `super` is real —
//                 Chrome raises the count by a third of the font size.

import { useState } from "react";
import { Pressable, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";

import { useInk } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { Squiggle } from "./Squiggle";
import { Txt } from "./Type";

export type Segment = { key: string; label: string; count?: number | string };

export function Seg({
  segments,
  selected,
  onSelect,
  size = 19,
  gap = 22,
  top = 18,
  count = "super",
  countGap,
  dim = 0.45,
  role = "tab",
  accessibilityLabel,
  style,
}: {
  segments: Segment[];
  selected: string;
  onSelect: (key: string) => void;
  /** The word's size — 19 on the kit, 18 on the listening pills. */
  size?: number;
  /** The gap between segments — 22 on the kit, 20 on the rooms' cuts. */
  gap?: number;
  /** The margin above — 18 on the kit. */
  top?: number;
  /** Where the count sits against the word. */
  count?: "super" | "baseline";
  /** The count's gap from the word — 3 (margin-left) for super, 4 on the baseline. */
  countGap?: number;
  /** The unselected word's ink alpha. */
  dim?: number;
  role?: "tab" | "radio";
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const { ink } = useInk();
  const [widths, setWidths] = useState<Record<string, number>>({});
  const cg = countGap ?? (count === "super" ? 3 : 4);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[{ marginTop: top }, style]}
      contentContainerStyle={{
        flexDirection: "row",
        alignItems: "baseline",
        gap,
        paddingHorizontal: 2,
        paddingBottom: 2,
      }}
      accessibilityLabel={accessibilityLabel}
    >
      {segments.map((s) => {
        const on = s.key === selected;
        return (
          <Pressable
            key={s.key}
            onPress={() => onSelect(s.key)}
            accessibilityRole={role}
            accessibilityState={role === "radio" ? { checked: on } : { selected: on }}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              setWidths((prev) => (prev[s.key] === w ? prev : { ...prev, [s.key]: w }));
            }}
            style={{ paddingTop: 4, paddingBottom: 9 }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: count === "baseline" ? "baseline" : "flex-start",
                gap: cg,
              }}
            >
              <Txt
                family="Cormorant Garamond"
                weight={600}
                size={size}
                line={1.1}
                style={{ color: on ? colors.ink : ink(dim) }}
              >
                {s.label}
              </Txt>
              {s.count !== undefined ? (
                <Txt
                  weight={700}
                  size={10}
                  color="brass"
                  // super: Chrome raises the box by a third of the parent's
                  // size from the baseline — the 10px box's top lands 3px
                  // above the word's.
                  style={count === "super" ? { marginTop: -3 } : undefined}
                >
                  {s.count}
                </Txt>
              ) : null}
            </View>
            {on && widths[s.key] ? (
              <Squiggle
                width={widths[s.key]}
                style={{ position: "absolute", left: 0, bottom: 2 }}
              />
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
