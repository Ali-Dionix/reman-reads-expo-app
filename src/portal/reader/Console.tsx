// The console — `.rr-lr-deck`, the torn tail band of the opened volume.
//
// Site: app/data/accountListeningPage.ts, `<footer class="rr-lr-deck">` in
// readerHtml and its rules (`.rr-lr-groovebox`, `.rr-lr-groove`,
// `.rr-lr-groove-track`, `.rr-lr-groove-hd`, `.rr-lr-groove-tip`,
// `.rr-lr-groove-row`, `.rr-lr-time`, `.rr-lr-deck-line`, `.rr-lr-clock`,
// `.rr-lr-deck-say`, `.rr-lr-deck-ctrl`, `.rr-lr-narbtn`, `.rr-lr-nar-face`,
// `.rr-lr-jog`, `.rr-lr-big`, `.rr-lr-speed`) at the ≤900px and ≤520px
// branches — the phone's — and the two SHORT-phone branches under them:
// `(max-height:700px)` (big 44, groove 24, gap 5, 8 above) and
// `(max-height:500px)` (no readout line, the groove after the keys, 6 / 5
// of padding). Behaviour: ListeningEnhancer.tsx paintDeck /
// paintTimes / paintGroove / paintFolio / say / refuseLocked, the
// [data-rr-lr-toggle] / -jog / -clock / -speed / -voice click handlers and
// the groove's pointer drag (groovePreview, commit on release).
//
// THE GROOVE ACROSS THE TOP, its two clocks at either end of the readout line
// under it, the sentence, then ONE ROW OF FIVE on a grid whose end columns are
// equal fractions — the narrator's label at the left margin, the dial at the
// right, and the three transport keys DEAD CENTRE between them. At ≤900px the
// narrator's printed name drops to the bare face and the dial drops its rpm
// figure, the keys 42 / 56 / 42 and the dial 54 wide (padding 6px 3px); at
// ≤520px the keys are 40 / 54 / 40 and the dial 50 wide (6px 2px). A phone
// on its side (844×390) and a small tablet take the first set.
//
// Heights, at 390×844: 10 above, the 22px groove, 3, a 25px readout row (the
// clock button's 4px padding around a 17px line), 6, the 17.39px sentence,
// 6, the 54px key row, 10 below — 154, the deck's box on the site.
//
// The dial is PER BOOK (console/speed.ts — speedShownFor / setSpeed(slug))
// and wears the ramp's chevron flag at its crown while the creep is armed;
// the jogs roll their overrun into the neighbouring band, as the site's
// jog() does; the two openers toggle their own sheet (toggleMenu). THE KEYS
// DO NOT SHUT A STANDING SHEET: the site's [data-rr-lr-toggle] / -jog /
// -clock handlers return before the document click's fall-through
// shutMenus(), so a reader can play, jog and read the clock with the dial's
// sheet up — only the two openers, the grabber and the scrim close one.
//
// The readout's percent is the WHOLE BOOK'S and, with nothing on the platter,
// is measured from the reader's standing chapter or their spot (paintFolio) —
// a volume reopened halfway through says so; the idle clock and groove stay
// on band 0 at 0:00, as paintDeck leaves them.
//
// The accessible names are the site's own aria-labels, verbatim — the parity
// rig drives both sides by them.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { Image } from "expo-image";

import { chaptersOf, mmss, useDeck, type Recording } from "../../lib/audioStore";
import { ownerOf } from "../../lib/portalState";
import { useSession } from "../../lib/session";
import { useSubscribe } from "../../lib/subscription";
import { em } from "../../theme/ink";
import { FONTS, lh, lineOf } from "../../theme/type";
import { Disc } from "../../ui/Disc";
import { hairline } from "../../ui/DashedBox";
import { Jog15, Pause, Play, RampFlag } from "./console/glyphs";
import { deckInk } from "./console/ink";
import { speedShort, useBookSpeed, useSpeedRamp } from "./console/speed";
import narrators from "./narrators.json";
import { useStanding, voiceInForce } from "./voice/standing";
import { strokeProps, stopProps } from "../../ui/svgPaint";

/** The web's own ten-entry table — past X the console prints the figure. */
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/** paintFolio's "18 hr 56 min left". */
const leftOf = (seconds: number): string => {
  const left = Math.max(0, seconds);
  const h = Math.floor(left / 3600);
  const m = Math.round((left % 3600) / 60);
  return `${h ? `${h} hr ${m} min` : `${m} min`} left`;
};

/** The pressed directory, for the face on the narrator button. */
const PRESSED = new Map(
  (narrators.pressed as { id: string; name: string; hue: string; portrait?: string }[]).map((n) => [n.id, n]),
);

export type Sheet = "voice" | "speed" | "lamp" | "type" | "contents" | null;

/** The console's figures at the phone's two heights. TALL is the ≤900px /
 *  ≤520px branch (the 390×844 golden); SHORT is `(max-height:700px)` —
 *  `.rr-lr-deck{gap:5px 7px;padding-top:8px}`, `.rr-lr-big` 44,
 *  `.rr-lr-groove` 24. An iPhone SE (667pt) shows the second. The big key's
 *  figure is the ≤520px one; the width side is read at render (`narrow`). */
const TALL = { top: 10, bottom: 10, gap: 6, big: 54, groove: 22 };
const SHORT = { top: 8, bottom: 10, gap: 5, big: 44, groove: 24 };
/** The lock line, as VoiceOver hears it when a refusal lands. */
const LOCKED_ANNOUNCE = "Listening needs an account. Sign up to listen.";
/** (max-height:500px): the groovebox's flex-basis, which the column deck
 *  reads as height. */
const FLAT_GROOVEBOX = 160;

/** The two sliders' VoiceOver / TalkBack actions. */
const SLIDER_ACTIONS = [{ name: "increment" }, { name: "decrement" }];

/* ------------------------------------------------------------ pieces --- */

/** `.rr-lr-groove-hd` — the brass stud: a radial gradient lit from the upper
 *  left, ringed by a 1px shadow and set on a second, blurred one
 *  (`0 1px 3px`). 14px; the ring is the `0 0 0 1px` spread. */
function Stud({ night, held }: { night: boolean; held: boolean }) {
  const { stud, studRing, studShadow } = deckInk(night);
  const s = 16;
  return (
    <View style={held ? { transform: [{ scale: 1.25 }] } : undefined}>
    {/* the drop: a 14px disc under the face carrying the blurred shadow */}
    <View pointerEvents="none" style={[styles.studDrop, { boxShadow: studShadow }]} />
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        {/* CSS sizes the circle to the farthest corner — .96 of the face's box,
            which the gradient's bounding-box units measure the same way */}
        <RadialGradient id="rr-lr-stud" cx="34%" cy="30%" r="96%" fx="34%" fy="30%">
          <Stop offset="0" {...stopProps(stud.hi)} />
          <Stop offset={stud.midAt} {...stopProps(stud.mid)} />
          <Stop offset="1" {...stopProps(stud.rim)} />
        </RadialGradient>
      </Defs>
      <Circle cx={8} cy={8} r={7.5} fill="none" {...strokeProps(studRing)} strokeWidth={1} />
      <Circle cx={8} cy={8} r={7} fill="url(#rr-lr-stud)" />
    </Svg>
    </View>
  );
}

/** The narrator's face turns like a record while the book sounds —
 *  `.rr-lr-reader.is-playing .rr-lr-narbtn .rr-lr-nar-face{animation:
 *  rr-lr-spin 3.6s linear infinite}`, and still under reduced motion. */
function useSpin(on: boolean): Animated.AnimatedInterpolation<string> {
  const spin = useRef(new Animated.Value(0)).current;
  const [still, setStill] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setStill(!!v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => setStill(!!v));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  useEffect(() => {
    if (!on || still) {
      spin.stopAnimation();
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 3600, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [on, still, spin]);
  return spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
}

/* ----------------------------------------------------------- console --- */

export function Console({
  recording,
  night,
  leaf,
  total,
  page,
  sheet,
  band: standing = -1,
  clockRemaining,
  onClock,
  onOpen,
  onSignUp,
  onLayoutHeight,
  liveSay = null,
  bottomInset,
}: {
  recording: Recording;
  night: boolean;
  /** The codex's standing leaf and page count — the folio, when pages exist. */
  leaf: number;
  total: number;
  /** The PRINTED page number on the standing leaf (`man.pages[leaf].n`) —
   *  the site's folio prints that, not the leaf's index. Omitted, the index. */
  page?: number;
  /** Which sheet stands open, so the openers can shut their own (toggleMenu)
   *  and read aria-expanded. REQUIRED: omitted, a second tap on the dial
   *  would open the sheet again instead of closing it. */
  sheet: Sheet;
  /** The frame's standing chapter — the site's galleyBand — for the readout
   *  while nothing sounds; -1 when the frame has none (the spot is read then). */
  band?: number;
  /** The clock button's state: the chapter's length, or the time left. */
  clockRemaining: boolean;
  onClock: () => void;
  /** Open a sheet — the narrator's, the dial's. */
  onOpen: (sheet: Sheet) => void;
  /** The say line's "Sign up to listen." link. */
  onSignUp: () => void;
  onLayoutHeight: (h: number) => void;
  /** The narrator sheet's line, said here too — the site's sayLive prints a
   *  live reader's refusal over the list AND on the console's sentence.
   *  Printed in place of the deck's own when the room is not locked (a
   *  locked room's sentence carries the "Sign up to listen." door and is
   *  already brick from the refusal that raised it). */
  liveSay?: { text: string; bad: boolean; subscribe?: boolean } | null;
  /** The rail's own gutter; the deck measures its own (see `pad`). */
  bandPad?: number;
  bottomInset: number;
}) {
  const { width, height } = useWindowDimensions();
  // the site's two short-phone branches (see the header), and the ≤520px
  // width branch under the ≤900px one
  const short = height <= 700;
  const flat = height <= 500;
  const narrow = width <= 520;
  const m = short ? SHORT : TALL;
  // the keys: ≤900px 42 / 56 / 42 and the dial 54; ≤520px 40 / 54 / 40 and
  // 50; (max-height:700px) takes the big key to 44 at either width
  const jogSize = narrow ? 40 : 42;
  const bigSize = short ? m.big : narrow ? 54 : 56;
  const dialW = narrow ? 50 : 54;
  const ink = deckInk(night);
  const {
    now,
    chapter,
    playing,
    position,
    duration,
    finished,
    toggle,
    begin,
    nudge,
    playAt,
    seekTo,
    voice,
    say: deckSay,
    locked,
    spots,
  } = useDeck();
  const say = deckSay ?? (liveSay?.text ? liveSay : null);
  // the subscription's refusal — from the deck (a live band the site would
  // not read) or the narrator sheet (a tap) — carries the website's door
  const subscribeDoor = !!say && "subscribe" in say && !!say.subscribe;
  const { subscribe } = useSubscribe();
  // the dial, this book's own; the creep belongs to the room's root
  // (console/SpeedFollower.tsx) and is only stood in for here until that
  // is mounted — counting nothing while it is
  const { speed, ramp } = useBookSpeed(recording.slug);
  useSpeedRamp(recording.slug, "console");

  // paintDeck: this book on the platter, or the idle readout
  const here = now?.slug === recording.slug;
  const band = here ? (now?.band ?? 0) : null;
  // THE PRESSING IN FORCE is the deck's while THIS book sounds, else the
  // reader's ledger (voice/standing.ts — the site's paintVoice goes through
  // narratorFor → voiceInForce, and paintDeck's bandDuration through bookFor →
  // narratorFor, so a choice made in the narrator sheet changes the face AND
  // the chapter length at once, before anything plays), else the house's
  // default — the face must not go blank on a volume opened to browse.
  const { user } = useSession();
  const ledger = useStanding(ownerOf(user?.id));
  const voices = recording.voices ?? [];
  const voiceIds = useMemo(() => voices.map((v) => v.id), [voices]);
  const voiceId = here ? voice : voiceInForce(recording.slug, voiceIds, recording.voiceId ?? null, ledger);
  const chapters = chaptersOf(recording, voiceId);

  // paintFolio's percent is the WHOLE BOOK'S, measured in audio time (bands
  // already behind you, plus where the needle stands in this one) — not the
  // page count. A book's chapters are not equal lengths, so the two disagree.
  // Nothing on the platter: the frame's standing band, else the spot's
  // chapter, and the spot's seconds only when they belong to that chapter.
  const spot = spots[recording.slug];
  const at =
    band !== null
      ? band
      : standing >= 0
        ? standing
        : Math.max(0, Math.min(spot?.chapter ?? 0, Math.max(0, chapters.length - 1)));
  const secs = here ? position : spot?.chapter === at ? spot.seconds : 0;
  const whole = chapters.reduce((s, c) => s + c.duration, 0);
  const done = chapters.slice(0, at).reduce((s, c) => s + c.duration, 0) + secs;
  const pct = whole ? Math.round((done / whole) * 100) : 0;
  const printed = total ? `Page ${page ?? leaf + 1} of ${total}` : leftOf(whole - done);

  const cur = here ? position : 0;
  const dur = here ? duration || (chapters[band ?? 0]?.duration ?? 0) : (chapters[0]?.duration ?? 0);

  // who is reading: narrators.json's face on the label, or the initial
  const nowVoice = voices.find((v) => v.id === voiceId) ?? voices[0] ?? null;
  const face = nowVoice ? PRESSED.get(nowVoice.id) : undefined;
  const voiceInitial =
    nowVoice?.name?.[0]?.toUpperCase() ??
    /^read by\s+(\w)/i.exec(recording.voice)?.[1]?.toUpperCase() ??
    "R";

  const rotate = useSpin(here && playing);

  // ≤900px: .rr-lr-deck{padding:10px clamp(8px,3.4vw,18px) calc(10px + safe-area)}
  const pad = Math.min(18, Math.max(8, width * 0.034));

  // the two openers toggle their own sheet (toggleMenu); no key shuts one
  const open = (which: Sheet) => onOpen(sheet === which ? null : which);

  // The lock line is said MUTED on every volume open (the site: `say(LOCKED_SAY,
  // { html })`, no `bad`) and turns to refusal ink on ANY refusal after it —
  // the site's refuseLocked runs for a contents row, a locked live voice
  // (VoiceSheet.pickLive calls begin() for exactly this), a slip, the rail's
  // chapter jogs, not only the big key. The deck's refusals outlive the
  // volume (they clear on sign-in alone), so the line reads their RISE since
  // this console was mounted: a guest refused once in an earlier volume
  // reopens the next to a muted line, as the site does, and the first
  // refusal in this one turns it brick from wherever it came.
  //
  // The store COUNTS refusals (`say.n`), so every refusal after the mount is
  // a rise, from any control, however many came before.
  const n = deckSay?.n ?? 0;
  const atMount = useRef(n);
  // a NOTE of the deck's own (a refused seek, a live chapter the site would
  // not read) is brick or muted as it says; only the LOCK line reads its rise
  const bad = deckSay
    ? deckSay.kind === "note"
      ? deckSay.bad
      : deckSay.bad && n > atMount.current
    : !!say?.bad;
  // every refusal is announced (the site's say() → announce()) —
  // accessibilityLiveRegion is Android's alone, so VoiceOver is told here
  const seen = useRef(n);
  useEffect(() => {
    const was = seen.current;
    seen.current = n;
    if (deckSay && bad && n !== was) {
      AccessibilityInfo.announceForAccessibility(deckSay.kind === "note" ? deckSay.text : LOCKED_ANNOUNCE);
    }
  }, [deckSay, bad, n]);

  /* ------------------------------------------------- the groove --- */

  // The site scrubs on pointer drag and COMMITS ON RELEASE — "the needle
  // lands where it was set down". The head and the fill follow the finger
  // meanwhile, with the paper tag above the head. Inert while this book is
  // not on the platter (the site: `st.slug !== openSlug` → return).
  const [dialHover, setDialHover] = useState(false);
  // .rr-lr-speed:hover{background:#0B0A08;color:#FAF7EF}: under a mouse, the
  // pointer's; on the device, Chrome Android and Safari hold :hover on the
  // tapped button until the next tap, so the site's dial stands FILLED while
  // its sheet is up (the reader-speed golden) — the expanded state is the
  // touch hover. On the web the pointer's own hover already does this.
  const lit = dialHover || (Platform.OS !== "web" && sheet === "speed");
  const [grooveW, setGrooveW] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);
  const live = useRef({ here, dur, grooveW, seekTo });
  live.current = { here, dur, grooveW, seekTo };
  const start = useRef(0);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => live.current.here && live.current.dur > 0,
        onMoveShouldSetPanResponder: () => live.current.here && live.current.dur > 0,
        onPanResponderGrant: (e) => {
          const w = live.current.grooveW || 1;
          start.current = Math.max(0, Math.min(1, e.nativeEvent.locationX / w));
          setScrub(start.current);
        },
        onPanResponderMove: (_e, g) => {
          const w = live.current.grooveW || 1;
          setScrub(Math.max(0, Math.min(1, start.current + g.dx / w)));
        },
        onPanResponderRelease: (_e, g) => {
          const w = live.current.grooveW || 1;
          const ratio = Math.max(0, Math.min(1, start.current + g.dx / w));
          setScrub(null);
          live.current.seekTo(ratio * live.current.dur);
        },
        onPanResponderTerminate: () => setScrub(null),
        // a drag on the groove is the groove's until the finger lifts: no
        // scroller above takes it over mid-gesture
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [],
  );
  const gpct = scrub ?? (dur > 0 ? Math.min(1, cur / dur) : 0);

  /* ------------------------------------------------- the big key --- */

  // [data-rr-lr-toggle]: refused (and said) while locked — the deck does
  // both; idle, the book begins where it was left; else play / pause
  const onBig = () => {
    if (here) toggle();
    else begin(recording.slug);
  };

  // [data-rr-lr-jog]: the site's jog() — running off either end of the band
  // rolls onto the next groove (target > dur → next band at the remainder;
  // target < 0 → the previous band, that much short of its end); inside it,
  // a plain seek. Inert while this book is not on the platter.
  const jog = (delta: number) => {
    if (!here || band === null) return;
    const target = cur + delta;
    if (target > dur && chapters[band + 1]) {
      playAt(recording.slug, band + 1, target - dur);
      return;
    }
    if (target < 0 && band > 0) {
      const prevDur = chapters[band - 1]?.duration ?? 0;
      playAt(recording.slug, band - 1, Math.max(0, prevDur + target));
      return;
    }
    nudge(delta);
  };

  // THE DECK'S HEIGHT IS ARITHMETIC: every row is a constant (see the header),
  // so the sheets that stand on it are told the exact figure — 153.390625
  // with the sentence, not a layout event's rounding of it. On the web the
  // layout event reports whole pixels (offsetHeight), and a sheet parked on a
  // rounded foot lands its type half a pixel off the site's; a phone's Yoga
  // is fractional and would not care. The measured height still rules when
  // it disagrees by a pixel or more (a wrapped sentence, a font not yet in).
  //
  // On a short phone the key row is the NARRATOR'S 46 (40 face + 3 + 3), the
  // big key having dropped to 44 under it; on a flat one the readout line is
  // gone and the groovebox stands after the keys (order:4).
  const keyRow = Math.max(bigSize, 46);
  // (max-height:500px): `.rr-lr-groovebox{flex:1 1 160px}` — in the deck's
  // COLUMN, that basis is 160px of height, and the site's groovebox stands
  // that tall with the stock empty under its clocks (measured 244.39 for the
  // deck at 844×390). Matched, since the phone must show the site's view;
  // the rule reads as one written for a row, and is flagged as such.
  const grooveboxH = flat ? Math.max(FLAT_GROOVEBOX, m.groove + 3 + 25) : m.groove + 3 + 25;
  const arithmetic = flat
    ? 6 + (say ? SAY_LINE + m.gap : 0) + keyRow + m.gap + grooveboxH + 5 + bottomInset
    : m.top + grooveboxH + (say ? m.gap + SAY_LINE : 0) + m.gap + keyRow + m.bottom + bottomInset;
  const report = (measured: number) =>
    onLayoutHeight(Math.abs(measured - arithmetic) < 1 ? arithmetic : measured);

  // .rr-lr-groovebox — the groove FIRST, its readout directly beneath;
  // on a flat phone, after the keys (order:4 — Yoga has no order, so the
  // node is placed after the keys instead)
  const groovebox = (
    <View style={[styles.groovebox, flat && { minHeight: FLAT_GROOVEBOX }]}>
      <View
        {...pan.panHandlers}
        onLayout={(e) => setGrooveW(e.nativeEvent.layout.width)}
        accessibilityRole="adjustable"
        accessibilityLabel="Seek within this chapter"
        accessibilityValue={{ min: 0, max: Math.round(dur), now: Math.round(cur), text: `${mmss(cur)} of ${mmss(dur)}` }}
        // react-native-web 0.21 maps only the aria props; RN 0.86 takes them too
        aria-valuemin={0}
        aria-valuemax={Math.round(dur)}
        aria-valuenow={Math.round(cur)}
        aria-valuetext={`${mmss(cur)} of ${mmss(dur)}`}
        // VoiceOver / TalkBack swipe: the site's arrow keys, ±5 s
        accessibilityActions={SLIDER_ACTIONS}
        onAccessibilityAction={(e) => {
          if (!here || dur <= 0) return;
          const name = e.nativeEvent.actionName;
          const d = name === "increment" ? 5 : name === "decrement" ? -5 : 0;
          if (d) seekTo(Math.max(0, Math.min(dur, cur + d)));
        }}
        style={[styles.groove, { height: m.groove }]}
      >
        {/* the 4px track inside the 22px hit strip */}
        <View style={[styles.grooveTrack, { backgroundColor: ink.track }]}>
          <View style={[styles.grooveFill, { width: `${gpct * 100}%`, backgroundColor: ink.fill }]} />
        </View>
        {/* the needle head — 14px, centred on the needle, plus its ring */}
        <View style={[styles.grooveHd, { left: `${gpct * 100}%`, top: (m.groove - 16) / 2 }]} pointerEvents="none">
          <Stud night={night} held={scrub !== null} />
        </View>
        {/* .rr-lr-groove-tip — the paper tag riding above the head while it is held */}
        {scrub !== null ? (
          <View style={[styles.tipAnchor, { left: `${gpct * 100}%` }]} pointerEvents="none">
            <View style={[styles.tip, { backgroundColor: ink.tip.paper, borderColor: ink.tip.line, boxShadow: ink.tip.shadow }]}>
              <Text style={[styles.tipText, { color: ink.tip.ink }]}>{mmss(gpct * dur)}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* .rr-lr-groove-row — the clock, the readout, the clock button, on
          one baseline: every piece states its own padding so the 25px
          row lands the same on a phone as in Chrome */}
      <View style={styles.grooveRow}>
        <Text style={[styles.time, styles.timeLead, { color: ink.time }]}>{mmss(cur)}</Text>

        {/* .rr-lr-deck-line — the band, "Chapter N of M", and the
            whole-book readout; idle, one compact segment */}
        <View style={[styles.deckLine, flat && styles.hidden]}>
          {band !== null ? (
            <>
              <Text style={[styles.deckBand, { color: ink.band }]} numberOfLines={1}>
                {chapter?.title ?? ""}
              </Text>
              <Text style={[styles.deckEm, { color: ink.em }]} numberOfLines={1}>
                {`Chapter ${ROMAN[band] ?? band + 1} of ${ROMAN[chapters.length - 1] ?? chapters.length}`}
              </Text>
            </>
          ) : (
            <Text style={[styles.deckEm, { color: ink.em }]} numberOfLines={1}>
              {finished === recording.slug ? "Finished" : `Not playing · ${chapters.length} chapters`}
            </Text>
          )}
          <Text style={[styles.deckEm, { color: ink.em }]} numberOfLines={1}>
            {`${pct}% · ${printed}`}
          </Text>
        </View>

        <Pressable
          onPress={onClock}
          accessibilityRole="button"
          accessibilityLabel="Chapter length, tap to show time left"
          style={styles.clock}
        >
          <Text style={[styles.time, { color: ink.time }]}>
            {clockRemaining ? `−${mmss(Math.max(0, dur - cur))}` : `/ ${mmss(dur)}`}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.deck,
        {
          paddingTop: flat ? 6 : m.top,
          paddingBottom: bottomInset + (flat ? 5 : m.bottom),
          paddingHorizontal: pad,
          gap: m.gap,
        },
      ]}
      onLayout={(e) => report(e.nativeEvent.layout.height)}
      accessibilityLabel="Player controls"
    >
      {flat ? null : groovebox}

      {/* .rr-lr-deck-say — the sentence; brick and 600 when it is a refusal.
          The "Sign up to listen." link belongs to the LOCKED sentence alone
          (LOCKED_HTML); every other refusal is printed plain. The link's
          rule is its own 1px View, so it lands 2px under the baseline
          (text-underline-offset:2px) — RN's underline sits where the font
          says, a pixel high. */}
      {say ? (
        <View style={styles.sayRow} accessibilityLiveRegion="polite">
          <Text style={[styles.say, bad && styles.sayBad, { color: bad ? ink.sayBad : ink.say }]}>
            {locked || subscribeDoor ? `${say.text} ` : say.text}
          </Text>
          {locked ? (
            <Pressable onPress={onSignUp} accessibilityRole="link" style={styles.sayLinkBox}>
              <Text style={[styles.say, styles.sayLink, { color: bad ? ink.sayBad : ink.say }]}>Sign up to listen.</Text>
              <View style={[styles.sayRule, { backgroundColor: bad ? ink.sayBad : ink.say }]} />
            </Pressable>
          ) : subscribeDoor ? (
            // the subscription is bought on the WEBSITE, in the reader's real
            // browser, signed in (useSubscribe) — the one door the site's own
            // line needs none of. The provider's foreground refresh takes the
            // padlocks off when the reader is back; the sentence itself is
            // the deck's or the sheet's to clear.
            <Pressable
              onPress={() => void subscribe()}
              accessibilityRole="link"
              style={styles.sayLinkBox}
            >
              <Text style={[styles.say, styles.sayLink, { color: bad ? ink.sayBad : ink.say }]}>Subscribe on the website.</Text>
              <View style={[styles.sayRule, { backgroundColor: bad ? ink.sayBad : ink.say }]} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* .rr-lr-deck-ctrl — grid: minmax(0,1fr) auto auto auto minmax(0,1fr),
          gap 4; the narrator's label justified start, the dial end */}
      <View style={styles.deckCtrl}>
        <View style={styles.endStart}>
          {/* THE VOICE. The disc is the button: it wears the reader's face
              (or initial in their own label hue) and opens the narrator
              sheet. ≤520px: .rr-lr-narbtn{padding:3px 0} */}
          <Pressable
            onPress={() => open("voice")}
            style={styles.narBtn}
            accessibilityRole="button"
            accessibilityLabel="Narrator, choose who reads it"
            accessibilityState={{ expanded: sheet === "voice" }}
            // react-native-web 0.21 writes aria-expanded only from the aria prop
            aria-expanded={sheet === "voice"}
          >
            <Animated.View
              style={[
                styles.narFace,
                { backgroundColor: nowVoice?.hue ?? "#7E2D1F", boxShadow: ink.faceShadow, transform: [{ rotate }] },
              ]}
            >
              {face?.portrait ? (
                <Image source={{ uri: face.portrait }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <Text style={[styles.narInitial, { color: ink.faceInitial }]}>{voiceInitial}</Text>
              )}
              {/* the inset ring is painted OVER the portrait, as an inset box-shadow is */}
              <View pointerEvents="none" style={[styles.narRim, { borderColor: ink.faceRim }]} />
            </Animated.View>
          </Pressable>
        </View>

        {/* .rr-lr-jog — 42px at ≤900px, 40 at ≤520px; a 1.5px ring on paper */}
        <Disc
          size={jogSize}
          ring={ink.jog.ring}
          ringWidth={hairline(1.5)}
          fill={ink.jog.fill}
          onPress={() => jog(-15)}
          accessibilityLabel="Back fifteen seconds"
        >
          <Jog15 back color={ink.jog.glyph} />
        </Disc>

        {/* .rr-lr-big — the one filled thing on a white console; 56px at
            ≤900px, 54 at ≤520px, 44 on a short phone; ink by day, ivory
            under the lamp */}
        <View style={{ boxShadow: ink.bigShadow, borderRadius: bigSize / 2 }}>
          <Disc
            size={bigSize}
            fill={ink.big.fill}
            onPress={onBig}
            accessibilityLabel="Play or pause"
            accessibilityState={{ selected: playing }}
          >
            {/* .rr-lr-big svg{margin-left:1px}; the pause bars sit true */}
            {playing ? <Pause color={ink.big.glyph} /> : <View style={{ marginLeft: 1 }}><Play color={ink.big.glyph} /></View>}
          </Disc>
        </View>

        <Disc
          size={jogSize}
          ring={ink.jog.ring}
          ringWidth={hairline(1.5)}
          fill={ink.jog.fill}
          onPress={() => jog(15)}
          accessibilityLabel="Forward fifteen seconds"
        >
          <Jog15 color={ink.jog.glyph} />
        </Disc>

        <View style={styles.endEnd}>
          {/* the dial — .rr-lr-speed, 54×42 at ≤900px and 50×42 at ≤520px,
              the figure alone; it opens the playback-speed sheet */}
          <Pressable
            onPress={() => open("speed")}
            onHoverIn={() => setDialHover(true)}
            onHoverOut={() => setDialHover(false)}
            accessibilityRole="button"
            accessibilityLabel="Playback speed"
            accessibilityState={{ expanded: sheet === "speed" }}
            aria-expanded={sheet === "speed"}
            style={[
              styles.speed,
              {
                width: dialW,
                paddingHorizontal: narrow ? 2 : 3,
                borderColor: ink.dial.ring,
                borderWidth: hairline(1.5),
                backgroundColor: lit ? ink.dial.hoverFill : "transparent",
              },
            ]}
          >
            {/* .rr-lr-speed-ramp — the creep's chevron at the crown, centred,
                2px above the padding box, in the dial's own ink */}
            {ramp ? (
              <View pointerEvents="none" style={styles.speedRamp}>
                <RampFlag color={lit ? ink.dial.hoverInk : ink.dial.ink} />
              </View>
            ) : null}
            <Text style={[styles.speedText, { color: lit ? ink.dial.hoverInk : ink.dial.ink }]}>{speedShort(speed)}</Text>
          </Pressable>
        </View>
      </View>

      {flat ? groovebox : null}
    </View>
  );
}

/* -------------------------------------------------------------- styles --- */

// the two Cormorant clocks: 14px, line-height normal → 17
const TIME_LINE = lh("Cormorant Garamond", 14);
// the readout's Manrope figures: 9.5px → 13; its Cormorant band: 13px → 16
const EM_LINE = lh("Manrope", 9.5);
const BAND_LINE = lh("Cormorant Garamond", 13);
// .rr-lr-deck-say — 12px/1.45, on Chrome's 1/64
const SAY_LINE = lineOf(12, 1.45);

const styles = StyleSheet.create({
  // ≤900px: .rr-lr-deck{gap:7px;padding:10px clamp(8px,3.4vw,18px) …};
  // ≤520px: gap 6
  // (the figures ride in from TALL / SHORT at render)
  deck: {},
  // .rr-lr-groovebox{gap:3px}
  groovebox: { gap: 3 },
  // (max-height:500px): .rr-lr-deck-line{display:none}
  hidden: { display: "none" },

  // .rr-lr-groove{height:22px;display:flex;align-items:center} — the hit strip
  groove: { justifyContent: "center" },
  // .rr-lr-groove-track{height:4px;border-radius:999px;overflow:hidden}
  grooveTrack: { height: 4, borderRadius: 999, overflow: "hidden" },
  grooveFill: { position: "absolute", left: 0, top: 0, bottom: 0 },
  // .rr-lr-groove-hd{top:50%;width:14px;height:14px;margin:-7px 0 0 -7px} —
  // the 16px box carries the ring, so it is set back 8
  grooveHd: { position: "absolute", width: 16, height: 16, marginLeft: -8 },
  // the stud's 0 1px 3px drop, on the 14px face inside the 16px box
  studDrop: { position: "absolute", left: 1, top: 1, width: 14, height: 14, borderRadius: 7 },
  // .rr-lr-groove-tip{bottom:26px;transform:translateX(-50%)}
  tipAnchor: { position: "absolute", bottom: 26, width: 0, alignItems: "center" },
  tip: { paddingVertical: 4, paddingHorizontal: 9, borderWidth: 1.5, borderRadius: 2 },
  tipText: { fontFamily: FONTS.serifRegular, fontSize: 13.5, lineHeight: lh("Cormorant Garamond", 13.5), fontVariant: ["tabular-nums"] },

  // .rr-lr-groove-row{display:flex;align-items:baseline;gap:10px;padding:0 1px}
  // — 25px tall: the clock button's 4px around its 17px line; the other two
  // pieces pad down to the same baseline (17 from the top)
  grooveRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 1, height: 25 },
  // .rr-lr-time{font-family:'Cormorant Garamond';font-size:14px;tabular}
  time: { fontFamily: FONTS.serifRegular, fontSize: 14, lineHeight: TIME_LINE, fontVariant: ["tabular-nums"] },
  timeLead: { paddingTop: 4 },
  // .rr-lr-clock{padding:4px 2px}
  clock: { paddingVertical: 4, paddingHorizontal: 2 },
  // .rr-lr-deck-line{flex:1 1 auto;justify-content:center;gap:7px (≤520)}
  deckLine: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "flex-start", justifyContent: "center", gap: 7, overflow: "hidden" },
  // .rr-lr-deck-line b — Cormorant 600 13px (≤520), max-width 220; baseline
  // 12 down its 16px line → 5 of padding
  deckBand: { fontFamily: FONTS.serif, fontSize: 13, lineHeight: BAND_LINE, maxWidth: 220, flexShrink: 1, paddingTop: 5 },
  // .rr-lr-deck-line em — 600 9.5px (≤520) .04em Manrope, tabular; baseline
  // 10 down its 13px line → 7 of padding
  deckEm: { fontFamily: FONTS.sansSemi, fontSize: 9.5, lineHeight: EM_LINE, letterSpacing: em(9.5, 0.04), fontVariant: ["tabular-nums"], paddingTop: 7 },

  // .rr-lr-deck-say{text-align:center;font:400 12px/1.45 'Manrope'} — the
  // sentence and its link on one centred row, wrapping between them
  sayRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start" },
  say: { textAlign: "center", fontFamily: FONTS.sans, fontSize: 12, lineHeight: SAY_LINE },
  // .rr-lr-deck-say.is-bad{font-weight:600}
  sayBad: { fontFamily: FONTS.sansSemi },
  // .rr-lr-deck-say a{font-weight:600;text-decoration:underline;text-underline-offset:2px}
  sayLinkBox: { position: "relative" },
  sayLink: { fontFamily: FONTS.sansSemi },
  // the rule: 1px, 2px under the baseline — a pixel above the line box's foot
  sayRule: { position: "absolute", left: 0, right: 0, bottom: 1, height: 1 },

  // .rr-lr-deck-ctrl — ≤900px: max-width none, gap 4
  deckCtrl: { flexDirection: "row", alignItems: "center", gap: 4, width: "100%" },
  // the two minmax(0,1fr) columns, and where each justifies its one child
  endStart: { flex: 1, minWidth: 0, alignItems: "flex-start" },
  endEnd: { flex: 1, minWidth: 0, alignItems: "flex-end" },

  // .rr-lr-narbtn{padding:3px 0} (≤520px), the face alone
  narBtn: { paddingVertical: 3, alignItems: "center", justifyContent: "center" },
  // .rr-lr-nar-face — 40px on the narrator's hue, the portrait or the initial
  narFace: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  narRim: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, borderRadius: 20, borderWidth: 1 },
  // .rr-lr-nar-face i{font-size:18px;line-height:1}
  narInitial: { fontFamily: FONTS.serifRegular, fontSize: 18, lineHeight: 18 },

  // .rr-lr-speed — ≤900px: width 54, min-height 42, padding 6px 3px; ≤520px:
  // width 50, padding 6px 2px (both ride in at render); font 700 12px .01em
  speed: { minHeight: 42, paddingVertical: 6, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  speedText: { fontFamily: FONTS.sansBold, fontSize: 12, lineHeight: lh("Manrope", 12), letterSpacing: em(12, 0.01), fontVariant: ["tabular-nums"] },
  // .rr-lr-speed-ramp{position:absolute;left:50%;top:-2px;transform:translateX(-50%)}
  speedRamp: { position: "absolute", top: -2, left: 0, right: 0, alignItems: "center" },
});
