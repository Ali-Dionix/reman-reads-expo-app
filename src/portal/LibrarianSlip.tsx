// The librarian's slip — `.rr-ov-slipwrap` from accountPage.ts.
//
// One shelf of the shop-style cover card, pulled against the reader's record.
// The web ships three hidden <li> scaffolds that AccountEnhancer inks; here the
// same shape is data-driven, and an empty pull shows `.rr-ov-slip-empty`
// exactly as the web does — absent, never faked.
//
// Transcribed at ≤520px, where `.rr-ov-rec-card` turns from a column into a
// ROW: a 104px cover on the left, the body beside it.

import Svg, { Path } from "react-native-svg";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useInk, em } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { FONTS } from "../theme/type";

export type Rec = {
  id: string;
  title: string;
  /** "Author · 1998" — whatever the enhancer inks into .rr-ov-rec-meta */
  meta: string;
  why: string;
  price: string;
  badge: string;
  /** Cover artwork URL. Absent → the cloth cover with set type. */
  art?: string;
  /** The cloth colour, --bk. Defaults to the CSS default. */
  cloth?: string;
  author?: string;
};

function Arrow({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M3 8h10M9 4l4 4-4 4"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** `.rr-ov-rec-cover` — cloth by default, artwork when one is known. */
function Cover({ rec }: { rec: Rec }) {
  const cloth = rec.cloth ?? "#4A3B27";

  if (rec.art) {
    return (
      <View style={[styles.cover, { backgroundColor: "#E8D7B9" }]}>
        <Image source={{ uri: rec.art }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={[styles.coverInner, { borderColor: "rgba(23,20,17,.3)" }]} />
      </View>
    );
  }

  return (
    <View style={[styles.cover, styles.coverCloth, { backgroundColor: cloth }]}>
      <View style={[styles.coverInner, { borderColor: "rgba(243,226,188,.28)" }]} />
      <Text style={styles.coverBrand}>Roman Reads</Text>
      <Text style={styles.coverTitle} numberOfLines={4}>
        {rec.title}
      </Text>
      <View style={styles.coverRule} />
      {rec.author ? (
        <Text style={styles.coverAuthor} numberOfLines={2}>
          {rec.author}
        </Text>
      ) : null}
    </View>
  );
}

function RecCard({ rec, onPress }: { rec: Rec; onPress?: () => void }) {
  const { ink } = useInk();
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.white, borderColor: ink(pressed ? 0.3 : 0.12) },
      ]}
    >
      <Cover rec={rec} />

      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.ink2 }]} numberOfLines={2}>
          {rec.title}
        </Text>
        <Text style={[styles.meta, { color: ink(0.55) }]}>{rec.meta}</Text>
        <Text style={[styles.why, { color: ink(0.62) }]}>{rec.why}</Text>

        <View style={styles.act}>
          <View style={styles.foot}>
            <Text style={[styles.price, { color: colors.ink2 }]}>{rec.price}</Text>
            <Text style={[styles.badge, { borderColor: ink(0.24), color: ink(0.62) }]}>
              {rec.badge}
            </Text>
          </View>
          <View style={styles.cta}>
            <Text style={[styles.ctaText, { color: colors.brick }]}>View in shop</Text>
            <Arrow color={colors.brick} size={14} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function LibrarianSlip({
  recs,
  onOpenShop,
  onOpenRec,
}: {
  recs: Rec[];
  onOpenShop?: () => void;
  onOpenRec?: (rec: Rec) => void;
}) {
  const { ink, brown } = useInk();
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { borderTopColor: brown(0.3) }]}>
      {/* .rr-ov-slip-head — a 2px brass bar down its left edge */}
      <View style={styles.slipHead}>
        <View style={[styles.slipBar, { backgroundColor: colors.brass }]} />
        <Text style={[styles.slipKicker, { color: colors.gold2 }]}>Pulled for you</Text>
        <Text style={[styles.slipH, { color: colors.ink2 }]}>The librarian’s slip.</Text>
        <Text style={[styles.slipSub, { color: ink(0.6) }]}>
          One shelf, pulled against your record — books worth owning, chosen from what
          you’ve marked.
        </Text>
      </View>

      <View style={styles.recrow}>
        <View style={[styles.recrowHead, { borderBottomColor: brown(0.3) }]}>
          <View style={styles.recrowTitle}>
            <Text style={[styles.recrowTitleB, { color: colors.ink2 }]}>Physical books</Text>
            <Text style={[styles.recrowTitleEm, { color: ink(0.5) }]}>yours to keep</Text>
          </View>
          <Pressable onPress={onOpenShop} accessibilityRole="link" hitSlop={6}>
            <View style={styles.recrowLink}>
              <Text style={[styles.recrowLinkText, { color: colors.brick }]}>
                Browse the shop
              </Text>
              <Arrow color={colors.brick} size={13} />
            </View>
          </Pressable>
        </View>

        {recs.length ? (
          <View style={styles.recs}>
            {recs.map((rec) => (
              <RecCard key={rec.id} rec={rec} onPress={() => onOpenRec?.(rec)} />
            ))}
          </View>
        ) : (
          <Text style={[styles.empty, { borderColor: brown(0.4), color: ink(0.6) }]}>
            You’ve shelved everything we’d have pulled. The librarian is re-reading — the
            whole shop is a door away.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12, paddingTop: 32, paddingBottom: 6, borderTopWidth: 1 },

  slipHead: { maxWidth: 600, paddingLeft: 16 },
  slipBar: { position: "absolute", left: 0, top: 3, bottom: 3, width: 2 },
  slipKicker: {
    fontFamily: FONTS.sansBold,
    fontSize: 9.5,
    letterSpacing: em(9.5, 0.26),
    textTransform: "uppercase",
  },
  slipH: {
    fontFamily: FONTS.serifRegular,
    fontSize: 23,
    lineHeight: 24.8,
    marginTop: 7,
  },
  slipSub: {
    fontFamily: FONTS.sans,
    fontSize: 13.5,
    lineHeight: 21.6,
    marginTop: 9,
    maxWidth: 480,
  },

  recrow: { marginTop: 30 },
  recrowHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 18,
    paddingBottom: 11,
    borderBottomWidth: 1,
  },
  recrowTitle: { flexDirection: "row", alignItems: "baseline", gap: 10, flexShrink: 1 },
  recrowTitleB: { fontFamily: FONTS.serif, fontSize: 20, lineHeight: 20 },
  recrowTitleEm: { fontFamily: FONTS.sans, fontSize: 12 },
  recrowLink: { flexDirection: "row", alignItems: "center", gap: 5 },
  recrowLinkText: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    letterSpacing: em(10, 0.09),
    textTransform: "uppercase",
  },

  // ≤520px: one column, gap 14
  recs: { gap: 14 },
  // ≤520px: the card lies down — row, 12px padding, 14px gap
  card: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    padding: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
  // ≤520px: flex none, width 104, aspect-ratio 2/3
  cover: {
    width: 104,
    aspectRatio: 2 / 3,
    borderRadius: 10,
    overflow: "hidden",
  },
  coverCloth: { alignItems: "center", justifyContent: "center", padding: 12 },
  coverInner: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderWidth: 1,
    borderRadius: 6,
  },
  coverBrand: {
    position: "absolute",
    top: 15,
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: FONTS.sansBold,
    fontSize: 6.5,
    letterSpacing: em(6.5, 0.3),
    textTransform: "uppercase",
    color: "rgba(243,226,188,.7)",
  },
  coverTitle: {
    fontFamily: FONTS.serif,
    fontSize: 15,
    lineHeight: 17.7,
    color: "#F3E2BC",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  coverRule: {
    width: 26,
    height: 1,
    backgroundColor: "rgba(243,226,188,.45)",
    marginVertical: 10,
  },
  coverAuthor: {
    fontFamily: FONTS.sansBold,
    fontSize: 7,
    letterSpacing: em(7, 0.2),
    textTransform: "uppercase",
    color: "rgba(243,226,188,.75)",
    textAlign: "center",
    paddingHorizontal: 4,
  },

  // ≤520px: padding 2px 0 0
  body: { flex: 1, paddingTop: 2 },
  title: { fontFamily: FONTS.serif, fontSize: 17, lineHeight: 20.4 },
  meta: { fontFamily: FONTS.sansSemi, fontSize: 12, marginTop: 3 },
  why: { fontFamily: FONTS.sans, fontSize: 12.5, lineHeight: 19.4, marginTop: 10 },
  act: { marginTop: "auto", paddingTop: 14 },
  foot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  price: { fontFamily: FONTS.sansBold, fontSize: 13 },
  badge: {
    fontFamily: FONTS.sansBold,
    fontSize: 9,
    letterSpacing: em(9, 0.07),
    textTransform: "uppercase",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
  },
  cta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 13 },
  ctaText: {
    fontFamily: FONTS.sansBold,
    fontSize: 10.5,
    letterSpacing: em(10.5, 0.08),
    textTransform: "uppercase",
  },

  empty: {
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    fontFamily: FONTS.sans,
    fontSize: 13.5,
    lineHeight: 21.6,
  },
});
