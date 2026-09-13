// The four baked leaves of a bound volume — `volumeHtml()` in
// app/data/accountListeningPage.ts, at the ≤900px / ≤520px branches:
//
//   0  the frontispiece   `.rr-lr-fr`   the plate over its disc, the caption
//   1  the title page     `.rr-lr-tp`   house line, title, author, the facts,
//                                       Begin listening, the seal, the scrawl
//   2  the contents       `.rr-lr-toc`  the chapters with dot leaders
//   3  the colophon       `.rr-lr-end`  the end mark and the two ways out
//
// A hasText volume bakes NO band leaves (the chapter text is the galley's),
// so its leaf 3 is already the colophon and the count is four, padded to
// nothing. Every leaf carries a running head and a folio, like every page of
// a book (`leafHtml()`): folio 1 is a recto, so even indices are rectos; a
// verso carries the book's title and a recto the section it opens, each
// pushed to the OUTER edge.
//
// THE NIGHT RULES ARE HAND-SET, as the site's are ("a book read after dark is
// a warm sheet under a lamp, not a navy panel"): the paper, the inks and the
// rules below are the literals of the `html[data-rr-theme="dark"] .rr-lr-*`
// block, and where the site left a day literal to the tokeniser (the house
// line's gold, the numerals' brick) the token's own night value is used.

import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { chaptersOf, useDeck, type Recording } from "../../../lib/audioStore";
import { FONTS } from "../../../theme/type";
import { Button } from "../../../ui/Button";
import { Cover } from "../../../ui/Cover";
import { DashedBox } from "../../../ui/DashedBox";
import { SmallCaps } from "./SmallCaps";
import { roman, runShort, sleeveFor, voiceName } from "./sleeve";
import { fillProps, strokeProps } from "../../../ui/svgPaint";

/* ------------------------------------------------------------- inks --- */

/** The leaf's inks, day and night — one object per mode, read once. */
export function leafInks(night: boolean) {
  return night
    ? {
        paper: ["#222B40", "#1A2233"] as const,
        run: "rgba(210,175,105,.9)",
        runLabel: "rgba(210,175,105,.9)",
        runRule: "rgba(201,166,98,.3)",
        folio: "rgba(210,175,105,.9)",
        catch: "rgba(210,175,105,.9)",
        cap: "rgba(210,175,105,.9)",
        house: "#D4AD67",
        title: "#F4EBD6",
        by: "#EADFC6",
        tr: "rgba(210,175,105,.9)",
        factVal: "#EADFC6",
        // html[data-rr-theme=dark] .rr-lr-orn, .rr-lr-end-mark — one rule, .7
        orn: "rgba(217,138,112,.7)",
        tocSub: "rgba(240,229,207,.62)",
        goNum: "#D98A70",
        goTitle: "#EADFC6",
        goTime: "rgba(210,175,105,.9)",
        goLead: "rgba(201,166,98,.5)",
        goRule: "rgba(201,166,98,.3)",
        hand: "#C4A37A",
        endMark: "rgba(217,138,112,.7)",
        endP: "rgba(240,229,207,.8)",
        seal: "#D98A70",
        sealRing: "rgba(217,138,112,.45)",
      }
    : {
        paper: ["#FFFFFF", "#FFFFFF"] as const,
        run: "rgba(110,86,58,.85)",
        runLabel: "rgba(155,122,77,.95)",
        runRule: "rgba(110,86,58,.26)",
        folio: "rgba(110,86,58,.7)",
        catch: "rgba(110,86,58,.5)",
        cap: "rgba(110,86,58,.95)",
        house: "#8C6A3F",
        title: "#0B0A08",
        by: "#171411",
        tr: "rgba(110,86,58,.9)",
        factVal: "#171411",
        orn: "rgba(126,45,31,.5)",
        tocSub: "rgba(11,10,8,.6)",
        goNum: "#7E2D1F",
        goTitle: "#171411",
        goTime: "rgba(110,86,58,.95)",
        goLead: "rgba(110,86,58,.55)",
        goRule: "rgba(110,86,58,.26)",
        hand: "#6E563A",
        endMark: "rgba(126,45,31,.65)",
        endP: "rgba(11,10,8,.78)",
        seal: "#7E2D1F",
        sealRing: "rgba(126,45,31,.45)",
      };
}

/** `.rr-lr-leaf{padding-left:clamp(19px,5vw,28px)}` at ≤520px. */
export const leafSide = (width: number): number => Math.min(28, Math.max(19, width * 0.05));

/* ------------------------------------------------------------- leaf --- */

/** `.rr-lr-leaf`'s foot padding at ≤900px — the folio's bottom edge sits this
 *  far above the window's, clear of the dog-ears. */
const LEAF_FOOT = 57;

/**
 * `leafHtml()` — a leaf: the running head, the body, the folio.
 *
 * `.rr-lr-leaf{display:flex;flex-direction:column;overflow-y:auto;
 *   padding:16px clamp(19px,5vw,28px) 57px}` — the ≤520px head, the ≤900px
 * foot (kept clear of the dog-ears). A ScrollView whose content grows to the
 * window, so a short leaf can still centre its body and a long one scrolls.
 *
 * THE FOLIO ON A LONG LEAF. The site's leaf is `height:100%` and its body
 * `flex:1 1 auto; min-height:0`: the body SHRINKS to the window and its
 * content overflows through the folio, so on the contents leaf "· 3 ·" and
 * the catchword stand at the window's foot on the first screen, printed over
 * the list, and the rest of the list scrolls up under them. A ScrollView has
 * no shrinking body, so when the content runs past the window the folio is
 * printed a second time as an overlay pinned at the foot (the in-flow copy
 * goes invisible but keeps its height, so the measurement never flickers).
 * The site's folio scrolls away with the leaf; this one stays — the first
 * screen, which is what a reader sees taking the book down, is the same.
 */
export function Leaf({
  index,
  head,
  night,
  width,
  children,
  bodyStyle,
}: {
  index: number;
  head: { verso?: string; recto?: string; catchword?: string };
  night: boolean;
  /** The window's width — the leaf's own, for the responsive padding. */
  width: number;
  children: ReactNode;
  bodyStyle?: object;
}) {
  const ink = leafInks(night);
  const isVerso = index % 2 === 1;
  const label = (isVerso ? head.verso : head.recto) ?? head.recto ?? head.verso ?? "";
  const side = leafSide(width);
  const [winH, setWinH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const long = winH > 0 && contentH > winH + 1;

  // .rr-lr-run: Cormorant 13px small-caps, .16em; the label .2em, brass
  const mark = label ? (
    <SmallCaps text={label} size={13} family={FONTS.serifRegular} color={ink.runLabel} ls={2.6} line={16} />
  ) : (
    <Text style={styles.runBlank}> </Text>
  );

  // .rr-lr-folio — the folio between its printer's points, and the catchword
  // at the fore-edge (≤520px: padding-top 8)
  const folio = (
    <View style={styles.folio}>
      <View style={styles.folioSide} />
      <SmallCaps
        text={`· ${index + 1} ·`}
        size={14}
        family={FONTS.serifItalicMedium}
        color={ink.folio}
        ls={2.24}
        line={17}
      />
      <View style={[styles.folioSide, { alignItems: "flex-end" }]}>
        {head.catchword ? (
          <Text style={[styles.catch, { color: ink.catch }]}>{head.catchword}</Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.leaf} onLayout={(e) => setWinH(e.nativeEvent.layout.height)}>
      {/* the paper: white by day; at night a lit sheet — lamplight pooling at
          the head over a settling navy */}
      {night ? (
        <View style={[StyleSheet.absoluteFill, styles.inert]}>
          <LinearGradient colors={[ink.paper[0], ink.paper[1]]} style={StyleSheet.absoluteFill} />
          <LampPool />
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.inert, { backgroundColor: ink.paper[0] }]} />
      )}
      <ScrollView
        style={styles.leafScroll}
        contentContainerStyle={[
          styles.leafContent,
          { paddingLeft: side, paddingRight: side },
        ]}
        onContentSizeChange={(_w, h) => setContentH(h)}
        showsVerticalScrollIndicator={false}
        // a leaf scrolls inside the desk's own scroller on Android only with this
        nestedScrollEnabled
      >
        {/* .rr-lr-run — the head, its label at the outer edge, on a rule */}
        <View style={[styles.run, { borderBottomColor: ink.runRule }]}>
          {isVerso ? mark : <Text style={styles.runBlank}> </Text>}
          {isVerso ? <Text style={styles.runBlank}> </Text> : mark}
        </View>

        {/* .rr-lr-body — ≤520px: padding-top 12 */}
        <View style={[styles.body, bodyStyle]}>{children}</View>

        <View
          style={long ? styles.folioGone : null}
          accessibilityElementsHidden={long}
          importantForAccessibility={long ? "no-hide-descendants" : "auto"}
        >
          {folio}
        </View>
      </ScrollView>

      {/* the folio again, at the window's foot, when the body ran past it */}
      {long ? (
        <View style={[styles.folioPinned, { left: side, right: side }]} pointerEvents="none">
          {folio}
        </View>
      ) : null}
    </View>
  );
}

/**
 * `html[data-rr-theme="dark"] .rr-lr-leaf`'s first layer —
 * `radial-gradient(130% 72% at 50% -8%, rgba(255,224,158,.12), transparent 60%)`.
 * A unit circle under a scale is the ellipse: the viewBox is 100×100 stretched
 * to the box, so the radii are the CSS percentages verbatim.
 *
 * WIDTH AND HEIGHT ARE SAID. An <svg> with only a viewBox is a replaced
 * element with an intrinsic ratio, and on the web `top:0;bottom:0` does not
 * override that: absoluteFill gave it the leaf's WIDTH and a square height
 * (measured: 342×342 in a 342×580 leaf), so the pool's 72% was of 342 and
 * the lamp died a third of the way down. 100%/100% takes the box.
 */
export function LampPool() {
  return (
    <Svg
      width="100%"
      height="100%"
      style={StyleSheet.absoluteFill}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <Defs>
        <RadialGradient
          id="rr-lr-pool"
          cx={0}
          cy={0}
          r={1}
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(50 -8) scale(130 72)"
        >
          <Stop offset="0" stopColor="#FFE09E" stopOpacity={0.12} />
          <Stop offset="0.6" stopColor="#FFE09E" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={100} height={100} fill="url(#rr-lr-pool)" />
    </Svg>
  );
}

/* ----------------------------------------------------- the ornament --- */

/** `ornament` — the printer's flower between two rules, 132×10. The ≤520px
 *  rule narrows it to 104 wide and leaves the height ATTRIBUTE at 10, so the
 *  drawing is centred in a 104×10 box (preserveAspectRatio's default), and
 *  the block keeps the 10px the title page's centring counts on. */
function Ornament({ color, width = 104 }: { color: string; width?: number }) {
  return (
    <Svg width={width} height={10} viewBox="0 0 132 10" fill="none" style={{ marginVertical: 5 }}>
      <Path d="M4 5h44M84 5h44" {...strokeProps(color)} strokeWidth={1} strokeLinecap="round" />
      <Path d="M66 .8 70.2 5 66 9.2 61.8 5Z" {...fillProps(color)} />
      <Circle cx={53} cy={5} r={1.4} {...fillProps(color)} />
      <Circle cx={79} cy={5} r={1.4} {...fillProps(color)} />
    </Svg>
  );
}

/* --------------------------------------------------- the frontispiece --- */

/**
 * `.rr-lr-fr-disc` — the record behind the plate: the grooves as rings, the
 * label in the sleeve's ink, the spindle. Spins while this book sounds
 * (`.rr-lr-reader.is-playing .rr-lr-vol.is-open .rr-lr-fr-disc`, 3.6s linear).
 */
function FrontDisc({ size, label, spinning }: { size: number; label: string; spinning: boolean }) {
  const turn = useSharedValue(0);
  useEffect(() => {
    if (spinning) {
      turn.value = withRepeat(withTiming(360, { duration: 3600, easing: Easing.linear }), -1, false);
    } else {
      cancelAnimation(turn);
      turn.value = 0;
    }
  }, [spinning, turn]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));

  const r = size / 2;
  // repeating-radial-gradient(circle, rgba(0,0,0,.5) 0 1px, rgba(0,0,0,.18) 1px 3px)
  const rings: number[] = [];
  for (let d = 1.5; d < r; d += 3) rings.push(d);
  return (
    <Animated.View style={[{ width: size, height: size, borderRadius: size / 2 }, styles.disc, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={r} cy={r} r={r} fill="#171411" />
        <Circle cx={r} cy={r} r={r} fill="rgba(0,0,0,.18)" />
        {rings.map((d) => (
          <Circle key={d} cx={r} cy={r} r={d} fill="none" stroke="rgba(0,0,0,.5)" strokeWidth={1} />
        ))}
        {/* ::before — the label, 38%, with its inset ring */}
        <Circle cx={r} cy={r} r={r * 0.38} {...fillProps(label)} />
        <Circle cx={r} cy={r} r={r * 0.38 - 0.5} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth={1} />
        {/* ::after — the spindle, 7px, ringed */}
        <Circle cx={r} cy={r} r={3.5} fill="#FBF5E4" stroke="rgba(0,0,0,.4)" strokeWidth={1.5} />
      </Svg>
    </Animated.View>
  );
}

export function Frontispiece({
  rec,
  voice,
  index,
  night,
  width,
  spinning,
}: {
  rec: Recording;
  voice: string | null;
  index: number;
  night: boolean;
  width: number;
  spinning: boolean;
}) {
  const ink = leafInks(night);
  const s = sleeveFor(rec, voice);
  // .rr-lr-fr-plate{width:min(258px,62%)} of the body — the leaf less its sides
  const bodyW = width - leafSide(width) * 2;
  const plateW = Math.min(258, bodyW * 0.62);
  const discW = plateW * 0.74;

  return (
    <Leaf index={index} head={{ recto: "Frontispiece" }} night={night} width={width} bodyStyle={styles.fr}>
      <View style={{ width: plateW, aspectRatio: 2 / 3 }}>
        {/* the disc, half out from behind the plate: left 50%, top 9% */}
        <View style={[styles.frDisc, { left: plateW / 2, top: plateW * 1.5 * 0.09 }]}>
          <FrontDisc size={discW} label={s.labelHue} spinning={spinning} />
        </View>
        {/* .rr-lr-plate — the cover, ringed and thrown */}
        <View
          style={styles.plate}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${rec.title} cover`}
        >
          {/* the site's plate is one named element over aria-hidden art: the
              Cover's own Image must not announce as a second, nameless image */}
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            aria-hidden
          >
            <Cover art={s.art} spine={s.spine} width={plateW} radius={0} shadow={false} />
          </View>
        </View>
      </View>
      <Text style={[styles.frCap, { color: ink.cap }]}>{s.blurb}</Text>
    </Leaf>
  );
}

/* ------------------------------------------------------ the title page --- */

/** `.rr-lr-tp-facts span` — a small-caps label over its figure. Module scope:
 *  a component defined in a render body is a new type every render. */
function Fact({ label, value, ink }: { label: string; value: string; ink: ReturnType<typeof leafInks> }) {
  return (
    <View style={styles.fact}>
      <SmallCaps text={label} size={11.5} family={FONTS.serifMedium} color={ink.house} ls={2.07} line={14} />
      <Text style={[styles.factVal, { color: ink.factVal }]}>{value}</Text>
    </View>
  );
}

export function TitlePage({
  rec,
  voice,
  index,
  night,
  width,
  onBegin,
}: {
  rec: Recording;
  voice: string | null;
  index: number;
  night: boolean;
  width: number;
  /** "Begin listening" — the site's [data-rr-lr-begin]: the chapter the book
   *  was left in is OPENED first, and only then does the needle drop (behind
   *  refuseLocked, so a guest still gets the chapter). The frame lends it. */
  onBegin: () => void;
}) {
  const ink = leafInks(night);
  const s = sleeveFor(rec, voice);
  const chapters = chaptersOf(rec, voice);
  const reader = rec.hasText ? voiceName(rec, voice) : "Our default narrator";

  return (
    <Leaf index={index} head={{ recto: "Title page" }} night={night} width={width} bodyStyle={styles.tp}>
      <SmallCaps
        text="Roman Reads · Audiobooks"
        size={13}
        family={FONTS.serifRegular}
        color={ink.house}
        ls={3.9}
        line={16}
      />
      <Text style={[styles.tpTitle, { color: ink.title }]}>{rec.title}</Text>
      <Text style={[styles.tpBy, { color: ink.by }]}>{rec.author}</Text>
      <Ornament color={ink.orn} />
      <View style={styles.facts}>
        <Fact label="Read by" value={reader} ink={ink} />
        <Fact label="Runtime" value={runShort(rec.seconds)} ink={ink} />
        <Fact label="Chapters" value={String(chapters.length)} ink={ink} />
      </View>
      <View style={{ marginTop: 24 }}>
        <Button label="Begin listening" onPress={onBegin} />
      </View>
      {/* .rr-lr-seal — a dashed brick pill, 700 9.5px .2em */}
      <View style={styles.seal}>
        <DashedBox color={ink.sealRing} radius={999} />
        <Text style={[styles.sealText, { color: ink.seal }]}>In the subscription</Text>
      </View>
      <Text style={[styles.scrawl, { color: ink.hand }]}>{s.sleeveNote}</Text>
    </Leaf>
  );
}

/* --------------------------------------------------------- the contents --- */

export function ContentsLeaf({
  rec,
  voice,
  index,
  night,
  width,
  onBand,
}: {
  rec: Recording;
  voice: string | null;
  index: number;
  night: boolean;
  width: number;
  /** A row tapped: the site plays that chapter (and, for a hasText book,
   *  unfolds its galley); the deck refuses a guest and says so. */
  onBand: (band: number) => void;
}) {
  const ink = leafInks(night);
  const { now, playing } = useDeck();
  const chapters = chaptersOf(rec, voice);
  const here = now?.slug === rec.slug;

  return (
    <Leaf
      index={index}
      head={{ verso: rec.title, recto: "Contents", catchword: "End" }}
      night={night}
      width={width}
    >
      <SmallCaps text="The chapters" size={20} family={FONTS.serifMedium} color={ink.title} ls={3.6} line={24} />
      <Text style={[styles.tocSub, { color: ink.tocSub }]}>
        {rec.hasText
          ? `Read by ${voiceName(rec, voice)}. Tap a chapter to read along. The text follows the narration.`
          : `${rec.voice}. Tap a chapter to play it and the book turns to its page.`}
      </Text>
      <View>
        {chapters.map((c, i) => {
          const sounding = here && playing && now?.band === i;
          return (
            <Pressable
              key={i}
              onPress={() => onBand(i)}
              accessibilityRole="button"
              // the site's button names itself by its text — the label and
              // the time; the numeral is aria-hidden
              accessibilityLabel={`${c.title} ${mmss(c.duration)}`}
              style={({ pressed }) => [
                styles.bandGo,
                { borderTopColor: ink.goRule },
                i === chapters.length - 1 && { borderBottomWidth: 1, borderBottomColor: ink.goRule },
                pressed && { backgroundColor: night ? "rgba(201,166,98,.09)" : "rgba(110,86,58,.08)" },
              ]}
            >
              <View style={styles.goRow}>
                <Text
                  style={[styles.goNum, { color: sounding ? ink.title : ink.goNum }]}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  {roman(i)}
                </Text>
                <Text style={[styles.goTitle, { color: ink.goTitle }]} numberOfLines={1}>
                  {c.title}
                </Text>
                <View style={styles.goLead}>
                  <DotLead color={ink.goLead} />
                </View>
                <Text style={[styles.goTime, { color: ink.goTime }]}>{mmss(c.duration)}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.tocFoot, { color: ink.hand }]}>
        playback speed and a sleep timer live in the player bar below.
      </Text>
    </Leaf>
  );
}

/**
 * `.rr-lr-go-lead` — `border-bottom:1px dotted`, which Chrome paints as one
 * pixel on, one off — the kit's dotted Rule runs the same pattern now, with
 * the theme's colour; this leader keeps its own colour and 1px stroke,
 * pixel-snapped like a border.
 */
function DotLead({ color }: { color: string }) {
  return (
    <Svg width="100%" height={1}>
      <Line x1="0" y1={0.5} x2="100%" y2={0.5} {...strokeProps(color)} strokeWidth={1} strokeDasharray="1 1" {...CRISP} />
    </Svg>
  );
}

/** shape-rendering, which react-native-svg's types do not carry; web-only. */
const CRISP = { shapeRendering: "crispEdges" } as object;

const mmss = (s: number): string =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/* --------------------------------------------------------- the colophon --- */

/**
 * `.rr-lr-end-mark` — the asterism, ⁂. The site sets it in Cormorant, which
 * has no such glyph, so Chrome draws it from a fallback face and the golden
 * shows an upright three-floret mark in a 26×24 box; a phone would draw a
 * third and a fourth. Every other ornament on these leaves is an SVG for
 * exactly this reason, so the mark is one too, drawn to the golden's
 * fallback glyph at 10×: three FIVE-petal florets, one over two, each ~11px
 * across and packed so they touch; a petal is a fat teardrop, ~2.4px at the
 * waist with a rounded tip at r≈5.8, and the five leave a pinhole of paper
 * at the hub rather than a dot of ink.
 */
function EndMark({ color }: { color: string }) {
  const floret = (cx: number, cy: number) =>
    [0, 72, 144, 216, 288].map((deg) => (
      <Path
        key={`${cx}-${cy}-${deg}`}
        // a petal: out from the hub to r≈5.8, ~2.8 wide at the waist, round-tipped
        d="M0 -0.9 C 1.45 -1.6, 1.9 -3.5, 1.2 -5.1 C 0.75 -6, -0.75 -6, -1.2 -5.1 C -1.9 -3.5, -1.45 -1.6, 0 -0.9Z"
        {...fillProps(color)}
        transform={`translate(${cx} ${cy}) rotate(${deg})`}
      />
    ));
  return (
    <Svg width={26} height={24} viewBox="0 0 26 24">
      {floret(13, 6.4)}
      {floret(6.4, 17.8)}
      {floret(19.6, 17.8)}
    </Svg>
  );
}

export function Colophon({
  rec,
  voice,
  index,
  night,
  width,
  onShut,
}: {
  rec: Recording;
  voice: string | null;
  index: number;
  night: boolean;
  width: number;
  /** "Back to your audiobooks" — the frame's close. REQUIRED: on the site
   *  this is a live button that shuts the reader, and a ghost that does
   *  nothing is a dead tap; the frame lends its onClose. */
  onShut: () => void;
}) {
  const ink = leafInks(night);
  const s = sleeveFor(rec, voice);
  const router = useRouter();
  return (
    <Leaf index={index} head={{ verso: rec.title, recto: "Colophon" }} night={night} width={width} bodyStyle={styles.end}>
      {/* the mark's line box on the site is 39px tall (32px italic at
          normal leading) with the glyph sitting on its baseline; the SVG
          stands in the same box so the head under it does not move */}
      <View
        style={styles.endMark}
        // aria-hidden on the site: an ornament, not a word
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <EndMark color={ink.endMark} />
      </View>
      <View style={{ marginTop: 12 }}>
        <SmallCaps text="End of the recording" size={23} family={FONTS.serifMedium} color={ink.title} ls={3.68} line={28} />
      </View>
      <Text style={[styles.endP, { color: ink.endP }]}>{s.colophon}</Text>
      <View style={styles.endActs}>
        <Button label="Back to your audiobooks" ghost onPress={onShut} />
        {/* an <a> on the site (role link — the kit's Button says "button";
            see KIT.md for the role prop it still wants). The reader Modal
            has to come down BEFORE the push, or Hermes opens under it. */}
        <Button
          label="Ask AI about this book"
          ghost
          onPress={() => {
            onShut();
            router.push({ pathname: "/hermes", params: { book: rec.slug } });
          }}
        />
      </View>
    </Leaf>
  );
}

/* -------------------------------------------------------------- styles --- */

const styles = StyleSheet.create({
  leaf: { flex: 1, overflow: "hidden" },
  leafScroll: { flex: 1 },
  // ≤520px: padding-top 16; ≤900px: padding-bottom 57 (clear of the dog-ears)
  leafContent: { flexGrow: 1, paddingTop: 16, paddingBottom: 57 },
  run: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 9,
    borderBottomWidth: 1,
  },
  runBlank: { fontFamily: FONTS.serifRegular, fontSize: 13, lineHeight: 16 },
  body: { flexGrow: 1, flexShrink: 0, paddingTop: 12 },
  folio: { flexDirection: "row", alignItems: "baseline", gap: 10, paddingTop: 8 },
  folioSide: { flex: 1 },
  // the in-flow folio of a long leaf: still measured, no longer seen
  folioGone: { opacity: 0 },
  // the pinned copy: its bottom edge where the site's lands, 57px up
  folioPinned: { position: "absolute", bottom: LEAF_FOOT },
  catch: { fontFamily: FONTS.serifItalicLight, fontSize: 13.5, lineHeight: 16 },

  // .rr-lr-fr — the plate over its disc, then the caption; gap 18
  fr: { alignItems: "center", justifyContent: "center", gap: 18 },
  frDisc: { position: "absolute", zIndex: 1, pointerEvents: "none" },
  inert: { pointerEvents: "none" },
  // box-shadow: 6px 10px 22px rgba(54,42,28,.32) — the record thrown on the page
  disc: { boxShadow: "6px 10px 22px rgba(54,42,28,.32)" },
  plate: {
    zIndex: 2,
    boxShadow:
      "0 0 0 1px rgba(43,30,16,.35), 1px 3px 2px rgba(54,42,28,.22), 12px 20px 34px rgba(54,42,28,.3)",
  },
  // ≤520px: 14px; line-height 1.55; max-width 26em
  frCap: {
    fontFamily: FONTS.serifItalicLight,
    fontSize: 14,
    lineHeight: 21.703125,
    maxWidth: 364,
    textAlign: "center",
  },

  // .rr-lr-tp
  tp: { alignItems: "center", justifyContent: "center" },
  // h2: margin-top 18; 500; clamp(30px,3.7vw,46px) → 30 at a phone; 1.03; -.012em
  tpTitle: {
    marginTop: 18,
    fontFamily: FONTS.serifMedium,
    fontSize: 30,
    lineHeight: 30.890625,
    letterSpacing: -0.36,
    textAlign: "center",
  },
  tpBy: { marginTop: 6, fontFamily: FONTS.serifItalicLight, fontSize: 19, lineHeight: 23, textAlign: "center" },
  facts: { marginTop: 4, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: 26, rowGap: 6 },
  fact: { alignItems: "center", gap: 2 },
  // line-height normal at 16px Cormorant is 19.42 — measured against the
  // golden, 19 lands the figures (and everything under them) a pixel high
  factVal: { fontFamily: FONTS.serifRegular, fontSize: 16, lineHeight: 19.5 },
  // padding 7/13 INSIDE a 1px dashed border — the ring is the DashedBox
  // overlay on the outer pixel, so the box pads for the border too (29 tall)
  seal: { marginTop: 16, paddingVertical: 8, paddingHorizontal: 14 },
  sealText: { fontFamily: FONTS.sansBold, fontSize: 9.5, lineHeight: 13, letterSpacing: 1.9, textTransform: "uppercase" },
  scrawl: {
    marginTop: 20,
    fontFamily: FONTS.hand,
    fontSize: 15.5,
    lineHeight: 20,
    textAlign: "center",
    transform: [{ rotate: "-0.8deg" }],
  },

  // .rr-lr-toc-sub: margin 10px 0 16px; italic 15px/1.5
  tocSub: { marginTop: 10, marginBottom: 16, fontFamily: FONTS.serifItalicLight, fontSize: 15, lineHeight: 22.5 },
  // .rr-lr-band-go: border-top; padding 12px 3px 11px
  bandGo: { borderTopWidth: 1, paddingTop: 12, paddingBottom: 11, paddingHorizontal: 3 },
  goRow: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  goNum: { width: 24, fontFamily: FONTS.serifItalic, fontSize: 15, lineHeight: 18 },
  goTitle: { flexShrink: 1, fontFamily: FONTS.serif, fontSize: 17, lineHeight: 21 },
  // .rr-lr-go-lead: flex 1; a dotted rule, lifted 4px onto the baseline
  goLead: { flex: 1, minWidth: 10, height: 1, transform: [{ translateY: -4 }] },
  goTime: { fontFamily: FONTS.serifRegular, fontSize: 15, lineHeight: 18, fontVariant: ["tabular-nums"] },
  // .rr-lr-toc-foot: margin-top auto; padding-top 16; Caveat 500 15px/1.45
  tocFoot: {
    marginTop: "auto",
    paddingTop: 16,
    fontFamily: FONTS.hand,
    fontSize: 15,
    lineHeight: 21.75,
    transform: [{ rotate: "-0.6deg" }],
  },

  // .rr-lr-end
  end: { alignItems: "center", justifyContent: "center" },
  endMark: { height: 39, justifyContent: "flex-end", paddingBottom: 6 },
  endP: {
    marginTop: 14,
    maxWidth: 462,
    fontFamily: FONTS.serifRegular,
    fontSize: 16.5,
    lineHeight: 26.390625,
    textAlign: "center",
  },
  endActs: { marginTop: 26, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 },
});
