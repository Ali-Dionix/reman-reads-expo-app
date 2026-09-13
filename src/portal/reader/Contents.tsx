// The contents drawer — `[data-rr-lr-drawer]`, `.rr-lr-drawer` with
// `.rr-lr-drawer-tabs` (`.rr-lr-dtab` × 2, `.rr-lr-drawer-x`),
// `.rr-lr-drawer-pane` × 2, the chapters `.rr-lr-toc` (`.rr-lr-band-go`,
// `.rr-lr-go-row` — the numeral `i`, the label `b`, the dotted
// `.rr-lr-go-lead`, `.rr-lr-go-time` — `.rr-lr-go-needle`, `.rr-lr-go-here`)
// and the bookmarks pane (`.rr-lr-slips`: `.rr-lr-slip-add` / `.rr-lr-slip-idle`,
// `.rr-lr-slip-row` with `.rr-lr-slip-hit` and `.rr-lr-slip-x`, the
// write-once `.rr-lr-slip-note`, `.rr-lr-slips-empty`), under the scrim
// `.rr-lr-dscrim` — and the deck's `.rr-lr-chip`, which only a slip press
// raises. THE CHIP STANDS UNDER THE DRAWER, as it does on the site: the
// deck stacks it at z-index 4 and the drawer is 6, so on a phone — where
// the only slip press is in the drawer — a reader never sees the sentence,
// only the fresh slip and its note input. Not blessed as a deviation, so
// not fixed here: the same view, bug and all.
//
// Site: app/data/accountListeningPage.ts — drawerBandsHtml and the drawer's
// rules at the ≤900px branch: a torn card (CARD_BG_DAY / CARD_BG_NIGHT under
// the five-layer mask — TornCard) standing `bottom:calc(100% + 6px)` over
// the console, `left:8px;right:8px`, capped at 70vh, its desk-only
// anticlockwise set released (`transform:none`); the pane pads 72px at its
// foot (the ≤980px rule). Behaviour in app/components/ListeningEnhancer.tsx
// — openDrawer / shutDrawer / paintDrawer, the [data-rr-lr-band-go] handler,
// markPlayingLeaf (is-here / is-playing), paintProgress (the per-band
// needle, seeded from the ledger's resting band and ticking on the sounding
// one), paintSlips, pressSlip, saveSlipNote and showChip.
//
// TWO TABS, because the site has two: "Chapters" and "Bookmarks". Both panes
// stay mounted and the idle one is hidden, as the site's `[hidden]` does, so
// a reader who scrolls to chapter 34, looks at Bookmarks and comes back is
// still at chapter 34.
//
// A chapter row PLAYS that chapter (the site's band-go): a guest is refused
// by the deck and told why on the console. The frame decides whether the
// drawer shuts on the tap (Reader.tsx onBand).
//
// THE ENTRANCE. `.rr-lr-drawer.is-lifting` → translateY(16px) + opacity 0,
// released over .38s cubic-bezier(.22,.61,.36,1); the scrim fades over .3s.
// Shutting is instant (`hidden`), the scrim fading out behind. Reduced
// motion skips the lift, as the site's `reduced.matches` does. The lift is
// started from the drawer's FIRST layout, so the card is never seen without
// its paper: the stock is cut from the measured box.
//
// CSS COLLAPSES ADJACENT VERTICAL MARGINS; Yoga sums them. The slips pane's
// margins are therefore written as the COLLAPSED gaps — each element carries
// the max of its own top margin and its predecessor's bottom, and only the
// last carries a bottom.

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Line, Path } from "react-native-svg";

import { chaptersOf, mmss, useDeck, type Recording } from "../../lib/audioStore";
import { ownerOf } from "../../lib/portalState";
import { useSession } from "../../lib/session";
import { FONTS, lh, snap } from "../../theme/type";
import { DashedBox, useBox } from "../../ui/DashedBox";
import { SmallCaps } from "./contents/SmallCaps";
import { TornCard } from "./contents/TornCard";
import {
  addBookmark,
  noteBookmark,
  removeBookmark,
  useBookmarks,
  type Owner,
  type WordAnchor,
} from "./contents/slips";
import { strokeProps } from "../../ui/svgPaint";

/** accountListeningPage.ts roman() — I to X, then the arabic figure. */
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const roman = (n: number): string => ROMAN[n] ?? String(n + 1);

export type Pane = "bands" | "slips";

/** `.rr-lr-drawer{left:8px;right:8px}` — the card's width is known before
 *  the first layout. */
const DRAWER_INSET = 8;
/** the entrance: .38s cubic-bezier(.22,.61,.36,1), from 16px down */
const LIFT_MS = 380;
const LIFT_EASE = Easing.bezier(0.22, 0.61, 0.36, 1);
const LIFT_PX = 16;
/** .rr-lr-dscrim{transition:opacity .3s} */
const SCRIM_MS = 300;
/** showChip — the chip stands for six seconds */
const CHIP_MS = 6000;
/** `.rr-lr-drawer-x` / `.rr-lr-slip-x` set no font-family, so the × is the
 *  UA button face — Arial on the golden. A phone draws it in its own sans
 *  (Roboto / SF): an unset family is the platform's default. */
const X_FACE = Platform.OS === "web" ? "Arial, Helvetica, sans-serif" : undefined;

/* ------------------------------------------------------------- colours --- */

// The reader is hand-set for night (accountListeningPage.ts, "Night
// Scriptorium"): the day literal, and the night literal the site's dark
// block writes for it — or, for the two brand colours the light tables DO
// carry (brick #7E2D1F, ink2 #171411), the mapped value measured off the
// golden.
const C = {
  tab: ["rgba(11,10,8,.55)", "rgba(240,229,207,.7)"],
  tabOn: ["#0B0A08", "#F4EBD6"],
  tabRule: ["#7E2D1F", "#D2AF69"],
  x: ["rgba(11,10,8,.6)", "rgba(240,229,207,.6)"],
  rowRule: ["rgba(110,86,58,.26)", "rgba(201,166,98,.3)"],
  numeral: ["#7E2D1F", "#D98A70"],
  numeralOn: ["#0B0A08", "#F4EBD6"],
  label: ["#171411", "#EADFC6"],
  lead: ["rgba(110,86,58,.55)", "rgba(201,166,98,.5)"],
  time: ["rgba(110,86,58,.95)", "rgba(210,175,105,.9)"],
  needle: ["rgba(11,10,8,.11)", "rgba(240,229,207,.14)"],
  needleFill: ["#9B7A4D", "#D2AF69"],
  here: ["#7E2D1F", "#D2AF69"],
  hand: ["#6E563A", "#C4A37A"],
  slipAdd: ["#7E2D1F", "#D98A70"],
  slipAddRing: ["rgba(126,45,31,.55)", "rgba(217,138,112,.6)"],
  slipAddBg: ["rgba(255,255,255,.7)", "rgba(22,29,44,.5)"],
  slipBar: ["#7E2D1F", "#D98A70"],
  slipX: ["rgba(11,10,8,.45)", "rgba(240,229,207,.45)"],
  slipQ: ["rgba(110,86,58,.95)", "rgba(210,175,105,.85)"],
  // .rr-lr-slip-note — dashed, on a wash of the card
  noteRing: ["rgba(110,86,58,.5)", "rgba(201,166,98,.45)"],
  noteBg: ["rgba(255,255,255,.8)", "rgba(22,29,44,.6)"],
  // .rr-lr-chip
  chipBg: ["#FFFFFF", "#1D2537"],
  chipRing: ["#0B0A08", "rgba(244,235,214,.85)"],
  chipInk: ["#171411", "#EADFC6"],
  chipBtn: ["#7E2D1F", "#D2AF69"],
} as const;
const pick = (pair: readonly [string, string], night: boolean) => (night ? pair[1] : pair[0]);

/** shape-rendering, which react-native-svg's types do not carry (Rule.tsx). */
const CRISP = { shapeRendering: "crispEdges" } as object;

/** `border-bottom:1px dotted` as Chrome paints it at 1px: one-pixel dots on a
 *  two-pixel period (measured on the golden; the kit's Rule "dotted" runs
 *  the same 1-on-1-off now, but not this anchoring), and the pattern is
 *  anchored at the RIGHT end — the last pixel is a dot — with the first
 *  pixel always painted too. On a leader of odd snapped width that is the
 *  plain 1-1 pattern from the left; on an even one the dots sit on the odd
 *  pixels with a lone dot at 0 (measured: golden dots at 215 then 216, 218
 *  … 314 across a 100px leader). The snapped width is round(right) −
 *  round(left) as Chrome snaps a box, measured in WINDOW space — onLayout's
 *  x and width are the web target's offsetLeft/offsetWidth, rounded each
 *  on its own, which is a different parity on a third of the rows. */
function Leader({ color }: { color: string }) {
  const ref = useRef<View>(null);
  const [even, setEven] = useState(false);
  const onLayout = () => {
    ref.current?.measureInWindow((x, _y, width) => {
      const snapped = Math.round(x + width) - Math.round(x);
      setEven(snapped % 2 === 0);
    });
  };
  return (
    <View ref={ref} onLayout={onLayout} style={styles.lead} {...HIDDEN}>
      <Svg width="100%" height={1}>
        {even ? (
          <>
            <Line x1={0} y1={0.5} x2={1} y2={0.5} {...strokeProps(color)} strokeWidth={1} {...CRISP} />
            <Line
              x1={0}
              y1={0.5}
              x2="100%"
              y2={0.5}
              {...strokeProps(color)}
              strokeWidth={1}
              strokeDasharray="1 1"
              strokeDashoffset={1}
              {...CRISP}
            />
          </>
        ) : (
          <Line x1={0} y1={0.5} x2="100%" y2={0.5} {...strokeProps(color)} strokeWidth={1} strokeDasharray="1 1" {...CRISP} />
        )}
      </Svg>
    </View>
  );
}

/* ---------------------------------------------------------------- icons --- */

/** icSlip — the slip, 14px on the press button. */
function SlipGlyph({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M6 3h8v14l-4-3-4 3V3Z" {...strokeProps(color)} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

/* -------------------------------------------------------------- hidden --- */

/** The site's `aria-hidden="true"` on a decorative span. */
const HIDDEN = { accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" } as const;

/** The scroll offset of a pane that is hidden and shown again. Both panes
 *  stay mounted, but `display:none` destroys a scroller's offset (on the web
 *  target as in Chrome), so it is kept here and put back on show. */
function usePaneScroll(shown: boolean) {
  const ref = useRef<ScrollView>(null);
  const y = useRef(0);
  const onScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    y.current = e.nativeEvent.contentOffset.y;
  }, []);
  useEffect(() => {
    if (!shown || y.current <= 0) return;
    const at = y.current;
    const raf = requestAnimationFrame(() => ref.current?.scrollTo({ y: at, animated: false }));
    return () => cancelAnimationFrame(raf);
  }, [shown]);
  return { ref, onScroll };
}

/* --------------------------------------------------------------- drawer --- */

type Chip = { text: string; offerNote: boolean };

export function Contents({
  open,
  pane,
  onPane,
  onOpen,
  onClose,
  recording,
  night,
  onBand,
  onSlip,
  wordAnchor,
  bottom,
  maxHeight,
}: {
  open: boolean;
  pane: Pane;
  onPane: (pane: Pane) => void;
  /** Open the drawer on a pane — the chip's "add a note" after the drawer
   *  was shut (the site's openDrawer("slips")). */
  onOpen: (pane: Pane) => void;
  onClose: () => void;
  recording: Recording;
  night: boolean;
  /** A chapter row was tapped — the frame cues it, turns the leaf, and
   *  decides whether the drawer shuts. */
  onBand: (band: number) => void;
  /** A slip was tapped — the frame lands the needle there and turns the
   *  leaf, ON the word when the slip carries one (the site's revealWord). */
  onSlip: (band: number, seconds: number, word?: number) => void;
  /** readAlong.ts wordAnchor(): the word sounding at `seconds` in the
   *  standing galley, with ~six words around it — null when the sounding
   *  chapter's galley is not standing. A slip pressed then rides the word. */
  wordAnchor: (seconds: number) => WordAnchor | null;
  bottom: number;
  maxHeight: number;
}) {
  const { width: windowW } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [box, onLayout] = useBox();
  // whose marks: the site's rr-account-owner — a guest's are a guest's
  const { user } = useSession();
  const owner = ownerOf(user?.id);

  // mounted while open, and while the scrim fades behind a shut drawer
  const [shown, setShown] = useState(open);
  const lift = useSharedValue(0);
  const scrim = useSharedValue(0);
  // the lift starts from the first layout after each open
  const lifted = useRef(false);
  // EACH OPEN IS A FRESH MOUNT. A drawer shut and re-opened inside the
  // scrim's 300ms fade would otherwise keep its old subtree, whose onLayout
  // (async from the layout pass) can land before the passive effect below
  // zeroes the lift — starting the lift and then having it reset to 0 with
  // no layout to follow: a drawer standing invisible. The count turns on
  // the same render that flips `open`, so the drawer's key changes with it
  // and its first onLayout is always after the synchronous reset.
  const prevOpen = useRef(false);
  const openCount = useRef(0);
  if (open !== prevOpen.current) {
    prevOpen.current = open;
    if (open) openCount.current += 1;
  }
  useLayoutEffect(() => {
    if (!open) return;
    lifted.current = false;
    lift.value = 0;
  }, [open, lift]);

  useEffect(() => {
    if (open) {
      setShown(true);
      scrim.value = reduced ? 1 : withTiming(1, { duration: SCRIM_MS });
      return;
    }
    // shutDrawer: `hidden` at once; the scrim's transition runs it out
    lift.value = 0;
    if (reduced) {
      scrim.value = 0;
      setShown(false);
      return;
    }
    scrim.value = withTiming(0, { duration: SCRIM_MS }, (done) => {
      if (done) runOnJS(setShown)(false);
    });
  }, [open, reduced, lift, scrim]);

  const onDrawerLayout = (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    onLayout(e);
    if (lifted.current || !open) return;
    lifted.current = true;
    lift.value = reduced ? 1 : withTiming(1, { duration: LIFT_MS, easing: LIFT_EASE });
  };

  const drawerStyle = useAnimatedStyle(() => ({
    opacity: lift.value,
    transform: [{ translateY: LIFT_PX * (1 - lift.value) }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));

  /* --------------------------------------------------- the chip --- */

  const [chip, setChip] = useState<Chip | null>(null);
  const chipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showChip = useCallback((text: string, offerNote: boolean) => {
    setChip({ text, offerNote });
    AccessibilityInfo.announceForAccessibility(text);
    if (chipTimer.current) clearTimeout(chipTimer.current);
    chipTimer.current = setTimeout(() => {
      setChip(null);
      chipTimer.current = null;
    }, CHIP_MS);
  }, []);
  useEffect(
    () => () => {
      if (chipTimer.current) clearTimeout(chipTimer.current);
    },
    [],
  );
  // THE FRESH SLIP lives here, not in the pane: the site's freshMarkId
  // outlives a shut drawer (only a save, or the slip's ×, clears it), and
  // the pane unmounts with the drawer. So does the chip's ask to focus the
  // note — the site's chip-note handler: hide the chip, openDrawer("slips"),
  // focus the input on the next frame. The pane takes the ask when it next
  // renders, which is the same commit that mounts it if the drawer was shut.
  const [fresh, setFresh] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const noteFocusAsk = useRef(false);
  const chipNote = () => {
    setChip(null);
    noteFocusAsk.current = true;
    onOpen("slips");
  };

  // The chip is the DECK's, not the drawer's: it stands its six seconds
  // whether the drawer is open or shut — and shutting the drawer is exactly
  // how a phone reader gets to see it, and its "add a note". So it is
  // rendered outside the `shown` gate.
  const chipEl = chip ? (
    // .rr-lr-chip — the deck's own, `bottom:calc(100% + 9px)`, left/right 8
    // at ≤900px, at z-index 4 — UNDER the drawer (6), as the site has it;
    // see the header. It is still announced, so a screen reader hears what
    // a sighted reader does not see while the drawer stands.
    <View
      style={[
        styles.chip,
        {
          bottom: bottom + 3,
          backgroundColor: pick(C.chipBg, night),
          borderColor: pick(C.chipRing, night),
          boxShadow: night
            ? "0 2px 8px rgba(0,0,0,.55)"
            : "2px 3px 2px rgba(54,42,28,.14), 6px 9px 16px rgba(54,42,28,.18)",
        },
      ]}
      accessibilityLiveRegion="polite"
    >
      <Text style={[styles.chipText, { color: pick(C.chipInk, night) }]}>{chip.text}</Text>
      {chip.offerNote ? (
        <Pressable onPress={chipNote} accessibilityRole="button">
          <Text style={[styles.chipBtn, { color: pick(C.chipBtn, night) }]}>add a note</Text>
        </Pressable>
      ) : null}
    </View>
  ) : null;

  if (!shown) return chipEl;

  return (
    <>
      {/* .rr-lr-dscrim — over the stage, under both bands (their z-index 3
          to its 1); aria-hidden on the site, so it carries no name here */}
      <Animated.View style={[styles.scrim, scrimStyle]} pointerEvents={open ? "auto" : "none"}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        />
      </Animated.View>
      {open ? (
        <Animated.View
          key={openCount.current}
          style={[styles.drawer, { bottom, maxHeight }, drawerStyle]}
          onLayout={onDrawerLayout}
          // the site's [data-rr-lr-drawer] is role=region — a landmark the
          // tabs can be found from
          role="region"
          accessibilityLabel="Chapters and bookmarks"
        >
          <TornCard width={box.w || windowW - 2 * DRAWER_INSET} height={box.h} night={night} id="rr-drawer" />

          {/* .rr-lr-drawer-tabs — Chapters / Bookmarks, and the × */}
          <View style={styles.tabs} accessibilityRole="tablist" accessibilityLabel="Choose chapters or bookmarks">
            {(["bands", "slips"] as const).map((which) => {
              const on = pane === which;
              const label = which === "bands" ? "Chapters" : "Bookmarks";
              return (
                <Pressable
                  key={which}
                  onPress={() => onPane(which)}
                  accessibilityRole="tab"
                  // the site's CSS small caps leave the name as written;
                  // SmallCaps synthesises them by uppercasing, so the name is
                  // set here, not read off the runs
                  accessibilityLabel={label}
                  accessibilityState={{ selected: on }}
                  // react-native-web 0.21 writes aria-selected only from the aria prop
                  aria-selected={on}
                  style={[styles.dtab, { borderBottomColor: on ? pick(C.tabRule, night) : "transparent" }]}
                >
                  <SmallCaps
                    size={14.5}
                    ls={0.16}
                    fontFamily={FONTS.serifRegular}
                    lineHeight={lh("Cormorant Garamond", 14.5)}
                    color={on ? pick(C.tabOn, night) : pick(C.tab, night)}
                  >
                    {label}
                  </SmallCaps>
                </Pressable>
              );
            })}
            <Pressable
              onPress={onClose}
              style={styles.drawerX}
              accessibilityRole="button"
              accessibilityLabel="Close chapters and bookmarks"
            >
              <Text style={[styles.drawerXText, { color: pick(C.x, night) }]}>×</Text>
            </Pressable>
          </View>

          {/* both panes stand; the idle one is `hidden` */}
          <Bands recording={recording} night={night} onBand={onBand} shown={pane === "bands"} />
          <Slips
            owner={owner}
            recording={recording}
            night={night}
            onSlip={onSlip}
            wordAnchor={wordAnchor}
            shown={pane === "slips"}
            showChip={showChip}
            fresh={fresh}
            setFresh={setFresh}
            note={note}
            setNote={setNote}
            noteFocusAsk={noteFocusAsk}
          />
        </Animated.View>
      ) : null}
      {chipEl}
    </>
  );
}

/* ---------------------------------------------------------- the chapters --- */

/** One `.rr-lr-band-go` row. Memoised: the pane re-renders on every 500ms
 *  tick of the deck's position while the drawer stands, and only the
 *  sounding row's needle changes — forty-odd Pressables, leaders and text
 *  runs re-rendered twice a second is a scroll stutter on a mid-range
 *  phone. Every prop is a primitive but `onPress`, which is stable. */
const Row = memo(function Row({
  i,
  title,
  time,
  isHere,
  lit,
  ratio,
  night,
  last,
  onPress,
}: {
  i: number;
  title: string;
  time: string;
  isHere: boolean;
  lit: boolean;
  ratio: number;
  night: boolean;
  last: boolean;
  onPress: (band: number) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(i)}
      accessibilityRole="button"
      // the numeral and the leader are aria-hidden on the site, and
      // "now playing" shows only on the here-row
      accessibilityLabel={`${title} ${time}${isHere ? " now playing" : ""}`}
      accessibilityState={{ selected: isHere }}
      style={[
        styles.go,
        { borderTopColor: pick(C.rowRule, night) },
        last && { borderBottomWidth: 1, borderBottomColor: pick(C.rowRule, night) },
      ]}
    >
      {/* .rr-lr-go-row — numeral, label, leader, time, on one baseline */}
      <View style={styles.goRow}>
        <Text style={[styles.num, { color: lit ? pick(C.numeralOn, night) : pick(C.numeral, night) }]} {...HIDDEN}>
          {roman(i)}
        </Text>
        <Text style={[styles.label, { color: pick(C.label, night) }]} numberOfLines={1}>
          {title}
        </Text>
        {/* .rr-lr-go-lead — an empty inline-block whose bottom border is
            the leader; its baseline is its bottom edge, lifted 4px */}
        <Leader color={pick(C.lead, night)} />
        <Text style={[styles.time, { color: pick(C.time, night) }]}>{time}</Text>
      </View>
      {/* .rr-lr-go-needle — the per-band needle, 2px, 34px in */}
      <View style={[styles.needle, { backgroundColor: pick(C.needle, night) }]} {...HIDDEN}>
        <View style={[styles.needleFill, { width: `${ratio * 100}%`, backgroundColor: pick(C.needleFill, night) }]} />
      </View>
      {isHere ? (
        <View style={styles.hereWrap}>
          <SmallCaps
            size={11.5}
            ls={0.18}
            fontFamily={FONTS.serifRegular}
            lineHeight={lh("Cormorant Garamond", 11.5)}
            color={pick(C.here, night)}
          >
            now playing
          </SmallCaps>
        </View>
      ) : null}
    </Pressable>
  );
});

function Bands({
  recording,
  night,
  onBand,
  shown,
}: {
  recording: Recording;
  night: boolean;
  onBand: (band: number) => void;
  shown: boolean;
}) {
  const { now, playing, voice, position, spots } = useDeck();
  const { ref, onScroll } = usePaneScroll(shown);
  // the frame's onBand is a fresh closure on every tick (the frame reads the
  // deck too); the rows get one stable function so their memo holds
  const onBandRef = useRef(onBand);
  onBandRef.current = onBand;
  const press = useCallback((i: number) => onBandRef.current(i), []);
  // "the needle is here" marks the row even while paused; the playing colour
  // only while it actually sounds (markPlayingLeaf)
  const here = now?.slug === recording.slug;
  const band = here ? (now?.band ?? -1) : -1;
  const chapters = chaptersOf(recording, here ? voice : (recording.voiceId ?? null));
  // the ledger's resting band seeds its needle; the sounding band ticks
  const spot = spots[recording.slug];
  const ratioOf = (i: number, dur: number): number => {
    if (!dur) return 0;
    const seconds = here && i === band ? position : spot && spot.chapter === i ? spot.seconds : -1;
    return seconds < 0 ? 0 : Math.min(1, seconds / dur);
  };

  return (
    <ScrollView
      ref={ref}
      onScroll={onScroll}
      scrollEventThrottle={64}
      style={[styles.pane, !shown && styles.hidden]}
      contentContainerStyle={styles.paneIn}
      showsVerticalScrollIndicator={false}
      role="tabpanel"
      accessibilityLabel="Chapters"
      accessibilityElementsHidden={!shown}
      importantForAccessibility={shown ? "auto" : "no-hide-descendants"}
    >
      {chapters.map((c, i) => {
        const isHere = i === band;
        return (
          <Row
            key={c.n}
            i={i}
            title={c.title}
            time={mmss(c.duration)}
            isHere={isHere}
            lit={isHere && playing}
            ratio={ratioOf(i, c.duration)}
            night={night}
            last={i === chapters.length - 1}
            onPress={press}
          />
        );
      })}
    </ScrollView>
  );
}

/* ---------------------------------------------------------- the bookmarks --- */

function Slips({
  owner,
  recording,
  night,
  onSlip,
  wordAnchor,
  shown,
  showChip,
  fresh,
  setFresh,
  note,
  setNote,
  noteFocusAsk,
}: {
  owner: Owner;
  recording: Recording;
  night: boolean;
  onSlip: (band: number, seconds: number, word?: number) => void;
  wordAnchor: (seconds: number) => WordAnchor | null;
  shown: boolean;
  showChip: (text: string, offerNote: boolean) => void;
  /** the slip just pressed carries a write-once note input (freshMarkId) —
   *  held by the drawer, which outlives this pane */
  fresh: string | null;
  setFresh: (id: string | null) => void;
  note: string;
  setNote: (text: string) => void;
  /** the chip's "add a note": focus the fresh slip's input when next rendered */
  noteFocusAsk: React.MutableRefObject<boolean>;
}) {
  const { now, position } = useDeck();
  const { ref, onScroll } = usePaneScroll(shown);
  const marks = useBookmarks(owner, recording.slug);
  // "Live only while this book is sounding" — on the platter, playing or paused
  const sounding = now?.slug === recording.slug;
  const band = now?.band ?? 0;
  const hand = pick(C.hand, night);

  const noteRef = useRef<TextInput>(null);
  useEffect(() => {
    if (!noteFocusAsk.current || !noteRef.current) return;
    noteFocusAsk.current = false;
    const raf = requestAnimationFrame(() => noteRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  });

  // THE NOTE INPUT SCROLLS INTO VIEW when it takes focus: the browser does
  // that for the site's input, a RN ScrollView does not — and on iOS the
  // keyboard covers a fresh slip that sits low in the pane (the frame lifts
  // the drawer clear of the keyboard; this brings the row up to its foot).
  // The fresh row's box is its onLayout in the pane's content, the pane's
  // own height its onLayout.
  const paneH = useRef(0);
  const freshBox = useRef({ y: 0, h: 0 });
  const revealNote = () => {
    const { y, h } = freshBox.current;
    const want = y + h - paneH.current + 6;
    if (want > 0) ref.current?.scrollTo({ y: want, animated: true });
  };

  // pressSlip — every outcome answers: the limit, a slip already within
  // three seconds, or a fresh mark with the offer of a note
  const press = async () => {
    if (!sounding) {
      AccessibilityInfo.announceForAccessibility("Nothing is playing, play a chapter first.");
      return;
    }
    // when the galley for the sounding band is standing, the slip is
    // pressed ON the word — index + excerpt ride the mark
    const r = await addBookmark(owner, recording.slug, band, position, wordAnchor(position));
    if (!r) {
      showChip("This book is at its bookmark limit. Remove one first.", false);
      return;
    }
    if (r.already) {
      showChip(`A bookmark is already saved at ${mmss(r.mark.seconds)}, Chapter ${roman(r.mark.band)}.`, false);
      return;
    }
    setFresh(r.mark.id);
    setNote("");
    showChip(`Bookmark saved at ${mmss(r.mark.seconds)}, Chapter ${roman(r.mark.band)}.`, true);
  };

  // saveSlipNote — on Enter and on blur alike; the input goes either way
  const saveNote = () => {
    if (!fresh) return;
    const id = fresh;
    const text = note;
    setFresh(null);
    setNote("");
    if (text.trim()) void noteBookmark(owner, recording.slug, id, text);
  };

  const remove = (id: string) => {
    if (fresh === id) setFresh(null);
    void removeBookmark(owner, recording.slug, id);
  };

  const last = marks.length - 1;

  return (
    <ScrollView
      ref={ref}
      onScroll={onScroll}
      scrollEventThrottle={64}
      style={[styles.pane, !shown && styles.hidden]}
      contentContainerStyle={styles.paneIn}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onLayout={(e) => {
        paneH.current = e.nativeEvent.layout.height;
      }}
      role="tabpanel"
      accessibilityLabel="Bookmarks"
      accessibilityElementsHidden={!shown}
      importantForAccessibility={shown ? "auto" : "no-hide-descendants"}
    >
      {sounding ? (
        // .rr-lr-slip-add — the press, a dashed brick pill across the pane
        <Pressable
          onPress={() => void press()}
          style={[styles.slipAdd, { backgroundColor: pick(C.slipAddBg, night) }]}
          accessibilityRole="button"
        >
          <DashedBox color={pick(C.slipAddRing, night)} width={1.5} radius={2} />
          <SlipGlyph color={pick(C.slipAdd, night)} size={14} />
          <Text style={[styles.slipAddText, { color: pick(C.slipAdd, night) }]}>
            {`Save a bookmark · Chapter ${roman(band)} · ${mmss(position)}`}
          </Text>
        </Pressable>
      ) : (
        // .rr-lr-slip-idle
        <Text style={[styles.slipIdle, { color: hand }]}>
          play a chapter first, then you can save a bookmark.
        </Text>
      )}
      {marks.length === 0 ? (
        // .rr-lr-slips-empty — the site's own empty line, in the hand
        <Text style={[styles.slipsEmpty, { color: hand }]}>
          no bookmarks yet. your place is saved automatically, and a bookmark marks a moment you
          want to find again.
        </Text>
      ) : (
        marks.map((m, i) => {
          const at = `Chapter ${roman(m.band)} · ${mmss(m.seconds)}`;
          const isFresh = m.id === fresh;
          return (
            // .rr-lr-slip-row — a brick bar down its left, the hit, the ×
            <View
              key={m.id}
              onLayout={
                isFresh
                  ? (e) => {
                      freshBox.current = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height };
                    }
                  : undefined
              }
            >
              <View style={[styles.slipRow, i === last && !isFresh && styles.slipRowLast]}>
                <View style={[styles.slipBar, { backgroundColor: pick(C.slipBar, night) }]} {...HIDDEN} />
                <Pressable
                  onPress={() => onSlip(m.band, m.seconds, m.word)}
                  style={styles.slipHit}
                  accessibilityRole="button"
                  accessibilityLabel={`Go to ${at}`}
                >
                  <SmallCaps
                    size={14.5}
                    ls={0.1}
                    fontFamily={FONTS.serif}
                    lineHeight={lh("Cormorant Garamond", 14.5)}
                    color={pick(C.label, night)}
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {at}
                  </SmallCaps>
                  {m.note ? <Text style={[styles.slipNote, { color: hand }]}>{m.note}</Text> : null}
                  {m.excerpt ? (
                    <Text style={[styles.slipQ, { color: pick(C.slipQ, night) }]}>{`“${m.excerpt}”`}</Text>
                  ) : null}
                </Pressable>
                <Pressable
                  onPress={() => remove(m.id)}
                  style={styles.slipX}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove the bookmark at ${at}`}
                >
                  <Text style={[styles.slipXText, { color: pick(C.slipX, night) }]}>×</Text>
                </Pressable>
              </View>
              {/* .rr-lr-slip-note — under the fresh slip, once */}
              {isFresh ? (
                <View style={[styles.noteBox, { backgroundColor: pick(C.noteBg, night) }]}>
                  <DashedBox color={pick(C.noteRing, night)} width={1} radius={2} />
                  <TextInput
                    ref={noteRef}
                    value={note}
                    onChangeText={setNote}
                    onFocus={revealNote}
                    onBlur={saveNote}
                    onSubmitEditing={saveNote}
                    maxLength={200}
                    placeholder="a word to remember it by (optional)"
                    placeholderTextColor={night ? "rgba(196,163,122,.6)" : "rgba(110,86,58,.6)"}
                    accessibilityLabel="A note for this bookmark"
                    returnKeyType="done"
                    style={[styles.noteInput, { color: hand }]}
                  />
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

/* -------------------------------------------------------------- styles --- */

const styles = StyleSheet.create({
  // .rr-lr-dscrim{background:rgba(11,10,8,.28)} — z-index 1, under the bands
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(11,10,8,.28)", zIndex: 1 },
  // ≤900px: a bottom sheet over the dimmed stage — left/right 8, rising from
  // the console, z-index 6. The desk card's anticlockwise set is released
  // here (`transform:none`): a sheet pinned to both margins reads as tilted
  // chrome, not a torn card. The stock is the TornCard behind.
  drawer: {
    position: "absolute",
    left: DRAWER_INSET,
    right: DRAWER_INSET,
    zIndex: 6,
  },
  // .rr-lr-drawer-tabs{flex:none;gap:2px;padding:19px 20px 0}
  tabs: { flexDirection: "row", alignItems: "center", gap: 2, paddingTop: 19, paddingHorizontal: 20 },
  // .rr-lr-dtab{border-bottom:2px solid transparent;padding:7px 11px 8px}
  dtab: { paddingTop: 7, paddingBottom: 8, paddingHorizontal: 11, borderBottomWidth: 2 },
  // .rr-lr-drawer-x{margin-left:auto;padding:6px 9px;font-size:15px;line-height:1}
  drawerX: { marginLeft: "auto", paddingVertical: 6, paddingHorizontal: 9 },
  // no font-family on the site: the × is the browser's default button face
  // (Arial on the golden), so it is drawn in the platform sans, not Manrope
  drawerXText: { fontFamily: X_FACE, fontSize: 15, lineHeight: 15 },
  // .rr-lr-drawer-pane{flex:1 1 auto;min-height:0;overflow-y:auto;padding:6px 22px 24px}
  // — and ≤980px: padding-bottom:72px
  pane: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  // .rr-lr-drawer-pane[hidden]{display:none}
  hidden: { display: "none" },
  paneIn: { paddingTop: 6, paddingHorizontal: 22, paddingBottom: 72 },
  // .rr-lr-drawer-pane .rr-lr-band-go{padding:11px 2px 10px}; border-top 1px
  go: { borderTopWidth: 1, paddingTop: 11, paddingBottom: 10, paddingHorizontal: 2 },
  // .rr-lr-go-row{display:flex;align-items:baseline;gap:10px}
  goRow: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  // i{flex:none;width:24px;font:italic 600 15px Cormorant}
  num: { width: 24, fontFamily: FONTS.serifItalic, fontSize: 15, lineHeight: lh("Cormorant Garamond", 15) },
  // b{min-width:0;font:600 17px Cormorant;white-space:nowrap;text-overflow:ellipsis}
  label: { flexShrink: 1, minWidth: 0, fontFamily: FONTS.serif, fontSize: 17, lineHeight: lh("Cormorant Garamond", 17) },
  // .rr-lr-go-lead{flex:1;min-width:10px;border-bottom:1px dotted;transform:translateY(-4px)}
  lead: { flex: 1, minWidth: 10, height: 1, transform: [{ translateY: -4 }] },
  // .rr-lr-go-time{flex:none;font:15px Cormorant;tabular-nums}
  time: { fontFamily: FONTS.serifRegular, fontSize: 15, lineHeight: lh("Cormorant Garamond", 15), fontVariant: ["tabular-nums"] },
  // .rr-lr-go-needle{margin:8px 0 0 34px;height:2px;overflow:hidden}
  needle: { marginTop: 8, marginLeft: 34, height: 2, overflow: "hidden" },
  needleFill: { position: "absolute", left: 0, top: 0, bottom: 0 },
  // .rr-lr-go-here{margin:6px 0 0 34px}
  hereWrap: { marginTop: 6, marginLeft: 34 },

  // THE SLIPS PANE, with its margins COLLAPSED as CSS collapses them:
  //   add   margin:10px 0 6px      idle  margin:12px 2px 6px
  //   empty margin:12px 2px        row   margin:8px 0
  //   note  margin:0 0 10px (an inline replaced box: its 10 stays inside
  //         the line box and the next row's 8 lands on top of it)
  // add/idle → empty: max(6,12)=12; add/idle → row: max(6,8)=8; row → row 8;
  // row → note 8; note → row 18. Each element carries the gap ABOVE it, and
  // only the last carries one below.

  // .rr-lr-slip-add{gap:8px;min-height:40px;padding:9px 12px;
  //   border:1.5px dashed;border-radius:2px;font:700 11px Manrope;.06em;uppercase}
  slipAdd: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    minHeight: 40,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 2,
  },
  slipAddText: { fontFamily: FONTS.sansBold, fontSize: 11, letterSpacing: 0.66, textTransform: "uppercase", lineHeight: lh("Manrope", 11) },
  // .rr-lr-slip-idle{font:500 14px/1.5 Caveat;rotate(-.4deg)}
  slipIdle: {
    marginTop: 12,
    marginHorizontal: 2,
    fontFamily: FONTS.hand,
    fontSize: 14,
    lineHeight: snap(21),
    transform: [{ rotate: "-0.4deg" }],
  },
  // .rr-lr-slips-empty{font:500 14.5px/1.5 Caveat;rotate(-.5deg)} — the last
  // child, so it keeps its 12 below
  slipsEmpty: {
    marginTop: 12,
    marginBottom: 12,
    marginHorizontal: 2,
    fontFamily: FONTS.hand,
    fontSize: 14.5,
    lineHeight: snap(21.75),
    transform: [{ rotate: "-0.5deg" }],
  },
  // .rr-lr-slip-row{align-items:center;gap:8px;padding-left:11px}
  slipRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, paddingLeft: 11 },
  slipRowLast: { marginBottom: 8 },
  // ::before — 3px brick bar, 8px in from top and bottom, at .85
  slipBar: { position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2, opacity: 0.85 },
  // .rr-lr-slip-hit{flex:1;gap:3px;padding:8px 6px;border-radius:2px}
  slipHit: { flex: 1, minWidth: 0, gap: 3, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 2 },
  // em{font:500 15px Caveat;rotate(-.6deg);transform-origin:left}
  slipNote: { fontFamily: FONTS.hand, fontSize: 15, lineHeight: lh("Caveat", 15), transform: [{ rotate: "-0.6deg" }], transformOrigin: "left" },
  // .rr-lr-slip-q{font:italic 13.5px/1.45 Cormorant}
  slipQ: { fontFamily: FONTS.serifItalicLight, fontSize: 13.5, lineHeight: snap(13.5 * 1.45) },
  // .rr-lr-slip-x{width:28px;height:28px;border-radius:50%;font-size:16px;line-height:1}
  slipX: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  slipXText: { fontFamily: X_FACE, fontSize: 16, lineHeight: 16 },
  // .rr-lr-slip-note{width:100%;margin:0 0 10px;padding:8px 10px;border:1px dashed;
  //   border-radius:2px;font:500 15px Caveat} — the ring is the DashedBox
  noteBox: { marginTop: 8, marginBottom: 10, borderRadius: 2 },
  noteInput: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontFamily: FONTS.hand,
    fontSize: 15,
    lineHeight: lh("Caveat", 15),
  },

  // .rr-lr-chip{left:8px;right:8px;z-index:4;align-items:baseline;gap:10px;
  //   padding:9px 13px;border:1.5px solid;border-radius:2px;font:14.5px Cormorant;
  //   rotate(-.8deg)} — under the drawer, as the site stacks it
  chip: {
    position: "absolute",
    left: 8,
    right: 8,
    zIndex: 4,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderWidth: 1.5,
    borderRadius: 2,
    transform: [{ rotate: "-0.8deg" }],
  },
  chipText: { flexShrink: 1, fontFamily: FONTS.serifRegular, fontSize: 14.5, lineHeight: lh("Cormorant Garamond", 14.5) },
  // .rr-lr-chip button{font:600 12px Manrope;text-decoration:underline;underline-offset 2px}
  chipBtn: { fontFamily: FONTS.sansSemi, fontSize: 12, lineHeight: lh("Manrope", 12), textDecorationLine: "underline" },
});
