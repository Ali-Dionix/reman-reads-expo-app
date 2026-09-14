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

import { Image, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useInk } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { SunMoon } from "../ui/ThemeSwitch";
import { TornSheet } from "../ui/TornEdge";
import { Txt } from "../ui/Type";

const MARK_192 = require("../../assets/mark-192.png");

/** `.rr-nav5` box height at ≤600px: 12 + 44 + 14. */
export const NAV_H = 70;

/**
 * `.rr-nav5-theme` — the theme switch. Drawn in src/ui/ThemeSwitch.tsx, where
 * the portal bar's disc shares it; re-exported here for the reader's console,
 * which imports it from the bar.
 */
export { SunMoon } from "../ui/ThemeSwitch";

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
