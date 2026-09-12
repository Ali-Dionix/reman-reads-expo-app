// The leaf — `.rr-lr-cx` / `.rr-lr-cx-bk` / `.rr-lr-block` / `.rr-lr-win`
// and the furniture inside the window (`.rr-lr-fold`, `.rr-lr-mark`,
// `.rr-lr-hb`, the `#rr-gtl` gutter), the read-along's gilt (the page's own
// ink layer on the web), the dog-ears (`.rr-lr-dog`) and the pinch.
//
// Site: app/data/accountListeningPage.ts — the codex half of readerHtml and
// the SECOND `@media (max-width:900px)` block (the one that dresses
// `.rr-lr-cx-bk`, NOT `.rr-lr-book`'s one-handed specimen branch — see the
// note on Codex below); the ≤620px / ≤560px branches under it.
// Behaviour: app/components/ListeningEnhancer.tsx paintLeaf / turn /
// the codex tap-to-seek, and app/components/readAlong.ts for the join.
//
// THE CODEX, not a reflow: a rendered page is a photograph of paper, so the
// phone shows ONE leaf of the same book (`--per:1`) inside the desk's own
// case — the boards, the fillet, the gutter, the silk bands, the ribbon.
//
// SIZING: the web computes a width-derived height cap in `100cqw` because a
// plain `max-height:100%` leaves the block height-bound, the width clamps and
// `aspect-ratio` silently breaks. React Native has no such trap — a leaf with
// `aspectRatio` inside a width-constrained parent IS width-derived — so the
// intent survives without the arithmetic. Do not "fix" this into a height.
//
// Read-along is wired through the page manifest's normalised word boxes: they
// index the same paragraph strings the galley's timings do, so a word's
// position and a word's moment meet without either file knowing the other.
// THE FAST CLOCK IS READ HERE AND NOWHERE ELSE: useFastPosition subscribes
// this one component to the 100ms sample, so the gilt lands on every word
// while the frame around it re-renders at the transport's 500ms.

import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient as SvgGrad, Path, Rect, Stop } from "react-native-svg";

import { chaptersOf, useDeck, useFastPosition, type Recording } from "../../lib/audioStore";
import {
  boxAtPoint,
  boxesForSentence,
  boxesForWord,
  loadGalley,
  wordAt,
  wordOfBox,
  wordStart,
  type Galley,
} from "../../lib/galley";
import {
  leafOfPage,
  pageImageUrl,
  pagesShape,
  type BookPages,
  type PageBox,
} from "../../lib/pages";

/* ------------------------------------------------------------- codex --- */

/**
 * The cut-edge widths — the enhancer's `--pl`/`--pr`, for a codex at `--per:1`
 * (`base = 5`, `swing = 13`, so the pair is a constant 23px however far in you
 * are). "What has been read stacks up on the left, what is left stays on the
 * right": the stack THINS on the right as you turn, which is the only gauge on
 * the screen that is part of the book. A frozen 5/17 was a snapshot of page one.
 */
export function cutEdges(leaf: number, total: number): { pl: number; pr: number } {
  const span = Math.max(1, total - 1);
  const at = Math.max(0, Math.min(span, leaf));
  return { pl: 5 + 13 * (at / span), pr: 5 + 13 * ((span - at) / span) };
}

/**
 * `.rr-lr-block::before/::after` — the cut edges either side of the trim.
 *
 * `repeating-linear-gradient(90deg, paper 0 1px, rule 1px 2px)`: fifty leaves
 * seen end-on. Declared at module scope, never inside Codex — a component
 * defined in a render body is a new type every render and remounts its subtree.
 */
function CutEdge({
  width,
  side,
  night,
}: {
  width: number;
  side: "left" | "right";
  night: boolean;
}) {
  const paper = night ? "#26314A" : "#F6EEDB";
  const rule = night ? "rgba(210,175,105,.65)" : "rgba(110,86,58,.42)";

  return (
    <View
      pointerEvents="none"
      style={[styles.cut, { width, backgroundColor: paper, [side]: -width }]}
    >
      {Array.from({ length: Math.ceil(width / 2) }, (_, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: i * 2 + 1,
            top: 0,
            bottom: 0,
            width: 1,
            backgroundColor: rule,
          }}
        />
      ))}
    </View>
  );
}

/**
 * `.rr-lr-cx .rr-lr-fold` at ≤900px — the sheet bending into the ONE spine a
 * single-leaf codex has. 18px at the leaf's left edge, kept narrow because a
 * pressed page's own margin is ~20px at this scale and wider furniture sits on
 * the glyphs rather than the paper.
 */
function Fold({ night }: { night: boolean }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={
        night
          ? ["rgba(0,0,0,.48)", "rgba(0,0,0,.16)", "rgba(0,0,0,0)"]
          : ["rgba(43,30,16,.26)", "rgba(43,30,16,.08)", "rgba(43,30,16,0)"]
      }
      locations={[0, 0.46, 1]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.fold}
    />
  );
}

/**
 * `.rr-lr-cx .rr-lr-hb` — the striped silk at the head and the tail, re-aimed
 * from the gutter to the leaf's left edge (`left:0;width:22px`), squared at
 * that edge and rounded at the other (`border-radius:0 2px 2px 0`).
 * `repeating-linear-gradient(90deg,#F1E4C4 0 3px,#7E2D1F 3px 6px)`, 7px tall.
 */
function Headband({ tail }: { tail?: boolean }) {
  return (
    <View style={[styles.hb, tail ? { bottom: 0 } : { top: 0 }]} pointerEvents="none">
      <Svg width={22} height={7}>
        <Rect width={22} height={7} fill="#F1E4C4" />
        {[3, 9, 15, 21].map((x) => (
          <Rect key={x} x={x} width={3} height={7} fill="#7E2D1F" />
        ))}
      </Svg>
    </View>
  );
}

/**
 * `.rr-lr-cx .rr-lr-mark` — the ribbon, hanging 52% of the block and lying IN
 * the fold (`left:6px;width:9px`), never beside it: a pressed page's inner
 * margin is the PDF's own, so a ribbon parked on the recto would lie on the
 * words. The swallowtail is the web's clip-path polygon, drawn as a path.
 */
function Ribbon() {
  return (
    <View style={styles.mark} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <SvgGrad id="rr-rib" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#6B2418" />
            <Stop offset="0.52" stopColor="#93392A" />
            <Stop offset="1" stopColor="#6B2418" />
          </SvgGrad>
        </Defs>
        <Path d="M0 0H100V100L50 80 0 100Z" fill="url(#rr-rib)" />
      </Svg>
    </View>
  );
}

/**
 * BRINGING THE PAPER CLOSER — two fingers on the leaf.
 *
 * The boards do not move. Only the SHEET moves inside them, the way a page
 * moves under a copy stand: the case, the cut edges, the fold, the silk and the
 * ribbon are the binding, and binding does not zoom. That is also why the
 * transform sits on a wrapper INSIDE the window rather than on the case.
 *
 * WHAT THIS IS FOR, and what it is not. A phone cannot hold a magnified LINE of
 * this book — one line is 272pt of a 310pt leaf, so at 2x it is 545pt on a
 * 375pt screen and every line would need dragging. So this is not a way to read
 * the chapter. It is a way to LOOK: at a watercolour, at a word, at what the
 * typesetter did. The cap is where the photograph runs out of real detail
 * (1191px of source over ~930 device px of leaf on a 3x phone ≈ 1.28x true),
 * with a little grace past it — beyond MAX there is nothing to see, only mush.
 *
 * The gilt rides along for free: the read-along SVG is a sibling of the page
 * image inside this same wrapper, so it scales and pans with the paper it is
 * painted on and never drifts off its word.
 *
 * PINCH ONLY — deliberately no double-tap. A double-tap would make every
 * single tap wait out the arbitration window (RNGH defaults to 500ms) before
 * tap-to-seek could fire, and putting a finger on a word is the thing this room
 * exists for. Pinch takes two pointers and a tap takes one, so they never race.
 */
const LENS_MAX = 2.5;
// `.rr-lr-win`'s 1px rule. Gesture coordinates arrive against the BORDER box,
// the paper fills the content box, so the rule has to come off both ends.
const WIN_RULE = 1;

function useLens(
  win: { w: number; h: number },
  leaf: number,
  onTapPage?: (nx: number, ny: number) => void,
) {
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  // the value each gesture started from, so a second pinch continues rather
  // than snapping back to 1
  const scale0 = useSharedValue(1);
  const tx0 = useSharedValue(0);
  const ty0 = useSharedValue(0);

  // A turned leaf is a new sheet: it lies flat. Keeping the zoom across a turn
  // sounds considerate and is not — the reader would land mid-page on a page
  // they have not seen, at a magnification chosen for a different one.
  useEffect(() => {
    scale.value = withTiming(1, { duration: 200 });
    tx.value = withTiming(0, { duration: 200 });
    ty.value = withTiming(0, { duration: 200 });
  }, [leaf, scale, tx, ty]);

  /** Never let the paper come away from the window's edges. */
  const clamp = (s: number, x: number, y: number) => {
    "worklet";
    const mx = (win.w * (s - 1)) / 2;
    const my = (win.h * (s - 1)) / 2;
    return {
      x: Math.max(-mx, Math.min(mx, x)),
      y: Math.max(-my, Math.min(my, y)),
    };
  };

  const pinch = Gesture.Pinch()
    .onStart(() => {
      scale0.value = scale.value;
      tx0.value = tx.value;
      ty0.value = ty.value;
    })
    .onUpdate((e) => {
      const s = Math.max(1, Math.min(LENS_MAX, scale0.value * e.scale));
      const c = clamp(s, tx.value, ty.value);
      scale.value = s;
      tx.value = c.x;
      ty.value = c.y;
    })
    .onEnd(() => {
      // a pinch that ends under 1.05 was a reader letting the page go
      if (scale.value < 1.05) {
        scale.value = withTiming(1, { duration: 180 });
        tx.value = withTiming(0, { duration: 180 });
        ty.value = withTiming(0, { duration: 180 });
      }
    });

  // One finger moves the sheet — but only once it is off the desk. At rest the
  // pan must not exist at all, or it swallows the tap that seeks.
  const pan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onStart(() => {
      tx0.value = tx.value;
      ty0.value = ty.value;
    })
    .onUpdate((e) => {
      if (scale.value <= 1.001) return;
      const c = clamp(scale.value, tx0.value + e.translationX, ty0.value + e.translationY);
      tx.value = c.x;
      ty.value = c.y;
    });

  /**
   * The tap lives HERE, not on a Pressable underneath, because a
   * GestureDetector consumes the touches its children would otherwise see —
   * wrapping the leaf in one silently killed tap-to-seek. One gesture system
   * owns the leaf, so the tap is one of its gestures.
   *
   * Still only ONE tap: `numberOfTaps` stays at 1. A double-tap would make
   * every single tap wait out the arbitration window before it could seek.
   *
   * A tap arrives in WINDOW space; the boxes are in PAGE space. While the paper
   * is lifted those are not the same thing, so the lens is undone here.
   */
  const tap = Gesture.Tap()
    .maxDuration(300)
    .onEnd((e, ok) => {
      if (!ok || !onTapPage) return;
      const cw = win.w - WIN_RULE * 2;
      const ch = win.h - WIN_RULE * 2;
      if (cw <= 0 || ch <= 0) return;
      const wx = (e.x - WIN_RULE) / cw;
      const wy = (e.y - WIN_RULE) / ch;
      const s = scale.value;
      const nx = s <= 1.001 ? wx : (wx - 0.5 - tx.value / cw) / s + 0.5;
      const ny = s <= 1.001 ? wy : (wy - 0.5 - ty.value / ch) / s + 0.5;
      runOnJS(onTapPage)(nx, ny);
    });

  // pinch and pan share the leaf; a tap races them and loses the moment a
  // finger travels, which is what keeps a drag from seeking
  const gesture = Gesture.Simultaneous(Gesture.Race(tap, pan), pinch);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return { gesture, style };
}

/* -------------------------------------------------------- read-along --- */

/**
 * The join: the galley (per PRESSING — the same words, a different clock) met
 * with the page boxes (per BOOK) on character offsets. Returns the sounding
 * word's printed boxes, its sentence's, and the page the needle stands on.
 *
 * A narrator switch must re-fetch or the gilt lands on the old reader's
 * timings; a band change likewise. The manifest is the book's and is fetched
 * by the frame.
 */
function useReadAlong(recording: Recording, voice: string | null, band: number, man: BookPages | null) {
  const [gal, setGal] = useState<Galley | null>(null);
  const position = useFastPosition();

  useEffect(() => {
    let alive = true;
    const chapters = chaptersOf(recording, voice);
    setGal(null);
    loadGalley(recording.slug, voice, band, chapters[band]?.galley).then((g) => {
      if (alive) setGal(g);
    });
    return () => {
      alive = false;
    };
  }, [recording, voice, band]);

  // every printed run of the chapter being read — the paper half of the join
  const chapterBoxes = useMemo(
    () => man?.chapters.find((c) => c.idx === band)?.boxes ?? [],
    [man, band],
  );

  const wordIdx = gal ? wordAt(gal, position * 1000) : -1;
  const word = wordIdx >= 0 ? gal?.words[wordIdx] : undefined;

  // The word's printed home, and its sentence's. Both are recomputed per beat,
  // which is cheap: a chapter holds a few hundred boxes, not the book's.
  const wordBoxes = useMemo(
    () => (word ? boxesForWord(chapterBoxes, word) : []),
    [chapterBoxes, word],
  );
  const sentBoxes = useMemo(
    () => (gal && wordIdx >= 0 ? boxesForSentence(gal, chapterBoxes, wordIdx) : []),
    [gal, chapterBoxes, wordIdx],
  );

  // the page the needle is standing on — -1 when the word has no printed home
  // (front matter, a plate, a chapter whose boxes never arrived): silence,
  // not an error, and never a page turn
  const homePage = wordBoxes[0]?.[3] ?? -1;

  return { gal, wordBoxes, sentBoxes, homePage };
}

/* -------------------------------------------------------------- Codex --- */

/**
 * The case, the block and the leaf — `.rr-lr-cx-bk` at its ≤900px branch.
 *
 * NOT the specimen volume's one-handed branch. The specimen is held the other
 * way a book is held (spine under the thumb, dog-eared corners); the CODEX is
 * the DESK's book with only the spread given up, so the phone block "unwraps
 * the boards from the one-handed spine": padding 15/17/17, the fillet inset a
 * plain 6px all round, `::after{content:none}` — no spine cloth — and the
 * spread's own furniture re-aimed at the one spine the page now has.
 *
 * Either side of the trim the paper block shows its CUT EDGES — the 1px
 * striping that makes fifty leaves read as a stack rather than a screenshot.
 */
export function Codex({
  recording,
  voice,
  band,
  man,
  leaf,
  total,
  night,
  follow,
  onFollow,
  onReadFrom,
}: {
  recording: Recording;
  /** The pressing in force — the galley is per pressing. */
  voice: string | null;
  band: number;
  man: BookPages | null;
  leaf: number;
  total: number;
  night: boolean;
  /** Whether the book turns to the page being read. */
  follow: boolean;
  /** The follow asks for a leaf. */
  onFollow: (leaf: number) => void;
  /** A finger read from a word: `elsewhere` when it cued a band the needle
   *  was not on, so the frame knows not to turn to that band's first page. */
  onReadFrom: (elsewhere: boolean) => void;
}) {
  const slug = recording.slug;
  const shape = pagesShape(slug);
  const page = man?.pages[leaf];
  const { pl, pr } = cutEdges(leaf, total);
  const [win, setWin] = useState({ w: 0, h: 0 });
  const { seekTo, playAt } = useDeck();

  // The leaf is width-derived: aspectRatio against a width-constrained parent.
  const pw = man?.pageW ?? shape?.w ?? 1191;
  const ph = man?.pageH ?? shape?.h ?? 1684;
  const ratio = pw / ph;

  const { gal, wordBoxes, sentBoxes, homePage } = useReadAlong(recording, voice, band, man);

  // THE FOLLOW: the book turns to the page the word is printed on. Only while
  // following, and only when the word actually moved off this leaf.
  useEffect(() => {
    if (!follow || !man || homePage < 0) return;
    const want = leafOfPage(man, homePage);
    if (want !== leaf) onFollow(want);
  }, [follow, man, homePage, leaf, onFollow]);

  // the gilt only paints on the leaf actually showing
  const shownPage = page?.n ?? -1;
  const gilt = wordBoxes.filter((b) => b[3] === shownPage);
  const wash = sentBoxes.filter((b) => b[3] === shownPage);

  /**
   * A finger on the paper: read from that word.
   *
   * The codex stands the WHOLE book, but only one chapter is sounding — so a
   * reader who turns past the end of it and puts a finger on a word is asking
   * to read from a band that is not on the platter. The web hands that case
   * back to the room (`PageSurface.elsewhere`) because only the room knows
   * which chapter a page belongs to; here the page manifest knows, and it
   * carries EVERY chapter's boxes, so the box is found first and its chapter's
   * galley is fetched only once there is something to fetch it for.
   *
   * Chapters share pages at their seams (chapter I ends on page 4, II begins
   * on it), so candidates are tried with the sounding chapter first and the
   * one whose box is actually under the finger wins.
   */
  const tapPage = useCallback(
    (nx: number, ny: number) => {
      if (!man) return;
      const pageN = man.pages[leaf]?.n;
      if (pageN == null) return;

      const here = man.chapters
        .filter((c) => pageN >= c.firstPage && pageN <= c.lastPage)
        .sort((a, b) => Number(b.idx === band) - Number(a.idx === band));

      for (const ch of here) {
        const box = boxAtPoint(ch.boxes, pageN, nx, ny);
        if (!box) continue;

        // the chapter already sounding: the needle just moves
        if (ch.idx === band && gal) {
          const i = wordOfBox(gal, box);
          if (i < 0) return;
          onReadFrom(false);
          seekTo(wordStart(gal, i) / 1000);
          return;
        }

        // elsewhere in the book: cue that band, at that word
        const chapters = chaptersOf(recording, voice);
        loadGalley(slug, voice, ch.idx, chapters[ch.idx]?.galley).then((g2) => {
          if (!g2) return;
          const i = wordOfBox(g2, box);
          if (i < 0) return;
          // the band change must NOT throw the reader to the chapter's first
          // page — they are looking at the page they tapped
          onReadFrom(true);
          playAt(slug, ch.idx, wordStart(g2, i) / 1000);
        });
        return;
      }
      // the margin, a plate, a blank — nothing to read from, so nothing happens
    },
    [man, leaf, band, gal, recording, voice, slug, seekTo, playAt, onReadFrom],
  );

  const { gesture, style: paperStyle } = useLens(win, leaf, tapPage);

  return (
    <LinearGradient
      colors={night ? ["#4A1A16", "#3D1310", "#331010"] : ["#5C201C", "#4A1717", "#3B1211"]}
      locations={[0, night ? 0.46 : 0.44, 1]}
      start={{ x: 0.13, y: 0 }}
      end={{ x: 0.87, y: 1 }}
      style={[styles.case, night ? styles.caseNight : styles.caseDay]}
    >
      {/* ::before — the fillet, inset 6px on every board */}
      <View style={[styles.fillet, { borderColor: "rgba(241,228,196,.2)" }]} pointerEvents="none" />

      {/* the block, with a cut edge on each side of the trim */}
      <View style={{ marginLeft: pl, marginRight: pr }}>
        <CutEdge width={pl} side="left" night={night} />
        <CutEdge width={pr} side="right" night={night} />

        <GestureDetector gesture={gesture}>
        <View
          style={[
            styles.win,
            {
              aspectRatio: ratio,
              backgroundColor: night ? "#1D263C" : "#FDFAF0",
              borderColor: night ? "rgba(201,166,98,.2)" : "rgba(43,30,16,.3)",
            },
          ]}
          onLayout={(e) =>
            setWin({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
          }
          accessible
          accessibilityLabel="The page — tap a word to read from there, pinch to bring it closer"
        >
          {/* THE SHEET. Everything inside this wrapper is the PAPER and moves
              with the lens; everything outside it is the BINDING and does not. */}
          <Animated.View style={[StyleSheet.absoluteFill, paperStyle]}>
            {page ? (
              <Image
                source={{ uri: pageImageUrl(slug, page.image) }}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                transition={140}
              />
            ) : (
              <View style={styles.leafWait}>
                <ActivityIndicator color={night ? "#C9A662" : "#9B7A4D"} />
              </View>
            )}

            {/* THE GILDER'S THREE STROKES, in page coordinates — the sentence's
                faint wash, the sounding word, and its one-pixel rule. The web
                paints these into the page's own <svg> ink layer; the boxes are
                normalised, so an SVG on the page's viewBox lands on the glyph
                whatever size the leaf happens to be — including lifted. */}
            {gilt.length || wash.length ? (
              <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${pw} ${ph}`} pointerEvents="none">
                {wash.map((b, i) => (
                  <Rect
                    key={`s${i}`}
                    x={b[4] * pw}
                    y={b[5] * ph}
                    width={b[6] * pw}
                    height={b[7] * ph}
                    fill={night ? "rgba(210,175,105,.13)" : "rgba(155,122,77,.14)"}
                  />
                ))}
                {gilt.map((b, i) => (
                  <Rect
                    key={`w${i}`}
                    x={b[4] * pw}
                    y={b[5] * ph}
                    width={b[6] * pw}
                    height={b[7] * ph}
                    fill={night ? "rgba(210,175,105,.34)" : "rgba(155,122,77,.38)"}
                  />
                ))}
                {/* the rule is ONE device pixel at every scale, the way a printed
                    rule is one rule — a stroke in page units would fatten */}
                {gilt.map((b, i) => (
                  <Path
                    key={`u${i}`}
                    d={`M${b[4] * pw} ${(b[5] + b[7]) * ph}h${b[6] * pw}`}
                    stroke={night ? "rgba(224,183,112,.6)" : "rgba(155,122,77,.6)"}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </Svg>
            ) : null}
          </Animated.View>

          {/* the gutter, `#rr-gtl` — drawn in PAGE coordinates on the web, so
              it runs the full width of the leaf and dies at 26%, not a 20px
              band at the edge */}
          <LinearGradient
            colors={["rgba(43,30,16,.34)", "rgba(43,30,16,.12)", "rgba(43,30,16,0)"]}
            locations={[0, 0.09, 0.26]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* z-order inside the window: the fold (3), the ribbon (4), the
              silk (5) — all at the leaf's left edge. OUTSIDE the lens on
              purpose: this is the binding, and a binding does not zoom. */}
          <Fold night={night} />
          <Ribbon />
          <Headband />
          <Headband tail />
        </View>
        </GestureDetector>
      </View>
    </LinearGradient>
  );
}

/* -------------------------------------------------------------- styles --- */

const styles = StyleSheet.create({
  // ≤900px: .rr-lr-cx-bk{padding:15px 17px 17px;max-width:min(600px,100%)} —
  // the boards unwrapped from the one-handed spine, so the padding is even.
  // The radius is .rr-lr-book's: square at the hinge, rounded at the fore-edge.
  case: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    paddingTop: 15,
    paddingHorizontal: 17,
    paddingBottom: 17,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  caseDay: {
    shadowColor: "#2B1E10",
    shadowOpacity: 0.5,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 11 },
    elevation: 8,
  },
  caseNight: {
    shadowColor: "#000",
    shadowOpacity: 0.8,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 13 },
    elevation: 8,
  },
  // .rr-lr-cx-bk::before{inset:6px} — a plain fillet on every board
  fillet: { position: "absolute", top: 6, left: 6, right: 6, bottom: 6, borderWidth: 1, borderRadius: 2 },
  // the block's own margins are --pl/--pr, so they are set per leaf, inline
  cut: { position: "absolute", top: 2, bottom: 2, overflow: "hidden" },
  win: {
    width: "100%",
    overflow: "hidden",
    borderWidth: 1,
  },
  leafWait: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  // the spread's furniture, re-aimed at the leaf's left edge
  fold: { position: "absolute", left: 0, top: 0, bottom: 0, width: 18, zIndex: 3 },
  mark: { position: "absolute", left: 6, top: 0, width: 9, height: "52%", zIndex: 4 },
  hb: {
    position: "absolute",
    left: 0,
    width: 22,
    height: 7,
    zIndex: 5,
    overflow: "hidden",
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
});
