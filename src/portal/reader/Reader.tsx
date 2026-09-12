// The Reading Desk — the opened volume, `.rr-lr-reader` (`readerHtml` in
// app/data/accountListeningPage.ts), transcribed at its ≤900px / ≤620px /
// ≤560px branches.
//
// THE FRAME. This file is the modal, the torn head band (`.rr-lr-rail`:
// `.rr-lr-rail-side.is-l` — back "Audiobooks", Library; `.rr-lr-rail-mid` —
// the running head, a contents opener; `.rr-lr-rail-side.is-r` — the chapter
// steps, Bookmarks, the pages-per-view segment, the theme toggle), the stage
// (`.rr-lr-stage`, `.rr-lr-lamp`, `.rr-lr-cx-stage`, `.rr-lr-cx-foot`), the
// state — which sheet is open, the standing leaf, the follow, the lamp, the
// type prefs, the clock's face — and the wiring to the deck. Everything it
// stands is a module of its own:
//
//   Codex.tsx        the leaf — boards, pages, the gilt, the pinch
//   Console.tsx      the torn tail band — groove, clocks, the sentence, five keys
//   VoiceSheet.tsx   the narrator sheet
//   SpeedSheet.tsx   the dial's sheet
//   LampSheet.tsx    the sleep timer
//   TypeSheet.tsx    text settings
//   Contents.tsx     the chapters / bookmarks drawer
//
// SHAPE: a torn head band, the book, a torn console. "The only two coloured
// surfaces on screen are those bands — everything else is the field and the
// book." The field is WHITE by day and starred navy by night.
//
// Behaviour: the reader half of app/components/ListeningEnhancer.tsx —
// openBook / shutBook, paintRail, turn / paintLeaf, openDrawer, toggleMenu,
// refuseLocked. The accessible names are the site's aria-labels verbatim.

import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { useDeck, type Recording } from "../../lib/audioStore";
import { leafOfChapter, loadPages, pagesShape, type BookPages } from "../../lib/pages";
import { em } from "../../theme/ink";
import { NightField } from "../../theme/NightField";
import { ThemeReveal } from "../../theme/ThemeReveal";
import { useTheme } from "../../theme/ThemeProvider";
import { FONTS } from "../../theme/type";
import { SunMoon } from "../TornNav";
import { Codex } from "./Codex";
import { Console, type Sheet } from "./Console";
import { Contents, type Pane } from "./Contents";
import { LampSheet, type Lamp } from "./LampSheet";
import { SpeedSheet } from "./SpeedSheet";
import { TornBand } from "./TornBand";
import { TypeSheet, TYPE_DEFAULTS, type TypePrefs } from "./TypeSheet";
import { VoiceSheet } from "./VoiceSheet";

/* ------------------------------------------------------------- icons --- */

const Ic = {
  arrowL: "M10 3 5 8l5 5",
  chevD: "M3 6l5 5 5-5",
  prev: "M10 3 5 8l5 5",
  next: "M6 3l5 5-5 5",
  slip: "M4 2h8v12l-4-3-4 3z",
  lib: "M2.5 3h3v10h-3zM6.5 3h3v10h-3zM10.5 3.6l2.9-.8 2.6 9.7-2.9.8z",
};

function Glyph({ d, color, size = 15 }: { d: string; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d={d} stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* --------------------------------------------------------- the field --- */

// the torn hem tile is 17px tall — the sheets rise clear of it
const TILE_TEAR = 17;

/** `.rr-lr-libbtn,.rr-lr-rail-div{display:none}` at ≤620px. */
const LIB_HIDDEN_BELOW = 620;

/* ------------------------------------------------------------ reader --- */

export function Reader({
  recording,
  onClose,
}: {
  recording: Recording;
  onClose: () => void;
}) {
  const { mode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const night = mode === "dark";

  const { now, voice: deckVoice, spots, playBand } = useDeck();

  // THIS book on the platter, or not: the console reads idle for a volume
  // opened to browse while another sounds, and the gilt stays off its pages.
  const here = now?.slug === recording.slug;
  const band = here ? (now?.band ?? 0) : -1;
  const voice = here ? deckVoice : (recording.voiceId ?? null);

  const [man, setMan] = useState<BookPages | null>(null);
  const [leaf, setLeaf] = useState(0);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pane, setPane] = useState<Pane>("bands");
  const [lamp, setLamp] = useState<Lamp>(null);
  const [typePrefs, setTypePrefs] = useState<TypePrefs>(TYPE_DEFAULTS);
  const [clockRemaining, setClockRemaining] = useState(false);
  // the sheets rise from the console — they need to know where its top edge is
  const [consoleH, setConsoleH] = useState(0);
  const { height: windowH, width } = useWindowDimensions();

  /* ------------------------------------------------- the follow --- */

  // The follow is ON until the reader turns a page themselves. Turning a leaf
  // is a statement — "I am reading over there" — and a book that yanks itself
  // back on the next syllable is unusable. Reading from a word re-arms it, and
  // so does a new band.
  const [follow, setFollow] = useState(true);
  // set when a band change came from a tap on the paper rather than the needle
  const stayPut = useRef(false);

  useEffect(() => {
    let alive = true;
    loadPages(recording.slug).then((m) => {
      if (!alive) return;
      setMan(m);
      // open where the needle stands, or where the book was left
      const at = band >= 0 ? band : (spots[recording.slug]?.chapter ?? 0);
      if (m) setLeaf(leafOfChapter(m, at));
    });
    return () => {
      alive = false;
    };
    // the manifest is per BOOK, so only the slug re-fetches it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording.slug]);

  // The needle moves the paper: a new band turns to its first leaf, and the
  // follow is re-armed — a new chapter is not the reader wandering off.
  //
  // UNLESS the band changed because a finger landed on a word further into the
  // book: the reader is already looking at the page they asked for, and
  // throwing them to the chapter's opening would undo the tap.
  useEffect(() => {
    if (band < 0) return;
    if (stayPut.current) {
      stayPut.current = false;
      setFollow(true);
      return;
    }
    if (man) setLeaf(leafOfChapter(man, band));
    setFollow(true);
  }, [man, band]);

  const onFollow = useCallback((want: number) => setLeaf(want), []);
  const onReadFrom = useCallback((elsewhere: boolean) => {
    if (elsewhere) stayPut.current = true;
    setFollow(true);
  }, []);

  const shape = pagesShape(recording.slug);
  const total = man?.pages.length ?? shape?.n ?? 0;

  // A hand on the arrows says "I am reading over here" — the follow lets go,
  // and is re-armed by reading from a word or by the next band.
  const turn = useCallback(
    (d: 1 | -1) => {
      setFollow(false);
      setLeaf((l) => Math.max(0, Math.min(total - 1, l + d)));
    },
    [total],
  );

  /* ------------------------------------------------- the wiring --- */

  const openContents = (which: Pane) => {
    setPane(which);
    setSheet("contents");
  };

  // the drawer's band-go: play that chapter (a guest is refused by the deck
  // and told why on the console) and turn to its first leaf regardless
  const onBand = (n: number) => {
    playBand(recording.slug, n);
    if (man) setLeaf(leafOfChapter(man, n));
    setFollow(true);
  };

  // the console's "Sign up to listen." — the site's
  // /login?flow=signup&next=/account/listening, in the app's own route
  const onSignUp = () => {
    onClose();
    router.push({ pathname: "/sign-in", params: { flow: "signup", next: "/listening" } });
  };

  const railInk = night ? "#E8DECB" : "#171411";
  const railMuted = night ? "rgba(232,222,203,.66)" : "rgba(11,10,8,.66)";

  // padding-inline:clamp(8px,2.6vw,16px) on both bands
  const bandPad = Math.min(16, Math.max(8, width * 0.026));

  // the sheets stand on the console's tear; the drawer 6px above it
  const sheetBottom = consoleH + TILE_TEAR;
  const drawerBottom = consoleH + TILE_TEAR + 6;

  return (
    // The desk takes the WHOLE screen, as the web's does — over the portal's
    // top bar, the dock and the tab bar. A reader squeezed between the app's
    // own chrome is a page lying on a desk, not an opened book.
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    {/* A Modal is its OWN native window, and gesture-handler only sees touches
        inside a root it owns — the one in app/_layout.tsx does not reach in
        here. Without this the pinch works on the web target and does nothing
        at all on a device, which is the worst kind of silent. */}
    <GestureHandlerRootView style={styles.reader}>
    <View style={[styles.reader, !night && styles.fieldDay]} accessibilityLabel="Audiobook player">
      {/* the night field — STARS over a settling navy, not a flat swatch.
          Shared with the theme reveal on purpose: the disc that wipes this
          field in has to be the SAME drawing, or the wipe shows a seam. */}
      {night ? <NightField /> : null}

      {/* ============================ the torn head band ============ */}
      <TornBand edge="bottom">
        <View style={[styles.rail, { paddingTop: insets.top + 6, paddingHorizontal: bandPad }]}>
          <View style={styles.railSide}>
            {/* ≤900px: .rr-lr-railbtn span{display:none} — icon-only; the
                arrow goes UP a level, labelled with its destination */}
            <Pressable
              onPress={onClose}
              style={styles.railBtn}
              accessibilityRole="button"
              accessibilityLabel="Audiobooks"
            >
              <Glyph d={Ic.arrowL} color={railMuted} size={14} />
            </Pressable>
            {/* .rr-lr-libbtn — display:none at ≤620px */}
            {width > LIB_HIDDEN_BELOW ? (
              <>
                <View style={[styles.railDiv, { backgroundColor: night ? "rgba(201,166,98,.34)" : "rgba(110,86,58,.32)" }]} />
                <Pressable
                  onPress={onClose}
                  style={styles.railBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Library"
                >
                  <Glyph d={Ic.lib} color={railMuted} size={14} />
                </Pressable>
              </>
            ) : null}
          </View>

          {/* the running head: kicker over title, the whole block a button
              that opens the contents — the chevron under it says so */}
          <Pressable
            onPress={() => openContents("bands")}
            style={styles.railMid}
            accessibilityRole="button"
            accessibilityLabel="Contents, every chapter one tap away"
          >
            {/* the kicker is the AUTHOR, as the web's enhancer writes it */}
            <Text
              style={[styles.railKick, { color: night ? "#C9A662" : "#8C6A3F" }]}
              numberOfLines={1}
            >
              {recording.author ?? " "}
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
            {/* [data-rr-lr-railsteps] — "Previous chapter" / "Next chapter",
                shown only inside a chapter's galley view, which the app does
                not stand yet; the find-in-chapter button likewise. */}
            {/* [data-rr-lr-dgo="slips"] — Bookmarks */}
            <Pressable
              onPress={() => openContents("slips")}
              style={styles.railBtn}
              accessibilityRole="button"
              accessibilityLabel="Bookmarks"
            >
              <Glyph d={Ic.slip} color={railMuted} size={14} />
            </Pressable>
            {/* [data-rr-lr-per="2|1"] — "Two pages at a time" / "One page at a
                time": hidden on the site's phone view (one leaf is all a
                phone stands) */}
            <SunMoon size={34} ink={night ? "#C9A662" : "#6E563A"} line={night ? "rgba(201,166,98,.28)" : "rgba(11,10,8,.28)"} />
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
              recording={recording}
              voice={voice}
              band={band}
              man={man}
              leaf={leaf}
              total={total}
              night={night}
              follow={follow}
              onFollow={onFollow}
              onReadFrom={onReadFrom}
            />
          </View>

          {/* .rr-lr-cx-foot — the arrows go UNDER the case on a phone, one to
              each margin (space-between), on paper-filled discs.
              NOTE: `.rr-lr-turn{display:none}` at ≤620px on the site — the
              dog-ears (`.rr-lr-dog`, in the window) turn the leaf there; they
              are the Codex module's to add, and this foot goes with them. */}
          <View style={styles.foot}>
            <Pressable
              onPress={() => turn(-1)}
              disabled={leaf <= 0}
              accessibilityRole="button"
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
              accessibilityRole="button"
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
        <Console
          recording={recording}
          night={night}
          leaf={leaf}
          total={total}
          clockRemaining={clockRemaining}
          onClock={() => setClockRemaining((r) => !r)}
          onOpen={setSheet}
          onSignUp={onSignUp}
          onLayoutHeight={setConsoleH}
          bandPad={bandPad}
          bottomInset={insets.bottom}
        />
      </TornBand>

      {/* ================================== the sheets =============== */}
      <VoiceSheet
        open={sheet === "voice"}
        onClose={() => setSheet(null)}
        recording={recording}
        night={night}
        bottom={sheetBottom}
        maxHeight={windowH * 0.72}
      />
      <SpeedSheet
        open={sheet === "speed"}
        onClose={() => setSheet(null)}
        recording={recording}
        night={night}
        bottom={sheetBottom}
        maxHeight={windowH * 0.72}
      />
      <LampSheet
        open={sheet === "lamp"}
        onClose={() => setSheet(null)}
        night={night}
        lamp={lamp}
        setLamp={setLamp}
        bottom={sheetBottom}
        maxHeight={windowH * 0.72}
      />
      <TypeSheet
        open={sheet === "type"}
        onClose={() => setSheet(null)}
        night={night}
        prefs={typePrefs}
        setPrefs={setTypePrefs}
        bottom={sheetBottom}
        maxHeight={windowH * 0.72}
      />
      <Contents
        open={sheet === "contents"}
        pane={pane}
        onPane={setPane}
        onClose={() => setSheet(null)}
        recording={recording}
        night={night}
        onBand={onBand}
        bottom={drawerBottom}
        maxHeight={windowH * 0.7}
      />
    </View>

    {/* The lamp switch's reveal, again. A Modal is its OWN native window, so
        the root instance paints behind it — and the switch that starts the
        sweep is in this room's head band. `field="room"` because the disc has
        to be indistinguishable from what it lands on, and what it lands on
        here is the starred navy, not the app's plain paper. */}
    <ThemeReveal field="room" />
    </GestureHandlerRootView>
    </Modal>
  );
}

/* -------------------------------------------------------------- styles --- */

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
  // .rr-lr-rail-div{width:1px;height:18px;margin:0 5px}
  railDiv: { width: 1, height: 18, marginHorizontal: 5 },
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
});
