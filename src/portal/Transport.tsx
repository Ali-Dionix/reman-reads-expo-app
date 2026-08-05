// The console — the Listening Room's transport, for whatever is on the platter.
//
// The web's `.rr-lr-rail` folds to two rows below 760px: what's playing plus
// the dial, then the buttons with the scrub beside them. Same shape here.
//
// The scrub is a bare Pressable strip rather than a slider component: the web's
// groove is a paper track with a head on it, and a stock Material slider would
// be the one Google-looking thing in the room. Tapping anywhere on the groove
// drops the needle there — which is what a groove is for.
//
// Icons are the page's own: icPlay/icPause/icBack15 from accountListeningPage.ts.

import { useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";

import { mmss, useDeck } from "../lib/audioStore";
import { useInk, em } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { FONTS } from "../theme/type";

/** icBack15 / its mirror — the ± buttons. */
function Jump({ back, color }: { back?: boolean; color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Path
        d={
          back
            ? "M11.5 5.5V2L7 5.5l4.5 3.5V6.9a5.6 5.6 0 1 1-5.4 4.2"
            : "M12.5 5.5V2L17 5.5l-4.5 3.5V6.9a5.6 5.6 0 1 0 5.4 4.2"
        }
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgText
        x={12}
        y={17}
        textAnchor="middle"
        fontSize={7}
        fontWeight="700"
        fill={color}
      >
        15
      </SvgText>
    </Svg>
  );
}

export function Transport() {
  const {
    recording,
    chapter,
    playing,
    position,
    duration,
    loading,
    toggle,
    nudge,
    step,
    seekTo,
    now,
  } = useDeck();
  const { ink } = useInk();
  const { colors } = useTheme();
  const [grooveW, setGrooveW] = useState(0);

  if (!recording || !now) return null;

  const pct = duration > 0 ? Math.min(1, position / duration) : 0;
  const first = now.band === 0;
  const last = now.band >= recording.chapters.length - 1;

  const onGroove = (e: { nativeEvent: { locationX: number } }) => {
    if (!grooveW || !duration) return;
    seekTo((e.nativeEvent.locationX / grooveW) * duration);
  };

  return (
    <View style={[styles.rail, { backgroundColor: colors.cream2, borderColor: ink(0.16) }]}>
      {/* row one: what is sounding */}
      <View style={styles.mid}>
        <Text style={[styles.title, { color: colors.ink2 }]} numberOfLines={1}>
          {recording.title}
        </Text>
        <Text style={[styles.band, { color: ink(0.55) }]} numberOfLines={1}>
          {loading ? "cueing…" : `Band ${now.band + 1} of ${recording.chapters.length} · ${chapter?.title ?? ""}`}
        </Text>
      </View>

      {/* the groove — tap anywhere to set the needle down there */}
      <Pressable
        onPress={onGroove}
        onLayout={(e: LayoutChangeEvent) => setGrooveW(e.nativeEvent.layout.width)}
        accessibilityRole="adjustable"
        accessibilityLabel="Position in this band"
        style={[styles.groove, { backgroundColor: ink(0.1) }]}
      >
        <View style={[styles.grooveFill, { width: `${pct * 100}%`, backgroundColor: colors.brass }]} />
        <View
          style={[
            styles.head,
            { left: `${pct * 100}%`, backgroundColor: colors.brick, borderColor: colors.cream2 },
          ]}
        />
      </Pressable>

      <View style={styles.clock}>
        <Text style={[styles.time, { color: ink(0.5) }]}>{mmss(position)}</Text>
        <Text style={[styles.time, { color: ink(0.5) }]}>{mmss(duration)}</Text>
      </View>

      {/* row two: the buttons */}
      <View style={styles.deck}>
        <Pressable
          onPress={() => step(-1)}
          disabled={first}
          accessibilityLabel="Previous band"
          style={[styles.jog, { borderColor: ink(0.28), opacity: first ? 0.35 : 1 }]}
        >
          <Text style={[styles.jogText, { color: colors.ink2 }]}>‹</Text>
        </Pressable>

        <Pressable
          onPress={() => nudge(-15)}
          accessibilityLabel="Back fifteen seconds"
          style={[styles.jog, { borderColor: ink(0.28) }]}
        >
          <Jump back color={colors.ink2} />
        </Pressable>

        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={playing ? "Pause" : "Play"}
          style={[styles.big, { backgroundColor: colors.ink }]}
        >
          <Svg width={18} height={18} viewBox="0 0 14 14">
            {playing ? (
              <>
                <Rect x={1.5} y={1.5} width={3} height={11} rx={1} fill={colors.paper} />
                <Rect x={7.5} y={1.5} width={3} height={11} rx={1} fill={colors.paper} />
              </>
            ) : (
              <Path d="M3 2.2v9.6l8-4.8-8-4.8Z" fill={colors.paper} />
            )}
          </Svg>
        </Pressable>

        <Pressable
          onPress={() => nudge(15)}
          accessibilityLabel="Forward fifteen seconds"
          style={[styles.jog, { borderColor: ink(0.28) }]}
        >
          <Jump color={colors.ink2} />
        </Pressable>

        <Pressable
          onPress={() => step(1)}
          disabled={last}
          accessibilityLabel="Next band"
          style={[styles.jog, { borderColor: ink(0.28), opacity: last ? 0.35 : 1 }]}
        >
          <Text style={[styles.jogText, { color: colors.ink2 }]}>›</Text>
        </Pressable>
      </View>

      <Text style={[styles.voice, { color: colors.brown }]}>{recording.voice}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    marginBottom: 26,
    padding: 16,
    borderWidth: 1,
    borderRadius: 14,
  },
  mid: { marginBottom: 12 },
  title: { fontFamily: FONTS.serif, fontSize: 19, lineHeight: 23 },
  band: { fontFamily: FONTS.sans, fontSize: 11.5, marginTop: 2 },

  groove: { height: 24, justifyContent: "center", borderRadius: 2, overflow: "visible" },
  grooveFill: { position: "absolute", left: 0, height: 24, borderRadius: 2 },
  head: {
    position: "absolute",
    width: 4,
    height: 30,
    marginLeft: -2,
    borderRadius: 2,
    borderWidth: 1,
  },
  clock: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  time: { fontFamily: FONTS.sansSemi, fontSize: 10.5 },

  deck: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 14,
  },
  jog: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  jogText: { fontFamily: FONTS.serif, fontSize: 22, lineHeight: 24 },
  big: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  voice: {
    marginTop: 12,
    textAlign: "center",
    fontFamily: FONTS.hand,
    fontSize: 14.5,
    letterSpacing: em(14.5, 0.01),
  },
});
