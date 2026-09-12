// `.rr-ap-acts` — the action grid, appShell.ts's kit part 4 (appActsHtml).
//
// Four discs to a row on a phone, on bare paper: a 46px hairline ring, a 21px
// glyph, a label under it. Discs and labels say the same thing eight boxes on
// a white page would, without the boxes.
//
// FOUR STATES, as the site draws them:
//   live      full strength, presses.
//   soon      full strength, plus a brass "soon" tick under the label and a
//             DASHED ring — it goes somewhere real (the page that explains
//             the feature), so the reader never taps a dead disc.
//   dim       nowhere at all to go: .45 and unpressable.
//   locked    behind the subscription. NOT dimmed: the disc keeps its full
//             strength and takes a padlock struck on its rim, and it stays
//             tappable — its job when locked is to explain itself.

import { Pressable, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { useInk } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { Disc } from "./Disc";
import { Icon, type IconName } from "./Icon";
import { Txt } from "./Type";

export type Act = {
  label: string;
  icon: IconName;
  onPress?: () => void;
  soon?: boolean;
  locked?: boolean;
  /** The word in the tick slot under a locked label. Fits about four characters. */
  lockWord?: string;
};

/** The padlock struck on a locked disc's rim — --rr-ap-lock, 14px, ink. */
function Lock({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 12 12" style={{ position: "absolute", right: -5, bottom: -3 }}>
      <Rect x={2.4} y={5.3} width={7.2} height={5.1} rx={1.1} fill={color} />
      <Path d="M4.2 5.3V4a1.8 1.8 0 0 1 3.6 0v1.3" stroke={color} strokeWidth={1.3} fill="none" />
    </Svg>
  );
}

/**
 * `columns` is the grid: 4 on the kit's own (`repeat(4,minmax(0,1fr))`), 5 on
 * Home's add band (`.rr-ov-add .rr-ap-acts{grid-template-columns:repeat(5,…)}`
 * — 65.2px cells at 390, exactly). `disc` and `rowGap` are the overrides a
 * room's own class makes (`.rr-pf-support`: 52px discs, gap 16px 6px).
 */
export function Acts({
  acts,
  columns = 4,
  disc = 46,
  rowGap = 18,
  top = 16,
}: {
  acts: Act[];
  columns?: number;
  /** `.rr-ap-act i`'s size — 46, or 52 on Profile's support grid. */
  disc?: number;
  /** The grid's row gap — 18, or 16 on Profile's support grid. */
  rowGap?: number;
  /** `.rr-ap-acts`'s margin-top (16), collapsed with the head above it. */
  top?: number;
}) {
  const { colors } = useTheme();
  const { ink, brass } = useInk();

  return (
    <View
      // grid-template-columns:repeat(4,minmax(0,1fr)); gap:18px 6px — the 6px
      // column gap is half-a-gutter of padding on each cell, pulled back out
      // at the edges, so four cells and three gaps fill the measure exactly.
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        rowGap,
        marginTop: top,
        marginHorizontal: -3,
      }}
    >
      {acts.map((a, i) => {
        const dim = !a.onPress && !a.soon && !a.locked;
        const tick = a.locked ? a.lockWord : a.soon ? "soon" : undefined;
        const cell = (
          <View style={{ alignItems: "center", gap: 8, opacity: dim ? 0.45 : 1 }}>
            <Disc
              size={disc}
              ring={a.soon ? brass(0.5, "border") : ink(0.26, "border")}
              ringWidth={1.5}
              dashed={!!a.soon}
            >
              <Icon name={a.icon} size={21} color={colors.brown} />
              {a.locked ? <Lock color={colors.ink} /> : null}
            </Disc>
            <View style={{ alignItems: "center" }}>
              <Txt
                weight={600}
                size={10.5}
                line={1.25}
                tone={a.locked ? 0.6 : 0.74}
                style={{ textAlign: "center" }}
              >
                {a.label}
              </Txt>
              {tick ? (
                <Txt
                  weight={700}
                  size={7}
                  ls={0.18}
                  upper
                  color={a.locked ? "brown" : "brass"}
                  style={{ marginTop: 3, textAlign: "center" }}
                >
                  {tick}
                </Txt>
              ) : null}
            </View>
          </View>
        );
        const width = `${100 / columns}%` as const;
        return (
          <View key={i} style={{ width, paddingHorizontal: 3 }}>
            {a.onPress && !dim ? (
              <Pressable
                onPress={a.onPress}
                accessibilityRole="button"
                accessibilityLabel={tick ? `${a.label} ${tick}` : a.label}
              >
                {cell}
              </Pressable>
            ) : (
              cell
            )}
          </View>
        );
      })}
    </View>
  );
}
