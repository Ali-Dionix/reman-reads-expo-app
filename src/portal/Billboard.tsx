// "On the platter tonight" — `.rr-bill` from accountListeningPage.ts.
//
// Transcribed at the ≤640px branch: 18px gap, 18/16/20 padding, a 96px sleeve.
// It stays a ROW at every width — the sleeve is the point, and stacking it
// would turn the record into a hero image.
//
// The disc is the fiddly part and worth getting right: it sits BEHIND the
// sleeve, offset right so only a crescent shows, with a grooved black face, a
// label in the book's own labelHue, and a spindle hole. On the web that is
// three pseudo-elements and a repeating-radial-gradient; here it is nested
// views plus one SVG for the grooves, which is the only honest way to draw a
// repeating radial in RN.

import { Image } from "expo-image";
import Svg, { Circle, Path } from "react-native-svg";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SITE_ORIGIN } from "../lib/config";
import { useInk, em } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { FONTS } from "../theme/type";

export type BillboardBook = {
  slug: string;
  title: string;
  author: string;
  blurb: string;
  labelHue: string;
  art?: string;
  spine: string;
};

const SLEEVE_W = 96; // ≤640px: .rr-bill-slv{width:96px}

/** The grooved face. 20 rings is where the moiré stops and the record starts. */
function Grooves({ size }: { size: number }) {
  const r = size / 2;
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      {Array.from({ length: 20 }, (_, i) => (
        <Circle
          key={i}
          cx={r}
          cy={r}
          r={r - 1.5 - i * ((r - 2) / 20)}
          fill="none"
          stroke="rgba(0,0,0,.5)"
          strokeWidth={0.6}
        />
      ))}
    </Svg>
  );
}

function Disc({ hue }: { hue: string }) {
  // .rr-bill-disc — right:-16%; top:9%; width:72% of the sleeve
  const size = SLEEVE_W * 0.72;
  return (
    <View
      style={[
        styles.disc,
        { width: size, height: size, borderRadius: size / 2, right: -SLEEVE_W * 0.16, top: "9%" },
      ]}
    >
      <Grooves size={size} />
      {/* ::before — the paper label, inset 29.5% */}
      <View
        style={{
          position: "absolute",
          top: size * 0.295,
          left: size * 0.295,
          right: size * 0.295,
          bottom: size * 0.295,
          borderRadius: size / 2,
          backgroundColor: hue,
        }}
      />
      {/* ::after — the spindle hole, 6px across */}
      <View
        style={{
          position: "absolute",
          top: size / 2 - 3,
          left: size / 2 - 3,
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: "#FBF5E4",
        }}
      />
    </View>
  );
}

export function Billboard({
  book,
  onOpen,
  onPlay,
}: {
  book: BillboardBook;
  onOpen?: () => void;
  onPlay?: () => void;
}) {
  const { ink, mode } = useInk();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.bill,
        {
          backgroundColor: mode === "dark" ? colors.cream1 : "#F6F1E6",
          // html[data-rr-theme="dark"] .rr-bill{border-color:rgba(201,166,98,.3)}
          borderColor: mode === "dark" ? "rgba(201,166,98,.3)" : ink(0.13),
        },
      ]}
    >
      <View style={styles.slv}>
        <Disc hue={book.labelHue} />
        <View style={[styles.plate, { backgroundColor: book.art ? "#FBF5E4" : book.spine }]}>
          {book.art ? (
            <Image
              source={{ uri: `${SITE_ORIGIN}${book.art}` }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={160}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.txt}>
        <Text style={[styles.kicker, { color: colors.gold2 }]}>On the platter tonight</Text>

        <Pressable onPress={onOpen} accessibilityRole="link" hitSlop={4}>
          <Text style={[styles.title, { color: colors.ink }]}>{book.title}</Text>
        </Pressable>

        <Text style={[styles.by, { color: ink(0.66) }]}>{book.author}</Text>
        <Text style={[styles.line, { color: ink(0.65) }]}>{book.blurb}</Text>

        <Pressable
          onPress={onPlay}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.btn,
            pressed
              ? { backgroundColor: colors.brick }
              : { backgroundColor: "#FBF5E4", borderColor: "rgba(155,122,77,.9)" },
          ]}
        >
          {({ pressed }) => (
            <>
              <Svg width={14} height={14} viewBox="0 0 14 14">
                <Path
                  d="M3 2.2v9.6l8-4.8-8-4.8Z"
                  fill={pressed ? "#F1E4C4" : "#7E2D1F"}
                />
              </Svg>
              <Text style={[styles.btnText, { color: pressed ? "#F1E4C4" : "#7E2D1F" }]}>
                Begin listening
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginTop: 4,
    marginBottom: 34,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderWidth: 1,
    borderRadius: 3,
    overflow: "hidden",
  },
  slv: { width: SLEEVE_W },
  disc: {
    position: "absolute",
    backgroundColor: "#15120F",
    // 4px 6px 14px rgba(54,42,28,.3)
    shadowColor: "#362A1C",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 4, height: 6 },
    elevation: 4,
  },
  plate: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: 2,
    overflow: "hidden",
    shadowColor: "#362A1C",
    shadowOpacity: 0.34,
    shadowRadius: 12,
    shadowOffset: { width: 6, height: 10 },
    elevation: 6,
  },
  txt: { flex: 1, alignItems: "flex-start", minWidth: 0 },
  kicker: {
    fontFamily: FONTS.serifRegular,
    fontSize: 13,
    letterSpacing: em(13, 0.24),
    // iOS renders small-caps; Android ignores fontVariant and sets it plain,
    // which is the closer miss of the two available.
    fontVariant: ["small-caps"],
  },
  // clamp(26px,3.1vw,38px) — a phone sits on the 26px floor
  title: {
    fontFamily: FONTS.serifRegular,
    fontSize: 26,
    lineHeight: 27.6,
    letterSpacing: em(26, -0.01),
    marginTop: 5,
  },
  by: { fontFamily: FONTS.serifItalicLight, fontSize: 16.5, marginTop: 6 },
  line: { fontFamily: FONTS.sans, fontSize: 12.5, lineHeight: 20.6, marginTop: 9 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 19,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  btnText: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    letterSpacing: em(11, 0.08),
    textTransform: "uppercase",
  },
});
