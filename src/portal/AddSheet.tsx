// `#rr-pt-side` — the sheet the centre disc opens, appShell.ts's own, at its
// ≤900px cut: a sheet of paper pushed up from the bottom of the screen, torn
// along its top edge like the bar it comes through (HTEAR_TOP), over a scrim.
//
// THE + SHEET IS THE ADD-A-BOOK SHEET. Not a menu: the four ways a book gets
// into a reader's library (ADD_WAYS), each a full-width row — a 46px disc,
// the name at reading size, the line that says what it actually takes, and a
// chevron, or a LOCK where the chevron would be while the four are behind the
// subscription. Under them one line of small print says what the padlocks
// mean and what it costs. Then, under a dashed rule at the foot, the two
// rooms the tab bar has no slot for — Orders and Ask AI — as small print with
// chevrons. Deliberately the quietest thing in the sheet, and the only place
// in the navigation those rooms are reachable, which is why they stay.
//
// Copy is appShell.ts's verbatim: the head, the four rows' labels and notes,
// the gate line, the foot's labels (out of PORTAL_NAV). Every note is cut to
// one line on a 375px phone on the web; the widths here are the same.
//
// Behaviour, as portalClient wires the web's: a scrim that closes on tap, a
// row that closes on press, Escape → the Android back button (Modal's
// onRequestClose). The rows arrive in sequence — 4 × 45ms under a 380ms
// sheet, so the last lands while the paper is still moving.
//
// WHERE THE FOUR ROWS GO. On the web every row opens the import sheet
// (importSheet.ts), which is baked into /account only; other rooms link to
// /account?add=<key> and the enhancer opens the panel on arrival. The app has
// no import sheet yet, so a row navigates Home carrying the same `add`
// param — TODO(imports): the Home screen should open the import sheet for
// `add` once it exists, as ImportsEnhancer does.

import { useRouter } from "expo-router";
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

import { PRICE_PER_MONTH, useSubscription } from "../lib/subscription";
import { roomByKey, SHEET_KEYS } from "../nav/rooms";
import { useInk } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { Disc } from "../ui/Disc";
import { Chevron, Icon, type IconName } from "../ui/Icon";
import { Rule } from "../ui/Rule";
import { TornSheet } from "../ui/TornEdge";
import { Txt } from "../ui/Type";
import { GUT } from "./PortalPage";
import { strokeProps } from "../ui/svgPaint";

/** ADD_WAYS, verbatim. `key` is `?add=` off the home screen. */
export type AddWay = {
  key: "files" | "scan" | "text" | "link";
  label: string;
  note: string;
  icon: IconName;
};

export const ADD_WAYS: AddWay[] = [
  { key: "files", label: "Files", note: "PDF, EPUB, Word, HTML or plain text", icon: "files" },
  { key: "scan", label: "Scan", note: "Take photos of the pages", icon: "camera" },
  { key: "text", label: "Text", note: "Paste a chapter or a whole book", icon: "pencil" },
  { key: "link", label: "Link", note: "A link to an article or web page", icon: "link" },
];

const EASE = Easing.bezier(0.22, 0.61, 0.36, 1);

export function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { colors, chrome } = useTheme();
  // the four ways are behind the subscription — the site's answer, null-is-
  // locked until it has answered (paintLocks bakes the padlocks ON likewise)
  const { active: subscribed } = useSubscription();
  const locked = !subscribed;
  const { ink, brick, width } = useInk();
  const insets = useSafeAreaInsets();
  const { height: vh } = useWindowDimensions();
  const router = useRouter();

  // Mounted while open OR while the close animation runs.
  const [mounted, setMounted] = useState(open);
  const [sheetH, setSheetH] = useState(0);
  const slide = useRef(new Animated.Value(1)).current; // 1 = off screen
  const scrim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 380, easing: EASE, useNativeDriver: true }),
        Animated.timing(scrim, { toValue: 1, duration: 340, easing: Easing.ease, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(slide, { toValue: 1, duration: 380, easing: EASE, useNativeDriver: true }),
        Animated.timing(scrim, { toValue: 0, duration: 340, easing: Easing.ease, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [open, mounted, slide, scrim]);

  if (!mounted) return null;

  const go = (href: string, params?: Record<string, string>) => {
    onClose();
    // Let the sheet start down before the room changes under it.
    setTimeout(() => {
      if (params) router.navigate({ pathname: href, params } as never);
      else router.navigate(href as never);
    }, 60);
  };

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(sheetH, 400) * 1.02],
  });

  return (
    <Modal transparent visible statusBarTranslucent onRequestClose={onClose} animationType="none">
      {/* .rr-pt-scrim — the room dimmed behind the sheet, not blacked out */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: chrome.scrim, opacity: scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>

      <Animated.View
        accessibilityViewIsModal
        accessibilityLabel="Add your own book"
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          setSheetH((prev) => (prev === h ? prev : h));
        }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: vh * 0.86,
          paddingBottom: insets.bottom,
          transform: [{ translateY }],
        }}
      >
        {sheetH > 0 ? (
          <TornSheet
            edge="top"
            width={width}
            height={sheetH}
            paper={colors.white}
            line={chrome.tearLine}
            haze={chrome.sheetHaze}
            hazeSpread="sheet"
          />
        ) : null}

        {/* .rr-ap-sheet-in — padding 12px 20px 22px */}
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 12, paddingHorizontal: GUT, paddingBottom: 22 }}
        >
          {/* THE GRABBER — a hairline of ink at .16, 38×4 */}
          <View
            style={{
              alignSelf: "center",
              width: 38,
              height: 4,
              borderRadius: 999,
              backgroundColor: colors.ink,
              opacity: 0.16,
              marginBottom: 12,
            }}
          />

          {/* .rr-ap-sheet-h */}
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt weight={700} size={9} ls={0.22} upper color="brass">
                Your library
              </Txt>
              <Txt
                family="Cormorant Garamond"
                weight={600}
                size={27}
                line={1.02}
                ls={-0.005}
                style={{ marginTop: 3 }}
              >
                Add your own book.
              </Txt>
              <Txt size={12.5} line={1.55} style={{ marginTop: 7, maxWidth: 31 * 16, opacity: 0.6 }}>
                Four ways to bring one in. A book you add is yours alone, and nobody else can open it.
              </Txt>
            </View>
            {/* .rr-pt-side-shut — 32px ring at brick .35, gold2 glyph */}
            <Disc
              size={32}
              ring={brick(0.35, "border")}
              ringWidth={1}
              onPress={onClose}
              accessibilityLabel="Close"
              hitSlop={8}
            >
              <Svg viewBox="0 0 16 16" width={13} height={13}>
                <Path
                  d="M3.4 3.4l9.2 9.2M12.6 3.4l-9.2 9.2"
                  {...strokeProps(colors.gold2)}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
              </Svg>
            </Disc>
          </View>

          {/* .rr-ap-add — the four ways in */}
          <View style={{ marginTop: 18 }}>
            <Rule />
            {ADD_WAYS.map((w, i) => (
              <AddRow
                key={w.key}
                way={w}
                index={i}
                locked={locked}
                open={open}
                onPress={() => go("/", { add: w.key })}
              />
            ))}
          </View>

          {/* .rr-ap-add-gate — hidden for a subscriber on the web (paintLocks) */}
          {locked ? (
            <View
              style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 13, opacity: 0.62 }}
            >
              <Txt weight={700} size={8.5} ls={0.2} upper color="brass">
                Included
              </Txt>
              <Txt size={11.5} line={1.5} style={{ flex: 1 }}>
                All four open with the subscription, {PRICE_PER_MONTH}, the same one that opens every
                audiobook.
              </Txt>
            </View>
          ) : null}

          {/* .rr-ap-side-foot — the two rooms with no tab */}
          <View style={{ marginTop: 16 }}>
            <Rule />
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                columnGap: 22,
                rowGap: 6,
                paddingTop: 13,
                paddingHorizontal: 2,
              }}
            >
              {SHEET_KEYS.map((k) => {
                const room = roomByKey(k);
                return (
                  <Pressable
                    key={k}
                    onPress={() => go(room.route)}
                    accessibilityRole="link"
                    accessibilityLabel={room.label}
                    hitSlop={6}
                    style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                  >
                    <Txt weight={700} size={10} ls={0.13} upper color="brick">
                      {room.label}
                    </Txt>
                    <Chevron kind="sheet" size={11} color={colors.brick} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

/**
 * `.rr-ap-add-row` — grid 46px · 1fr · 20px, gap 15, min-height 74, padding
 * 14px 2px, on a dashed hairline. Presses down under the finger (.982) and
 * the disc fills with ink at the moment of the press.
 */
function AddRow({
  way,
  index,
  locked,
  open,
  onPress,
}: {
  way: AddWay;
  index: number;
  locked: boolean;
  open: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { ink, brick } = useInk();
  const arrive = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!open) return;
    arrive.setValue(0);
    Animated.timing(arrive, {
      toValue: 1,
      duration: 420,
      delay: 50 + index * 45,
      easing: EASE,
      useNativeDriver: true,
    }).start();
  }, [open, index, arrive]);

  return (
    <Animated.View
      style={{
        opacity: arrive,
        transform: [{ translateY: arrive.interpolate({ inputRange: [0, 1], outputRange: [9, 0] }) }],
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={locked ? `${way.label}. ${way.note}. Subscription` : `${way.label}. ${way.note}`}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          columnGap: 15,
          minHeight: 74,
          paddingVertical: 14,
          paddingHorizontal: 2,
          transform: [{ scale: pressed ? 0.982 : 1 }],
        })}
      >
        {({ pressed }) => (
          <>
            <Disc
              size={46}
              ring={pressed ? colors.ink : brick(0.32, "border")}
              ringWidth={1}
              fill={pressed ? colors.ink : undefined}
              tilt={pressed ? 3 : -4}
            >
              <Icon name={way.icon} size={21} color={pressed ? colors.paper : colors.gold2} />
            </Disc>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Txt weight={600} size={16} line={1.25} ls={-0.005} color="ink2">
                {way.label}
              </Txt>
              <Txt size={12} line={1.45} style={{ opacity: 0.55 }}>
                {way.note}
              </Txt>
            </View>
            <View style={{ width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
              {locked ? (
                <Icon name="lock" size={17} color={colors.gold2} />
              ) : (
                <Chevron kind="sheet" size={20} color={ink(0.34)} />
              )}
            </View>
          </>
        )}
      </Pressable>
      <Rule />
    </Animated.View>
  );
}
