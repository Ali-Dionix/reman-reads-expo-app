// The bound volume, held one-handed — `.rr-lr-vol .rr-lr-book` at its ≤900px
// branch (app/data/accountListeningPage.ts, "the volume, held one-handed").
//
// "A phone cannot carry a spread, so it carries the OTHER way a book is held:
// open at a single leaf, the spine under your thumb on the left. Everything
// the two-up spread says with a gutter, this says with a spine — the cloth
// turning the corner, the silk bands at head and tail, the block of leaves
// stacked either side of the one you are on, and the page bending into the
// hinge. The turn is a real turn and the corner is dog-eared, because that is
// the control a book actually gives you."
//
// This is what the site stands for a book whose pages are NOT rendered (and
// for every book before a chapter is opened): four baked leaves — the
// frontispiece, the title page, the contents, the colophon — in the desk's
// case. The codex of rendered pages (Codex.tsx) is a different object in the
// same kind of case.
//
// Element order, top down, as volumeHtml() writes it: the case (`.rr-lr-book`
// with its `::before` fillet and `::after` spine), the block (`.rr-lr-block`
// with a cut edge either side), the window (`.rr-lr-win`), the track of
// leaves, and — in the window — the two dog-ears. The desk's arrows
// (`.rr-lr-turn`) are `display:none` at this width.
//
// Behaviour: ListeningEnhancer.tsx paintLeaf (the cut edges, the disabled
// ends), goLeaf / turn (the track slides .58s cubic-bezier(.22,.61,.36,1)),
// clampLeaf / reachCount (one leaf at a time never lands on the pastedown),
// onTouchEnd (a horizontal swipe of 48px or more across the stage is a page
// turn, "as on any book"), and leafAt[slug] — the leaf a book was left on is
// kept for the visit, so re-opening a book you shut mid-way stands the page
// you were actually on, not the frontispiece.

import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Defs, FeDropShadow, Filter, LinearGradient as SvgGrad, Polygon, Rect, Stop } from "react-native-svg";

import { useDeck, type Recording } from "../../../lib/audioStore";
import { Colophon, ContentsLeaf, Frontispiece, TitlePage } from "./leaves";

/* -------------------------------------------------------- the cut edges --- */

/**
 * paintLeaf's `--pl` / `--pr` for a baked volume at `--per:1`: base 3, swing
 * 9 — "a phone's page needs the width more than the gauge needs the swing,
 * and the stack still visibly crosses over as you read".
 */
export function volumeEdges(leaf: number, reach: number): { pl: number; pr: number } {
  const span = Math.max(1, reach - 1);
  const at = Math.max(0, Math.min(span, leaf));
  const base = 3;
  const swing = 9;
  return {
    pl: Math.round((base + swing * (at / span)) * 10) / 10,
    pr: Math.round((base + swing * ((span - at) / span)) * 10) / 10,
  };
}

/**
 * `.rr-lr-block::before/::after` — `repeating-linear-gradient(90deg, #F6EEDB
 * 0 1px, rgba(110,86,58,.42) 1px 2px)`, top:2px bottom:2px, outside the
 * block over the cloth: fifty leaves seen end-on. Night: gilt catching the
 * lamp — `#26314A 0 1px, rgba(210,175,105,.65) 1px 2px`.
 */
function CutEdge({
  width,
  side,
  night,
  at,
}: {
  width: number;
  side: "left" | "right";
  night: boolean;
  /** Where the edge sits against its parent; the animated slot passes 0. */
  at?: number;
}) {
  const paper = night ? "#26314A" : "#F6EEDB";
  const rule = night ? "rgba(210,175,105,.65)" : "rgba(110,86,58,.42)";
  const w = Math.ceil(width);
  return (
    <View style={[styles.cut, { width, [side]: at ?? -width }]}>
      <Svg width={w} height="100%" viewBox={`0 0 ${w} 1`} preserveAspectRatio="none">
        {Array.from({ length: w }, (_, i) => (
          <Rect key={i} x={i} y={0} width={1} height={1} fill={i % 2 ? rule : paper} />
        ))}
      </Svg>
    </View>
  );
}

/* ------------------------------------------------------------ the spine --- */

/**
 * `.rr-lr-book::after` at ≤900px — 18px of cloth folding round the corner:
 * the hinge's dark line, the highlight where the cloth turns, the crease
 * beside the block; and the striped silk at the head and the tail, 11×4,
 * 5px in from each end.
 */
function Spine() {
  return (
    <View style={styles.spine}>
      <LinearGradient
        colors={[
          "rgba(0,0,0,.5)",
          "rgba(0,0,0,.5)",
          "rgba(255,255,255,.17)",
          "rgba(255,255,255,.05)",
          "rgba(0,0,0,.42)",
          "rgba(0,0,0,.22)",
        ]}
        locations={[0, 2 / 18, 5 / 18, 10 / 18, 15 / 18, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <Silk top />
      <Silk />
    </View>
  );
}

/** `repeating-linear-gradient(90deg,#F1E4C4 0 1.6px,#7E2D1F 1.6px 3.2px)` at 11×4. */
function Silk({ top }: { top?: boolean }) {
  return (
    <Svg width={11} height={4} style={[styles.silk, top ? { top: 5 } : { bottom: 5 }]} viewBox="0 0 11 4">
      {[0, 1, 2, 3].map((i) => (
        <Rect key={i} x={i * 3.2} y={0} width={3.2} height={4} fill="#F1E4C4" />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Rect key={i} x={i * 3.2 + 1.6} y={0} width={1.6} height={4} fill="#7E2D1F" />
      ))}
    </Svg>
  );
}

/* --------------------------------------------------------- the dog-ears --- */

/**
 * `.rr-lr-dog` — the corner of the leaf turned down: the phone's page
 * control, 50×50 at the foot of the window, a paper gradient clipped to the
 * triangle, a hair of shadow lifting it off the page. `is-next` at the
 * right, `is-prev` mirrored at the left; `[disabled]{opacity:0}` at the ends
 * of the book.
 */
function DogEar({
  side,
  night,
  disabled,
  onPress,
}: {
  side: "prev" | "next";
  night: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const next = side === "next";
  const id = `rr-dog-${side}`;
  // 135deg for is-next (toward the bottom-right), 225deg for is-prev
  const stops = night ? ["#141B29", "#222C42", "#2A3550"] : ["#E4D8B6", "#F4EEDD", "#FCF8EC"];
  // filter:drop-shadow(-1px -1px 2px rgba(43,30,16,.3)) / night rgba(0,0,0,.75)
  // — drop-shadow()'s third length IS the Gaussian's standard deviation
  // (Filter Effects, unlike box-shadow's radius): measured on the golden, the
  // fall-off runs ~8px up the page, which is stdDeviation 2
  const shadow = night ? "rgba(0,0,0,.75)" : "rgba(43,30,16,.3)";
  const points = next ? "50,0 50,50 0,50" : "0,0 50,50 0,50";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={next ? "Next page" : "Previous page"}
      accessibilityState={{ disabled }}
      aria-disabled={disabled || undefined}
      style={({ pressed }) => [
        styles.dog,
        next ? { right: 0 } : { left: 0 },
        { opacity: disabled ? 0 : 1 },
        pressed && { transform: [{ scale: 1.14 }] },
      ]}
    >
      <Svg width={50} height={50} viewBox="0 0 50 50">
        <Defs>
          <SvgGrad id={id} x1={next ? 0 : 1} y1={0} x2={next ? 1 : 0} y2={1}>
            <Stop offset="0" stopColor={stops[0]} />
            <Stop offset="0.52" stopColor={stops[1]} />
            <Stop offset="1" stopColor={stops[2]} />
          </SvgGrad>
          <Filter id={`${id}-sh`} x="-20%" y="-20%" width="140%" height="140%">
            <FeDropShadow dx={-1} dy={-1} stdDeviation={2} floodColor={shadow} />
          </Filter>
        </Defs>
        {/* the soft edge along the fold — the corner lifted a hair off the page */}
        <Polygon points={points} fill={`url(#${id})`} filter={`url(#${id}-sh)`} />
      </Svg>
    </Pressable>
  );
}

/* ------------------------------------------------------------ the volume --- */

const TURN_MS = 580;
const TURN_EASE = Easing.bezier(0.22, 0.61, 0.36, 1);
/** `--pl`/`--pr` and the block's margins: `.5s cubic-bezier(.22,.61,.36,1)`. */
const EDGE_MS = 500;
/** onTouchEnd: a swipe shorter than this is not a turn. */
const SWIPE_PX = 48;

/** leafAt[slug] — the leaf each volume stands open at, for the visit. */
const leafAt = new Map<string, number>();

export function Volume({
  recording,
  voice,
  night,
  onBand,
  onBegin,
  onShut,
}: {
  recording: Recording;
  voice: string | null;
  night: boolean;
  /** A contents row: open that chapter, then play it. */
  onBand: (band: number) => void;
  /** The title page's "Begin listening": open the resting chapter, then play. */
  onBegin: () => void;
  /** The colophon's "Back to your audiobooks" — the frame's close. */
  onShut: () => void;
}) {
  // `.rr-lr-reader.is-playing .rr-lr-vol.is-open .rr-lr-fr-disc` — the
  // enhancer toggles is-playing on the READER from the deck's status
  // (`st.status === "playing"`), whichever book sounds: the disc on the open
  // volume's frontispiece turns while anything is on the platter. The site's
  // rule, kept on purpose — the disc is the room's record, not this book's.
  const { playing } = useDeck();
  const spinning = playing;

  // four leaves, and one at a time never lands on a pastedown (there is none
  // here: a hasText volume bakes four, which squares the spread by itself)
  const reach = 4;
  const [leaf, setLeafState] = useState(() => leafAt.get(recording.slug) ?? 0);
  const setLeaf = (fn: (l: number) => number) =>
    setLeafState((l) => {
      const to = fn(l);
      leafAt.set(recording.slug, to);
      return to;
    });
  const [win, setWin] = useState({ w: 0, h: 0 });
  const { pl, pr } = volumeEdges(leaf, reach);

  // the track: `transform:translateX(calc(var(--leaf) * -100%))`, .58s —
  // and the first paint lands where the book was left, without the slide
  const x = useSharedValue(0);
  const laid = useRef(false);
  useEffect(() => {
    if (win.w <= 0) return;
    if (!laid.current) {
      laid.current = true;
      x.value = -leaf * win.w;
      return;
    }
    x.value = withTiming(-leaf * win.w, { duration: TURN_MS, easing: TURN_EASE });
  }, [leaf, win.w, x]);
  const track = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  // the cut edges thin and thicken over .5s, never jump
  const plv = useSharedValue(pl);
  const prv = useSharedValue(pr);
  useEffect(() => {
    plv.value = withTiming(pl, { duration: EDGE_MS, easing: TURN_EASE });
    prv.value = withTiming(pr, { duration: EDGE_MS, easing: TURN_EASE });
  }, [pl, pr, plv, prv]);
  const blockEdges = useAnimatedStyle(() => ({ marginLeft: plv.value, marginRight: prv.value }));
  const leftCut = useAnimatedStyle(() => ({ width: plv.value, left: -plv.value }));
  const rightCut = useAnimatedStyle(() => ({ width: prv.value, right: -prv.value }));

  const turn = (d: 1 | -1) => setLeaf((l) => Math.max(0, Math.min(reach - 1, l + d)));

  // a swipe across the BOOK is a page turn — the site's onTouchEnd counts a
  // 48px swipe anywhere over `.rr-lr-stage`, more across than down, so the
  // detector wraps the whole case (the boards, the spine, the cut edges), not
  // the window alone; the stage's own 3px / 12px pads are the frame's.
  // Activation waits for 20px of travel so a tap on a contents row or a
  // dog-ear is still a tap, and fails on 15px of vertical travel so a leaf
  // that scrolls keeps scrolling.
  const swipe = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (Math.abs(e.translationX) < SWIPE_PX || Math.abs(e.translationY) > Math.abs(e.translationX)) return;
      runOnJS(turn)(e.translationX < 0 ? 1 : -1);
    });

  const leafProps = { rec: recording, voice, night, width: win.w };

  return (
    <GestureDetector gesture={swipe}>
    <LinearGradient
      colors={night ? ["#4A1A16", "#3D1310", "#331010"] : ["#5C201C", "#4A1717", "#3B1211"]}
      locations={[0, night ? 0.46 : 0.44, 1]}
      // 158deg — from the top-left corner down and right
      start={{ x: 0.13, y: 0 }}
      end={{ x: 0.87, y: 1 }}
      style={[styles.book, night ? styles.bookNight : styles.bookDay]}
    >
      {/* ::before — the fillet, stamped on the front board clear of the spine */}
      <View style={styles.fillet} />
      {/* ::after — the spine */}
      <Spine />

      {/* .rr-lr-block — the paper block, cut edges either side */}
      <Animated.View style={[styles.block, blockEdges]}>
        {/* ::before paints UNDER the window (its ring shows on the last cream
            stripe), ::after paints OVER it — box-tree order, kept */}
        <Animated.View style={[styles.cutSlot, leftCut]}>
          <CutEdge width={Math.ceil(pl)} side="left" night={night} at={0} />
        </Animated.View>

        {/* .rr-lr-win */}
        <View
          style={[styles.win, night ? styles.winNight : styles.winDay]}
          onLayout={(e) => setWin({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        >
          {win.w > 0 ? (
            <Animated.View style={[styles.track, { width: win.w * reach }, track]}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={{ width: win.w, height: "100%", pointerEvents: i === leaf ? "auto" : "none" }}
                  accessibilityElementsHidden={i !== leaf}
                  importantForAccessibility={i !== leaf ? "no-hide-descendants" : "auto"}
                >
                  {i === 0 ? (
                    <Frontispiece {...leafProps} index={0} spinning={spinning} />
                  ) : i === 1 ? (
                    <TitlePage {...leafProps} index={1} onBegin={onBegin} />
                  ) : i === 2 ? (
                    <ContentsLeaf {...leafProps} index={2} onBand={onBand} />
                  ) : (
                    <Colophon {...leafProps} index={3} onShut={onShut} />
                  )}
                </View>
              ))}
            </Animated.View>
          ) : null}

          {/* every leaf is a recto now, so the shading is a spine shadow, not
              a gutter: `inset 20px 0 24px -22px rgba(110,86,58,.95), inset
              -7px 0 10px -10px rgba(110,86,58,.45)` (night: black, .9 / .5) */}
          <LinearGradient
            colors={
              night
                ? ["rgba(0,0,0,.4)", "rgba(0,0,0,.27)", "rgba(0,0,0,.15)", "rgba(0,0,0,.07)", "rgba(0,0,0,0)"]
                : [
                    "rgba(110,86,58,.42)",
                    "rgba(110,86,58,.28)",
                    "rgba(110,86,58,.16)",
                    "rgba(110,86,58,.07)",
                    "rgba(110,86,58,0)",
                  ]
            }
            locations={[0, 0.25, 0.5, 0.75, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.hinge}
          />
          <LinearGradient
            colors={night ? ["rgba(0,0,0,0)", "rgba(0,0,0,.14)"] : ["rgba(110,86,58,0)", "rgba(110,86,58,.13)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.foreEdge}
          />

          <DogEar side="prev" night={night} disabled={leaf <= 0} onPress={() => turn(-1)} />
          <DogEar side="next" night={night} disabled={leaf >= reach - 1} onPress={() => turn(1)} />
        </View>
        <Animated.View style={[styles.cutSlot, rightCut]}>
          <CutEdge width={Math.ceil(pr)} side="right" night={night} at={0} />
        </Animated.View>
      </Animated.View>
    </LinearGradient>
    </GestureDetector>
  );
}

/* -------------------------------------------------------------- styles --- */

const styles = StyleSheet.create({
  // ≤900px: .rr-lr-book{--per:1;max-width:min(560px,100%);max-height:none;
  // padding:10px 9px 12px 18px} — height:100% of the stage
  book: {
    flex: 1,
    alignSelf: "center",
    width: "100%",
    maxWidth: 560,
    paddingTop: 10,
    paddingRight: 9,
    paddingBottom: 12,
    paddingLeft: 18,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  bookDay: {
    boxShadow:
      "0 2px 3px rgba(43,30,16,.5), 0 22px 44px -16px rgba(43,30,16,.5), 0 54px 92px -42px rgba(43,30,16,.45)",
  },
  bookNight: {
    boxShadow:
      "0 2px 4px rgba(0,0,0,.75), 0 26px 52px -18px rgba(0,0,0,.8), 0 60px 100px -46px rgba(0,0,0,.7)",
  },
  // ::before{inset:6px 6px 6px 23px; border:1px solid rgba(241,228,196,.2);
  // border-radius:2px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.28), 0 0 0 1px rgba(0,0,0,.2)}
  fillet: {
    pointerEvents: "none",
    position: "absolute",
    top: 6,
    right: 6,
    bottom: 6,
    left: 23,
    borderWidth: 1,
    borderColor: "rgba(241,228,196,.2)",
    borderRadius: 2,
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,.28), 0 0 0 1px rgba(0,0,0,.2)",
  },
  spine: {
    pointerEvents: "none",
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 18,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    overflow: "hidden",
  },
  silk: { position: "absolute", left: 5 },
  block: { flex: 1 },
  cut: { position: "absolute", top: 2, bottom: 2, pointerEvents: "none" },
  // the animated home of a cut edge: its width and offset move with --pl/--pr
  cutSlot: { position: "absolute", top: 0, bottom: 0, pointerEvents: "none", overflow: "hidden" },
  win: { flex: 1, overflow: "hidden" },
  winDay: {
    backgroundColor: "#FFFFFF",
    boxShadow: "0 0 0 1px rgba(43,30,16,.3), 0 10px 22px -12px rgba(43,30,16,.55)",
  },
  winNight: {
    backgroundColor: "#1A2233",
    boxShadow: "0 0 0 1px rgba(201,166,98,.2), 0 12px 26px -12px rgba(0,0,0,.85)",
  },
  // ABSOLUTE, so the leaves never size the window: the case takes the height
  // the stage gives it (the site's height:100%), and a leaf that runs long
  // scrolls inside its own bounds instead of stretching the book to fit
  track: { position: "absolute", left: 0, top: 0, bottom: 0, flexDirection: "row" },
  hinge: { position: "absolute", left: 0, top: 0, bottom: 0, width: 22, pointerEvents: "none" },
  foreEdge: { position: "absolute", right: 0, top: 0, bottom: 0, width: 6, pointerEvents: "none" },
  dog: { position: "absolute", bottom: 0, width: 50, height: 50, zIndex: 2 },
});
