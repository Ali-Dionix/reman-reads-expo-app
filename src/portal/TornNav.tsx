// The site's minimal torn navbar — `tornMinimalNavHtml` from navOverride.ts.
//
// This is the bar /login wears (the portal's rooms wear `.rr-pt-top` instead).
// It carries the brand mark, the wordmark, and the sun/moon theme toggle.
//
// TWO DELIBERATE DEPARTURES from the web bar, both because this is a Reader
// app with no storefront in it (docs/APP.md, "Store rules"):
//   * the wishlist and cart counters are not here — there is no Counter to
//     open, so a badge that can only ever read 0 is furniture;
//   * the brand is the logo mark itself rather than the ruled `R` box, so the
//     header carries an actual icon.
//
// `palette` is what keeps the header from fighting the page under it. /login
// paints from its own oklch-derived palette, not the portal's tokens, so the
// nav takes the host page's sheet, ink and rule colours and its torn hem is
// cut from that same paper — in BOTH themes.

import { useRef } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useInk, em } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { FONTS } from "../theme/type";
import { TornHem } from "../ui/TornEdge";

const MARK = require("../../assets/mark.png");

export type NavPalette = {
  /** The nav sheet, and the paper its torn hem is cut from. */
  sheet: string;
  /** The bright underlayer peeking past the deckle. */
  under: string;
  ink: string;
  brass: string;
  /** The control ring. */
  line: string;
};

/**
 * `.rr-nav5-theme` — one button, both faces.
 *
 * The web shows the SUN in light and the MOON in dark
 * (`[data-rr-theme="dark"] .rr-th-moon{display:block}`), i.e. the icon names
 * the mode you are IN, not the one you would switch to. Same here.
 */
export function SunMoon({
  size = 40,
  ink,
  line,
}: {
  size?: number;
  ink?: string;
  line?: string;
}) {
  const { ink: inkA } = useInk();
  const { colors, mode, toggle, toggleFrom } = useTheme();

  const glyph = ink ?? colors.brown;
  const ring = line ?? inkA(0.35);

  // The reveal grows from the switch itself, so the button has to say where it
  // is. Measured on press-IN: measureInWindow answers through a callback, and
  // measuring on press would start the sweep a frame late.
  const self = useRef<View>(null);
  const at = useRef<{ x: number; y: number } | null>(null);

  return (
    <Pressable
      ref={self}
      onPressIn={() =>
        self.current?.measureInWindow((x, y, w, h) => {
          at.current = { x: x + w / 2, y: y + h / 2 };
        })
      }
      onPress={() => {
        // a keyboard or accessibility activation never pressed in — the plain
        // flip is the honest answer there, as the web's (0,0) fallback is
        if (at.current) toggleFrom(at.current.x, at.current.y);
        else toggle();
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: mode === "dark" }}
      accessibilityLabel={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      hitSlop={8}
      style={({ pressed }) => [
        styles.round,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: ring,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Svg viewBox="0 0 24 24" width={19} height={19}>
        {mode === "dark" ? (
          <Path
            d="M20.2 13.6A8.1 8.1 0 0 1 10.4 3.8a8.1 8.1 0 1 0 9.8 9.8Z"
            fill={glyph}
          />
        ) : (
          <G>
            <Circle cx={12} cy={12} r={4.6} fill="none" stroke={glyph} strokeWidth={1.6} />
            <Path
              d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7"
              stroke={glyph}
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          </G>
        )}
      </Svg>
    </Pressable>
  );
}

export function TornNav({ palette }: { palette?: NavPalette }) {
  const { ink, vw, width, mode } = useInk();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Default: the portal's own paper. /login overrides with its palette so the
  // hem is cut from the sheet the page is actually printed on.
  const p: NavPalette = palette ?? {
    sheet: colors.navpaper,
    under: mode === "dark" ? "#1d263c" : "#fdfaf0",
    ink: colors.ink,
    brass: colors.brass,
    line: ink(0.35),
  };

  return (
    <View>
      {/* ≤600px: .rr-nav5{padding:12px 5.5vw 14px} */}
      <View
        style={[
          styles.nav,
          {
            paddingTop: insets.top + 12,
            paddingHorizontal: vw(5.5),
            paddingBottom: 14,
            backgroundColor: p.sheet,
          },
        ]}
      >
        <View style={styles.brand}>
          {/* the brand mark, masked to ink — react-native's Image tintColor is
              the platform equivalent of the CSS mask the site uses */}
          <Image source={MARK} style={styles.mark} tintColor={p.ink} resizeMode="contain" />
          {/* The wordmark yields before the toggle does. At 375px the old bar
              carried three controls and pushed the sun/moon off the edge —
              the brand shrinks and truncates instead. */}
          <View style={styles.word}>
            <Text style={[styles.wordB, { color: p.ink }]} numberOfLines={1}>
              Roman Reads
            </Text>
            <Text style={[styles.wordI, { color: p.brass }]} numberOfLines={1}>
              Literature made simple
            </Text>
          </View>
        </View>

        {/* .rr-nav5--minimal .rr-nav5-theme{margin-left:auto} */}
        <View style={styles.ctrl}>
          <SunMoon ink={p.brass} line={p.line} />
        </View>
      </View>

      {/* the two-sheet deckle: bright underlayer first, the sheet over it */}
      <View>
        <TornHem width={width} color={p.under} style={styles.under} />
        <TornHem width={width} color={p.sheet} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 22,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1, minWidth: 0 },
  mark: { width: 34, height: 34 },
  word: { flexShrink: 1, minWidth: 0 },
  wordB: {
    fontFamily: FONTS.serif,
    fontSize: 21,
    lineHeight: 23,
    letterSpacing: em(21, 0.01),
  },
  wordI: {
    fontFamily: FONTS.sansSemi,
    fontSize: 8,
    letterSpacing: em(8, 0.22),
    textTransform: "uppercase",
    marginTop: 4,
  },
  // flex:none — the toggle is never the thing that gives way
  ctrl: { marginLeft: "auto", flexShrink: 0, flexGrow: 0 },
  round: {
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    // every nav control sits a couple of degrees off true
    transform: [{ rotate: "-2deg" }],
  },
  under: { position: "absolute", top: 4, left: 0, right: 0 },
});
