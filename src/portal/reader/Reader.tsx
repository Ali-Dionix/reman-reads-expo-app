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
import { useCallback, useEffect, useState } from "react";
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
import Svg, { Circle, Defs, Path, Pattern, Rect } from "react-native-svg";

import { mmss, useDeck, type Recording } from "../../lib/audioStore";
import { Jump } from "../Transport";
import {
  loadPages,
  pageImageUrl,
  pagesShape,
  leafOfChapter,
  type BookPages,
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
 * `.rr-lr-book::after` at ≤900px — the SPINE, folding round the left corner:
 * the hinge crease drawn as a horizontal gradient, and the striped silk chips
 * at the head and the tail. On a phone the gutter, the ribbon and the interior
 * headbands all belong to a spread; the spine replaces them
 * (`.rr-lr-fold,.rr-lr-mark,.rr-lr-hb{display:none}`).
 */
function Spine() {
  return (
    <View style={styles.spine} pointerEvents="none">
      <LinearGradient
        colors={[
          "rgba(0,0,0,.5)",
          "rgba(255,255,255,.17)",
          "rgba(255,255,255,.05)",
          "rgba(0,0,0,.42)",
          "rgba(0,0,0,.22)",
        ]}
        locations={[0, 0.28, 0.56, 0.83, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      {/* the two silk chips — 11×4 stripes at (5,5) and (5, bottom-5) */}
      <SilkChip top />
      <SilkChip />
    </View>
  );
}

/** repeating-linear-gradient(90deg,#F1E4C4 0 1.6px,#7E2D1F 1.6px 3.2px), 11×4 */
function SilkChip({ top }: { top?: boolean }) {
  return (
    <Svg
      width={11}
      height={4}
      style={[styles.silk, top ? { top: 5 } : { bottom: 5 }]}
      pointerEvents="none"
    >
      <Rect width={11} height={4} fill="#F1E4C4" />
      {[1.6, 4.8, 8, 11.2].map((x) => (
        <Rect key={x} x={x} width={1.6} height={4} fill="#7E2D1F" />
      ))}
    </Svg>
  );
}

/**
 * The case, the block and the leaf — `.rr-lr-book` at its ≤900px branch: one
 * leaf, the spine under your thumb on the left.
 *
 * The case is the specimen volume's boards: OXBLOOD book cloth, blind-stamped
 * with a cream fillet (stamped on the FRONT board, so it starts clear of the
 * spine — inset 6px, but 23px from the hinge). Either side of the trim the
 * paper block shows its CUT EDGES — the 1px striping that makes fifty leaves
 * read as a stack rather than a screenshot.
 */
function Codex({
  slug,
  man,
  leaf,
  night,
}: {
  slug: string;
  man: BookPages | null;
  leaf: number;
  night: boolean;
}) {
  const shape = pagesShape(slug);
  const page = man?.pages[leaf];

  // The leaf is width-derived: aspectRatio against a width-constrained parent.
  const ratio = (man?.pageW ?? shape?.w ?? 1191) / (man?.pageH ?? shape?.h ?? 1684);

  return (
    <LinearGradient
      colors={night ? ["#4A1A16", "#3D1310", "#331010"] : ["#5C201C", "#4A1717", "#3B1211"]}
      locations={[0, night ? 0.46 : 0.44, 1]}
      start={{ x: 0.13, y: 0 }}
      end={{ x: 0.87, y: 1 }}
      style={[styles.case, night ? styles.caseNight : styles.caseDay]}
    >
      {/* ::before — the fillet, on the front board only (left inset 23px) */}
      <View style={[styles.fillet, { borderColor: "rgba(241,228,196,.2)" }]} pointerEvents="none" />

      {/* the block, with a cut edge on each side of the trim */}
      <View style={styles.block}>
        <CutEdge width={5} side="left" night={night} />
        <CutEdge width={17} side="right" night={night} />

        <View
          style={[
            styles.win,
            {
              aspectRatio: ratio,
              backgroundColor: night ? "#1D263C" : "#FDFAF0",
              borderColor: night ? "rgba(201,166,98,.2)" : "rgba(43,30,16,.3)",
            },
          ]}
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

          {/* every leaf is a recto: the shading is a SPINE SHADOW down the
              left edge, not a gutter (.rr-lr-leaf inset 20px wash) */}
          <LinearGradient
            colors={
              night
                ? ["rgba(0,0,0,.55)", "rgba(0,0,0,0)"]
                : ["rgba(110,86,58,.5)", "rgba(110,86,58,0)"]
            }
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.spineShadow}
            pointerEvents="none"
          />
        </View>
      </View>

      {/* the spine cloth folds round the hinge, over the case's left band */}
      <Spine />
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
  } = useDeck();

  const [man, setMan] = useState<BookPages | null>(null);
  const [leaf, setLeaf] = useState(0);
  const [contents, setContents] = useState(false);
  const [pane, setPane] = useState<"bands" | "slips">("bands");
  const [grooveW, setGrooveW] = useState(0);
  // the drawer is a bottom sheet rising from the console — it needs to know
  // where the console's top edge is
  const [consoleH, setConsoleH] = useState(0);
  const { height: windowH } = useWindowDimensions();

  const band = now?.band ?? 0;

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

  // The needle moves the paper: a new band turns to its first leaf.
  useEffect(() => {
    if (man) setLeaf(leafOfChapter(man, band));
  }, [man, band]);

  const shape = pagesShape(recording.slug);
  const total = man?.pages.length ?? shape?.n ?? 0;
  const printed = man?.pages[leaf]?.n ?? leaf + 1;
  const pct = total ? Math.round(((leaf + 1) / total) * 100) : 0;

  const turn = useCallback(
    (d: 1 | -1) => setLeaf((l) => Math.max(0, Math.min(total - 1, l + d))),
    [total],
  );

  const grooveAt = (x: number) => {
    if (!grooveW || !duration) return;
    seekTo((x / grooveW) * duration);
  };

  const gpct = duration > 0 ? Math.min(1, position / duration) : 0;

  const railInk = night ? "#E8DECB" : "#171411";
  const railMuted = night ? "rgba(232,222,203,.66)" : "rgba(11,10,8,.66)";

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
        <View style={[styles.rail, { paddingTop: insets.top + 6 }]}>
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
      {/* .rr-lr-lamp — the reading lamp, from just above the head of the page */}
      <LinearGradient
        pointerEvents="none"
        colors={
          night
            ? ["rgba(255,226,160,.22)", "rgba(255,226,160,0)"]
            : ["rgba(255,244,214,.60)", "rgba(255,244,214,0)"]
        }
        style={styles.lamp}
      />
      <ScrollView contentContainerStyle={styles.stage} showsVerticalScrollIndicator={false}>
        <Codex slug={recording.slug} man={man} leaf={leaf} night={night} />

        {/* .rr-lr-cx-foot — the arrows go UNDER the case on a phone, one to
            each margin (space-between), on paper-filled discs */}
        <View style={styles.foot}>
          <Pressable
            onPress={() => turn(-1)}
            disabled={leaf <= 0}
            accessibilityLabel="Previous page"
            style={[
              styles.disc,
              night ? styles.discNight : styles.discDay,
              { opacity: leaf <= 0 ? 0.35 : 1 },
            ]}
          >
            <Glyph d={Ic.prev} color={railInk} size={17} />
          </Pressable>
          <Pressable
            onPress={() => turn(1)}
            disabled={leaf >= total - 1}
            accessibilityLabel="Next page"
            style={[
              styles.disc,
              night ? styles.discNight : styles.discDay,
              { opacity: leaf >= total - 1 ? 0.35 : 1 },
            ]}
          >
            <Glyph d={Ic.next} color={railInk} size={17} />
          </Pressable>
        </View>
      </ScrollView>

      {/* ============================== the torn console ============= */}
      <TornBand edge="top">
        <View
          style={[styles.deck, { paddingBottom: insets.bottom + 9 }]}
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

            <Text style={[styles.deckLine, { color: railMuted }]} numberOfLines={1}>
              <Text
                style={{
                  fontFamily: FONTS.serif,
                  fontSize: 14,
                  color: night ? "#EADFC6" : "#171411",
                }}
              >
                {loading ? "Cueing…" : (chapter?.title ?? "Nothing on the platter")}
              </Text>
              {total ? `  ·  ${pct}% · Page ${printed} of ${total}` : ""}
            </Text>
          </View>

          <View style={styles.deckCtrl}>
            <Pressable
              onPress={() => openPane("bands")}
              style={styles.tool}
              accessibilityLabel="Contents"
            >
              <Glyph d={Ic.drawer} color={railMuted} size={16} />
            </Pressable>

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

            <View style={styles.deckSpacer} />

            {/* the narrator's face — the 30px disc in the house hue, carrying
                the NARRATOR's initial ("Read by Ambrose Reed." → A). A
                specimen line names no one, so the house answers for it. */}
            <View style={styles.narFace} accessibilityLabel={recording.voice}>
              <Text style={styles.narInitial}>
                {/^read by\s+(\w)/i.exec(recording.voice)?.[1]?.toUpperCase() ?? "R"}
              </Text>
            </View>

            <SunMoon size={34} ink={night ? "#C9A662" : "#6E563A"} line={ink(0.28)} />
          </View>
        </View>
      </TornBand>

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

  // ≤760px: padding-block 12/14; ≤520px: padding-inline 3
  stage: { paddingHorizontal: 3, paddingTop: 12, paddingBottom: 14, alignItems: "center" },
  // radial-gradient(56% 46% at 50% -8%) — RN has no radial gradient, so the
  // lamp is the same wash as a vertical fade over the top ~46% of the stage
  lamp: { position: "absolute", top: 84, left: 0, right: 0, height: "40%", zIndex: 1 },

  // ≤900px: .rr-lr-book{padding:10px 9px 12px 18px} — the wide side is the
  // SPINE under your thumb. The radius is the spine's: square at the hinge,
  // rounded at the fore-edge.
  case: {
    width: "100%",
    paddingTop: 10,
    paddingLeft: 18,
    paddingRight: 9,
    paddingBottom: 12,
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
  // the fillet is stamped on the FRONT board — it starts clear of the spine
  // (.rr-lr-book::before{inset:6px 6px 6px 23px})
  fillet: { position: "absolute", top: 6, left: 23, right: 6, bottom: 6, borderWidth: 1, borderRadius: 2 },
  // the block sits inside the cut-edge margins (--pl 5px / --pr 17px)
  block: { marginLeft: 5, marginRight: 17 },
  cut: { position: "absolute", top: 2, bottom: 2, overflow: "hidden" },
  win: {
    width: "100%",
    overflow: "hidden",
    borderWidth: 1,
  },
  leafWait: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  // .rr-lr-book::after — the spine band over the case's left 18px
  spine: {
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
  // every leaf is a recto — the spine shadow falls down its left edge
  spineShadow: { position: "absolute", left: 0, top: 0, bottom: 0, width: 20 },

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
  // calc(9px + safe-area)}
  deck: { paddingHorizontal: 10, paddingTop: 12, gap: 6 },
  groovebox: { gap: 2 },
  deckCtrl: { flexDirection: "row", alignItems: "center", gap: 7 },
  deckSpacer: { flex: 1 },
  tool: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
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
  deckLine: { fontFamily: FONTS.sans, fontSize: 11, textAlign: "center" },

  // .rr-lr-dscrim{background:rgba(11,10,8,.28)}
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(11,10,8,.28)" },
  // ≤900px: a bottom sheet over the dimmed stage — left/right 8, rising from
  // the console; the torn card's slight anticlockwise set
  drawer: {
    position: "absolute",
    left: 8,
    right: 8,
    borderRadius: 3,
    transform: [{ rotate: "-0.6deg" }],
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
