// The site's public navbar in its minimal cut — `tornMinimalNavHtml` from
// navOverride.ts, the bar /login wears (the portal's rooms wear the app
// shell's `.rr-ap-top` instead, src/portal/PortalPage.tsx).
//
// Mark, wordmark, theme toggle, and the torn paper under them:
//   .rr-nav5          ≤600px: padding 12px 5.5vw 14px; sticky; gap 22
//   .rr-nav5-brand    gap 12
//   the mark          navOverride draws a ruled `R` box, but globals.css swaps
//                     it for the house-mark PNG on every page
//                     (body[data-rr-page] header > a:first-child > div:first-child):
//                     44×44, the 192px manifest icon at contain, its own ink by
//                     day and brightness(0) invert(1) — pure white — at night.
//   .rr-nav5-word     b 600 21px/1 Cormorant .01em ink; i 600 8px Manrope .24em
//                     uppercase brass, 4px under
//   .rr-nav5-theme    ≤600px on the minimal bar: 40px, 1.5px ink ring at .35,
//                     brown glyph at 19px, 2° off true, margin-left:auto
//   .rr-nav5-paper    the two-layer torn sheet (HTEAR along the bottom),
//                     white by day and #1d263c by night — the `sheet` role —
//                     with the ink line drop-shadowed under the tear.
//
// The scroll-progress hairline (.rr-nav5-progress) is scaleX(0) at the top of
// a page and is not drawn.

import { useRef } from "react";
import { Image, Pressable, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useInk } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { Disc } from "../ui/Disc";
import { TornSheet } from "../ui/TornEdge";
import { Txt } from "../ui/Type";
import { fillProps, strokeProps } from "../ui/svgPaint";

const MARK_192 = require("../../assets/mark-192.png");

/** `.rr-nav5` box height at ≤600px: 12 + 44 + 14. */
export const NAV_H = 70;

/**
 * `.rr-nav5-theme` — one button, both faces. The web shows the SUN in light
 * and the MOON in dark: the icon names the mode you are in.
 */
export function SunMoon({
  size = 40,
  glyph = 19,
  ink: inkOverride,
  line,
}: {
  size?: number;
  glyph?: number;
  /** The glyph's ink, when a room lights it differently from the bar. */
  ink?: string;
  /** The ring, likewise. */
  line?: string;
}) {
  const { colors, mode, toggle, toggleFrom } = useTheme();
  const { ink } = useInk();
  const c = inkOverride ?? colors.brown;

  // The reveal grows from the switch itself, so the button has to say where it
  // is. Measured on press-IN: measureInWindow answers through a callback, and
  // measuring on press would start the sweep a frame late.
  const self = useRef<View>(null);
  const at = useRef<{ x: number; y: number } | null>(null);

  return (
    <View ref={self} collapsable={false}>
    <Disc
      size={size}
      ring={line ?? ink(0.35, "border")}
      ringWidth={1.5}
      tilt={-2}
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
    >
      <Svg viewBox="0 0 24 24" width={glyph} height={glyph}>
        {mode === "dark" ? (
          <Path d="M20.2 13.6A8.1 8.1 0 0 1 10.4 3.8a8.1 8.1 0 1 0 9.8 9.8Z" {...fillProps(c)} />
        ) : (
          <G>
            <Circle cx={12} cy={12} r={4.6} fill="none" {...strokeProps(c)} strokeWidth={1.6} />
            <Path
              d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7"
              {...strokeProps(c)}
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          </G>
        )}
      </Svg>
    </Disc>
    </View>
  );
}

/**
 * The bar. In flow (it sits at the top of a scrolling page as the site's
 * does, sticky there); its torn paper hangs 20px past its box over whatever
 * follows, so the page under it should reserve `NAV_BLEED` or expect the
 * teeth to overlap its first 20px, as the site's pages do.
 */
export const NAV_BLEED = 20;

export function TornNav({ onBrand }: { onBrand?: () => void }) {
  const { colors, chrome, mode } = useTheme();
  const { vw, width } = useInk();
  const insets = useSafeAreaInsets();

  const height = insets.top + NAV_H;

  return (
    <View style={{ height, zIndex: 90 }}>
      <TornSheet
        edge="bottom"
        width={width}
        height={height}
        paper={colors.sheet}
        line={chrome.tearLine}
        haze={chrome.tearHaze}
        wash={chrome.tearWash}
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 22,
          paddingTop: insets.top + 12,
          paddingBottom: 14,
          paddingHorizontal: vw(5.5),
        }}
      >
        <Pressable
          onPress={onBrand}
          accessibilityRole="link"
          accessibilityLabel="Roman Reads home"
          style={{ flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1, minWidth: 0 }}
        >
          <Image
            source={MARK_192}
            style={{ width: 44, height: 44 }}
            resizeMode="contain"
            // brightness(0) invert(1) at night; by day the PNG's own ink
            tintColor={mode === "dark" ? "#ffffff" : undefined}
          />
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Txt family="Cormorant Garamond" weight={600} size={21} line={21} ls={0.01} numberOfLines={1}>
              Roman Reads
            </Txt>
            <Txt weight={600} size={8} ls={0.24} upper color="brass" numberOfLines={1} style={{ marginTop: 4 }}>
              Literature made simple
            </Txt>
          </View>
        </Pressable>

        {/* .rr-nav5--minimal .rr-nav5-theme{margin-left:auto} */}
        <View style={{ marginLeft: "auto", flexShrink: 0 }}>
          <SunMoon />
        </View>
      </View>
    </View>
  );
}
