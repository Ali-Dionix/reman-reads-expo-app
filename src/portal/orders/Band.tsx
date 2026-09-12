// /account/orders — the band under the ledger (`.rr-od-band`), on the kit's
// own button (`.rr-pt-btn`, src/ui/Button.tsx).
//
//   .rr-od-band      border-top 1px ink .12; background #FFFFFF (the `white`
//                    role — a lighter navy than the desk at night); padding
//                    56px 5vw 64px; centred
//   .rr-od-band h2   Cormorant 500, clamp(24px,3vw,34px) — 24px on a phone
//   .rr-od-band p    margin 10px auto 0; max-width 420; 400 14px/1.7 Manrope;
//                    ink .65
//   .rr-od-band-row  flex, centred, gap 14, wrap, margin-top 22 — the two
//                    buttons do not fit a 390px row side by side, so they
//                    stack, each centred, 14px apart
//
// The band lives OUTSIDE `.rr-pt-wrap` on the site, so it is a sibling of the
// wrapped head and ledger, edge to edge, with its own 5vw gutters.

import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { openOnSite } from "../../lib/web";
import { useInk } from "../../theme/ink";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../../ui/Button";
import { Txt } from "../../ui/Type";

/** `.rr-od-band` — "Want another book?" and its two doors out. */
export function Band() {
  const { bg } = useTheme();
  const { ink, vw } = useInk();
  const router = useRouter();
  return (
    <View
      style={[
        styles.band,
        { backgroundColor: bg("white"), borderTopColor: ink(0.12, "border"), paddingHorizontal: vw(5) },
      ]}
    >
      <Txt family="Cormorant Garamond" weight={500} size={24} style={styles.center}>
        Want another book?
      </Txt>
      {/* 14px/1.7 — Chrome floors the computed 23.8 to a 1/64px LayoutUnit */}
      <Txt size={14} line={Math.floor(14 * 1.7 * 64) / 64} tone={0.65} style={[styles.p, styles.center]}>
        Order anything from the shop and it reaches you in 1 to 2 days. If we do not have the book you want, ask us and we will print and bind it for you.
      </Txt>
      <View style={styles.row}>
        {/* href="/contact" — the request-a-book form is a site page, so it
            opens in the in-app tab (reading, not buying: src/lib/web.ts).
            href="/library" is the Library room, which the app has. */}
        <Button label="Request any book" onPress={() => void openOnSite("/contact")} />
        <Button label="Browse all books" ghost onPress={() => router.navigate("/library" as never)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { borderTopWidth: 1, paddingTop: 56, paddingBottom: 64, alignItems: "center" },
  center: { textAlign: "center" },
  /* .rr-od-band p{margin:10px auto 0;max-width:420px} */
  p: { marginTop: 10, maxWidth: 420 },
  /* .rr-od-band-row{gap:14px;flex-wrap:wrap;margin-top:22px} */
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 22,
    alignSelf: "stretch",
  },
});
