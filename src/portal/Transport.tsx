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

/** icBack15 / its mirror — the ± buttons. Shared with the Reading Desk. */
export function Jump({ back, color }: { back?: boolean; color: string }) {
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
    seekTo,
    now,
  } = useDeck();
  const { ink } = useInk();
  const { colors, mode } = useTheme();
  const [grooveW, setGrooveW] = useState(0);

  if (!recording || !now) return null;

  const pct = duration > 0 ? Math.min(1, position / duration) : 0;

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

      {/* the groove row — cur · groove · clock, exactly the web's one line.
          The Pressable is a 28px transparent HIT strip; the visible track is
          the 6px pill inside it. Tap anywhere to set the needle down there. */}
      <View style={styles.grooveRow}>
        <Text style={[styles.time, { color: ink(0.6) }]}>{mmss(position)}</Text>
        <Pressable
          onPress={onGroove}
          onLayout={(e: LayoutChangeEvent) => setGrooveW(e.nativeEvent.layout.width)}
          accessibilityRole="adjustable"
          accessibilityLabel="Position in this band"
          style={styles.groove}
        >
          <View style={[styles.track, { backgroundColor: ink(0.15) }]}>
            <View
              style={[
                styles.grooveFill,
                {
                  width: `${pct * 100}%`,
                  // the fill is the red ink of the needle's wake — #D2AF69 by
                  // night (theme.ts's dark for it; brick's text-pair is not it)
                  backgroundColor: mode === "dark" ? "#D2AF69" : "#7E2D1F",
                },
              ]}
            />
          </View>
          {/* the head — a brass stud, flat where the web grinds a radial */}
          <View
            style={[
              styles.head,
              {
                left: `${pct * 100}%`,
                backgroundColor: colors.brass,
                borderColor: mode === "dark" ? "rgba(0,0,0,.55)" : "rgba(43,30,16,.4)",
              },
            ]}
          />
        </Pressable>
        <Text style={[styles.time, { color: ink(0.6) }]}>{mmss(duration)}</Text>
      </View>

      {/* row two: the buttons — the web console is exactly −15 · play · +15;
          band steps live on the shelf and in the reader's head, not here */}
      <View style={styles.deck}>
        <Pressable
          onPress={() => nudge(-15)}
          accessibilityLabel="Back fifteen seconds"
          style={[styles.jog, { borderColor: ink(0.22) }]}
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
          style={[styles.jog, { borderColor: ink(0.22) }]}
        >
          <Jump color={colors.ink2} />
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

  grooveRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  // .rr-lr-groove — a 28px hit strip; the 6px pill inside is what shows
  groove: { flex: 1, height: 28, justifyContent: "center" },
  track: { height: 6, borderRadius: 999, overflow: "hidden" },
  grooveFill: { position: "absolute", left: 0, top: 0, bottom: 0 },
  head: {
    position: "absolute",
    top: 7,
    width: 14,
    height: 14,
    marginLeft: -7,
    borderRadius: 7,
    borderWidth: 1,
  },
  // .rr-lr-time/.rr-lr-clock — the serif figures, in even columns
  time: { fontFamily: FONTS.serifRegular, fontSize: 14, fontVariant: ["tabular-nums"] },

  deck: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  // ≤520px: 42px jogs, 46px platter
  jog: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  big: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
