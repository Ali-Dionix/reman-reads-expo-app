// The portal's page frame — `.rr-pt-top` + `.rr-pt-wrap` + `.rr-pt-head`.
//
// Transcribed from portalShared.ts at its ≤979px / ≤760px values, which is the
// branch a phone takes: the top bar RIDES WITH THE PAGE rather than sticking
// (its torn hem would otherwise crop the content on scroll — the fixed bottom
// bar is the persistent nav here), the brand comes back into it, and the
// desktop's "here"/back/sign-out controls drop out.

import type { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useInk, em } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { FONTS } from "../theme/type";
import { TornHem } from "../ui/TornEdge";
import { SunMoon } from "./TornNav";

const MARK = require("../../assets/mark.png");

/** `.rr-pt-top` — brand, then controls. Rides with the page on a phone. */
function TopBar() {
  const { vw, width, ink } = useInk();
  const { colors, mode, paperGradient } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View>
      <LinearGradient
        colors={[paperGradient[0], paperGradient[1]]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[
          styles.top,
          { paddingTop: insets.top + 13, paddingHorizontal: vw(5) },
        ]}
      >
        <View style={styles.brand}>
          {/* .rr-pt-mark-img — 30px, the mark masked to solid ink. tintColor
              is RN's equivalent of the CSS mask this uses on the web. */}
          <Image source={MARK} style={styles.mark} tintColor={colors.ink} resizeMode="contain" />
          <View style={styles.word}>
            <Text style={[styles.wordB, { color: colors.ink }]} numberOfLines={1}>
              Roman Reads
            </Text>
            <Text style={[styles.wordI, { color: colors.brass }]} numberOfLines={1}>
              Literature made simple
            </Text>
          </View>
        </View>

        {/* ONE toggle implementation, shared with the login page's navbar —
            two copies of a theme switch is two places for it to stop working */}
        <View style={styles.ctrl}>
          <SunMoon size={37} ink={colors.brown} line={ink(0.3)} />
        </View>
      </LinearGradient>

      {/* the torn hem, in the paper's own colour */}
      <TornHem width={width} color={mode === "dark" ? paperGradient[1] : "#F7F1E2"} />
    </View>
  );
}

/**
 * A portal page: the top bar, then `.rr-pt-wrap` (5vw gutters) with the
 * standard `.rr-pt-head` block, then the page's own content.
 */
export function PortalPage({
  kicker,
  title,
  sub,
  children,
}: {
  kicker: string;
  title: string;
  /** Rendered inside `.rr-pt-sub` — pass a <Text> tree for inline bold. */
  sub: ReactNode;
  children?: ReactNode;
}) {
  const { ink, vw } = useInk();
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        // .rr-pt-content — padding-bottom: calc(102px + safe-area)
        contentContainerStyle={{ paddingBottom: 102 }}
        stickyHeaderIndices={[0]}
      >
        <TopBar />

        <View style={[styles.wrap, { paddingHorizontal: vw(5) }]}>
          {/* .rr-pt-head — ≤760px: padding 36px 0 20px */}
          <View style={styles.head}>
            <Text style={[styles.kicker, { color: colors.brass }]}>{kicker}</Text>
            <Text style={[styles.h1, { color: colors.ink }]}>{title}</Text>
            <Text style={[styles.sub, { color: ink(0.65) }]}>{sub}</Text>
          </View>

          {children}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingBottom: 17,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 11, flexShrink: 1, minWidth: 0 },
  mark: { width: 30, height: 30 },
  word: { flexShrink: 1, minWidth: 0 },
  wordB: { fontFamily: FONTS.serif, fontSize: 19, lineHeight: 21 },
  wordI: {
    fontFamily: FONTS.sansSemi,
    fontSize: 7,
    letterSpacing: em(7, 0.2),
    textTransform: "uppercase",
    marginTop: 3,
  },
  // flex:none — the toggle never gives way to the wordmark
  ctrl: { marginLeft: "auto", flexShrink: 0, flexGrow: 0 },

  wrap: { maxWidth: 1080, width: "100%", alignSelf: "center" },
  head: { paddingTop: 36, paddingBottom: 20 },
  kicker: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    letterSpacing: em(10, 0.26),
    textTransform: "uppercase",
    marginBottom: 10,
  },
  // clamp(34px,4.4vw,54px) — a phone never exceeds the 34px floor
  h1: {
    fontFamily: FONTS.serifRegular,
    fontSize: 34,
    lineHeight: 34.7,
    letterSpacing: em(34, -0.01),
  },
  sub: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    lineHeight: 23.8,
    marginTop: 13,
    maxWidth: 560,
  },
});
