// `.rr-lr-galley-chip` / `[data-rr-lr-chipfollow]` — "back to your place".
//
// The chip the site shows whenever the hand has the page: the reader turned
// (or scrolled) away from the word being read, and this is the one way back
// to the needle (ListeningEnhancer.tsx onGalley: shown while the driver is
// `ready` and `following` is false; a press is `setFollow(true)`, and the
// chip hides itself as the follow returns).
//
// Site rule, verbatim: absolute, centred at the foot (`left:50%; bottom:16px
// + safe-area`), `rotate(-.8deg)`, min-height 44, padding 8/15, gap 8, a 1px
// rgba(110,86,58,.4) ring, radius 2, white, `0 2px 8px rgba(43,30,16,.22)`,
// Caveat 500 16px in #6E563A; the needle glyph in #9B7A4D. No night rule on
// the site — the chip is a white card in both schemes.

import { Pressable, StyleSheet, Text } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { FONTS } from "../../../theme/type";

/** icNeedle — the needle over the record, 15px on a 16 box. */
function Needle() {
  return (
    <Svg width={15} height={15} viewBox="0 0 16 16" fill="none">
      <Path d="M13.5 2.5 7 9" stroke="#9B7A4D" strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx={5.4} cy={10.6} r={2.3} fill="#9B7A4D" />
    </Svg>
  );
}

export function FollowChip({ onPress, bottom = 16 }: { onPress: () => void; bottom?: number }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="back to your place"
      style={({ pressed }) => [styles.chip, { bottom }, pressed && { opacity: 0.85 }]}
    >
      <Needle />
      <Text style={styles.label}>back to your place</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "rgba(110,86,58,.4)",
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
    boxShadow: "0 2px 8px rgba(43,30,16,.22)",
    transform: [{ rotate: "-0.8deg" }],
  },
  label: { fontFamily: FONTS.hand, fontSize: 16, lineHeight: 20, color: "#6E563A" },
});
