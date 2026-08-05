// The living card — `.rr-pf-card` from accountProfilePage.ts.
//
// THE SET-PIECE, AND IT HAS TWO FACES. The front carries the name and the
// number; the reverse carries what the shop actually acts on. Editing a field
// inks it onto the card as you type, and touching anything on the reverse
// turns the card over so you watch it happen.
//
// The turn is a real rotateY — React Native supports `perspective` + `rotateY`
// + `backfaceVisibility`, so this is the same mechanism the web uses, not an
// approximation. Both faces are absolutely stacked so the taller one sets the
// height and the card never resizes mid-turn.
//
// A LIT OBJECT: the card is a physical thing (a theme island on the web), so
// its colours never flip at night. Every literal below is deliberate.

import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useInk, em } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { FONTS } from "../theme/type";

const CARD = {
  paper: "#FBF5E4",
  ink: "#171411",
  inkStrong: "#0B0A08",
  gold: "#8C6A3F",
  brown: "#6E563A",
  rule: "rgba(110,86,58,.5)",
  ruleSoft: "rgba(110,86,58,.4)",
  ruleDash: "rgba(110,86,58,.55)",
  edge: "rgba(11,10,8,.55)",
  brick: "#7E2D1F",
} as const;

/** `.rr-pf-clbl` on the card — always the card's own gold, never the theme's. */
function CLbl({ children, first }: { children: ReactNode; first?: boolean }) {
  return <Text style={[styles.clbl, first && { marginTop: 0 }]}>{children}</Text>;
}

/** `.rr-pf-tape` — two strips holding the card to the page. */
function Tape({ side }: { side: "left" | "right" }) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.tape,
        side === "left"
          ? { left: -14, top: -8, transform: [{ rotate: "-39deg" }] }
          : { right: -14, top: -8, transform: [{ rotate: "39deg" }] },
      ]}
    />
  );
}

export function ReaderCard({
  name,
  cardNo,
  issued,
  address,
  langs,
  letters,
  deck,
  facts,
  back,
  onTurn,
}: {
  name: string;
  cardNo: string;
  issued: string;
  /** The reverse's inked values. */
  address?: string;
  langs: string[];
  letters: string;
  deck: string;
  facts: { shelf: string; waitlist: string; heard: string; slips: string };
  back: boolean;
  onTurn: () => void;
}) {
  const { ink } = useInk();
  const { colors } = useTheme();
  const turn = useRef(new Animated.Value(back ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(turn, {
      toValue: back ? 1 : 0,
      duration: 660,
      easing: Easing.bezier(0.2, 0.72, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [back, turn]);

  const frontSpin = turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backSpin = turn.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  return (
    <View style={styles.keep}>
      <View style={styles.stack}>
        {/* front */}
        <Animated.View
          style={[
            styles.face,
            { transform: [{ perspective: 1600 }, { rotateY: frontSpin }] },
          ]}
        >
          <Tape side="left" />
          <Tape side="right" />
          <View style={styles.faceInset} pointerEvents="none" />

          <View style={styles.chead}>
            <Text style={styles.cheadB}>Roman Reads</Text>
            <Text style={styles.cheadI}>reader’s card</Text>
          </View>

          <CLbl>This card belongs to</CLbl>
          <Text style={styles.cname} numberOfLines={1}>
            {name}
          </Text>

          <View style={styles.cmeta}>
            <Text style={styles.cmetaSpan}>
              <Text style={styles.cmetaB}>Nº </Text>
              {cardNo}
            </Text>
            <Text style={styles.cmetaSpan}>
              <Text style={styles.cmetaB}>ISSUED </Text>
              {issued}
            </Text>
            <View style={styles.cr}>
              <Text style={styles.crText}>R</Text>
            </View>
          </View>

          <Text style={styles.cfoot}>valid at all three desks — and in the app</Text>
        </Animated.View>

        {/* reverse */}
        <Animated.View
          style={[
            styles.face,
            styles.faceBack,
            { transform: [{ perspective: 1600 }, { rotateY: backSpin }] },
          ]}
        >
          <View style={styles.faceInset} pointerEvents="none" />

          <View style={styles.chead}>
            <Text style={styles.cheadB}>Standing orders</Text>
            <Text style={styles.cheadI}>reverse</Text>
          </View>

          <View style={styles.cblock}>
            <CLbl first>Parcels to</CLbl>
            <Text style={[styles.cval, !address && styles.cvalEm]}>
              {address || "no address on file"}
            </Text>
          </View>

          <View style={[styles.cblock, styles.cblockRuled]}>
            <CLbl first>Reads in</CLbl>
            <View style={styles.cstamps}>
              {langs.map((l) => (
                <Text key={l} style={styles.cstamp}>
                  {l}
                </Text>
              ))}
            </View>
          </View>

          <View style={[styles.cblock, styles.cblockRuled]}>
            <CLbl first>Letters</CLbl>
            <Text style={styles.cval}>{letters}</Text>
          </View>

          <View style={[styles.cblock, styles.cblockRuled]}>
            <CLbl first>The deck opens at</CLbl>
            <Text style={styles.cval}>{deck}</Text>
          </View>
        </Animated.View>
      </View>

      {/* .rr-pf-turn */}
      <Pressable onPress={onTurn} accessibilityRole="button" style={styles.turn}>
        <Animated.View
          style={{
            transform: [
              {
                rotate: turn.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "180deg"],
                }),
              },
            ],
          }}
        >
          <Svg width={15} height={15} viewBox="0 0 16 16" fill="none">
            <Path
              d="M2.6 6.4a5.6 5.6 0 0 1 10-1.7M13.4 9.6a5.6 5.6 0 0 1-10 1.7M2.4 2.9v3.6h3.6M13.6 13.1V9.5H10"
              stroke={ink(0.6)}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>
        <Text style={[styles.turnText, { color: ink(0.6) }]}>
          {back ? "Turn it back" : "Turn the card over"}
        </Text>
      </Pressable>

      {/* .rr-pf-facts — the record in numbers */}
      <View style={[styles.facts, { borderColor: "rgba(110,86,58,.3)" }]}>
        {(
          [
            [facts.shelf, "On the shelf"],
            [facts.waitlist, "On the waitlist"],
            [facts.heard, "Heard aloud"],
            [facts.slips, "Slips pressed"],
          ] as const
        ).map(([n, label]) => (
          <View key={label} style={[styles.fact, { backgroundColor: colors.cream4 }]}>
            <Text style={[styles.factB, { color: colors.ink2 }]}>{n}</Text>
            <Text style={[styles.factS, { color: colors.gold2 }]}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.filed, { color: colors.brown }]}>
        nothing to save — the card is inked as you type.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // ≤900px: order -1, width min(430px,100%); ≤560px: width 100%
  keep: { gap: 16, width: "100%" },
  stack: { position: "relative" },

  face: {
    paddingTop: 22,
    paddingHorizontal: 24,
    paddingBottom: 18,
    backgroundColor: CARD.paper,
    borderWidth: 1,
    borderColor: CARD.edge,
    backfaceVisibility: "hidden",
    shadowColor: "#362A1C",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 4, height: 8 },
    elevation: 4,
  },
  // both faces share one cell: the reverse is absolutely placed over the front
  faceBack: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  faceInset: {
    position: "absolute",
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderWidth: 1,
    borderColor: CARD.ruleSoft,
  },
  tape: {
    position: "absolute",
    width: 52,
    height: 17,
    backgroundColor: "rgba(244,236,216,.65)",
    zIndex: 6,
  },

  chead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: CARD.rule,
  },
  cheadB: { fontFamily: FONTS.serif, fontSize: 20, color: CARD.ink },
  cheadI: {
    fontFamily: FONTS.sansBold,
    fontSize: 8.5,
    letterSpacing: em(8.5, 0.22),
    textTransform: "uppercase",
    color: CARD.gold,
  },
  clbl: {
    marginTop: 15,
    fontFamily: FONTS.sansBold,
    fontSize: 8.5,
    letterSpacing: em(8.5, 0.18),
    textTransform: "uppercase",
    color: CARD.gold,
  },
  cname: {
    minHeight: 42,
    marginTop: 2,
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderBottomColor: CARD.ruleDash,
    fontFamily: FONTS.hand,
    fontSize: 27,
    lineHeight: 35,
    color: CARD.ink,
    transform: [{ rotate: "-0.5deg" }],
  },
  cmeta: { flexDirection: "row", alignItems: "center", gap: 18, marginTop: 13 },
  cmetaSpan: { fontFamily: FONTS.sansSemi, fontSize: 11, color: "rgba(11,10,8,.72)" },
  cmetaB: {
    fontFamily: FONTS.sansBold,
    fontSize: 8,
    letterSpacing: em(8, 0.18),
    color: CARD.gold,
  },
  cr: {
    marginLeft: "auto",
    width: 28,
    height: 32,
    borderWidth: 1.5,
    borderColor: CARD.inkStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  crText: { fontFamily: FONTS.serifItalic, fontSize: 20, color: CARD.inkStrong },
  cfoot: {
    marginTop: 11,
    fontFamily: FONTS.hand,
    fontSize: 14.5,
    color: CARD.brown,
    transform: [{ rotate: "-0.6deg" }],
  },

  cblock: { marginTop: 13 },
  cblockRuled: {
    paddingTop: 11,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderTopColor: CARD.ruleSoft,
  },
  cval: { marginTop: 4, fontFamily: FONTS.sansSemi, fontSize: 13, lineHeight: 19.5, color: CARD.ink },
  cvalEm: { color: "rgba(11,10,8,.45)" },
  cstamps: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 6 },
  cstamp: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(126,45,31,.5)",
    fontFamily: FONTS.sansBold,
    fontSize: 8,
    letterSpacing: em(8, 0.14),
    textTransform: "uppercase",
    color: CARD.brick,
    transform: [{ rotate: "-1.5deg" }],
    overflow: "hidden",
  },

  turn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  turnText: {
    fontFamily: FONTS.sansSemi,
    fontSize: 11,
    letterSpacing: em(11, 0.06),
    textTransform: "uppercase",
  },

  facts: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    backgroundColor: "rgba(110,86,58,.3)",
    gap: 1,
  },
  fact: { flexGrow: 1, flexBasis: "48%", gap: 3, paddingHorizontal: 13, paddingVertical: 11 },
  factB: { fontFamily: FONTS.serif, fontSize: 19, lineHeight: 19 },
  factS: {
    fontFamily: FONTS.sansBold,
    fontSize: 7.5,
    letterSpacing: em(7.5, 0.16),
    textTransform: "uppercase",
  },
  filed: {
    fontFamily: FONTS.hand,
    fontSize: 14.5,
    lineHeight: 21,
    transform: [{ rotate: "-1deg" }],
  },
});
