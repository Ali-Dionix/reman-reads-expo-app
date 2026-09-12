// The Ask AI page's small parts, off accountHermesPage.ts at its phone branch.
//
//   Stamp      `.rr-hm-stamp` — the dashed brick "AI" mark, 6° off true. The
//              slip's smaller cut (`.rr-hm-slip-ai`) is `lit`, because the
//              slip is a paper island and keeps its daylight colours.
//   Pill       `.rr-hm-chip` (white, the quick questions) and `.rr-hm-lang`
//              (transparent, the answer styles); both invert to ink when on.
//   InkButton  `.rr-pt-btn` — the portal's one filled button.
//   H2         `.rr-hm-h2` — Cormorant 500 at clamp(22px,2.6vw,30px): 22 on a
//              phone.
//   StepDisc   `.rr-hm-step` — the bookmark's − and + discs, which the site
//              sets `disabled` at the ends of the book.

import type { ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";

import { useInk } from "../../theme/ink";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../../ui/Button";
import { Disc } from "../../ui/Disc";
import { Txt } from "../../ui/Type";
import { ISLAND } from "./island";
import { DashedBox, hairline } from "../../ui/DashedBox";

/* --------------------------------------------------------------- stamp --- */

/**
 * `.rr-hm-stamp`: 800 8.5px Manrope .24em, 1.5px dashed brick at .55, 4px 8px,
 * −6°. `lit` is `.rr-hm-slip-ai`: 800 7.5px, 1px dashed, 2px 6px, −4°, in the
 * island's own literals.
 */
/** The stamp's baseline, from its top: ring + 4px + Manrope 8.5's ascent (9),
 *  on the pixel grid — the ring is 1.33px on a DPR-3 phone. */
export const STAMP_BASELINE = Math.round(hairline(1.5) + 4 + 9);

export function Stamp({ lit = false, style }: { lit?: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const { brick } = useInk();
  const size = lit ? 7.5 : 8.5;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          // the dashed ring is drawn, not laid out, so its width joins the padding
          paddingVertical: lit ? 2 + 1 : 4 + hairline(1.5),
          paddingHorizontal: lit ? 6 + 1 : 8 + hairline(1.5),
          transform: [{ rotate: lit ? "-4deg" : "-6deg" }],
        },
        style,
      ]}
    >
      <Txt weight={800} size={size} ls={0.24} upper style={{ color: lit ? ISLAND.brick : colors.brick }}>
        AI
      </Txt>
      <DashedBox color={lit ? ISLAND.stampEdge : brick(0.55, "border")} width={lit ? 1 : 1.5} />
    </View>
  );
}

/* ---------------------------------------------------------------- pill --- */

/**
 * `.rr-hm-chip` / `.rr-hm-lang`: min-height 44, 10px 16px, 1px ink at .25,
 * pill, 600 13px Manrope. `paper` is the chip's white ground (the lang chips
 * are transparent); `on` inverts to ink with paper type.
 */
export function Pill({
  label,
  on = false,
  paper = false,
  onPress,
  expanded,
}: {
  label: string;
  on?: boolean;
  paper?: boolean;
  onPress?: () => void;
  /** aria-expanded, for the chip that opens the companion panel. */
  expanded?: boolean;
}) {
  const { colors } = useTheme();
  const { ink } = useInk();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={expanded === undefined ? { selected: on } : { expanded }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingVertical: 10,
        paddingHorizontal: 16,
        justifyContent: "center",
        borderRadius: 999,
        borderWidth: 1,
        borderColor: on ? colors.ink : ink(0.25, "border"),
        backgroundColor: on ? colors.ink : paper ? colors.white : "transparent",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Txt
        weight={600}
        size={13}
        color={on ? "paper" : undefined}
        tone={on ? undefined : paper ? 0.75 : 0.7}
        numberOfLines={1}
      >
        {label}
      </Txt>
    </Pressable>
  );
}

/* -------------------------------------------------------------- button --- */

/** `.rr-pt-btn` on this page — the kit's Button; `.rr-hm-ask .rr-pt-btn:disabled{opacity:.5}`. */
export function InkButton({
  label,
  onPress,
  disabled = false,
  style,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return <Button label={label} onPress={onPress} disabled={disabled} style={style} />;
}

/* ------------------------------------------------------------------ h2 --- */

/** `.rr-hm-h2` — Cormorant 500, clamp(22px,2.6vw,30px): 22 on a phone. */
export function H2({ children }: { children: ReactNode }) {
  const { clamp } = useInk();
  return (
    <Txt family="Cormorant Garamond" weight={500} size={clamp(22, 2.6, 30)}>
      {children}
    </Txt>
  );
}

/**
 * An underlined text link — `.rr-hm-clear`, `.rr-hm-upclear`, `.rr-hm-mode-close`:
 * 600 12px Manrope, underline, 8px of padding. The site sets
 * `text-underline-offset:3px`; RN's textDecorationLine hugs the baseline and
 * cannot be offset, so the rule is a 1px View under the text, its top 3px
 * below the baseline — that is 3px less the face's descent below the text
 * box (Manrope's descent at 12px is 4, so the rule overlaps the box by 1).
 */
export function TextLink({
  label,
  color,
  size = 12,
  onPress,
  minHeight = 44,
}: {
  label: string;
  color: string;
  size?: number;
  onPress?: () => void;
  minHeight?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({ minHeight, padding: 8, justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
    >
      <View style={{ alignSelf: "flex-start" }}>
        <Txt weight={600} size={size} style={{ color }}>
          {label}
        </Txt>
        <View style={{ height: 1, marginTop: 3 - Math.round(0.3 * size), backgroundColor: color }} />
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------ step disc --- */

/**
 * `.rr-hm-step` — a 42px disc, 1.5px ink ring at .7, white, the glyph at 700
 * 18px. At the bookmark's limits the site's button is `disabled`: opacity
 * .26, no action, and announced as disabled — the kit Disc's own cut.
 */
export function StepDisc({
  glyph,
  label,
  disabled,
  onPress,
}: {
  glyph: "−" | "+";
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { ink } = useInk();
  return (
    <Disc
      size={42}
      ring={ink(0.7, "border")}
      ringWidth={1.5}
      fill={colors.white}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
    >
      <Txt weight={700} size={18}>
        {glyph}
      </Txt>
    </Disc>
  );
}
