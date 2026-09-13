// `.rr-im.is-upgrade` — the gate panel a locked cell opens: the argument for
// the subscription, IN PLACE, on the screen the reader is already on. A
// transcription of app/data/importUpgrade.ts (importUpgradeHtml +
// importUpgradeCss) at its phone branch — the unqualified rules plus the two
// short-phone cuts (≤740px and ≤640px tall), which pick by the live height.
//
// The site's own phone view is this whole panel: a full-screen card on paper
// (100dvh, no radius, no shadow), the close disc floating over its top-right,
// the drawn device up top bleeding into the copy through a 44px fade, and the
// copy pinned to the foot — brand, headline, lede, the four ways, the
// included line, the price row, the press, the fine print. Copy verbatim.
//
// WHY IT EXISTS. The five "Add your own book" cells and the + sheet's rows
// used to leave the app for /account?add=<key> in the reader's real browser,
// where no portal session lives — portalClient.initPortal replaces to /login
// and drops the param, so a guest and a subscriber alike landed on the site's
// login page with the intent lost. On the web the same tap opens THIS panel
// in place; now it does here too. Only the Continue press goes out, through
// openToBuy ("browsing in, buying out" — the app never starts a checkout),
// and it goes to the site's own gate-login href, `/login?next=%2Faccount%3F
// add%3D<key>` — the one URL that keeps the intent across the site's sign-in
// and lands the reader on this same panel with the site's Stripe press live.
//
// COLOURS. importUpgrade.ts's three vars are hexes the token pass maps as
// backgrounds (--upgrade-paper #FFFFFF → white, --upgrade-ink #0B0A08 → ink,
// --upgrade-brass #9B7A4D → brass), so they flip after dark on their own;
// muted type is rgba(11,10,8,.x) on `color`, ink at alpha. box-shadow never
// maps, hence the one night rule for the device's shadow — carried in DEVICE.
//
// A KIT PIECE: Home's five cells open it, and the Library room's locked
// cells want the same panel; `gateHref(key)` is the one URL both go out on.

import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useInk } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { Disc } from "../ui/Disc";
import { Icon, type IconName } from "../ui/Icon";
import { Txt } from "../ui/Type";
import { fillProps, strokeProps } from "../ui/svgPaint";

/** appShell.ts ADD_WAYS, verbatim — the four rows the device shows and the
 *  four labels the copy lists. */
const ADD_WAYS: { key: "files" | "scan" | "text" | "link"; label: string; note: string; icon: IconName }[] = [
  { key: "files", label: "Files", note: "PDF, EPUB, Word, HTML or plain text", icon: "files" },
  { key: "scan", label: "Scan", note: "Take photos of the pages", icon: "camera" },
  { key: "text", label: "Text", note: "Paste a chapter or a whole book", icon: "pencil" },
  { key: "link", label: "Link", note: "A link to an article or web page", icon: "link" },
];

/** app/data/subscription.ts — PRICE_LABEL. */
const PRICE_LABEL = "$14.99";

/** The gate's way out, exactly as importUpgrade.ts writes the login href:
 *  the site's sign-in, with the panel as `next`. */
export const gateHref = (key: string): string =>
  `/login?next=${encodeURIComponent(`/account?add=${key}`)}`;

const EASE = Easing.bezier(0.22, 0.61, 0.36, 1);

/** The device's night shadow — box-shadow is never token-mapped. */
const DEVICE = {
  shadow: { light: "0 16px 40px rgba(11,10,8,.13)", dark: "0 16px 40px rgba(0,0,0,.4)" },
} as const;

export function GateSheet({
  open,
  onClose,
  onContinue,
  guest,
}: {
  open: boolean;
  onClose: () => void;
  /** The press. The caller decides where it goes (openToBuy). */
  onContinue: () => void;
  /** paintGate's `subGuest`: a guest is offered the sign-in, not the sale. */
  guest: boolean;
}) {
  const { colors, mode } = useTheme();
  const { ink, brass, width, clamp } = useInk();
  const insets = useSafeAreaInsets();
  const { height: vh } = useWindowDimensions();

  // Mounted while open OR while the close animation runs.
  const [mounted, setMounted] = useState(open);
  const rise = useRef(new Animated.Value(1)).current; // 1 = off screen

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.timing(rise, { toValue: 0, duration: 320, easing: EASE, useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(rise, { toValue: 1, duration: 260, easing: EASE, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) setMounted(false);
        },
      );
    }
  }, [open, mounted, rise]);

  if (!mounted) return null;

  // The two short-phone cuts: the device gives up height first, the type
  // second, and the press never moves off the bottom of the screen.
  const pocket = vh <= 640;
  const short = vh <= 740;
  const art = pocket
    ? { min: 140, max: 196, top: 44, fade: 30 }
    : short
      ? { min: 182, max: 266, top: 50, fade: 44 }
      : { min: 250, max: 380, top: 58, fade: 44 };
  const deviceW = short ? Math.min(238, width * 0.62) : Math.min(248, width * 0.66);
  const h2 = pocket ? 30 : short ? 34 : clamp(36, 9, 46);
  const ledeSize = pocket ? 14 : short ? 14.5 : 15.5;
  const gutter = width <= 380 ? 20 : 24;

  const paper = colors.white;
  const shutSize = pocket ? 36 : 40;

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [0, vh] });

  return (
    <Modal transparent visible statusBarTranslucent onRequestClose={onClose} animationType="none">
      <Animated.View
        accessibilityViewIsModal
        accessibilityLabel="Roman Reads Subscription"
        style={[StyleSheet.absoluteFill, { backgroundColor: paper, transform: [{ translateY }] }]}
      >
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ minHeight: vh, flexGrow: 1 }}
        >
          {/* .rr-im-upgrade — min-height 100dvh; column */}
          <View style={{ flex: 1, minHeight: vh, flexDirection: "column" }}>
            {/* --- .rr-im-upgrade-art: one device, centred, bleeding into the copy --- */}
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{
                position: "relative",
                flexGrow: 9,
                flexShrink: 1,
                flexBasis: 0,
                minHeight: art.min,
                maxHeight: art.max,
                alignItems: "center",
                justifyContent: "flex-start",
                paddingTop: art.top + insets.top,
                paddingHorizontal: gutter,
                overflow: "hidden",
                backgroundColor: paper,
              }}
            >
              <Device width={deviceW} short={short} paper={paper} shadow={DEVICE.shadow[mode]} />
              {/* ::after — the fade into the paper */}
              <LinearGradient
                pointerEvents="none"
                // the paper at alpha 0, not "transparent" — a gradient to
                // rgba(0,0,0,0) greys on its way there
                colors={[`${paper}00`, paper]}
                style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: art.fade, zIndex: 1 }}
              />
            </View>

            {/* --- .rr-im-upgrade-copy: one left edge for every line of it --- */}
            <View
              style={{
                flexGrow: 1,
                flexShrink: 1,
                justifyContent: "flex-end",
                paddingTop: short ? 16 : 20,
                paddingHorizontal: gutter,
                paddingBottom: (pocket ? 14 : 20) + insets.bottom,
                backgroundColor: paper,
              }}
            >
              {/* .rr-im-upgrade-brand */}
              <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: short ? 8 : 10 }}>
                <Txt family="Cormorant Garamond" weight={600} size={17} line={1.3}>
                  Roman Reads
                </Txt>
                <View
                  style={{
                    marginLeft: 10,
                    paddingLeft: 12,
                    borderLeftWidth: 1,
                    borderLeftColor: brass(0.45, "border"),
                  }}
                >
                  <Txt weight={600} size={12} line={1.4} color="brass">
                    Subscription
                  </Txt>
                </View>
              </View>

              {/* h2 — "Your books,<br><i>read out loud.</i>" */}
              <Txt family="Cormorant Garamond" weight={500} size={h2} line={1} ls={-0.025} accessibilityRole="header">
                Your books,{"\n"}
                <Txt family="Cormorant Garamond" weight={500} italic size={h2} line={1} ls={-0.025} color="brass">
                  read out loud.
                </Txt>
              </Txt>

              {/* .rr-im-upgrade-lede */}
              <Txt size={ledeSize} line={1.55} tone={0.66} style={{ marginTop: pocket ? 10 : short ? 12 : 14 }}>
                One subscription. Every audiobook on the site, plus any book you add yourself, in a voice you
                pick.
              </Txt>

              {/* .rr-im-upgrade-ways — four even columns */}
              <View
                accessibilityLabel="Included ways to add a book"
                style={{
                  flexDirection: "row",
                  marginTop: pocket ? 12 : short ? 14 : 18,
                  columnGap: width <= 380 ? 6 : 8,
                  rowGap: width <= 380 ? 9 : 10,
                }}
              >
                {ADD_WAYS.map((w) => (
                  <View
                    key={w.key}
                    style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: width <= 380 ? 5 : 7 }}
                  >
                    <Icon name={w.icon} size={18} color={colors.brass} />
                    <Txt weight={500} size={width <= 380 ? 12.5 : 13.5} line={1.5} numberOfLines={1}>
                      {w.label}
                    </Txt>
                  </View>
                ))}
              </View>

              {/* .rr-im-upgrade-included */}
              <Txt
                size={pocket ? 12 : 13}
                line={1.6}
                tone={0.6}
                style={{ marginTop: pocket ? 10 : short ? 12 : 16 }}
              >
                You can also clone your own voice to read them. Books you add are private to you.
              </Txt>

              {/* .rr-im-upgrade-bottom */}
              <View style={{ paddingTop: pocket ? 16 : short ? 16 : 22 }}>
                {/* .rr-im-upgrade-price */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "baseline",
                    gap: 3,
                    marginBottom: pocket ? 10 : 14,
                  }}
                >
                  <Txt weight={600} size={23} line={1.4} ls={-0.04}>
                    {PRICE_LABEL}
                  </Txt>
                  <Txt size={14} line={1.4} tone={0.66}>
                    {" "}
                    / month
                  </Txt>
                  <Txt size={12} line={1.4} tone={0.66} style={{ marginLeft: "auto" }}>
                    Cancel anytime
                  </Txt>
                </View>

                {/* .rr-im-upgrade-continue — the press (button for a reader, link for a guest) */}
                <Pressable
                  onPress={onContinue}
                  accessibilityRole={guest ? "link" : "button"}
                  accessibilityLabel="Continue"
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 16,
                    minHeight: pocket ? 50 : 56,
                    paddingVertical: pocket ? 13 : 15,
                    paddingHorizontal: pocket ? 22 : 24,
                    borderWidth: 1,
                    borderColor: colors.ink,
                    borderRadius: 8,
                    backgroundColor: colors.ink,
                    opacity: pressed ? 0.86 : 1,
                  })}
                >
                  <Txt weight={600} size={16} line={1.5} style={{ color: paper }}>
                    Continue
                  </Txt>
                  <Svg viewBox="0 0 24 24" width={20} height={20}>
                    <Path
                      d="M4 12h15m-6-6 6 6-6 6"
                      {...strokeProps(paper)}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </Pressable>

                {/* .rr-im-gate-fine — paintGate's two wordings */}
                <Txt
                  size={12}
                  line={1.5}
                  tone={0.55}
                  style={{ marginTop: pocket ? 8 : 10, textAlign: "center" }}
                  accessibilityRole="text"
                >
                  {guest ? "Sign in to choose your subscription." : "Monthly subscription. Cancel from Settings."}
                </Txt>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* .rr-im-h > .rr-im-shut — floats over the art, top right; 40px,
            paper ground, 1px ink .16 ring, ink glyph */}
        <View
          style={{
            position: "absolute",
            top: (pocket ? 8 : 12) + insets.top,
            right: gutter,
            zIndex: 2,
          }}
        >
          <Disc
            size={shutSize}
            ring={ink(0.16, "border")}
            fill={paper}
            onPress={onClose}
            accessibilityLabel="Close"
            hitSlop={8}
          >
            <Svg viewBox="0 0 16 16" width={12} height={12}>
              <Path
                d="M3.4 3.4l9.2 9.2M12.6 3.4l-9.2 9.2"
                {...strokeProps(colors.ink)}
                strokeWidth={1.7}
                strokeLinecap="round"
              />
            </Svg>
          </Disc>
        </View>
      </Animated.View>
    </Modal>
  );
}

/**
 * `.rr-im-up-device` — the phone, drawn: a bezel (1px ink .16, radius 30,
 * paper, 9/19.5), a status strip, and the app's own add sheet on its screen —
 * ADD_WAYS unlocked, then the deck row that says what the four rows are FOR.
 * The window bar (.rr-im-up-chrome) is desktop chrome and stays out.
 */
function Device({ width, short, paper, shadow }: { width: number; short: boolean; paper: string; shadow: string }) {
  const { colors } = useTheme();
  const { ink, brass } = useInk();
  const height = (width * 19.5) / 9;
  return (
    <View
      style={{
        width,
        height,
        flexDirection: "column",
        borderWidth: 1,
        borderColor: ink(0.16, "border"),
        borderRadius: 30,
        backgroundColor: paper,
        boxShadow: shadow,
        overflow: "hidden",
      }}
    >
      {/* .rr-im-up-status */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingTop: 9,
          paddingHorizontal: 16,
          paddingBottom: 4,
        }}
      >
        <Txt weight={700} size={8} ls={0.02}>
          9:41
        </Txt>
        <View
          style={{
            flex: 1,
            height: 9,
            maxWidth: 52,
            marginHorizontal: "auto",
            borderRadius: 5,
            backgroundColor: colors.ink,
            opacity: 0.82,
          }}
        />
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 1.5 }}>
          {[3, 5, 7].map((h) => (
            <View key={h} style={{ width: 2, height: h, borderRadius: 1, backgroundColor: colors.ink, opacity: 0.5 }} />
          ))}
        </View>
      </View>

      {/* .rr-im-up-screen */}
      <View style={{ flex: 1, minHeight: 0, paddingTop: 10, paddingHorizontal: 14, overflow: "hidden" }}>
        <Txt weight={700} size={6} ls={0.2} upper color="brass">
          Add to your library
        </Txt>
        <Txt
          family="Cormorant Garamond"
          weight={500}
          size={short ? 14 : 15}
          line={1.1}
          ls={-0.01}
          style={{ marginTop: 3, marginBottom: short ? 6 : 8 }}
        >
          Your books
        </Txt>

        {/* .rr-im-up-rows */}
        {ADD_WAYS.map((w, i) => (
          <View
            key={w.key}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 9,
              paddingVertical: short ? 5 : 7,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: ink(0.08, "border"),
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: brass(0.32, "border"),
                borderRadius: 12,
              }}
            >
              <Icon name={w.icon} size={13} color={colors.brass} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt weight={600} size={9.5} line={1.3}>
                {w.label}
              </Txt>
              <Txt size={7.5} line={1.35} tone={0.52} numberOfLines={1} ellipsizeMode="tail" style={{ marginTop: 1 }}>
                {w.note}
              </Txt>
            </View>
            <Svg viewBox="0 0 16 16" width={9} height={9}>
              <Path
                d="M6 3.5 10.5 8 6 12.5"
                {...strokeProps(ink(0.3))}
                strokeWidth={1.9}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        ))}

        {/* .rr-im-up-deck — a chapter already being read */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 9,
            marginTop: 13,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: ink(0.08, "border"),
          }}
        >
          <View
            style={{
              width: 26,
              height: 26,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 13,
              backgroundColor: colors.ink,
            }}
          >
            <Svg viewBox="0 0 14 14" width={9} height={9}>
              <Path d="M3 2.2v9.6l8-4.8-8-4.8Z" {...fillProps(colors.paper)} />
            </Svg>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt weight={600} size={9.5} line={1.3}>
              Chapter one
            </Txt>
            {/* .rr-im-up-line — a 2px track (::before, ink at .12) and a 38% brass fill */}
            <View style={{ position: "relative", marginTop: 5, height: 2, borderRadius: 1, overflow: "hidden" }}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.ink, opacity: 0.12 }]} />
              <View style={{ width: "38%", height: "100%", borderRadius: 1, backgroundColor: colors.brass }} />
            </View>
          </View>
          <Txt weight={500} size={7.5} tone={0.45}>
            12:04
          </Txt>
        </View>
      </View>
    </View>
  );
}
