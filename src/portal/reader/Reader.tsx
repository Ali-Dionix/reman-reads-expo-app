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
//   contents/SearchMenu.tsx   find-in-chapter, hung under the deep rail —
//                             the galley searched, a hit seeks to its word
//
// SHAPE: a torn head band, the book, a torn console. "The only two coloured
// surfaces on screen are those bands — everything else is the field and the
// book." The field is WHITE by day and starred navy by night.
//
// Behaviour: the reader half of app/components/ListeningEnhancer.tsx —
// openBook / shutBook, openChapter / shutGalley / stepChapter, paintRail,
// turn / paintLeaf, openDrawer, toggleMenu, refuseLocked. The accessible names are the site's aria-labels verbatim.

import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { chaptersOf, useDeck, type Recording } from "../../lib/audioStore";
import { ownerOf } from "../../lib/portalState";
import { useSession } from "../../lib/session";
import { boxesForWord, loadGalley, useGalleyVersion, wordAt, type Galley } from "../../lib/galley";
import { leafOfChapter, leafOfPage, loadPages, pagesShape, type BookPages } from "../../lib/pages";
import { NightField } from "../../theme/NightField";
import { ThemeReveal } from "../../theme/ThemeReveal";
import { useTheme } from "../../theme/ThemeProvider";
import { FONTS, lineOf } from "../../theme/type";
import { hairline } from "../../ui/DashedBox";
import { Disc } from "../../ui/Disc";
import { SunMoon } from "../TornNav";
import { Codex, codexStands } from "./Codex";
import { Console, type Sheet } from "./Console";
import { SmallCaps } from "./contents/SmallCaps";
import { Contents, type Pane } from "./Contents";
import type { WordAnchor } from "./contents/slips";
import { SearchMenu } from "./contents/SearchMenu";
import { LampSheet, type Lamp } from "./LampSheet";
import { SpeedSheet } from "./SpeedSheet";
import { TornBand } from "./TornBand";
import { TypeSheet, TYPE_DEFAULTS, type TypePrefs } from "./TypeSheet";
import { useStanding, voiceInForce } from "./voice/standing";
import { VoiceSheet } from "./VoiceSheet";
import { fillProps, strokeProps } from "../../ui/svgPaint";

/* ------------------------------------------------------------- icons --- */

// accountListeningPage.ts icArrowL / icChevD / icSlip / icLib, verbatim
const Ic = {
  arrowL: { d: "M13 8H3m4-4L3 8l4 4", box: 16, cap: true },
  chevD: { d: "m2.5 4.5 3.5 3.5 3.5-3.5", box: 12, cap: true },
  prev: { d: "M10 3 5 8l5 5", box: 16, cap: true },
  next: { d: "M6 3l5 5-5 5", box: 16, cap: true },
  slip: { d: "M6 3h8v14l-4-3-4 3V3Z", box: 20, cap: false },
  // icLib is TWO paths on the site; joined into one, the second's relative
  // move would count from the first's start — so it is written absolute
  lib: { d: "M3 3.5h3v11H3zM7.5 3.5h3v11h-3zM12.2 4.1l2.9-.6 2.1 10.8-2.9.6z", box: 18, cap: false, w: 1.5 },
};

/** icBandPrev / icBandNext — a 1.7px bar and a filled wedge, 16 box. */
function BandStep({ next, color }: { next?: boolean; color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d={next ? "M11.5 3v10" : "M4.5 3v10"} {...strokeProps(color)} strokeWidth={1.7} strokeLinecap="round" />
      <Path d={next ? "M3 3.4v9.2L9.4 8 3 3.4Z" : "M13 3.4v9.2L6.6 8 13 3.4Z"} {...fillProps(color)} />
    </Svg>
  );
}

/** icSearch — 16px in an 18 box: a 5r circle and a handle. */
function SearchGlyph({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 18 18" fill="none">
      <Circle cx={8} cy={8} r={5} {...strokeProps(color)} strokeWidth={1.6} />
      <Path d="m12 12 3.6 3.6" {...strokeProps(color)} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

/** accountListeningPage.ts roman() — I to X, then the arabic figure. */
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const roman = (n: number): string => ROMAN[n] ?? String(n + 1);
/** paintRail: a chapter whose label is only its numeral ("II", "7.") would
 *  print the kicker twice — the book title carries the head instead. */
const BARE_LABEL = /^[IVXLCDM0-9]+\.?$/i;

function Glyph({
  ic,
  color,
  size,
}: {
  ic: { d: string; box: number; cap: boolean; w?: number };
  color: string;
  size: number;
}) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${ic.box} ${ic.box}`} fill="none">
      <Path
        d={ic.d}
        {...strokeProps(color)}
        strokeWidth={ic.w ?? 1.6}
        strokeLinecap={ic.cap ? "round" : "butt"}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* --------------------------------------------------------- the field --- */

/** `.rr-lr-libbtn,.rr-lr-rail-div{display:none}` — in the site's
 *  `@media (max-width:900px)` block (accountListeningPage.ts 1599), the same
 *  breakpoint that turns the rail's buttons icon-only. A phone on its side
 *  and a small tablet are still inside it. */
const LIB_HIDDEN_BELOW = 900;

/** The keyboard's height over the window. On iOS the window never resizes
 *  for the keyboard; on Android the activity does (Expo's default
 *  softwareKeyboardLayoutMode is "resize") but a statusBarTranslucent Modal
 *  is its own window and does NOT honour adjustResize — so on both a sheet
 *  pinned to the bottom is lifted by hand. iOS announces the keyboard before
 *  it moves (keyboardWill*), Android only once it has (keyboardDid*). */
function useKeyboardHeight(): number {
  const [h, setH] = useState(0);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const ios = Platform.OS === "ios";
    const show = Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", (e) =>
      setH(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", () => setH(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return h;
}

/* -------------------------------------------------------------- veil --- */

// The site's reader type is GREYSCALE, every word of it. Chrome decides LCD
// anti-aliasing per compositing layer and only grants it to a layer it can
// prove opaque; the site's bands are promoted over the codex (whose leaves
// are scrollers) and carry no ground of their own — their paper is a
// filtered pseudo-element — so their type is greyscale. In the app the two
// bands stay in the root layer, on the field's paint, and the web build
// renders them with LCD fringes: the rig then reads ~1 point of "font
// drift" that is not there (PortalPage.tsx tells the same story for the
// portal pages, the other way round).
//
// This veil is what the contents drawer happens to do by accident: a painted
// sheet at z-index 1 over the stage's composited scroller, carrying one
// glyph that no opaque ground can be proved for, so the bands (z-index 3)
// painted after it are promoted to layers of their own — with no ground,
// hence greyscale, measured equal to the golden's pixels. (Measured too:
// the sheet without the glyph, and the glyph without the sheet, each leave
// the fringes on.) It is all but transparent, the glyph is one pixel in the
// band's own colour, it takes no touches, and a phone rasterises both alike.
function Veil({ night }: { night: boolean }) {
  return (
    <View style={styles.veil} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={[styles.veilDot, { color: night ? "#151D2D" : "#FFFEFB" }]}>·</Text>
    </View>
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
  const { mode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const night = mode === "dark";

  const { now, voice: deckVoice, spots, locked, playBand, playAt, seekTo } = useDeck();

  // THIS book on the platter, or not: the console reads idle for a volume
  // opened to browse while another sounds, and the gilt stays off its pages.
  const here = now?.slug === recording.slug;
  const band = here ? (now?.band ?? 0) : -1;
  // THE PRESSING IN FORCE: the platter's while this book sounds, else the
  // reader's standing choice (voice/standing.ts — what the deck will drop
  // on Play, and what the console reads), else the house's default
  const { user } = useSession();
  const ledger = useStanding(ownerOf(user?.id));
  const voice = here
    ? deckVoice
    : voiceInForce(recording.slug, Object.keys(recording.pressings ?? {}), recording.voiceId ?? null, ledger);

  const [man, setMan] = useState<BookPages | null>(null);
  const [leaf, setLeaf] = useState(0);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pane, setPane] = useState<Pane>("bands");
  const [lamp, setLamp] = useState<Lamp>(null);
  const [typePrefs, setTypePrefs] = useState<TypePrefs>(TYPE_DEFAULTS);
  const [clockRemaining, setClockRemaining] = useState(false);
  // the sheets rise from the console — they need to know where its top edge is
  const [consoleH, setConsoleH] = useState(0);
  // the stage's height — the case never exceeds it (`.rr-lr-cx-bk{max-height:
  // min(100%,…)}`), so the codex is told the measure rather than guessing it
  const [stageH, setStageH] = useState(0);
  // the narrator sheet's line, said on the console too (the site's sayLive)
  const [liveSay, setLiveSay] = useState<{ text: string; bad: boolean; subscribe?: boolean } | null>(null);
  // the search menu hangs under the rail — its box, for the menu's top
  const [railH, setRailH] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  // the search button's right edge in window px — toggleMenu aligns the
  // find card's right edge close to flush with the button that opened it
  const searchBtn = useRef<View>(null);
  const [searchRight, setSearchRight] = useState(0);
  const { height: windowH, width } = useWindowDimensions();
  const keyboardH = useKeyboardHeight();

  /* ------------------------------------------------ the galley --- */

  // THE CHAPTER THE GALLEY IS STANDING — the site's galleyBand, -1 when the
  // volume stands (folded away). It is the rail's "deep" state: a chapter
  // open reads CHAPTER II / ⟨label⟩ over the jogs and the search, and its
  // back arrow shuts the CHAPTER ("The book"), not the book. A pressed
  // edition opens at the chapter it was left in (openBook, ListeningEnhancer
  // 733-741) — read first, listen after — so the seed is the ledger's spot.
  const [galleyBand, setGalleyBand] = useState(() => {
    if (!recording.hasText) return -1;
    const rest = spots[recording.slug]?.chapter ?? -1;
    return chaptersOf(recording, recording.voiceId ?? null)[rest] ? rest : -1;
  });
  // the needle turns the chapter: onStoreChange's "if (galleyBand !==
  // st.band) openChapter(...)" — a band that starts sounding stands its
  // galley, even one the back arrow had folded
  useEffect(() => {
    if (here && now && now.band >= 0 && recording.hasText) setGalleyBand(now.band);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [here, now?.band]);
  const deep = recording.hasText && galleyBand >= 0;
  // what the codex stands: a pressed edition's chapter is the GALLEY's
  // (codexUp() on the site needs the galley open — shut it and the baked
  // volume shows beneath, sound or no sound); a specimen has no galley and
  // follows the needle
  const shownBand = recording.hasText ? (deep ? galleyBand : -1) : band;
  const chapters = chaptersOf(recording, voice);

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
      const at = shownBand >= 0 ? shownBand : (spots[recording.slug]?.chapter ?? 0);
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
  // What stands: the CODEX of rendered pages (Codex.tsx's own gate), or the
  // bound volume / the reflowed galley. The foot's arrows belong to
  // `.rr-lr-cx-foot`, a child of `[data-rr-lr-codex]` — the volume turns by
  // its dog-ears and shows none, and the type galley turns chapters from the
  // head.
  const codexUp = codexStands(man, shownBand, typePrefs, recording.hasText);

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

  // the [data-rr-lr-dgo] openers: the running head and the Bookmarks button
  // each name a pane; the same opener pressed again shuts the drawer
  const openContents = (which: Pane) => {
    if (sheet === "contents" && pane === which) {
      setSheet(null);
      return;
    }
    setPane(which);
    setSheet("contents");
  };

  // the site's openChapter, less the surface: the galley stands that
  // chapter (a pressed edition only), the leaf turns to its first page and
  // the follow is re-armed
  const openChapter = (n: number) => {
    if (recording.hasText && chapters[n]) {
      setGalleyBand(n);
      // ListeningEnhancer 2064: the chapter is announced on every open
      AccessibilityInfo.announceForAccessibility(`Chapter ${roman(n)}, ${chapters[n].title}`);
    }
    if (man) setLeaf(leafOfChapter(man, n));
    setFollow(true);
  };

  // THE SITE'S playBand (app/components/audioStore.ts 662) is the deck's own
  // now: the band on the platter tapped again is play / pause, the pressing
  // in force for this book stays, and the band the ledger rests in resumes
  // at its seconds — see audioStore.playBand.
  const cueBand = (n: number, at?: number) => playBand(recording.slug, n, at);

  // the drawer's band-go, in the site's order (ListeningEnhancer 3549-3563):
  // openChapter, then playBand — which a guest is refused, and told why on
  // the console — then shutDrawer, EVERY time. The chapter opens either way:
  // browsing is free, only the needle is not.
  const onBand = (n: number) => {
    openChapter(n);
    cueBand(n);
    setSheet(null);
  };

  // THE STANDING GALLEY, for the slips: the chapter the codex has open, in
  // the pressing in force. The codex fetches the same galley for its gilt
  // (galley.ts caches per slug/voice/band, so this is one fetch between
  // them); the frame keeps a handle so a slip can be pressed ON the word
  // and a slip's go can turn the leaf to it.
  const gal = useRef<Galley | null>(null);
  // a live reading's cue file grows while it streams — see galley.ts
  const galleyVersion = useGalleyVersion();
  useEffect(() => {
    gal.current = null;
    if (!deep) return;
    let alive = true;
    loadGalley(recording.slug, voice, galleyBand, chapters[galleyBand]?.galley).then((g) => {
      if (alive) gal.current = g;
    });
    return () => {
      alive = false;
    };
    // chapters is derived from (recording, voice)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording.slug, voice, galleyBand, deep, galleyVersion]);

  // readAlong.ts wordAnchor(): the word sounding at `seconds` in the
  // standing galley — only when the sounding band IS the standing one — and
  // ~six words of its sentence (two before, three after), 80 characters at most
  const wordAnchor = (seconds: number): WordAnchor | null => {
    const g = gal.current;
    if (!g || !here || band !== galleyBand) return null;
    const w = wordAt(g, seconds * 1000);
    if (w < 0) return null;
    const from = Math.max(0, w - 2);
    const to = Math.min(g.words.length - 1, w + 3);
    const pieces: string[] = [];
    for (let i = from; i <= to; i++) {
      const [p, start, end] = g.words[i];
      const text = g.paras[p];
      if (text) pieces.push(text.slice(start, end));
    }
    return { word: w, excerpt: pieces.join(" ").slice(0, 80) };
  };

  // the site's revealWord, in the frame's terms: the leaf turns to the page
  // the word is printed on. The galley is the codex's own (cached), so the
  // reveal lands once it is standing — the one-shot pendingWord of the site.
  const revealWord = (n: number, word: number) => {
    if (!man) return;
    void loadGalley(recording.slug, voice, n, chapters[n]?.galley).then((g) => {
      const gw = g?.words[word];
      if (!gw) return;
      const boxes = man.chapters.find((c) => c.idx === n)?.boxes ?? [];
      const home = boxesForWord(boxes, gw)[0]?.[3];
      if (home == null) return;
      setLeaf(leafOfPage(man, home));
      setFollow(true);
    });
  };

  // a slip's go (the site's slip-go): the needle lands on the mark — in
  // place when its band is sounding, else that band cued at that second —
  // and the galley turns to the chapter, ON the word when the slip carries
  // one; the drawer stays open
  const onSlip = (n: number, seconds: number, word?: number) => {
    openChapter(n);
    if (typeof word === "number") {
      // the band change that follows must not throw the leaf back to the
      // chapter's first page — the reader is looking at the word they asked
      // for. A locked deck refuses the cue, so there is no band change to
      // hold off.
      if (!locked && !(here && band === n)) stayPut.current = true;
      revealWord(n, word);
    }
    playAt(recording.slug, n, seconds);
  };

  // the rail's jogs (stepChapter): the turn moves the needle too, like a
  // contents row
  const stepChapter = (dir: 1 | -1) => {
    if (galleyBand < 0) return;
    const to = galleyBand + dir;
    if (!chapters[to]) return;
    openChapter(to);
    cueBand(to);
  };

  // a find-in-chapter hit — readAlong's seekWord: the needle moves if this
  // chapter is on the platter, else the band is cued at that second and
  // played; the menu shuts (shutMenus)
  const onSearchHit = (seconds: number) => {
    if (galleyBand < 0) return;
    if (here && band === galleyBand) seekTo(seconds);
    else cueBand(galleyBand, seconds);
    setSearchOpen(false);
  };

  // shutGalley: the chapter folds away and the volume stands, the sound
  // going on as it was
  const shutGalley = () => setGalleyBand(-1);

  // toggleMenu("search") — one menu at a time: a sheet shuts it, it shuts a sheet
  const toggleSearch = () => {
    setSheet(null);
    setSearchOpen((o) => !o);
  };
  useEffect(() => {
    if (sheet) setSearchOpen(false);
  }, [sheet]);
  // the chapter folding away takes its search with it (paintRail hides the button)
  useEffect(() => {
    if (!deep) setSearchOpen(false);
  }, [deep]);

  // the console's "Sign up to listen." — the site's
  // /login?flow=signup&next=/account/listening, in the app's own route
  const onSignUp = () => {
    onClose();
    router.push({ pathname: "/sign-in", params: { flow: "signup", next: "/listening" } });
  };
  // the narrator sheet's "Sign in" (the clone card, a guest): the site's
  // /login?next=/account/listening — the same door, the sign-in face
  const onSignIn = () => {
    onClose();
    router.push({ pathname: "/sign-in", params: { next: "/listening" } });
  };

  // .rr-lr-railbtn{color:rgba(11,10,8,.66)} / night rgba(240,229,207,.66)
  const railMuted = night ? "rgba(240,229,207,.66)" : "rgba(11,10,8,.66)";
  // .rr-lr-rail-mid:hover{background:rgba(110,86,58,.07)} / night rgba(201,166,98,.08)
  const midHover = night ? "rgba(201,166,98,.08)" : "rgba(110,86,58,.07)";

  // padding-inline:clamp(8px,2.6vw,16px) on both bands
  const bandPad = Math.min(16, Math.max(8, width * 0.026));
  // a phone on its side: @media (max-width:900px) and (max-height:500px)
  // .rr-lr-rail{min-height:44px;padding-top:3px;padding-bottom:8px}
  const flat = windowH <= 500;
  const railBox = flat
    ? { minHeight: 44, paddingTop: insets.top + 3, paddingBottom: 8 }
    : { minHeight: 54, paddingTop: insets.top + 6, paddingBottom: 10 };

  // paintRail — the running head is a kicker over a title, reference-style:
  // inside a chapter CHAPTER II / ⟨label⟩; standing in the volume ⟨author⟩ /
  // ⟨title⟩. A bare label ("II", "7.") hands the head to the book's title.
  const label = deep ? (chapters[galleyBand]?.title ?? "") : "";
  const bare = !label || BARE_LABEL.test(label.trim());
  const kicker = deep ? "Chapter " + roman(galleyBand) : (recording.author ?? " ");
  const headTitle = deep && !bare ? label : recording.title;

  // the sheets stand on the console's BOX (`.rr-lr-sheet{bottom:100%}` of
  // .rr-lr-deck, whose tear hangs above the box as a pseudo-layer — TornBand
  // keeps its hems out of flow the same way, so consoleH IS the box); the
  // drawer is the footer's own child on the site — bottom:calc(100% + 6px)
  const sheetBottom = consoleH;
  const drawerBottom = consoleH + 6;

  return (
    // The desk takes the WHOLE screen, as the web's does — over the portal's
    // top bar, the dock and the tab bar. A reader squeezed between the app's
    // own chrome is a page lying on a desk, not an opened book.
    <Modal
      visible
      animationType="fade"
      // the hardware back closes what is on top: a sheet, then the volume
      // (the site's Esc: menu → drawer → the book)
      onRequestClose={() => (searchOpen ? setSearchOpen(false) : sheet ? setSheet(null) : deep ? shutGalley() : onClose())}
      statusBarTranslucent
    >
    {/* A Modal is its OWN native window, and gesture-handler only sees touches
        inside a root it owns — the one in app/_layout.tsx does not reach in
        here. Without this the pinch works on the web target and does nothing
        at all on a device, which is the worst kind of silent. */}
    <GestureHandlerRootView style={styles.reader}>
    {/* the site's `.rr-lr-reader` is role=dialog aria-modal — the volume is
        the only thing on screen while it stands */}
    <View
      style={[styles.reader, !night && styles.fieldDay]}
      accessibilityLabel="Audiobook player"
      role="dialog"
      aria-modal
      accessibilityViewIsModal
    >
      {/* the night field — STARS over a settling navy, not a flat swatch.
          Shared with the theme reveal on purpose: the disc that wipes this
          field in has to be the SAME drawing, or the wipe shows a seam. */}
      {night ? <NightField /> : null}
      <Veil night={night} />

      {/* ============================ the torn head band ============ */}
      <TornBand edge="bottom" style={styles.band}>
        <View
          style={[styles.rail, railBox, { paddingHorizontal: bandPad }]}
          onLayout={(e) => setRailH(e.nativeEvent.layout.height)}
        >
          <View style={styles.railSide}>
            {/* ≤900px: .rr-lr-railbtn span{display:none} — icon-only; the
                arrow goes UP a level, labelled with its destination: inside
                a chapter it closes the chapter ("The book"), standing in the
                volume it closes the book ("Audiobooks") */}
            <Pressable
              onPress={deep ? shutGalley : onClose}
              style={styles.railBtn}
              accessibilityRole="button"
              accessibilityLabel={deep ? "The book" : "Audiobooks"}
            >
              <Glyph ic={Ic.arrowL} color={railMuted} size={14} />
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
                  <Glyph ic={Ic.lib} color={railMuted} size={16} />
                </Pressable>
              </>
            ) : null}
          </View>

          {/* the running head: kicker over title, the whole block a button
              that opens the contents — the chevron under it says so */}
          <Pressable
            onPress={() => openContents("bands")}
            // :hover paints the head; a phone never hovers, the web target does
            style={(st) => [
              styles.railMid,
              (st as { hovered?: boolean }).hovered ? { backgroundColor: midHover } : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Contents, every chapter one tap away"
          >
            {/* the kicker — the AUTHOR, or CHAPTER II inside a chapter:
                .rr-lr-rail-mid em — Cormorant small-caps 10.5px .22em, line-height 1 */}
            <SmallCaps
              size={10.5}
              ls={0.22}
              fontFamily={FONTS.serifRegular}
              lineHeight={10.5}
              color={night ? "#C9A662" : "#8C6A3F"}
              numberOfLines={1}
            >
              {kicker}
            </SmallCaps>
            <Text
              style={[styles.railTitle, { color: night ? "#F4EBD6" : "#171411" }]}
              numberOfLines={1}
            >
              {headTitle}
            </Text>
            {/* .rr-lr-rail-mid>svg{margin-top:1px} — icChevD, 11px */}
            <View style={{ marginTop: 1 }}>
              <Glyph ic={Ic.chevD} color={night ? "rgba(210,175,105,.7)" : "rgba(110,86,58,.65)"} size={11} />
            </View>
          </Pressable>

          <View style={[styles.railSide, styles.railSideR]}>
            {/* [data-rr-lr-railsteps] — "Previous chapter" / "Next chapter",
                a phone's only band-step, shown only inside a chapter:
                .rr-lr-galley-steps{gap:8px}; .rr-lr-jog 42px in the ≤900px
                block and 40px at ≤520px, a 1.5px ring on white (night: no
                fill, an ivory ring). The site never disables .rr-lr-jog —
                stepChapter just returns at the ends — so the end-of-book
                step is a normal, fully painted, pressable button that does
                nothing (site-first-light: Chapter I, Previous chapter a
                full plate). */}
            {deep ? (
              <View style={styles.steps}>
                {([-1, 1] as const).map((d) => (
                  <Disc
                    key={d}
                    size={width <= 520 ? 40 : 42}
                    ring={night ? "rgba(240,229,207,.6)" : "rgba(11,10,8,.7)"}
                    ringWidth={hairline(1.5)}
                    fill={night ? "transparent" : "#FFFFFF"}
                    onPress={() => stepChapter(d)}
                    accessibilityLabel={d < 0 ? "Previous chapter" : "Next chapter"}
                  >
                    <BandStep next={d > 0} color={night ? "#EADFC6" : "#0B0A08"} />
                  </Disc>
                ))}
              </View>
            ) : null}
            {/* [data-rr-lr-search] — find-in-chapter searches the standing
                galley: no chapter, no search */}
            {deep ? (
              <Pressable
                ref={searchBtn}
                onLayout={() =>
                  searchBtn.current?.measureInWindow((x, _y, w) => setSearchRight(x + w))
                }
                onPress={toggleSearch}
                style={styles.railBtn}
                accessibilityRole="button"
                accessibilityLabel="Search"
                accessibilityState={{ expanded: searchOpen }}
                aria-expanded={searchOpen}
              >
                <SearchGlyph color={railMuted} />
              </Pressable>
            ) : null}
            {/* [data-rr-lr-dgo="slips"] — Bookmarks */}
            <Pressable
              onPress={() => openContents("slips")}
              style={styles.railBtn}
              accessibilityRole="button"
              accessibilityLabel="Bookmarks"
            >
              <Glyph ic={Ic.slip} color={railMuted} size={16} />
            </Pressable>
            {/* [data-rr-lr-per="2|1"] — "Two pages at a time" / "One page at a
                time": hidden on the site's phone view (one leaf is all a
                phone stands) */}
            {/* .rr-pt-theme — 36px, 1.5px ring at .32, an 18px glyph in brown; the
                night values are appShell's mapped ones, off the golden */}
            <SunMoon
              size={36}
              glyph={18}
              ink={night ? "#C4A37A" : "#6E563A"}
              line={night ? "rgba(232,222,203,.32)" : "rgba(11,10,8,.32)"}
            />
          </View>
        </View>
      </TornBand>

      {/* ================================== the stage ================ */}
      <View style={styles.cx} onLayout={(e) => setStageH(e.nativeEvent.layout.height)}>
        {/* The lamp, UNDER the book (`.rr-lr-lamp{z-index:0}` beneath
            `.rr-lr-vol{z-index:1}`; the codex's wash is its box's own
            background). It shows only in the stage's pads — a lamp painted
            over the paper lightened every pixel of the light golden's book.
              stage: radial-gradient(56% 46% at 50% -8%,rgba(255,244,214,.6),0 72%)
              night: radial-gradient(56% 46% at 50% -8%,rgba(255,226,160,.22),0 74%)
              codex: radial-gradient(64% 48% at 50% 0,rgba(255,244,214,.35),0 70%), day only
            RN has no radial gradient: each is its on-axis profile as a
            vertical fade, which is exact down the middle and close in the
            12px head pad where any of it shows. */}
        {codexUp ? (
          night ? null : (
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(255,244,214,.35)", "rgba(255,244,214,0)"]}
              style={[styles.lamp, { height: "34%" }]}
            />
          )
        ) : (
          <LinearGradient
            pointerEvents="none"
            colors={night ? ["rgba(255,226,160,.17)", "rgba(255,226,160,0)"] : ["rgba(255,244,214,.46)", "rgba(255,244,214,0)"]}
            style={[styles.lamp, { height: "26%" }]}
          />
        )}
        <ScrollView
          style={styles.cx}
          contentContainerStyle={codexUp ? styles.stage : styles.stageVol}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cxStage}>
            <Codex
              recording={recording}
              voice={voice}
              band={shownBand}
              man={man}
              leaf={leaf}
              total={total}
              night={night}
              follow={follow}
              onFollow={onFollow}
              onReadFrom={onReadFrom}
              onTurn={turn}
              onShut={onClose}
              // a leaf that opens a chapter (a contents row, Begin listening)
              // tells the frame on the same tap: the rail turns deep, the
              // foot's arrows appear, the case respects the stage's cap
              onOpenChange={setGalleyBand}
              prefs={typePrefs}
              maxHeight={stageH || undefined}
            />
          </View>

          {/* .rr-lr-cx-foot — the arrows go UNDER the case on a phone, one to
              each margin (space-between), on white discs. Inside
              `[data-rr-lr-codex]` only: `.rr-lr-turn{display:none}` at ≤620px
              hides every other turn, and the bound volume turns by its
              dog-ears (codex/Volume.tsx). */}
          {codexUp ? (
            // box-none: the codex's 'back to your place' chip is drawn under
            // the foot's box, and must take the tap; the two arrows keep
            // their own hit areas
            <View style={styles.foot} pointerEvents="box-none">
              <Pressable
                onPress={() => turn(-1)}
                disabled={leaf <= 0}
                accessibilityRole="button"
                accessibilityLabel="Previous page"
                style={[styles.turn, { opacity: leaf <= 0 ? 0.25 : 1 }]}
              >
                <View style={styles.disc}>
                  <Glyph ic={Ic.prev} color="#0B0A08" size={16} />
                </View>
              </Pressable>
              <Pressable
                onPress={() => turn(1)}
                disabled={leaf >= total - 1}
                accessibilityRole="button"
                accessibilityLabel="Next page"
                style={[styles.turn, { opacity: leaf >= total - 1 ? 0.25 : 1 }]}
              >
                <View style={styles.disc}>
                  <Glyph ic={Ic.next} color="#0B0A08" size={16} />
                </View>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* ============================== the torn console ============= */}
      <TornBand edge="top" style={styles.band}>
        <Console
          recording={recording}
          night={night}
          leaf={leaf}
          // paintFolio: a pressed edition reads pages only while the codex of
          // pages STANDS (codexUp()), else the time left; a specimen keeps
          // its page arithmetic whatever stands (paintLeaf)
          total={recording.hasText && !codexUp ? 0 : total}
          page={man?.pages[leaf]?.n}
          sheet={sheet}
          band={deep ? galleyBand : -1}
          clockRemaining={clockRemaining}
          onClock={() => setClockRemaining((r) => !r)}
          onOpen={setSheet}
          onSignUp={onSignUp}
          onLayoutHeight={setConsoleH}
          liveSay={liveSay}
          bandPad={bandPad}
          bottomInset={insets.bottom}
        />
      </TornBand>

      {/* ============================== the search menu ============= */}
      {searchOpen && deep ? (
        <SearchMenu
          top={railH + 10}
          night={night}
          slug={recording.slug}
          voice={voice}
          band={galleyBand}
          galleyPath={chapters[galleyBand]?.galley}
          anchorRight={searchRight}
          onHit={onSearchHit}
        />
      ) : null}

      {/* ================================== the sheets =============== */}
      <VoiceSheet
        open={sheet === "voice"}
        onClose={() => setSheet(null)}
        recording={recording}
        night={night}
        bottom={sheetBottom}
        maxHeight={windowH * 0.72}
        onSignIn={onSignIn}
        onSay={(text, bad, subscribe) => setLiveSay(text ? { text, bad, subscribe } : null)}
        standingBand={deep ? galleyBand : -1}
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
        // the chip's "add a note" after the drawer was shut: openDrawer("slips")
        onOpen={(which) => {
          setPane(which);
          setSheet("contents");
        }}
        onClose={() => setSheet(null)}
        recording={recording}
        night={night}
        onBand={onBand}
        onSlip={onSlip}
        wordAnchor={wordAnchor}
        // the keyboard (the Modal's window does not shrink for it) lifts the
        // drawer and takes its room off the top, so a slip's note input is
        // never under it and the card never rides over the head band
        bottom={drawerBottom + keyboardH}
        maxHeight={keyboardH ? Math.min(windowH * 0.7, windowH - keyboardH - drawerBottom - railH - 8) : windowH * 0.7}
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

  // .rr-lr-rail / .rr-lr-deck{z-index:3} — both bands ride over the drawer's scrim
  band: { zIndex: 3 },
  // the veil: one part in 250 of ink, which rounds to the field on white
  veil: { ...StyleSheet.absoluteFill, zIndex: 1, backgroundColor: "rgba(11,10,8,.004)" },
  veilDot: { fontSize: 1, lineHeight: 1 },
  // ≤760px: min-height 54, gap 4, padding 6 / 2.6vw / 10 — the heights and
  // the vertical pads are railBox, which the landscape branch rewrites
  rail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
  },
  // .rr-lr-galley-steps{flex:none;display:flex;gap:8px}
  steps: { flexDirection: "row", alignItems: "center", gap: 8 },
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
  // .rr-lr-rail-mid{gap:2px;padding:4px 16px 3px;border-radius:8px} and
  // ≤900px: {max-width:none;flex:1 1 auto;padding-inline:6px} — basis AUTO,
  // not RN's flex:1 (basis 0): the head, the left side and the right side
  // all shrink from their content widths in proportion, so the running head
  // keeps one more character (136.5px against 131.8 at 390px) and the right
  // side overflows its 4px, as the site's does
  railMid: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "auto",
    minWidth: 0,
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 3,
    borderRadius: 8,
  },
  // .rr-lr-rail-mid b{font:600 15.5px/1.14 Cormorant} at ≤760px
  railTitle: { fontFamily: FONTS.serif, fontSize: 15.5, lineHeight: lineOf(15.5, 1.14), maxWidth: "100%" },

  cx: { flex: 1 },
  // the codex's own box: .rr-lr-cx{padding:5px 3px 7px} (the galley it stands
  // in is inset:0 of the stage, so the stage's padding does not apply)
  stage: { flexGrow: 1, paddingHorizontal: 3, paddingTop: 5, paddingBottom: 7, alignItems: "center" },
  // the volume's: .rr-lr-stage at ≤760px/≤520px — padding:12px 3px 14px, and
  // the volume is height:100% of it
  stageVol: { flexGrow: 1, paddingHorizontal: 3, paddingTop: 12, paddingBottom: 14, alignItems: "center" },
  // .rr-lr-cx-stage{flex:1 1 auto;align-items:center} — the case is centred in
  // whatever height is left above the turn rail
  cxStage: { flex: 1, width: "100%", justifyContent: "center" },
  // the lamp: first child of the stage, so it paints under the book — no
  // zIndex, which would lift it over the scroller
  lamp: { position: "absolute", top: 0, left: 0, right: 0 },

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
  // .rr-lr-turn{padding:6px 4px} — the hit area around the disc;
  // [disabled]{opacity:.25}
  turn: { paddingVertical: 6, paddingHorizontal: 4 },
  // .rr-lr-turn-disc{width:42px;height:42px;border:1.5px solid rgba(11,10,8,.7);
  //   background:#FFFFFF;color:#0B0A08} — no shadow, and the dark block
  // writes no rule for it: the same white plate by night
  disc: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: "rgba(11,10,8,.7)",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
});
