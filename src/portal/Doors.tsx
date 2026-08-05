// The room index — `.rr-ov-index` / `.rr-ov-door` from accountPage.ts.
//
// "navigation that feels like a table of contents, not cards", as the source
// comment puts it. Transcribed at the ≤620px values: a 37px numeral column,
// the label and blurb stacked, a 19px arrow, and a hairline under each row.
//
// The web's hover — 13px of indent, a gradient wash, and a brass bar sliding
// up the left edge — becomes the PRESSED state, since a finger has no hover.

import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ROOMS, type Room } from "../nav/rooms";
import { useInk, em } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { FONTS } from "../theme/type";

/** The `arrow` const in accountPage.ts — 16×16, stroke 1.6. */
function Arrow({ color, size = 17 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M3 8h10M9 4l4 4-4 4"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function Door({ room }: { room: Room }) {
  const { ink, brown, brick } = useInk();
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => router.push(room.route as never)}
      accessibilityRole="link"
      accessibilityLabel={room.label}
      style={({ pressed }) => [
        styles.door,
        { borderBottomColor: brown(0.27) },
        // .rr-ov-door:not(.is-soon):hover — padding-left:13px + the wash
        pressed && { paddingLeft: 13, backgroundColor: `rgba(155,122,77,${0.09})` },
      ]}
    >
      {({ pressed }) => (
        <>
          {/* .rr-ov-door::before — the 2px brass bar that scales up on hover */}
          {pressed ? <View style={[styles.bar, { backgroundColor: colors.brass }]} /> : null}

          <View style={[styles.numeral, { borderColor: brick(0.35) }]}>
            <Text style={[styles.numeralText, { color: colors.brick }]}>{room.numeral}</Text>
          </View>

          <View style={styles.copy}>
            <Text style={[styles.label, { color: colors.ink2 }]}>{room.label}</Text>
            <Text style={[styles.blurb, { color: ink(0.61) }]}>{room.blurb}</Text>
          </View>

          <Arrow color={pressed ? colors.brick : ink(0.45)} />
        </>
      )}
    </Pressable>
  );
}

export function Doors() {
  const { brown, brass } = useInk();
  const { colors } = useTheme();

  return (
    <View style={styles.index}>
      {/* .rr-ov-index-head */}
      <View style={[styles.head, { borderBottomColor: brown(0.42) }]}>
        <Text style={[styles.headKicker, { color: colors.gold2 }]}>Your rooms</Text>
        <Text style={[styles.headHand, { color: colors.brown }]}>choose a door</Text>
      </View>

      <View>
        {/* PORTAL_ROOMS — the numbered doors only; the hub is not one of them */}
        {ROOMS.filter((r) => r.key !== "overview").map((r) => (
          <Door key={r.key} room={r} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  index: { paddingTop: 0 },

  head: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headKicker: {
    fontFamily: FONTS.sansBold,
    fontSize: 9,
    letterSpacing: em(9, 0.25),
    textTransform: "uppercase",
  },
  headHand: {
    fontFamily: FONTS.hand,
    fontSize: 16,
    transform: [{ rotate: "-3deg" }],
  },

  // ≤620px: grid-template-columns 37px 1fr 19px; gap 10; padding-block 14px
  door: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingRight: 4,
    borderBottomWidth: 1,
  },
  bar: {
    position: "absolute",
    left: -10,
    top: 12,
    bottom: 12,
    width: 2,
  },
  numeral: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-4deg" }],
  },
  numeralText: {
    fontFamily: FONTS.serifItalic,
    fontSize: 14,
  },
  copy: { flex: 1, gap: 3, minWidth: 0 },
  label: {
    fontFamily: FONTS.serif,
    fontSize: 20,
    lineHeight: 21,
  },
  blurb: {
    fontFamily: FONTS.sans,
    fontSize: 12.5,
    lineHeight: 19.4,
  },
});
