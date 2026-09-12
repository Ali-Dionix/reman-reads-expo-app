// `.rr-ap-band` / `.rr-ap-band-h` — the section head every room's bands
// share, appShell.ts's kit part 5 (appBandHeadHtml): a serif line, an
// optional supporting line, and an optional link at the right end, sitting
// on the baseline.
//
//   .rr-ap-band{margin:30px 0 0}
//   .rr-ap-band-h{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin:0 0 2px}
//   h2  600 23px/1.08 Cormorant, -.005em, ink
//   p   400 12.5px/1.55 Manrope, ink .58, margin-top 5
//   a   700 9px Manrope .14em uppercase, ink, 1.5px ink underline, padding-bottom 3
//
// THE 2PX UNDER THE HEAD COLLAPSES. On the web `.rr-ap-band-h`'s margin-bottom
// meets the next block's margin-top and the larger wins — the action grid's
// 16px, a group's 28px — so the 2px is never seen under anything the portal
// draws. Yoga adds margins, so the head draws NONE by default and the
// follower states its own; a follower with no top margin of its own passes
// `after={2}` to keep the CSS's floor.

import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../theme/ThemeProvider";
import { Head, Lede, Txt } from "./Type";

export function BandHead({
  title,
  sub,
  link,
  band = true,
  after = 0,
  style,
}: {
  title: string;
  sub?: string;
  link?: { label: string; onPress: () => void };
  /** Wrap in `.rr-ap-band`'s 30px top margin (default). */
  band?: boolean;
  /** The collapsed margin under the head — 0 when the follower carries its
   *  own (Acts, Group), 2 when it does not. */
  after?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 14,
          marginTop: band ? 30 : 0,
          marginBottom: after,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Head>{title}</Head>
        {sub ? <Lede tone={0.58} style={{ marginTop: 5 }}>{sub}</Lede> : null}
      </View>
      {link ? (
        <Pressable onPress={link.onPress} accessibilityRole="link" hitSlop={6}>
          <Txt
            weight={700}
            size={9}
            ls={0.14}
            upper
            numberOfLines={1}
            style={{ paddingBottom: 3, borderBottomWidth: 1.5, borderBottomColor: colors.ink }}
          >
            {link.label}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}
