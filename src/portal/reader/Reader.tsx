// The Reading Desk — the opened volume, transcribed from the reader half of
// app/data/accountListeningPage.ts at its ≤900px / ≤760px branches.
//
// SHAPE: a torn head band, the book, a torn console. "The only two coloured
// surfaces on screen are those bands — everything else is the field and the
// book." The field is WHITE by day and starred navy by night.
//
// THE CODEX, not a reflow: a rendered page is a photograph of paper, so the
// phone shows ONE leaf of the same book (`--per:1`) inside the desk's own
// case — the boards, the fillet, the gutter, the silk bands, the ribbon — and
// turns with arrows under the case rather than beside it, because a page on a
// phone is width-bound and a 38px disc either side would cost a third of it.
//
// WHICH BOOK: the codex takes `.rr-lr-cx-bk`'s ≤900px branch, NOT the specimen
// volume's. Both live under `@media (max-width:900px)` and they disagree on
// purpose — the specimen is held one-handed (spine under the thumb, dog-eared
// corners), the codex keeps the DESK's boards and gives up only the spread. So
// there is no spine cloth here, the padding is even, the fillet is a plain 6px
// inset, and the fold/ribbon/silk are re-aimed at the leaf's left edge.
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

import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGrad,
  Path,
  Pattern,
  Rect,
  Stop,
} from "react-native-svg";

import { mmss, useDeck, type Recording } from "../../lib/audioStore";
import { Jump } from "../Transport";
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
  loadPages,
  pageImageUrl,
  pagesShape,
  leafOfChapter,
  leafOfPage,
  type BookPages,
  type PageBox,
} from "../../lib/pages";
import { useInk, em } from "../../theme/ink";
import { useTheme } from "../../theme/ThemeProvider";
import { FONTS } from "../../theme/type";
import { SunMoon } from "../TornNav";
import { TornBand } from "./TornBand";

/* ------------------------------------------------------------- icons --- */

const Ic = {
  arrowL: "M10 3 5 8l5 5",
  chevD: "M3 6l5 5 5-5",
  slip: "M4 2.5h8v11l-4-3-4 3z",
  drawer: "M2.5 4.5h11v7h-11zM2.5 7.5h11",
  prev: "M10 3 5 8l5 5",
  next: "M6 3l5 5-5 5",
};

/** The web's own ten-entry table — past X the console prints the figure. */
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

function Glyph({ d, color, size = 15 }: { d: string; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d={d} stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* --------------------------------------------------------- the field --- */

// the torn hem tile is 17px tall — the drawer rises clear of it
const TILE_TEAR = 17;

/** The site-wide STARS tile (280px), the same nineteen points of cream. */
const STAR_DOTS: Array<[number, number, number, number]> = [
  [24, 33, 1, 0.55], [71, 12, 0.7, 0.4], [118, 55, 1.2, 0.7], [163, 21, 0.6, 0.35],
  [205, 68, 1, 0.5], [249, 30, 0.8, 0.45], [37, 109, 0.7, 0.4], [90, 146, 1.1, 0.6],
  [141, 113, 0.6, 0.3], [192, 150, 0.9, 0.5], [240, 118, 0.7, 0.35], [22, 187, 1, 0.55],
  [75, 224, 0.6, 0.3], [129, 196, 1.2, 0.65], [184, 237, 0.8, 0.4], [233, 205, 1, 0.5],
  [262, 262, 0.6, 0.3], [55, 262, 0.9, 0.45],
];

function Starfield() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <Pattern id="rr-stars" width={280} height={280} patternUnits="userSpaceOnUse">
          {STAR_DOTS.map(([cx, cy, r, o], i) => (
            <Circle key={i} cx={cx} cy={cy} r={r} fill="#f2e9d8" opacity={o} />
          ))}
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#rr-stars)" />
    </Svg>
  );
}

/* ------------------------------------------------------------- codex --- */

/**
 * The cut-edge widths — the enhancer's `--pl`/`--pr`, for a codex at `--per:1`
 * (`base = 5`, `swing = 13`, so the pair is a constant 23px however far in you
 * are). "What has been read stacks up on the left, what is left stays on the
 * right": the stack THINS on the right as you turn, which is the only gauge on
 * the screen that is part of the book. A frozen 5/17 was a snapshot of page one.
 */
function cutEdges(leaf: number, total: number): { pl: number; pr: number } {
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
function Codex({
  slug,
  man,
  leaf,
  total,
  night,
  gilt,
  wash,
  onTapPage,
}: {
  slug: string;
  man: BookPages | null;
  leaf: number;
  total: number;
  night: boolean;
  /** The sounding word's printed boxes, already filtered to THIS page. */
  gilt: PageBox[];
  /** Its sentence's, for the wash under it. */
  wash: PageBox[];
  /** A finger on the paper, in normalised page space. */
  onTapPage?: (nx: number, ny: number) => void;
}) {
  const shape = pagesShape(slug);
  const page = man?.pages[leaf];
  const { pl, pr } = cutEdges(leaf, total);
  const [win, setWin] = useState({ w: 0, h: 0 });
  const winRef = useRef<View>(null);

  // The leaf is width-derived: aspectRatio against a width-constrained parent.
  const pw = man?.pageW ?? shape?.w ?? 1191;
  const ph = man?.pageH ?? shape?.h ?? 1684;
  const ratio = pw / ph;

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

        <Pressable
          style={[
            styles.win,
            {
              aspectRatio: ratio,
              backgroundColor: night ? "#1D263C" : "#FDFAF0",
              borderColor: night ? "rgba(201,166,98,.2)" : "rgba(43,30,16,.3)",
            },
          ]}
          ref={winRef}
          onPress={(e) => {
            // The tap arrives in the window's own pixels; the boxes are
            // normalised, so the window has to say how big it currently is.
            //
            // `locationX` is the native path and is exact — but react-native-web
            // does not set it, so the fallback measures the window on screen and
            // subtracts. Never divide by an absent coordinate: NaN reads as
            // "everywhere" to a bounds test.
            const { locationX, locationY, pageX, pageY } = e.nativeEvent;
            if (win.w && win.h && Number.isFinite(locationX) && Number.isFinite(locationY)) {
              onTapPage?.(locationX / win.w, locationY / win.h);
              return;
            }
            if (!Number.isFinite(pageX) || !Number.isFinite(pageY)) return;
            winRef.current?.measureInWindow((x, y, w, h) => {
              if (!w || !h) return;
              onTapPage?.((pageX - x) / w, (pageY - y) / h);
            });
          }}
          onLayout={(e) =>
            setWin({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
          }
          accessibilityLabel="The page — tap a word to read from there"
        >
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
              whatever size the leaf happens to be. */}
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
              silk (5) — all at the leaf's left edge */}
          <Fold night={night} />
          <Ribbon />
          <Headband />
          <Headband tail />
        </Pressable>
      </View>
    </LinearGradient>
  );
}

/* ------------------------------------------------------------ reader --- */

export function Reader({
  recording,
  onClose,
}: {
  recording: Recording;
  onClose: () => void;
}) {
  const { ink } = useInk();
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const night = mode === "dark";

  const {
    now,
    chapter,
    playing,
    position,
    duration,
    loading,
    toggle,
    nudge,
    step,
    seekTo,
    rate,
    setRate,
    voice,
    voices,
    setNarrator,
    playAt,
  } = useDeck();

  const [man, setMan] = useState<BookPages | null>(null);
  const [leaf, setLeaf] = useState(0);
  const [contents, setContents] = useState(false);
  const [pane, setPane] = useState<"bands" | "slips">("bands");
  const [grooveW, setGrooveW] = useState(0);
  const [turntable, setTurntable] = useState(false);
  // the drawer is a bottom sheet rising from the console — it needs to know
  // where the console's top edge is
  const [consoleH, setConsoleH] = useState(0);
  const { height: windowH, width } = useWindowDimensions();

  const band = now?.band ?? 0;

  /* ------------------------------------------------- the read-along --- */

  const [gal, setGal] = useState<Galley | null>(null);
  // The follow is ON until the reader turns a page themselves. Turning a leaf
  // is a statement — "I am reading over there" — and a book that yanks itself
  // back on the next syllable is unusable. Reading from a word re-arms it, and
  // so does a new band.
  const [follow, setFollow] = useState(true);
  // set when a band change came from a tap on the paper rather than the needle
  const stayPut = useRef(false);

  // The galley is per PRESSING: the same words, a different clock. A narrator
  // switch must re-fetch or the gilt lands on the old reader's timings.
  useEffect(() => {
    let alive = true;
    const chapters = recording.pressings?.[voice ?? ""]?.chapters ?? recording.chapters;
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

  useEffect(() => {
    let alive = true;
    loadPages(recording.slug).then((m) => {
      if (!alive) return;
      setMan(m);
      if (m) setLeaf(leafOfChapter(m, band));
    });
    return () => {
      alive = false;
    };
    // the manifest is per BOOK, so only the slug re-fetches it
  }, [recording.slug]);

  // The needle moves the paper: a new band turns to its first leaf, and the
  // follow is re-armed — a new chapter is not the reader wandering off.
  //
  // UNLESS the band changed because a finger landed on a word further into the
  // book: the reader is already looking at the page they asked for, and
  // throwing them to the chapter's opening would undo the tap.
  useEffect(() => {
    if (stayPut.current) {
      stayPut.current = false;
      setFollow(true);
      return;
    }
    if (man) setLeaf(leafOfChapter(man, band));
    setFollow(true);
  }, [man, band]);

  // THE FOLLOW: the book turns to the page the word is printed on. Only while
  // following, and only when the word actually moved off this leaf.
  useEffect(() => {
    if (!follow || !man || homePage < 0) return;
    const want = leafOfPage(man, homePage);
    setLeaf((l) => (l === want ? l : want));
  }, [follow, man, homePage]);

  const shape = pagesShape(recording.slug);
  const total = man?.pages.length ?? shape?.n ?? 0;
  const printed = man?.pages[leaf]?.n ?? leaf + 1;

  // paintFolio's percent is the WHOLE BOOK'S, measured in audio time (bands
  // already behind you, plus where the needle stands in this one) — not the
  // page count. A book's chapters are not equal lengths, so the two disagree.
  const whole = recording.chapters.reduce((s, c) => s + c.duration, 0);
  const done =
    recording.chapters.slice(0, band).reduce((s, c) => s + c.duration, 0) + position;
  const pct = whole ? Math.round((done / whole) * 100) : 0;

  // A hand on the arrows says "I am reading over here" — the follow lets go,
  // and is re-armed by reading from a word or by the next band.
  const turn = useCallback(
    (d: 1 | -1) => {
      setFollow(false);
      setLeaf((l) => Math.max(0, Math.min(total - 1, l + d)));
    },
    [total],
  );

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
          setFollow(true);
          seekTo(wordStart(gal, i) / 1000);
          return;
        }

        // elsewhere in the book: cue that band, at that word
        const chapters = recording.pressings?.[voice ?? ""]?.chapters ?? recording.chapters;
        loadGalley(recording.slug, voice, ch.idx, chapters[ch.idx]?.galley).then((g2) => {
          if (!g2) return;
          const i = wordOfBox(g2, box);
          if (i < 0) return;
          // the band change must NOT throw the reader to the chapter's first
          // page — they are looking at the page they tapped
          stayPut.current = true;
          setFollow(true);
          playAt(recording.slug, ch.idx, wordStart(g2, i) / 1000);
        });
        return;
      }
      // the margin, a plate, a blank — nothing to read from, so nothing happens
    },
    [man, leaf, band, gal, recording, voice, seekTo, playAt],
  );

  // the gilt only paints on the leaf actually showing
  const shownPage = man?.pages[leaf]?.n ?? -1;
  const giltHere = wordBoxes.filter((b) => b[3] === shownPage);
  const washHere = sentBoxes.filter((b) => b[3] === shownPage);

  // who is reading, and the letter their label wears. narrators.ts is the
  // authority; a specimen names no one, so the house answers for it.
  const nowVoice = voices.find((v) => v.id === voice) ?? voices[0] ?? null;
  const voiceInitial =
    nowVoice?.name?.[0]?.toUpperCase() ??
    /^read by\s+(\w)/i.exec(recording.voice)?.[1]?.toUpperCase() ??
    "R";


  const grooveAt = (x: number) => {
    if (!grooveW || !duration) return;
    seekTo((x / grooveW) * duration);
  };

  const gpct = duration > 0 ? Math.min(1, position / duration) : 0;

  const railInk = night ? "#E8DECB" : "#171411";
  const railMuted = night ? "rgba(232,222,203,.66)" : "rgba(11,10,8,.66)";
  // .rr-lr-deck-line em, and its dark override
  const deckEmInk = night ? "rgba(210,175,105,.9)" : "rgba(110,86,58,.95)";

  // padding-inline:clamp(8px,2.6vw,16px) on both bands
  const bandPad = Math.min(16, Math.max(8, width * 0.026));

  const openPane = (which: "bands" | "slips") => {
    setPane(which);
    setContents(true);
  };

  return (
    // The desk takes the WHOLE screen, as the web's does — over the portal's
    // top bar, the dock and the tab bar. A reader squeezed between the app's
    // own chrome is a page lying on a desk, not an opened book.
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <View style={[styles.reader, !night && styles.fieldDay]}>
      {/* the night field — STARS over a settling navy, not a flat swatch */}
      {night ? (
        <LinearGradient
          colors={["#0C1220", "#070C15"]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      {night ? <Starfield /> : null}

      {/* ============================ the torn head band ============ */}
      <TornBand edge="bottom">
        <View style={[styles.rail, { paddingTop: insets.top + 6, paddingHorizontal: bandPad }]}>
          <View style={styles.railSide}>
            {/* ≤900px: .rr-lr-railbtn span{display:none} — icon-only */}
            <Pressable
              onPress={onClose}
              style={styles.railBtn}
              accessibilityRole="button"
              accessibilityLabel="The shelf"
            >
              <Glyph d={Ic.arrowL} color={railMuted} size={14} />
            </Pressable>
          </View>

          {/* the running head: kicker over title, the whole block a button
              that opens the contents — the chevron under it says so */}
          <Pressable
            onPress={() => openPane("bands")}
            style={styles.railMid}
            accessibilityRole="button"
            accessibilityLabel="The contents — every band, one tap away"
          >
            {/* the kicker is the AUTHOR, as the web's enhancer writes it */}
            <Text
              style={[styles.railKick, { color: night ? "#C9A662" : "#8C6A3F" }]}
              numberOfLines={1}
            >
              {recording.author ?? " "}
            </Text>
            <Text
              style={[styles.railTitle, { color: night ? "#F4EBD6" : "#171411" }]}
              numberOfLines={1}
            >
              {recording.title}
            </Text>
            <Glyph d={Ic.chevD} color={night ? "rgba(201,166,98,.65)" : "rgba(110,86,58,.65)"} size={12} />
          </Pressable>

          <View style={[styles.railSide, styles.railSideR]}>
            <Pressable
              onPress={() => openPane("slips")}
              style={styles.railBtn}
              accessibilityRole="button"
              accessibilityLabel="Bookmarks"
            >
              <Glyph d={Ic.slip} color={railMuted} size={14} />
            </Pressable>
          </View>
        </View>
      </TornBand>

      {/* ================================== the stage ================ */}
      <View style={styles.cx}>
        {/* the codex's own lamp — day only, anchored at the head of the box */}
        {night ? null : (
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(255,244,214,.35)", "rgba(255,244,214,0)"]}
            style={styles.lamp}
          />
        )}
        <ScrollView
          style={styles.cx}
          contentContainerStyle={styles.stage}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cxStage}>
            <Codex
              slug={recording.slug}
              man={man}
              leaf={leaf}
              total={total}
              night={night}
              gilt={giltHere}
              wash={washHere}
              onTapPage={tapPage}
            />
          </View>

          {/* .rr-lr-cx-foot — the arrows go UNDER the case on a phone, one to
              each margin (space-between), on paper-filled discs */}
          <View style={styles.foot}>
            <Pressable
              onPress={() => turn(-1)}
              disabled={leaf <= 0}
              accessibilityLabel="Previous page"
              style={[styles.turn, { opacity: leaf <= 0 ? 0.35 : 1 }]}
            >
              <View style={[styles.disc, night ? styles.discNight : styles.discDay]}>
                <Glyph d={Ic.prev} color={railInk} size={17} />
              </View>
            </Pressable>
            <Pressable
              onPress={() => turn(1)}
              disabled={leaf >= total - 1}
              accessibilityLabel="Next page"
              style={[styles.turn, { opacity: leaf >= total - 1 ? 0.35 : 1 }]}
            >
              <View style={[styles.disc, night ? styles.discNight : styles.discDay]}>
                <Glyph d={Ic.next} color={railInk} size={17} />
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      {/* ============================== the torn console ============= */}
      <TornBand edge="top">
        <View
          style={[styles.deck, { paddingBottom: insets.bottom + 9, paddingHorizontal: bandPad }]}
          onLayout={(e) => setConsoleH(e.nativeEvent.layout.height)}
        >
          {/* ≤900px: the groovebox rides FIRST (order:1) — the groove with
              its readout directly beneath, then the one row of controls */}
          <View style={styles.groovebox}>
            <View style={styles.grooveRow}>
              <Text style={[styles.time, { color: night ? "rgba(240,229,207,.62)" : ink(0.6) }]}>
                {mmss(position)}
              </Text>
              <Pressable
                onPress={(e) => grooveAt(e.nativeEvent.locationX)}
                onLayout={(e) => setGrooveW(e.nativeEvent.layout.width)}
                accessibilityRole="adjustable"
                accessibilityLabel="The groove — seek within the band"
                style={styles.groove}
              >
                {/* the 6px pill track inside the 28px hit strip */}
                <View style={[styles.grooveTrack, { backgroundColor: ink(0.15) }]}>
                  <View
                    style={[
                      styles.grooveFill,
                      {
                        width: `${gpct * 100}%`,
                        backgroundColor: night ? "#D2AF69" : "#7E2D1F",
                      },
                    ]}
                  />
                </View>
                {/* the head — a brass stud, not a bar */}
                <View
                  style={[
                    styles.grooveHd,
                    {
                      left: `${gpct * 100}%`,
                      backgroundColor: night ? "#C9A662" : "#9B7A4D",
                      borderColor: night ? "rgba(0,0,0,.55)" : "rgba(43,30,16,.4)",
                    },
                  ]}
                />
              </Pressable>
              <Text style={[styles.time, { color: night ? "rgba(240,229,207,.62)" : ink(0.6) }]}>
                {mmss(duration)}
              </Text>
            </View>

            {/* .rr-lr-deck-line — THREE segments, centred, 9px apart and no
                punctuation between them: the band, "Band N of M", and the
                whole-book readout. A dot between the first two was ours. */}
            <View style={styles.deckLine}>
              <Text
                style={[styles.deckBand, { color: night ? "#EADFC6" : "#171411" }]}
                numberOfLines={1}
              >
                {loading ? "Cueing…" : (chapter?.title ?? "Nothing on the platter")}
              </Text>
              {chapter ? (
                <Text style={[styles.deckEm, { color: deckEmInk }]} numberOfLines={1}>
                  {`Band ${ROMAN[band] ?? band + 1} of ${
                    ROMAN[recording.chapters.length - 1] ?? recording.chapters.length
                  }`}
                </Text>
              ) : null}
              {total ? (
                <Text style={[styles.deckEm, { color: deckEmInk }]} numberOfLines={1}>
                  {`${pct}% · Page ${printed} of ${total}`}
                </Text>
              ) : null}
            </View>
          </View>

          {/* ≤900px the console's second row is, in order: the contents tool,
              the transport (flex:1 1 auto, justify-content:center — so the
              platter sits in the MIDDLE of the slack, not hard left), the
              dial, then the narrator and the lamp */}
          <View style={styles.deckCtrl}>
            <View style={styles.deckSide}>
              <Pressable
                onPress={() => openPane("bands")}
                style={styles.tool}
                accessibilityLabel="Contents"
              >
                <Glyph d={Ic.drawer} color={railMuted} size={16} />
              </Pressable>
            </View>

            <View style={styles.transport}>
              {/* ≤520px: 42px circles carrying the circular-arrow 15s */}
              <Pressable
                onPress={() => nudge(-15)}
                style={[styles.jog, { borderColor: ink(0.22) }]}
                accessibilityLabel="Back fifteen seconds"
              >
                <Jump back color={railInk} />
              </Pressable>

              {/* .rr-lr-big — ink by day; at night the token itself turns the
                  platter cream. 46px at this width. */}
              <Pressable
                onPress={toggle}
                style={[styles.big, { backgroundColor: colors.ink }]}
                accessibilityLabel={playing ? "Pause" : "Play"}
              >
                <Svg width={16} height={16} viewBox="0 0 14 14">
                  {playing ? (
                    <>
                      <Rect x={1.5} y={1.5} width={3} height={11} rx={1} fill={colors.paper} />
                      <Rect x={7.5} y={1.5} width={3} height={11} rx={1} fill={colors.paper} />
                    </>
                  ) : (
                    <Path d="M3 2.2v9.6l8-4.8-8-4.8Z" fill={colors.paper} />
                  )}
                </Svg>
              </Pressable>

              <Pressable
                onPress={() => nudge(15)}
                style={[styles.jog, { borderColor: ink(0.22) }]}
                accessibilityLabel="Forward fifteen seconds"
              >
                <Jump color={railInk} />
              </Pressable>
            </View>

            {/* the dial — .rr-lr-speed, the rpm figure hidden at this width */}
            <Pressable
              onPress={() => {
                const dial = [1, 1.25, 1.5, 0.75];
                setRate(dial[(dial.indexOf(rate) + 1) % dial.length] ?? 1);
              }}
              style={[styles.speed, { borderColor: ink(0.26) }]}
              accessibilityRole="button"
              accessibilityLabel="The dial — playback speed"
            >
              <Text style={[styles.speedText, { color: railInk }]}>
                {`${rate}`.replace(/^0\./, ".")}×
              </Text>
            </Pressable>

            <View style={styles.deckSide}>
              {/* THE VOICE. The disc is the button: it wears the reader's
                  initial in their own label hue, and opens the turntable. A
                  specimen was pressed in no voice at all, so it stays a plain
                  face with nothing behind it — never a dead control. */}
              <Pressable
                onPress={() => voices.length > 1 && setTurntable(true)}
                disabled={voices.length < 2}
                style={styles.narBtn}
                accessibilityRole="button"
                accessibilityLabel={
                  voices.length > 1 ? "The voice — who reads it" : recording.voice
                }
              >
                <View style={[styles.narFace, { backgroundColor: nowVoice?.hue ?? "#7E2D1F" }]}>
                  <Text style={styles.narInitial}>{voiceInitial}</Text>
                </View>
              </Pressable>

              <SunMoon size={34} ink={night ? "#C9A662" : "#6E563A"} line={ink(0.28)} />
            </View>
          </View>
        </View>
      </TornBand>

      {/* ============================== the turntable ================ */}
      {/* A narrator is chosen the way a record is chosen — by its label. One
          disc per voice, the one on the platter wearing the spindle hole. */}
      {turntable ? (
        <>
          <Pressable style={styles.scrim} onPress={() => setTurntable(false)} />
          <View
            style={[
              styles.drawer,
              night ? styles.drawerNight : styles.drawerDay,
              { bottom: consoleH + TILE_TEAR + 6, maxHeight: windowH * 0.72 },
            ]}
          >
            <View style={styles.drawerTabs}>
              <Text
                style={[styles.menuH, { color: night ? "#F4EBD6" : "#0B0A08", borderBottomColor: night ? "rgba(201,166,98,.35)" : "rgba(110,86,58,.3)" }]}
              >
                The voice
              </Text>
              <Pressable
                onPress={() => setTurntable(false)}
                style={styles.drawerX}
                accessibilityLabel="Close the turntable"
              >
                <Text style={{ fontSize: 15, color: night ? "rgba(240,229,207,.6)" : ink(0.6) }}>
                  ×
                </Text>
              </Pressable>
            </View>

            <ScrollView style={styles.drawerScroll}>
              <View style={styles.rack}>
                {voices.map((v) => {
                  const on = v.id === (voice ?? nowVoice?.id);
                  return (
                    <Pressable
                      key={v.id}
                      onPress={() => {
                        setNarrator(v.id);
                        setTurntable(false);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      style={styles.pick}
                    >
                      {/* ≤520px: .rr-lr-nar-disc{width:76px;height:76px}; the
                          one on the platter is opaque and on the spindle */}
                      <View
                        style={[
                          styles.narDisc,
                          { backgroundColor: v.hue, opacity: on ? 1 : 0.55 },
                          on && { borderWidth: 2, borderColor: "#9B7A4D" },
                        ]}
                      >
                        <Text style={styles.narDiscLetter}>{v.name[0]?.toUpperCase()}</Text>
                        {on ? <View style={styles.spindle} /> : null}
                      </View>
                      <Text style={[styles.pickName, { color: night ? "#F4EBD6" : "#171411" }]}>
                        {v.name}
                      </Text>
                      <Text
                        style={[
                          styles.pickNote,
                          { color: night ? "rgba(240,229,207,.62)" : "rgba(11,10,8,.6)" },
                        ]}
                      >
                        {v.note}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </>
      ) : null}

      {/* ================================ the contents =============== */}
      {contents ? (
        <>
          <Pressable style={styles.scrim} onPress={() => setContents(false)} />
          {/* ≤900px: the drawer is a BOTTOM SHEET rising from the console
              (bottom:calc(100% + 6px)), left/right 8, capped at 70vh, with
              the torn card's slight anticlockwise set */}
          <View
            style={[
              styles.drawer,
              night ? styles.drawerNight : styles.drawerDay,
              { bottom: consoleH + TILE_TEAR + 6, maxHeight: windowH * 0.7 },
            ]}
          >
            {/* the tab row — The bands / The slips, and the × */}
            <View style={styles.drawerTabs}>
              {(["bands", "slips"] as const).map((which) => {
                const on = pane === which;
                return (
                  <Pressable
                    key={which}
                    onPress={() => setPane(which)}
                    accessibilityRole="tab"
                    style={[
                      styles.dtab,
                      on && {
                        borderBottomColor: night ? "#D2AF69" : "#7E2D1F",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dtabText,
                        {
                          color: on
                            ? night
                              ? "#F4EBD6"
                              : "#0B0A08"
                            : night
                              ? "rgba(240,229,207,.7)"
                              : ink(0.55),
                        },
                      ]}
                    >
                      {which === "bands" ? "The bands" : "The slips"}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setContents(false)}
                style={styles.drawerX}
                accessibilityLabel="Close the drawer"
              >
                <Text style={{ fontSize: 15, color: night ? "rgba(240,229,207,.6)" : ink(0.6) }}>
                  ×
                </Text>
              </Pressable>
            </View>

            {pane === "bands" ? (
              <ScrollView style={styles.drawerScroll}>
                {recording.chapters.map((c) => {
                  const on = c.n === band;
                  return (
                    <Pressable
                      key={c.n}
                      onPress={() => {
                        step(c.n > band ? 1 : -1);
                        // step() moves one band; jump straight for a far tap
                        if (Math.abs(c.n - band) > 1 && man) setLeaf(leafOfChapter(man, c.n));
                        setContents(false);
                      }}
                      style={[styles.drawerRow, { borderBottomColor: ink(0.1) }]}
                    >
                      <Text style={[styles.drawerNum, { color: night ? "#C9A662" : "#8C6A3F" }]}>
                        {c.n + 1}
                      </Text>
                      <Text
                        style={[styles.drawerLabel, { color: on ? (night ? "#E0B770" : "#7E2D1F") : railInk }]}
                        numberOfLines={1}
                      >
                        {c.title}
                      </Text>
                      <Text style={[styles.drawerTime, { color: railMuted }]}>
                        {mmss(c.duration)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <ScrollView style={styles.drawerScroll}>
                {/* the web's own empty line, in the hand — slips press on the
                    phone in Phase 3, but the drawer already knows their name */}
                <Text style={[styles.slipsEmpty, { color: night ? "#C4A37A" : "#6E563A" }]}>
                  no slips pressed. the ribbon keeps your place; a slip keeps a
                  moment.
                </Text>
              </ScrollView>
            )}
          </View>
        </>
      ) : null}
    </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // inside the Modal the desk owns the whole screen
  reader: { flex: 1 },
  // the field: white by day; the night field is the starred gradient above
  fieldDay: { backgroundColor: "#FFFEFB" },

  // ≤760px: min-height 54, gap 4, padding 6 / 2.6vw / 10
  rail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 54,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  // ≤900px: .rr-lr-rail-side{flex:0 1 auto} — the sides yield to the head
  railSide: { flexGrow: 0, flexShrink: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 2 },
  railSideR: { justifyContent: "flex-end" },
  railBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minHeight: 38,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
  },
  // ≤900px: .rr-lr-rail-mid{max-width:none;flex:1 1 auto;padding-inline:6px}
  railMid: { flex: 1, alignItems: "center", gap: 2, paddingHorizontal: 6, paddingTop: 4, paddingBottom: 3 },
  // small-caps in the web; RN has no font-variant on Android, so the kicker
  // takes the tracked uppercase the rest of the portal uses
  railKick: {
    fontFamily: FONTS.serifRegular,
    fontSize: 10.5,
    letterSpacing: em(10.5, 0.22),
    textTransform: "uppercase",
  },
  railTitle: { fontFamily: FONTS.serif, fontSize: 15.5, lineHeight: 17.7, maxWidth: "100%" },

  // the codex's own box, not the specimen stage: .rr-lr-cx{padding:5px 3px 7px}
  cx: { flex: 1 },
  stage: { flexGrow: 1, paddingHorizontal: 3, paddingTop: 5, paddingBottom: 7, alignItems: "center" },
  // .rr-lr-cx-stage{flex:1 1 auto;align-items:center} — the case is centred in
  // whatever height is left above the turn rail
  cxStage: { flex: 1, width: "100%", justifyContent: "center" },
  // .rr-lr-cx's own wash: radial-gradient(64% 48% at 50% 0,rgba(255,244,214,.35),0 70%).
  // RN has no radial gradient, so it is the same wash as a vertical fade over
  // the top 48% of the codex box. DAY ONLY — at night .rr-lr-cx replaces its
  // whole background with the starred navy and carries no lamp at all.
  lamp: { position: "absolute", top: 0, left: 0, right: 0, height: "48%", zIndex: 1 },

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
  leafWait: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
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

  // .rr-lr-cx-foot — width:min(600px,100%); margin:0 auto;
  // justify-content:space-between; padding:9px 4px 0
  foot: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignSelf: "center",
    width: "100%",
    maxWidth: 600,
    paddingTop: 9,
    paddingHorizontal: 4,
  },
  // .rr-lr-turn{padding:6px 4px} — the hit area around the disc
  turn: { paddingVertical: 6, paddingHorizontal: 4 },
  disc: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  discDay: {
    backgroundColor: "#FDFAF0",
    borderColor: "rgba(110,86,58,.4)",
    shadowColor: "#362A1C",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  discNight: {
    backgroundColor: "#1D2537",
    borderColor: "rgba(201,166,98,.38)",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  // ≤900px: .rr-lr-deck{gap:6px 7px;padding:12px clamp(8px,2.6vw,16px)
  // calc(9px + safe-area)}; ≤520px narrows the column gap to 4px
  deck: { paddingTop: 12, gap: 6 },
  groovebox: { gap: 2 },
  deckCtrl: { flexDirection: "row", alignItems: "center", gap: 4 },
  // .rr-lr-deck-side{flex:none;gap:2px}
  deckSide: { flexDirection: "row", alignItems: "center", gap: 2 },
  // .rr-lr-deck-ctrl{order:3;flex:1 1 auto;justify-content:center;gap:8px} —
  // the transport is centred in the slack, which is what puts the platter
  // near the middle of the console instead of hard against the left tools
  transport: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  // .rr-lr-tool{min-height:40px;padding:8px 9px}, ≤520px padding-inline:5px
  tool: { minHeight: 40, paddingVertical: 8, paddingHorizontal: 5, alignItems: "center", justifyContent: "center" },
  // ≤520px: 42px circles, 1px rule at .22
  jog: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  big: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  // .rr-lr-speed — the dial pill, its rpm figure hidden at this width
  speed: {
    minHeight: 34,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  speedText: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    letterSpacing: em(10, 0.06),
    textTransform: "uppercase",
  },
  // .rr-lr-narbtn{padding:5px 3px} inside a .rr-lr-tool's 40px floor
  narBtn: { minHeight: 40, paddingVertical: 5, paddingHorizontal: 3, alignItems: "center", justifyContent: "center" },
  // .rr-lr-nar-face — 30px, the narrator's hue, the initial in cream
  narFace: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#7E2D1F",
    borderWidth: 1,
    borderColor: "rgba(11,10,8,.28)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  narInitial: { fontFamily: FONTS.serif, fontSize: 14, color: "#F1E4C4" },

  grooveRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  // Cormorant figures, tabular so the clock never breathes
  time: { fontFamily: FONTS.serifRegular, fontSize: 14, fontVariant: ["tabular-nums"], minWidth: 34 },
  // the 28px hit strip is TRANSPARENT; the 6px pill inside is the track
  groove: { flex: 1, height: 28, justifyContent: "center" },
  grooveTrack: { height: 6, borderRadius: 999, overflow: "hidden" },
  grooveFill: { position: "absolute", left: 0, top: 0, bottom: 0 },
  grooveHd: { position: "absolute", top: 7, width: 14, height: 14, marginLeft: -7, borderRadius: 7, borderWidth: 1 },
  // .rr-lr-deck-line{display:flex;align-items:baseline;justify-content:center;gap:9px}
  deckLine: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 9 },
  deckBand: { fontFamily: FONTS.serif, fontSize: 14, maxWidth: 220 },
  deckEm: { fontFamily: FONTS.sansSemi, fontSize: 10.5, letterSpacing: em(10.5, 0.04), fontVariant: ["tabular-nums"] },

  // .rr-lr-dscrim{background:rgba(11,10,8,.28)}
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(11,10,8,.28)" },
  // ≤900px: a bottom sheet over the dimmed stage — left/right 8, rising from
  // the console. The desk card's anticlockwise set goes here (`transform:none`):
  // a sheet pinned to both margins reads as tilted chrome, not a torn card.
  drawer: {
    position: "absolute",
    left: 8,
    right: 8,
    borderRadius: 3,
    shadowColor: "#362A1C",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 6, height: 10 },
    elevation: 8,
  },
  drawerDay: { backgroundColor: "#FFFEFC" },
  drawerNight: { backgroundColor: "#1D2537" },
  // .rr-lr-drawer-tabs{gap:2px;padding:19px 20px 0}
  drawerTabs: { flexDirection: "row", alignItems: "center", gap: 2, paddingTop: 19, paddingHorizontal: 20 },
  dtab: { paddingTop: 7, paddingBottom: 8, paddingHorizontal: 11, borderBottomWidth: 2, borderBottomColor: "transparent" },
  dtabText: {
    fontFamily: FONTS.serifRegular,
    fontSize: 14.5,
    letterSpacing: em(14.5, 0.16),
    fontVariant: ["small-caps"],
  },
  drawerX: { marginLeft: "auto", paddingVertical: 6, paddingHorizontal: 9 },
  // .rr-lr-menu-h — the card's own head, ruled under
  menuH: {
    flex: 1,
    fontFamily: FONTS.serifMedium,
    fontSize: 14.5,
    letterSpacing: em(14.5, 0.16),
    fontVariant: ["small-caps"],
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  // .rr-lr-nar — a strict two-column rack, gap 4px 16px
  rack: { flexDirection: "row", flexWrap: "wrap", paddingTop: 12, paddingBottom: 6 },
  // .rr-lr-nar-pick{padding:10px 4px 8px;gap:8px}
  pick: { width: "50%", alignItems: "center", gap: 8, paddingTop: 10, paddingBottom: 8, paddingHorizontal: 4 },
  // ≤520px: 76px discs
  narDisc: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2B1E10",
    shadowOpacity: 0.26,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  narDiscLetter: { fontFamily: FONTS.serifRegular, fontSize: 30, color: "#F1E4C4" },
  // only the disc on the platter is on the spindle
  spindle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FBF5E4",
    borderWidth: 1.5,
    borderColor: "rgba(11,10,8,.42)",
  },
  pickName: { marginTop: 2, fontFamily: FONTS.serif, fontSize: 16, textAlign: "center" },
  // the one-line character note is Manrope, not tiny italic serif
  pickNote: {
    fontFamily: FONTS.sans,
    fontSize: 10.5,
    lineHeight: 16.3,
    letterSpacing: em(10.5, 0.015),
    textAlign: "center",
  },
  // .rr-lr-drawer-pane{padding:6px 22px 24px}
  drawerScroll: { flexGrow: 0, paddingTop: 6, paddingHorizontal: 22, marginBottom: 24 },
  // .rr-lr-slips-empty — the hand, at its slight set
  slipsEmpty: {
    marginVertical: 12,
    marginHorizontal: 2,
    fontFamily: FONTS.hand,
    fontSize: 14.5,
    lineHeight: 21.75,
    transform: [{ rotate: "-0.5deg" }],
  },
  drawerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  drawerNum: { fontFamily: FONTS.serifItalic, fontSize: 13, minWidth: 22 },
  drawerLabel: { flex: 1, fontFamily: FONTS.serif, fontSize: 16 },
  drawerTime: { fontFamily: FONTS.sansSemi, fontSize: 10.5 },
});
