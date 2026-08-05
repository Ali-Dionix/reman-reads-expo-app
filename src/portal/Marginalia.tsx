// The month's marginalia — `.rr-ov-marg` from accountPage.ts.
//
// A light typed annotation under the room index: four lines, each hung off an
// em dash in brass, and a Caveat scrawl to close. AccountEnhancer rewrites the
// lines through data-rr-ov-mg hooks, so they arrive here as data.

import { StyleSheet, Text, View } from "react-native";

import { useInk, em } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { FONTS } from "../theme/type";

export type MargLine = { key: string; text: string };

export function Marginalia({
  title = "This month, in the margins.",
  lines,
  scrawl = "a slow month is still a month of reading.",
}: {
  title?: string;
  lines: MargLine[];
  scrawl?: string;
}) {
  const { ink, brown } = useInk();
  const { colors } = useTheme();

  return (
    <View style={[styles.marg, { borderTopColor: brown(0.42) }]}>
      <Text style={[styles.kicker, { color: colors.brass }]}>The month’s marginalia</Text>
      <Text style={[styles.h2, { color: colors.ink }]}>{title}</Text>

      {lines.map((l) => (
        <View key={l.key} style={styles.mgline}>
          {/* .rr-ov-mgline::before — content:'—' in brass, hung in the gutter */}
          <Text style={[styles.dash, { color: colors.brass }]}>—</Text>
          <Text style={[styles.mglineText, { color: ink(0.65) }]}>{l.text}</Text>
        </View>
      ))}

      <Text style={[styles.scrawl, { color: colors.brown }]}>{scrawl}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // ≤620px: margin 36px 0 56px
  marg: {
    marginTop: 36,
    marginBottom: 56,
    maxWidth: 640,
    borderTopWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 2,
  },
  kicker: {
    fontFamily: FONTS.sansBold,
    fontSize: 9.5,
    letterSpacing: em(9.5, 0.26),
    textTransform: "uppercase",
    marginBottom: 8,
  },
  h2: { fontFamily: FONTS.serifRegular, fontSize: 24, lineHeight: 27 },
  mgline: { flexDirection: "row", marginTop: 12 },
  dash: { width: 16, fontFamily: FONTS.sans, fontSize: 13.5, lineHeight: 22.3 },
  mglineText: { flex: 1, fontFamily: FONTS.sans, fontSize: 13.5, lineHeight: 22.3 },
  scrawl: {
    fontFamily: FONTS.hand,
    fontSize: 15.5,
    marginTop: 18,
    transform: [{ rotate: "-1deg" }],
  },
});
