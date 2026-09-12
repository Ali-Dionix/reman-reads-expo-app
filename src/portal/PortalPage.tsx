// The portal's page frame — appShellHtml's `.rr-ap-top` over the room's own
// `.rr-pt-content`, on a phone.
//
// THE TOP BAR STICKS. The site's does at both sizes (appShell.ts, "IT STICKS
// AT BOTH SIZES"): the room you are in stays named and back stays in reach
// without a scroll to the top. Its paper is genuinely opaque — two solid
// layers, not a blur — so content passing beneath is hidden behind the
// deckle. Here it is an absolutely positioned bar over the scroller, and the
// scroller pads its content by the bar's height plus the tear's 20px bleed,
// which is the site's `margin-bottom:20px` reserving the same 20px.
//
// The bar, per appShell.ts (mobile is the unqualified state):
//   .rr-ap-top      min-height 60; padding 11px 20px 13px; gap 12; sticky
//   lead            HOME: the 32px house mark in ink (.rr-ap-mark).
//                   ANY OTHER ROOM: a 36px back disc (.rr-ap-disc.rr-ap-back).
//   .rr-ap-title    i  700 8px Manrope .22em uppercase brass   ("Your account")
//                   b  600 19px/1.1 Cormorant ink, one line   (the room)
//   .rr-ap-top-ctrl margin-left:auto; gap 10: the GUEST stamp, the theme disc
//   .rr-ap-top-paper the two-layer torn sheet, HTEAR along its bottom
//   .rr-pt-content  padding-bottom: 64 + 30 + safe-area — clear of the fixed
//                   tab bar and its 17px bleed
//
// The desk under everything is `desk`: #FFFFFF by day and #0d1322 by night,
// restated by hand on the web because `white`'s own night is lighter.
//
// THE SCROLLER IS PAINTED OPAQUE, AND THAT IS NOT DECORATION. The site's body
// IS the desk, painted; a ScrollView here carries `transform: translateZ(0)`
// on the web build — a composited layer — and Chrome will only rasterise
// text with subpixel (LCD) anti-aliasing on a layer it can prove opaque. An
// unpainted scroller renders every glyph on every portal screen greyscale
// against the site's LCD type (measured on /profile: 0 coloured text pixels
// in a paragraph against the site's 2,556; 7.34% → 3.02% from this alone).
// So the ScrollView, its content container and the fixed frame all carry
// `desk`. On the phone it is simply the desk under the page.
//
// EXCEPT WHERE THE SITE'S OWN TEXT IS GREYSCALE. Two rooms carry a fixed
// sheet over the page on the web (the Listening Room's `.rr-lr-reader`, the
// Ask AI page's picker), and content painted after a composited fixed layer
// is squashed into a layer of its own that Chrome cannot prove opaque — so
// on THOSE pages the site's type is greyscale too. `lcd={false}` leaves the
// scroller unpainted there, so the rig compares like with like; a phone
// renders both the same.

import { useRouter } from "expo-router";
import { forwardRef, type ReactNode, type Ref } from "react";
import { Image, Pressable, ScrollView, View, type ScrollViewProps, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "../lib/session";
import { useInk } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { DashedBox } from "../ui/DashedBox";
import { Disc } from "../ui/Disc";
import { Icon } from "../ui/Icon";
import { TornSheet } from "../ui/TornEdge";
import { Kicker, Txt } from "../ui/Type";

const MARK = require("../../assets/mark.png");

/** --ap-topbox: the header's own height, without the status bar. */
export const TOP_BOX = 60;
/** --ap-toph − --ap-topbox: the tear's bleed the content reserves. */
export const TOP_BLEED = 20;
/** --ap-tab: the tab bar's slot height, without the safe area. */
export const TAB_H = 64;
/** --ap-gut: the phone gutter, `.rr-pt-wrap`'s padding. */
export const GUT = 20;

/** `.rr-pt-content` bottom padding: calc(var(--ap-tab) + 30px + env(safe-area-inset-bottom)). */
export function useContentInsets() {
  const insets = useSafeAreaInsets();
  return {
    top: insets.top + TOP_BOX + TOP_BLEED,
    bottom: TAB_H + 30 + insets.bottom,
  };
}

/**
 * `.rr-pt-theme` — the theme disc. The web shows the SUN in light and the
 * MOON in dark: the icon names the mode you are in, not the one you would
 * switch to. 36px, 1.5px ink ring at .32, brown glyph at 18px, 2° off true.
 */
export function ThemeDisc({ size = 36, glyph = 18 }: { size?: number; glyph?: number }) {
  const { colors, mode, toggle } = useTheme();
  const { ink } = useInk();
  const c = colors.brown;
  return (
    <Disc
      size={size}
      ring={ink(0.32, "border")}
      ringWidth={1.5}
      tilt={-2}
      onPress={toggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: mode === "dark" }}
      accessibilityLabel={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      hitSlop={6}
    >
      <Svg viewBox="0 0 24 24" width={glyph} height={glyph}>
        {mode === "dark" ? (
          <Path d="M20.2 13.6A8.1 8.1 0 0 1 10.4 3.8a8.1 8.1 0 1 0 9.8 9.8Z" fill={c} />
        ) : (
          <>
            <Path d="M12 12m-4.6 0a4.6 4.6 0 1 0 9.2 0a4.6 4.6 0 1 0 -9.2 0" fill="none" stroke={c} strokeWidth={1.6} />
            <Path
              d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7"
              stroke={c}
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          </>
        )}
      </Svg>
    </Disc>
  );
}

/**
 * `.rr-pt-guest` — the guest stamp: a dashed brick pill, 700 8px Manrope,
 * .12em at ≤760px ("GUEST" alone; the second word is dropped there), 1.5°
 * off true. appShell.ts sets 5px 9px and .2em; portalShared.ts's ≤760px
 * block, spliced in after it, cuts that to 6px 8px and .12em. The 1px
 * dashed border is INSIDE the box (border-box), so the padding here carries
 * it: 7px 9px around the letters, the ring drawn over the outer pixel. The
 * ring is SVG because it is a dashed ring on Android too.
 */
export function GuestStamp() {
  const { colors } = useTheme();
  const { brick } = useInk();
  return (
    <View
      accessibilityLabel="Guest mode. This is sample data, and nothing you do here is saved"
      style={{ transform: [{ rotate: "-1.5deg" }] }}
    >
      <View style={{ paddingVertical: 6 + 1, paddingHorizontal: 8 + 1 }}>
        <Txt weight={700} size={8} ls={0.12} upper style={{ color: colors.brick }}>
          Guest
        </Txt>
      </View>
      <DashedBox color={brick(0.55, "border")} width={1} radius={999} />
    </View>
  );
}

/** `.rr-ap-top` — the bar itself, with its torn paper. */
export function TopBar({
  title,
  eyebrow = "Your account",
  home = false,
  back = "/",
}: {
  title: string;
  eyebrow?: string;
  /** The Home room: the mark instead of a back disc. */
  home?: boolean;
  /** Where the back disc goes. Default: the app's home. */
  back?: string;
}) {
  const insets = useSafeAreaInsets();
  const { colors, chrome } = useTheme();
  const { width, ink } = useInk();
  const { guest } = useSession();
  const router = useRouter();

  const height = insets.top + TOP_BOX;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height,
        zIndex: 40,
      }}
    >
      <TornSheet
        edge="bottom"
        width={width}
        height={height}
        paper={colors.white}
        line={chrome.tearLine}
        haze={chrome.tearHaze}
        wash={chrome.tearWash}
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingTop: insets.top + 11,
          paddingBottom: 13,
          paddingHorizontal: GUT,
          minHeight: height,
        }}
      >
        {home ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Roman Reads, your account home"
            onPress={() => router.navigate("/")}
          >
            {/* .rr-ap-mark — the house-mark PNG masked and filled with ink;
                tintColor is RN's equivalent of that CSS mask. */}
            <Image source={MARK} style={{ width: 32, height: 32 }} tintColor={colors.ink} resizeMode="contain" />
          </Pressable>
        ) : (
          <Disc
            size={36}
            ring={ink(0.32, "border")}
            ringWidth={1.5}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.navigate(back as never);
            }}
            accessibilityLabel={back === "/" ? "Back to your account" : "Back"}
            hitSlop={6}
          >
            <Icon name="back" size={18} color={colors.brown} />
          </Disc>
        )}
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Kicker numberOfLines={1}>{eyebrow}</Kicker>
          <Txt
            family="Cormorant Garamond"
            weight={600}
            size={19}
            line={1.1}
            numberOfLines={1}
          >
            {title}
          </Txt>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {guest ? <GuestStamp /> : null}
          <ThemeDisc />
        </View>
      </View>
    </View>
  );
}

/**
 * A portal page. The bar over a scroller (or a fixed frame when `scroll` is
 * false, for a room that scrolls itself). Children sit directly on the desk,
 * edge to edge — wrap them in <Wrap> for `.rr-pt-wrap`'s 20px gutters.
 *
 * A STICKY BAR. The site's other sticky things (the library's search bar)
 * pin at `--ap-toph` — the 60px bar plus the 20px its tear hangs — while a
 * stickyHeaderIndices child pins at the scroller's own top edge. So with
 * `sticky` the scroller starts at the bar's box edge rather than padding
 * for it, `lead` goes in first, then the sticky child wearing the 20px
 * bleed as a transparent strip (content passes under the tear as it does on
 * the web), then the children. The lead's box ends where its flow spacing
 * would — the strip is pulled back over its last 20px.
 */
export const PortalPage = forwardRef(function PortalPage(
  {
    title,
    eyebrow,
    children,
    scroll = true,
    home,
    back,
    contentStyle,
    lead,
    sticky,
    keyboardShouldPersistTaps,
    lcd = true,
  }: {
    title: string;
    /** `.rr-ap-title i`. Default "Your account"; a sub-screen passes its room ("Profile"). */
    eyebrow?: string;
    children?: ReactNode;
    scroll?: boolean;
    /** Draw the mark rather than a back disc. Defaults to title === "Home". */
    home?: boolean;
    /** The back disc's destination. Default "/". */
    back?: string;
    contentStyle?: StyleProp<ViewStyle>;
    /** What scrolls away above a sticky bar (the room head). Only with `sticky`. */
    lead?: ReactNode;
    /** A bar pinned at `--ap-toph` once the lead has scrolled away. */
    sticky?: ReactNode;
    keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
    /** Paint the scroller opaque (the header's LCD-text note). False for a
     *  room whose site page has a fixed sheet over it. */
    lcd?: boolean;
  },
  ref: Ref<ScrollView>,
) {
  const { colors } = useTheme();
  const ground = lcd ? colors.desk : undefined;
  const insets = useSafeAreaInsets();
  const pad = useContentInsets();
  const isHome = home ?? title === "Home";

  return (
    <View style={{ flex: 1, backgroundColor: colors.desk }}>
      {scroll ? (
        sticky ? (
          <ScrollView
            ref={ref}
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={[1]}
            keyboardShouldPersistTaps={keyboardShouldPersistTaps}
            style={{ flex: 1, marginTop: insets.top + TOP_BOX, backgroundColor: ground }}
            contentContainerStyle={[
              { paddingTop: TOP_BLEED, paddingBottom: pad.bottom, backgroundColor: ground },
              contentStyle,
            ]}
          >
            <View style={{ marginBottom: -TOP_BLEED }}>{lead}</View>
            <View style={{ paddingTop: TOP_BLEED }}>{sticky}</View>
            {children}
          </ScrollView>
        ) : (
          <ScrollView
            ref={ref}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps={keyboardShouldPersistTaps}
            style={{ flex: 1, backgroundColor: ground }}
            contentContainerStyle={[
              { paddingTop: pad.top, paddingBottom: pad.bottom, backgroundColor: ground },
              contentStyle,
            ]}
          >
            {children}
          </ScrollView>
        )
      ) : (
        <View
          style={[
            { flex: 1, paddingTop: pad.top, paddingBottom: pad.bottom, backgroundColor: colors.desk },
            contentStyle,
          ]}
        >
          {children}
        </View>
      )}
      <TopBar title={title} eyebrow={eyebrow} home={isHome} back={back} />
    </View>
  );
});

/** `.rr-pt-wrap` — the page's own measure: 20px gutters, 1080 max. */
export function Wrap({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ paddingHorizontal: GUT, maxWidth: 1080, width: "100%", alignSelf: "center" }, style]}>
      {children}
    </View>
  );
}

/** Out of the gutters again, for a full-bleed band or a horizontal shelf. */
export function Bleed({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ marginHorizontal: -GUT }, style]}>{children}</View>;
}

/** globals.css's emphasis swoosh — a 320×14 tile stretched under the word. */
const SWOOSH = "M3 11.6C68 5.8 188 2.2 317 3.1C190 4.9 72 8.4 5 13.2Z";

/**
 * `.rr-pt-head` at app size — the room head every portal page opens with:
 * `.rr-pt-h1` at clamp(26px,6.8vw,36px)/1.04 and `.rr-pt-sub` at 13.5px/1.65
 * in ink .62, 10px under it. The kicker is display:none in the app shell.
 *
 * `em` is the h1's `<em>`: Cormorant 600 with globals.css's brass swoosh
 * under it — `::after` at height max(5px,.13em), bottom -.2em, 1.5% wider
 * than the word. One line on any phone, so the two halves sit in a row on
 * one baseline; `title` keeps its trailing space ("Ask AI ").
 */
export function Head({ title, em, sub, ls = -0.01 }: { title: string; em?: string; sub?: ReactNode; ls?: number }) {
  const { clamp } = useInk();
  const { colors } = useTheme();
  const size = clamp(26, 6.8, 36);
  // height: max(5px, .13em); bottom: -.2em — the box hangs .2em under the
  // inline-block, and its top is therefore .2em − height below its bottom.
  const h = Math.max(5, 0.13 * size);
  const hang = 0.2 * size - h;
  return (
    <View style={{ paddingVertical: 2 }}>
      {em ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline" }}>
          <Txt family="Cormorant Garamond" weight={500} size={size} line={1.04} ls={ls}>
            {title}
          </Txt>
          <View>
            <Txt family="Cormorant Garamond" weight={600} size={size} line={1.04} ls={ls}>
              {em}
            </Txt>
            {/* right:-1.5% — the swoosh runs 1.5% of the word past its end. */}
            <View style={{ position: "absolute", left: 0, right: "-1.5%", bottom: -(hang + h), height: h }}>
              <Svg width="100%" height={h} viewBox="0 0 320 14" preserveAspectRatio="none">
                <Path d={SWOOSH} fill={colors.brass} />
              </Svg>
            </View>
          </View>
        </View>
      ) : (
        <Txt family="Cormorant Garamond" weight={500} size={size} line={1.04} ls={ls}>
          {title}
        </Txt>
      )}
      {sub ? (
        <Txt size={13.5} line={1.65} tone={0.62} style={{ marginTop: 10, maxWidth: 34 * 16 }}>
          {sub}
        </Txt>
      ) : null}
    </View>
  );
}
