// The travelling record — the site's ListeningDock, on the phone.
//
// A slip of paper carrying a spinning label, riding above the bottom bar
// wherever the reader goes. It exists so that leaving the Listening Room does
// not mean losing the needle: the deck keeps playing and this is its handle.
//
// A CARD ABOVE THE BAR, NOT A STRIP GLUED TO IT — listening-dock.css at the
// phone branch: `.rr-ld{left:10px;right:10px;bottom:calc(74px + safe)}`,
// the slip floating clear of the tab bar with the page passing beneath it,
// the shape every listening app's mini-player takes. The bar's torn paper
// reaches TEETH_RISE (17px) above its own box (TornEdge.tsx, the rising
// sheet), so the card sits above the teeth with a breath of desk between —
// glued to the box, its second line was under the tear.
//
// AND THE PAGE ENDS ABOVE IT. The card measures itself and publishes its
// height (dockSpace.ts); useContentInsets adds it, exactly as the site's
// `body.rr-ld-on` pads .rr-pt-content by the dock's own height. Zero again
// the moment the needle lifts.
//
// The label disc is a LIT OBJECT (`.rr-ld-label` is a theme island on the
// web) — it keeps its colours at night while the paper slip it rides on flips
// with the page.

import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { mmss, useDeck } from "../lib/audioStore";
import { useInk, em } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { FONTS } from "../theme/type";
import { fillProps } from "../ui/svgPaint";
import { TEETH_RISE } from "../ui/TornEdge";
import { setDockHeight } from "./dockSpace";

/** `.rr-ld{left:10px;right:10px}` — the card's own gutter. */
const GUTTER = 10;
/** The desk showing between the card and the bar's teeth. */
const BREATH = 8;
/** The slip's shadow — the order slip's, a lit object's, never mapped. */
const SLIP_SHADOW = "1px 2px 1px rgba(54,42,28,.16), 8px 12px 20px rgba(54,42,28,.14)";

export function ListeningDock({ onOpen }: { onOpen?: () => void }) {
  const { now, recording, chapter, playing, position, duration, loading, toggle, stop } =
    useDeck();
  const { ink } = useInk();
  const { colors, bg } = useTheme();

  // The room the card takes: published as it lays out, withdrawn the moment
  // there is nothing to show (and on unmount, for good measure).
  const show = !!now && !!recording;
  useEffect(() => {
    if (!show) setDockHeight(0);
  }, [show]);
  useEffect(() => () => setDockHeight(0), []);

  // The label turns while the needle is down. 33⅓ rpm is 1.8s a revolution;
  // slowed to 4s so it reads as motion rather than a strobe at 60fps.
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!playing) {
      spin.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [playing, spin]);

  if (!show) return null;

  const pct = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    // the card's box in the bottom stack — the gutters and the breath are
    // part of the room it takes, so they are measured with it; touches on
    // the desk beside the card fall through to the page
    <View
      pointerEvents="box-none"
      style={{ paddingHorizontal: GUTTER, paddingBottom: TEETH_RISE + BREATH }}
      onLayout={(e) => setDockHeight(e.nativeEvent.layout.height)}
    >
    <View
      style={[
        styles.dock,
        { backgroundColor: bg("white"), borderColor: ink(0.16, "border") },
      ]}
    >
      {/* the gilt progress rule, flush with the slip's top edge */}
      <View style={[styles.rule, { backgroundColor: "rgba(155,122,77,.22)" }]}>
        <View style={[styles.ruleFill, { width: `${pct * 100}%`, backgroundColor: colors.brass }]} />
      </View>

      {/* SIBLINGS, never nested: a Pressable inside a Pressable swallows taps
          on Android and is invalid markup on web. The slip's face opens the
          room; the transport buttons sit beside it. */}
      <View style={styles.body}>
        <Pressable
          style={styles.face}
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={`Open the Listening Room — ${recording.title}`}
        >
        {/* .rr-ld-label — the spinning disc, lit at night */}
        <Animated.View
          style={[
            styles.label,
            {
              transform: [
                {
                  rotate: spin.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.labelInner} />
          <View style={styles.spindle} />
        </Animated.View>

        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.ink2 }]} numberOfLines={1}>
            {recording.title}
          </Text>
          <Text style={[styles.band, { color: ink(0.55) }]} numberOfLines={1}>
            {loading
              ? "cueing…"
              : `${chapter?.title ?? ""} · ${mmss(position)} / ${mmss(duration)}`}
          </Text>
        </View>
        </Pressable>

        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={playing ? "Pause" : "Play"}
          hitSlop={10}
          style={[styles.btn, { borderColor: ink(0.3) }]}
        >
          <Svg width={14} height={14} viewBox="0 0 14 14">
            {playing ? (
              <>
                <Rect x={1.5} y={1.5} width={3} height={11} rx={1} {...fillProps(colors.brick)} />
                <Rect x={7.5} y={1.5} width={3} height={11} rx={1} {...fillProps(colors.brick)} />
              </>
            ) : (
              <Path d="M3 2.2v9.6l8-4.8-8-4.8Z" {...fillProps(colors.brick)} />
            )}
          </Svg>
        </Pressable>

        <Pressable
          onPress={stop}
          accessibilityRole="button"
          accessibilityLabel="Lift the needle"
          hitSlop={10}
          style={styles.close}
        >
          <Text style={[styles.closeX, { color: ink(0.45) }]}>×</Text>
        </Pressable>
      </View>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // .rr-ld-card — a 1px ink .16 ring, 3px radius, the slip's two shadows;
  // the rule sits inside the ring, so the corners clip
  dock: { borderWidth: 1, borderRadius: 3, overflow: "hidden", boxShadow: SLIP_SHADOW },
  rule: { height: 3, width: "100%" },
  ruleFill: { height: 3 },
  body: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  face: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minWidth: 0 },
  // a lit object — the disc keeps its colours at night
  label: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#15120F",
    alignItems: "center",
    justifyContent: "center",
  },
  labelInner: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#7E2D1F",
  },
  spindle: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FBF5E4",
  },
  copy: { flex: 1, minWidth: 0 },
  title: { fontFamily: FONTS.serif, fontSize: 16, lineHeight: 19 },
  band: { fontFamily: FONTS.sans, fontSize: 11, marginTop: 1 },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  close: { paddingHorizontal: 2 },
  closeX: { fontSize: 20, lineHeight: 22, fontFamily: FONTS.sans },
});

/** The in-room transport's shared label style, so the dock and the room agree. */
export const transportLabel = {
  fontFamily: FONTS.sansBold,
  fontSize: 9.5,
  letterSpacing: em(9.5, 0.2),
  textTransform: "uppercase" as const,
};
