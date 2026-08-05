// The reader's record — `.rr-ov-slab` from app/data/accountPage.ts.
//
// TRANSCRIBED, not redesigned. Hermes sits against a reclaimed plank and the
// account details are inked onto the wood; the copy is an absolutely
// positioned overlay whose left/top/width are PERCENTAGES of the artwork, so
// the ink stays on the plank at every screen size. Those percentages, and the
// clamp() type sizes, are the ≤620px values from accountPage.ts — this is a
// phone, so the mobile branch of each media query is the one that applies.
//
// The plank is a lit object: the ink on it keeps its daylight colours at
// night, because a photograph of wood does not darken with the page.

import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useInk, em } from "../theme/ink";
import { FONTS } from "../theme/type";

const ART = require("../../assets/reading-room-hermes-seated-slab-selected.webp");

/** The artwork's intrinsic size — width/height from the <img> tag. */
const ART_RATIO = 1024 / 1536;

export function ReaderSlab({
  name,
  cardNo,
  issued = "MMXXVI",
  onEditParticulars,
}: {
  name: string;
  cardNo: string;
  issued?: string;
  onEditParticulars?: () => void;
}) {
  const { slab, slab2, clamp } = useInk();

  // .rr-ov-slab-kicker  font: 700 clamp(6.5px,.82vw,9px)
  const kickerSize = clamp(6.5, 0.82, 9);
  // .rr-ov-slab-name    font: 600 clamp(20px,6.4vw,29px)/.95   (≤620px)
  const nameSize = clamp(20, 6.4, 29);
  // .rr-ov-slab-meta>span  font: 600 clamp(8px,.9vw,10px)/1.25
  const metaSize = clamp(8, 0.9, 10);
  // .rr-ov-slab-meta b     font: 700 clamp(5.5px,.64vw,7.5px)
  const labelSize = clamp(5.5, 0.64, 7.5);
  // .rr-ov-slab-line       font: 600 clamp(8px,.86vw,10px)/1.45
  const lineSize = clamp(8, 0.86, 10);
  // .rr-ov-slab-link       font: 700 clamp(7px,.76vw,9px)
  const linkSize = clamp(7, 0.76, 9);

  const label = {
    fontFamily: FONTS.sansBold,
    fontSize: labelSize,
    letterSpacing: em(labelSize, 0.13),
    textTransform: "uppercase" as const,
    color: slab(0.66),
  };

  return (
    <View style={styles.slab}>
      <Image
        source={ART}
        style={styles.art}
        contentFit="contain"
        accessibilityLabel="Hermes reading beside a reclaimed wood reader record"
      />

      <View style={styles.copy}>
        <Text
          style={[
            styles.kicker,
            { fontSize: kickerSize, letterSpacing: em(kickerSize, 0.15), color: slab(0.78) },
          ]}
        >
          Reader’s record
        </Text>

        <Text
          numberOfLines={1}
          style={[
            styles.name,
            { fontSize: nameSize, lineHeight: nameSize * 0.95, borderBottomColor: slab(0.48) },
          ]}
        >
          {name}
        </Text>

        <View style={[styles.meta, { borderBottomColor: slab(0.34) }]}>
          <View style={styles.metaCell}>
            <Text style={label}>Card no.</Text>
            <Text style={[styles.metaValue, { fontSize: metaSize, lineHeight: metaSize * 1.25 }]}>
              {cardNo}
            </Text>
          </View>
          <View style={[styles.metaCell, styles.metaCellSecond, { borderLeftColor: slab(0.28) }]}>
            <Text style={label}>Issued</Text>
            <Text style={[styles.metaValue, { fontSize: metaSize, lineHeight: metaSize * 1.25 }]}>
              {issued}
            </Text>
          </View>
        </View>

        <View style={styles.line}>
          <Text style={[label, styles.lineLabel]}>Access</Text>
          <Text
            style={{
              fontFamily: FONTS.sansSemi,
              fontSize: lineSize,
              lineHeight: lineSize * 1.45,
              color: slab2(0.75),
            }}
          >
            Every room, one record.
          </Text>
        </View>

        <Pressable onPress={onEditParticulars} accessibilityRole="link" hitSlop={8}>
          {({ pressed }) => (
            <Text
              style={[
                styles.link,
                {
                  fontSize: linkSize,
                  letterSpacing: em(linkSize, 0.07),
                  color: pressed ? "#171411" : "#5F2D1E",
                },
              ]}
            >
              edit particulars →
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ≤620px: width calc(100% + 18px); margin-left/-right -9px — the plank runs
  // past the page's 5vw gutter, which is what makes it read as an object
  // lying on the desk rather than a figure inside a column.
  slab: {
    width: "100%",
    marginHorizontal: -9,
    alignSelf: "stretch",
  },
  art: {
    width: "100%",
    aspectRatio: ART_RATIO,
  },
  // .rr-ov-slab-copy — left/top/width are % OF THE ARTWORK (≤620px values)
  copy: {
    position: "absolute",
    left: "14.5%",
    top: "26%",
    width: "34%",
    minWidth: 142,
    maxWidth: 208,
  },
  kicker: {
    fontFamily: FONTS.sansBold,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  name: {
    fontFamily: FONTS.hand,
    color: "#342013",
    paddingBottom: 9,
    borderBottomWidth: 1,
  },
  meta: {
    flexDirection: "row",
    marginTop: 10,
    paddingBottom: 9,
    borderBottomWidth: 1,
  },
  metaCell: { flex: 1.08, gap: 3 },
  metaCellSecond: { flex: 0.92, paddingLeft: 8, borderLeftWidth: 1 },
  metaValue: { fontFamily: FONTS.sansSemi, color: "#352315" },
  line: { marginTop: 10 },
  lineLabel: { marginBottom: 2 },
  link: {
    marginTop: 12,
    fontFamily: FONTS.sansBold,
    textTransform: "uppercase",
    textDecorationLine: "underline",
  },
});
