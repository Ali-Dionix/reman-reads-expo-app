// The narrator sheet — `[data-rr-lr-voice-menu]`, `.rr-lr-menu.rr-lr-sheet`
// with `.rr-lr-sheet-grab`, `.rr-lr-sheet-in`, `.rr-lr-vc-filters`
// (`.rr-lr-vc-find`, `.rr-lr-vc-langs` / `.rr-lr-vc-chip` /
// `.rr-lr-vc-langmenu` / `.rr-lr-vc-langopt`), `.rr-lr-vc-one`,
// `.rr-lr-vc-lab`, `.rr-lr-vc-recents` (`.rr-lr-vc-pick`, `.rr-lr-vc-pface`,
// `.rr-lr-vc-ptick`), the FEATURED grid `.rr-lr-nar` (`.rr-lr-nar-pick`,
// `.rr-lr-nar-disc`, `.rr-lr-nar-badge`, the state line) and
// `.rr-lr-nar--live`, the clone card `.rr-lr-cv` / `.rr-lr-cv-row`, and the
// directory `.rr-lr-vc-list` (`.rr-lr-vc-tongue`, `.rr-lr-vc-row.is-live`,
// `.rr-lr-vc-face`, `.rr-lr-vc-txt`, `.rr-lr-vc-tag`, `.rr-lr-vc-more`),
// `.rr-lr-vc-none`.
//
// Site: app/data/accountListeningPage.ts (the markup at [data-rr-lr-voice-menu]
// and every rule above, at the ≤900px / ≤520px branches — the phone's disc is
// 72px, the grid's gaps 4px 6px, the sheet-in gutter clamp(14px,4.6vw,22px));
// behaviour in app/components/ListeningEnhancer.tsx — paintVoice (with
// recentVoices), paintLiveFeatured, paintLiveReaders, paintLiveTags,
// paintLiveSay, paintLangChip, filterVoices, paintClone, pickNarrator,
// pickLiveNarrator; the ledger half of the turntable in
// app/components/audioStore.ts setNarrator.
//
// ONE PLACE PER HOUSE READER, which is the shape of this sheet: recents for
// what has actually been on, Featured for the readers worth a portrait (the
// house pair AND the few live readers with a manner word against them), and
// the language lists for every live reader — the pressed pair never repeat;
// the five featured live readers do, because the site's directory is the
// whole directory.
//
// THE CHOICE STANDS. A tap on a record label is a write to the reader's
// ledger (./voice/standing.ts — the site's `audioVoice` and the pressing
// this book was last put on), whether or not the book is on the platter: the
// tick moves at once, the choice outlives closing the volume, and the deck
// is told the moment the book lands. On the platter the deck's setNarrator
// restates the needle by the ratio of the two run lengths.
//
// THE LOCKS. A guest sees every reader and can play none: the pressed pair
// wear a lock badge and "sign up to listen"; the live readers' second line
// says the same, their rows are tagged "Sign up to listen", and the line over
// the directory carries the refusal in brick. Signed in, a pressed reader is
// "reads this book" / "on the platter"; a LIVE reader is the subscription's,
// which the site answers on the TAP (a 402 said over the directory), never
// on the disc — the gate is pressed-vs-live, not "Featured". Choosing a live
// reader here is not yet wired: it needs the live-reading pipeline (a chapter
// synthesized on request), which the app does not carry, so a signed-in tap
// says so on the same line.
//
// THE SHEET IS A LIST, NOT A SCROLLVIEW: three hundred and thirty-eight
// readers as rows would mount in one go otherwise. Everything on the sheet is
// one flat FlatList — the filters, the label, the chip strip, the two grids,
// the clone tile, the language headings (sticky, as `.rr-lr-vc-tongue` is),
// the rows and the folds — so a language sixty rows down is reached by
// scrolling one thing.
//
// The directory is baked by ./gen-narrators.mjs into ./narrators.json —
// rerun it when app/data/narrators.ts or the Fish register changes.

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type Role,
  type TextStyle,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path, Polygon, Rect } from "react-native-svg";

import { useDeck, type Recording } from "../../lib/audioStore";
import { ownerOf } from "../../lib/portalState";
import { useSession } from "../../lib/session";
import { useInk } from "../../theme/ink";
import { FONTS, lh, lineOf } from "../../theme/type";
import { Face } from "./voice/Face";
import { SheetPaper } from "./voice/SheetPaper";
import { paletteFor, type Palette } from "./voice/palette";
import { chooseVoice, noteHeard, useStanding, voiceInForce } from "./voice/standing";
import narrators from "./narrators.json";

/** The house mark on the clone tile — /public/favicon/favicon-96x96.png,
 *  byte for byte (the app's assets/mark.png). */
const MARK = require("../../../assets/mark.png");

type Pressed = { id: string; name: string; note: string; hue: string; portrait?: string; featured: number };
type Live = {
  id: string;
  name: string;
  note: string;
  hue: string;
  locale: string;
  gender: string;
  language: string;
  line: string;
  portrait?: string;
};
type Lang = { code: string; label: string; count: number };

const PRESSED = narrators.pressed as Pressed[];
const LIVE = narrators.live as Live[];
const FEATURED_LIVE = narrators.featured as string[];
const LANGUAGES = narrators.languages as Lang[];
const PRESSED_BY_ID = new Map(PRESSED.map((n) => [n.id, n]));

/** ListeningEnhancer's LIVE_CAP — rows past it fold under "Show N more". */
const LIVE_CAP = 5;

/** The word every voice in the picker wears while the room is locked. */
const LOCKED_TAG = "Sign up to listen";
/** paintLiveSay's line for a locked room (LOCKED_SAY) and its standing text (LIVE_SAY). */
const LOCKED_SAY = "Listening needs an account. Sign up to listen.";
const LIVE_SAY =
  "These readers are not pressed. Pick one and they begin reading this chapter to you straight away, and it is kept for next time.";
/** What a signed-in tap on a live reader says while the app carries no
 *  live-reading pipeline. (The site's own refusal for a reader the
 *  subscription has not opened — "This needs the subscription." — waits on
 *  useDeck().voiceLocked telling a missing subscription from an unwired
 *  one; today it says every live voice is shut.) */
const LIVE_SOON = "Live readers are coming to the app soon.";
/** The live pipeline — a chapter synthesized on request, read down the
 *  response as it is made — is not in the app. While it is not, the sheet
 *  must not promise what a tap then refuses: the standing line over the
 *  directory is the coming-soon sentence and every live row is tagged
 *  "Coming soon", not "Available". Flip this (or read a deck flag) when the
 *  pipeline ships, and LIVE_SAY / "Available" come back on their own. */
const LIVE_READY = false;
const SOON_TAG = "Coming soon";

/** ListeningEnhancer's voiceLocale — the region a provider voice id names,
 *  as the chip prints it; an opaque id yields nothing and the chip carries
 *  no second line rather than an invented one. */
const voiceLocale = (id: string): string => {
  const m = /^[a-z]{2}-([A-Z]{2})\b/.exec(id);
  return m ? (m[1] as string) : "";
};

/* ------------------------------------------------------------ geometry --- */

/** .rr-lr-sheet-grab: 76×26, margin 9px auto 0 */
const GRAB_TOP = 9;
const GRAB_H = 26;
/** [data-rr-lr-voice-menu] .rr-lr-sheet-in{max-height:min(66vh,560px)} */
const innerMax = (windowH: number) => Math.min(windowH * 0.66, 560);
/** Where the language menu hangs from — calc(100% + 6px) of .rr-lr-vc-langs:
 *  the grab, the column's padding-top 4, the filter row's padding-top 6, the
 *  chip's 38, and the 6px gap. Less the list's scroll offset. */
const LANG_ANCHOR = GRAB_TOP + GRAB_H + 4 + 6 + 38 + 6;
/** ≤520px: .rr-lr-nar-disc 72px, .rr-lr-nar{gap:4px 6px} */
const DISC = 72;
const DISC_INITIAL = 28;
const GRID_COL_GAP = 6;
const GRID_ROW_GAP = 4;
/** .rr-lr-vc-row.is-live .rr-lr-vc-face 36px, its letter 16px */
const ROW_FACE = 36;
/** .rr-lr-vc-pface 34px, its letter 15px; .rr-lr-vc-ptick 18px */
const PICK_FACE = 34;
const PICK_TICK = 18;

/* -------------------------------------------------------------- glyphs --- */

/** icSearch — 16×16 in an 18 box */
function SearchGlyph({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 18 18" fill="none">
      <Circle cx={8} cy={8} r={5} stroke={color} strokeWidth={1.6} />
      <Path d="m12 12 3.6 3.6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

/** .rr-lr-vc-chip i — a 9×6 triangle, currentColor at .6, flipped when open */
function Caret({ color, up }: { color: string; up: boolean }) {
  return (
    <Svg
      width={9}
      height={6}
      viewBox="0 0 9 6"
      style={{ opacity: 0.6, transform: [{ rotate: up ? "180deg" : "0deg" }] }}
    >
      <Polygon points="0,0 9,0 4.5,6" fill={color} />
    </Svg>
  );
}

/** IC_TICK / IC_LOCK — 10×10 in a 12 box, byte-for-byte the enhancer's */
function Tick({ color }: { color: string }) {
  return (
    <Svg width={10} height={10} viewBox="0 0 12 12" fill="none">
      <Path d="m2 6.3 2.6 2.6L10 3.4" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function Lock({ color }: { color: string }) {
  return (
    <Svg width={10} height={10} viewBox="0 0 12 12" fill="none">
      <Rect x={2.4} y={5.3} width={7.2} height={5.1} rx={1.1} fill={color} />
      <Path d="M4.2 5.3V4a1.8 1.8 0 0 1 3.6 0v1.3" stroke={color} strokeWidth={1.3} fill="none" />
    </Svg>
  );
}

/** MIC — the house mic on the clone tile's disc, 18×18 in a 20 box */
function Mic({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
      <Rect x={7.4} y={2.2} width={5.2} height={9} rx={2.6} stroke={color} strokeWidth={1.5} />
      <Path d="M4.6 9.4a5.4 5.4 0 0 0 10.8 0M10 14.8v3" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

/** `input:focus{outline:none}` — the field's ring is the wrapper's. Chrome's
 *  focus ring is `outline: auto`, which ignores a zero width, so the STYLE has
 *  to go; RN's types stop at solid/dotted/dashed, react-native-web takes none. */
/** A reader's name in Cormorant 600. The face carries its weight in its
 *  NAME, so a run the face has no glyphs for — Arabic, Persian, Urdu,
 *  Hebrew, eleven Arabic rows alone — falls back per glyph to a system face
 *  at 400, regular and visibly smaller where the site's font-weight:600
 *  makes the browser's fallback bold. The weight is stated where a fallback
 *  honours it: the web (verified) and iOS (which picks within the family,
 *  never synthesises). Android's Typeface.create would fake-bold the Latin
 *  run of a single-face family, so it keeps the face's own weight. */
const SERIF_600: TextStyle = Platform.OS === "android" ? {} : { fontWeight: "600" };

/** Keep a touch from bubbling to the column's shut-the-menu handler. */
const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

const NO_OUTLINE =
  Platform.OS === "web" ? ({ outlineStyle: "none" } as unknown as TextStyle) : null;

/** The directory's row is LTR with the Arabic run laid first inside it
 *  (.rr-lr-vc-row{text-align:left} under the document's direction). RN's
 *  Text takes its paragraph direction from the first strong character —
 *  dir="auto" on the web — so a name that opens in Arabic, Persian, Hebrew
 *  or Urdu would flip and hug the tag column. The style pins native; the
 *  `dir` prop pins the DOM, where react-native-web reads it. */
const LTR_TEXT: TextStyle = { textAlign: "left", writingDirection: "ltr" };
const LTR_PROP = Platform.OS === "web" ? ({ dir: "ltr" } as object) : {};

/** The site's chip is `aria-haspopup="listbox"` over a `role="listbox"` of
 *  `role="option"`s. RN's Role has option but no listbox, and no haspopup at
 *  all; react-native-web renders both, so they go on for the web only. */
const HAS_LISTBOX = Platform.OS === "web" ? ({ "aria-haspopup": "listbox" } as object) : {};
const LISTBOX_ROLE =
  Platform.OS === "web" ? ({ role: "listbox" as Role } as { role: Role }) : ({ accessibilityRole: "menu" } as const);
const OPTION_ROLE: Role = Platform.OS === "web" ? "option" : "menuitem";

/* --------------------------------------------------------------- items --- */

type PressedState = { here: boolean; pressed: boolean; line: string };

type Item =
  | { t: "filters" }
  | { t: "one"; text: string }
  | { t: "lab"; text: string }
  | { t: "recents"; ids: string[] }
  | { t: "pressed"; readers: Pressed[] }
  | { t: "featured"; readers: Live[] }
  | { t: "cv" }
  | { t: "livesay" }
  | { t: "tongue"; code: string; label: string }
  | { t: "row"; n: Live }
  | { t: "more"; code: string; label: string; rest: number }
  | { t: "none" }
  | { t: "foot" };

const keyOf = (it: Item, i: number): string =>
  it.t === "row" ? `row:${it.n.id}` : it.t === "tongue" ? `tongue:${it.code}` : `${it.t}:${i}`;

/* --------------------------------------------------------------- sheet --- */

export function VoiceSheet({
  open,
  onClose,
  recording,
  night,
  bottom,
  onSignIn,
  onSay,
}: {
  open: boolean;
  onClose: () => void;
  recording: Recording;
  night: boolean;
  /** Where the sheet's foot sits — the console's BOX top (the site's
   *  `bottom:100%` of .rr-lr-deck), under its hanging tear. */
  bottom: number;
  /** The frame's ceiling — the site's own (min(66vh,560px) inside the
   *  grab) is tighter, so it is not read. */
  maxHeight?: number;
  /** The clone tile's "Sign in" door — the site's guest card links to
   *  /login (sign-in, not sign-up), back to the room. The FRAME owns it:
   *  this sheet stands inside the Reader's Modal, which is its own window
   *  on a device, so a route pushed from in here lands under the volume and
   *  is never seen. The frame shuts the volume first, then pushes
   *  /sign-in?next=/listening. */
  onSignIn: () => void;
  /** The site's sayLive says a refusal TWICE — over the list of readers it
   *  is about, and on the console's sentence for a reader who has already
   *  shut the sheet (or whose sheet is scrolled past the line). The frame
   *  paints it into the Console's say slot, as it does the locked-room
   *  sentence; `bad` is the site's { bad: true } — brick and 600. Cleared
   *  with an empty text when the sheet shuts. */
  onSay?: (text: string, bad: boolean) => void;
}) {
  const { clamp } = useInk();
  const { width, height: windowH } = useWindowDimensions();
  const { now, voice: deckVoice, setNarrator, refuse, locked } = useDeck();
  const { user } = useSession();
  const standing = useStanding(ownerOf(user?.id));
  const pal = useMemo(() => paletteFor(night), [night]);

  // the pressings are the BOOK's; the deck's voice counts only while this
  // book is on the platter, and the ledger's choice the rest of the time
  const voices = recording.voices ?? [];
  const voiceIds = useMemo(() => voices.map((v) => v.id), [voices]);
  const here = now?.slug === recording.slug;
  const chosen = useMemo(
    () => voiceInForce(recording.slug, voiceIds, recording.voiceId ?? null, standing),
    [recording.slug, recording.voiceId, voiceIds, standing],
  );

  // The tick: the platter's pressing while THIS book sounds — the deck drops
  // a book on voiceInForce() itself (audioStore playBand / playAt), so the
  // two agree from the first frame — and the ledger's choice the rest of the
  // time.
  const on = here ? deckVoice : chosen;

  // THE RECENTS. A pressing that has actually sounded goes to the front of
  // the strip — the site reads this off the spots' editionIds, newest first.
  useEffect(() => {
    if (here && deckVoice) noteHeard(recording.slug, deckVoice);
  }, [here, deckVoice, recording.slug]);

  const [q, setQ] = useState("");
  const [lang, setLang] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const [unfolded, setUnfolded] = useState<Set<string>>(() => new Set());
  /** liveNote — what a tap on a live reader said, over the directory. */
  const [liveNote, setLiveNote] = useState("");
  const [sheetH, setSheetH] = useState(0);
  /** The list's scroll offset — the language menu hangs from the chip, which
   *  moves with the list. */
  const [scrollY, setScrollY] = useState(0);
  const listRef = useRef<FlatList<Item>>(null);

  // the sheet forgets its refusal and its menu when it shuts — the console's
  // copy of the refusal goes with it (the site's liveNote is per open too)
  const onSayRef = useRef(onSay);
  onSayRef.current = onSay;
  const liveNoteRef = useRef("");
  /** The site's sayLive: to the eye over the list, and to the console. */
  const sayLive = useCallback((text: string) => {
    liveNoteRef.current = text;
    setLiveNote(text);
    onSayRef.current?.(text, !!text);
  }, []);
  useEffect(() => {
    if (!open) {
      setLangOpen(false);
      if (liveNoteRef.current) sayLive("");
    }
  }, [open, sayLive]);

  // one pressing (or none yet) → the caption; two or more → the picker
  const picker = voices.length > 1;
  const needle = q.trim().toLowerCase();
  const matches = useCallback(
    (name: string) => !needle || name.toLowerCase().includes(needle),
    [needle],
  );

  // Only where there is something to read: a specimen has no published text,
  // so there is nothing for an unpressed voice to say.
  const offerLive = recording.hasText;
  const featuredLive = useMemo(
    () => FEATURED_LIVE.map((id) => LIVE.find((n) => n.id === id)).filter((n): n is Live => !!n),
    [],
  );
  // EVERY LIVE READER, by language, in the directory's own order. The
  // featured five stand in the grid AND in their language's list, as the
  // site's paintLiveReaders leaves them — "Show 67 more English readers" is
  // 72 less the fold, not 72 less the grid. Only the pressed pair are never
  // repeated.
  const groups = useMemo(
    () =>
      LANGUAGES.map((g) => ({
        ...g,
        readers: LIVE.filter((n) => n.language === g.code),
      })).filter((g) => g.readers.length),
    [],
  );

  const pressedState = useCallback(
    (id: string): PressedState => {
      const has = voiceIds.includes(id);
      const pressed = has && !locked;
      const isHere = pressed && id === on;
      return {
        here: isHere,
        pressed,
        line: isHere ? "on the platter" : pressed ? "reads this book" : locked ? "sign up to listen" : "not on this title",
      };
    },
    [voiceIds, locked, on],
  );

  /** pickNarrator — the reader's choice, written down; on the platter the
   *  deck changes pressing mid-sentence. The tick moves, the sheet stays. */
  const pick = useCallback(
    (id: string) => {
      setLangOpen(false);
      if (id === on || !voiceIds.includes(id)) return;
      chooseVoice(recording.slug, id);
      if (here) setNarrator(id);
    },
    [on, voiceIds, here, recording.slug, setNarrator],
  );

  /** pickLiveNarrator — a locked room refuses; an open one is not wired yet. */
  const pickLive = useCallback(
    (id: string) => {
      setLangOpen(false);
      // refuseLocked: the deck's own sentence goes brick and semibold, and
      // the same line is said over the list (the site's sayLive says it twice)
      if (refuse()) {
        sayLive(LOCKED_SAY);
        return;
      }
      // TODO(live pipeline): a reader the subscription opens still has no
      // live reading to start in the app.
      sayLive(LIVE_SOON);
    },
    [refuse, sayLive],
  );

  const unfold = useCallback((code: string) => {
    setLangOpen(false);
    setUnfolded((s) => new Set(s).add(code));
  }, []);

  /* ------------------------------------------------------ the flat list --- */

  // the strip stands on the reader's own history, whether or not THIS book
  // has more than one pressing — only the house pair can have sounded
  const recents = useMemo(
    () => standing.audioRecents.filter((id) => PRESSED_BY_ID.has(id)),
    [standing.audioRecents],
  );

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [{ t: "filters" }];
    let shown = 0;
    if (!picker) out.push({ t: "one", text: recording.voice });
    // Recent voices — the chip row is left alone by the search (filterVoices)
    if (recents.length) out.push({ t: "lab", text: "Recent voices" }, { t: "recents", ids: recents });
    // the search filters the pressed pair (filterVoices); the rack keeps
    // its padding when both are hidden, as the site's grid does. They COUNT
    // whether or not the rack is shown — the site's discs stand in the DOM
    // under a hidden rack, so a one-pressing book never says "no reader by
    // that name" under an empty search box.
    const pressed = PRESSED.filter((n) => matches(n.name));
    shown += pressed.length;
    if (picker) out.push({ t: "lab", text: "Featured" }, { t: "pressed", readers: pressed });
    // the showcase discs are a fixed row, not a result: neither the search
    // nor the language chip touches them. paintLiveFeatured gates on the
    // text and the directory alone — a book pressed ONCE still shows the
    // five, under no label (the site's feat.hidden = !picker).
    if (offerLive && featuredLive.length) out.push({ t: "featured", readers: featuredLive });
    // paintClone: a guest is offered the door; a signed-in reader with no
    // voice yet is offered "Record" — on the app, the pill in its
    // coming-soon state until the recorder is ported. (The site's one hidden
    // case, `!cloneState.ready && !cloneState.voice`, is the service being
    // switched off, which the app cannot ask.)
    out.push({ t: "cv" });
    if (offerLive) {
      const live: Item[] = [];
      let liveShown = 0;
      for (const g of groups) {
        if (lang && g.code !== lang) continue;
        const rows = g.readers.filter((n) => matches(n.name));
        if (!rows.length) continue;
        // a search lifts every fold: a reader who typed a name wants the
        // name, not the fold it happens to sit under
        const folded = !unfolded.has(g.code) && !needle;
        const kept = folded ? rows.slice(0, LIVE_CAP) : rows;
        liveShown += kept.length;
        live.push({ t: "tongue", code: g.code, label: g.label });
        for (const n of kept) live.push({ t: "row", n });
        const rest = rows.length - kept.length;
        if (rest > 0) live.push({ t: "more", code: g.code, label: g.label, rest });
      }
      // the label and the line go with the list: a search that empties the
      // directory leaves no heading over nothing
      if (liveShown) out.push({ t: "lab", text: "Read it in another voice" }, { t: "livesay" }, ...live);
      shown += liveShown;
    }
    if (!shown) out.push({ t: "none" });
    out.push({ t: "foot" });
    return out;
  }, [picker, recording.voice, recents, matches, offerLive, featuredLive, lang, groups, unfolded, needle]);

  const sticky = useMemo(
    () => items.map((it, i) => (it.t === "tongue" ? i : -1)).filter((i) => i >= 0),
    [items],
  );

  // A REFUSAL IS SEEN. On a desk the line over the directory stands in view
  // of the grid it answers for; on a phone it sits under the two grids and
  // the clone tile, a screen and more down, so a tap on a featured disc
  // that only wrote there looked like nothing at all. The list is brought
  // to the line the moment a note lands (and only then — a search while the
  // note stands is left where the finger put it).
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => {
    if (!liveNote) return;
    const list = itemsRef.current;
    const i = list.findIndex((it) => it.t === "livesay");
    if (i < 0) return;
    // with its label, "Read it in another voice", over it
    const index = i > 0 && list[i - 1]?.t === "lab" ? i - 1 : i;
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
  }, [liveNote]);
  // the line may not be mounted yet (the window is five screens); land near
  // it by the average row, then ask again once it is
  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0 });
      }, 160);
    },
    [],
  );

  const gutter = clamp(14, 4.6, 22);
  const contentW = width - gutter * 2;
  const cell = (contentW - GRID_COL_GAP * 2) / 3;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Item>) => {
      switch (item.t) {
        case "filters":
          return (
            <Filters
              pal={pal}
              q={q}
              setQ={setQ}
              lang={lang}
              langOpen={langOpen}
              toggleLang={() => setLangOpen((o) => !o)}
            />
          );
        case "one":
          // the hairline is the box's: border props on a Text are ignored on
          // iOS/Android
          return (
            <View style={[styles.one, { borderTopColor: pal.oneRule }]}>
              <Text style={[styles.oneText, { color: pal.oneText }]}>{item.text}</Text>
            </View>
          );
        case "lab":
          return <Text style={[styles.lab, { color: pal.lab }]}>{item.text}</Text>;
        case "recents":
          return (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.recents}
              contentContainerStyle={styles.recentsIn}
              keyboardShouldPersistTaps="handled"
            >
              {item.ids.map((id) => {
                const n = PRESSED_BY_ID.get(id)!;
                const checked = id === on;
                const em = voiceLocale(id);
                return (
                  <Pressable
                    key={id}
                    onPress={() => pick(id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked }}
                    aria-checked={checked}
                    accessibilityLabel={em ? `${n.name} ${em}` : n.name}
                    style={[
                      styles.pickChip,
                      { boxShadow: checked ? `inset 0 0 0 1.5px ${pal.chipOnRing}` : `inset 0 0 0 1px ${pal.chipRestRing}` },
                    ]}
                  >
                    <Face
                      size={PICK_FACE}
                      initialSize={15}
                      hue={n.hue}
                      portrait={n.portrait}
                      name={n.name}
                      ring={false}
                      style={{ overflow: "hidden" }}
                    />
                    <View>
                      <Text style={[styles.pickChipName, { color: pal.pickName }]} numberOfLines={1}>
                        {n.name}
                      </Text>
                      {em ? <Text style={[styles.pickChipEm, { color: pal.lab }]}>{em}</Text> : null}
                    </View>
                    {checked ? (
                      <View style={[styles.pickTick, { backgroundColor: pal.badgeOnBg }]}>
                        <Tick color={pal.badgeOnInk} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          );
        case "pressed":
          return (
            <View style={[styles.rack, { paddingTop: 4, paddingBottom: 10 }]} accessibilityRole="radiogroup" accessibilityLabel="Choose a narrator">
              {item.readers.map((n) => {
                const st = pressedState(n.id);
                return (
                  <Pressable
                    key={n.id}
                    onPress={() => pick(n.id)}
                    // a reader with no recording of this book is SHOWN, not
                    // offered — react-native-web renders `disabled` as
                    // aria-disabled, and drops accessibilityState
                    disabled={!st.pressed}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: st.here, disabled: !st.pressed }}
                    aria-checked={st.here}
                    // the site's accessible name is the label's whole text:
                    // the name and the state line under it
                    accessibilityLabel={`${n.name} ${st.line}`}
                    accessibilityHint={n.note}
                    style={[styles.pick, { width: cell }]}
                  >
                    <Face
                      size={DISC}
                      initialSize={DISC_INITIAL}
                      hue={n.hue}
                      portrait={n.portrait}
                      name={n.name}
                      cast
                      opacity={!st.pressed ? 0.34 : st.here ? 1 : 0.6}
                      grey={!st.pressed}
                      outline={st.here ? pal.discOutline : undefined}
                      scale={st.here ? 1.04 : 1}
                    >
                      {/* .rr-lr-nar-badge — a tick on the platter, a lock when shut */}
                      {st.here || !st.pressed ? (
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: st.here ? pal.badgeOnBg : pal.badgeBg,
                              boxShadow: `0 0 0 1.5px ${st.here ? pal.badgeOnRing : pal.badgeRing},0 1px 3px ${night ? "rgba(0,0,0,.6)" : "rgba(43,30,16,.3)"}`,
                            },
                          ]}
                        >
                          {st.here ? <Tick color={pal.badgeOnInk} /> : <Lock color={pal.badgeInk} />}
                        </View>
                      ) : null}
                    </Face>
                    <Text style={[styles.pickName, { color: pal.pickName }]}>{n.name}</Text>
                    <Text style={[styles.pickLine, { color: pal.pickLine }]}>{st.line}</Text>
                  </Pressable>
                );
              })}
            </View>
          );
        case "featured":
          return (
            <View style={[styles.rack, { paddingTop: 0, paddingBottom: 10 }]} role="group" accessibilityLabel="More featured readers">
              {item.readers.map((n) => {
                // dimmed for a guest only — the site's paintLiveTags sets
                // aria-disabled from locked(); the subscription answers on
                // the tap, not on the disc
                const shut = locked;
                const line = locked ? "sign up to listen" : n.line.split(" · ").slice(2).join(", ") || "reads this book";
                return (
                  <Shown
                    key={n.id}
                    onPress={() => pickLive(n.id)}
                    shut={locked}
                    accessibilityLabel={`${n.name} ${line}`}
                    style={[styles.pick, { width: cell }]}
                  >
                    <Face
                      size={DISC}
                      initialSize={DISC_INITIAL}
                      hue={n.hue}
                      portrait={n.portrait}
                      name={n.name}
                      cast
                      opacity={shut ? 0.34 : n.id === on ? 1 : 0.6}
                      grey={shut}
                    />
                    <Text style={[styles.pickName, { color: pal.pickName }]}>{n.name}</Text>
                    <Text style={[styles.pickLine, { color: pal.pickLine }]}>{line}</Text>
                  </Shown>
                );
              })}
            </View>
          );
        case "cv":
          return <CloneCard pal={pal} guest={locked} onSignIn={onSignIn} />;
        case "livesay": {
          // an open room with no live pipeline says so at rest, in the
          // muted ink — a note (a tap's answer) is the refusal's
          const bad = locked || !!liveNote;
          const text = locked ? LOCKED_SAY : liveNote || (LIVE_READY ? LIVE_SAY : LIVE_SOON);
          return (
            <Text style={[styles.livesay, bad ? styles.livesayBad : null, { color: bad ? pal.livesayBad : pal.livesay }]}>
              {text}
            </Text>
          );
        }
        case "tongue":
          return (
            <View style={{ backgroundColor: pal.tongueBg }}>
              <Text style={[styles.tongue, { color: pal.tongue }]}>{item.label}</Text>
            </View>
          );
        case "row": {
          const n = item.n;
          const isHere = n.id === on;
          const tag = locked ? LOCKED_TAG : isHere ? "Playing" : LIVE_READY ? "Available" : SOON_TAG;
          return (
            <Shown
              onPress={() => pickLive(n.id)}
              shut={locked}
              // the site's name is the button's whole text: the name, the
              // line under it and the tag — a screen reader needs the tag,
              // and the rig needs the site's exact run
              accessibilityLabel={`${n.name} ${n.line || n.note} ${tag}`}
              style={[styles.row, { borderTopColor: pal.rowRule }]}
            >
              <Face
                size={ROW_FACE}
                initialSize={16}
                hue={n.hue}
                portrait={n.portrait}
                name={n.name}
                opacity={locked ? 0.4 : 1}
                grey={locked}
                style={{ overflow: "hidden" }}
              />
              <View style={styles.rowTxt}>
                <Text {...LTR_PROP} style={[styles.rowName, LTR_TEXT, { color: pal.rowName }]} numberOfLines={1}>
                  {n.name}
                </Text>
                <Text {...LTR_PROP} style={[styles.rowLine, LTR_TEXT, { color: pal.rowLine }]}>
                  {n.line || n.note}
                </Text>
              </View>
              <Text style={[styles.tag, { color: isHere ? pal.tagOn : pal.tag }]}>{tag}</Text>
            </Shown>
          );
        }
        case "more":
          return (
            <Pressable onPress={() => unfold(item.code)} accessibilityRole="button" style={styles.more}>
              <Text style={[styles.moreText, { color: pal.more }]}>
                {`Show ${item.rest} more ${item.label} ${item.rest === 1 ? "reader" : "readers"}`}
              </Text>
            </Pressable>
          );
        case "none":
          return <Text style={[styles.none, { color: pal.none }]}>no reader by that name.</Text>;
        case "foot":
          return null;
      }
    },
    [pal, q, lang, langOpen, pressedState, pick, pickLive, unfold, cell, night, locked, on, onSignIn, liveNote],
  );

  const shutLang = useCallback(() => setLangOpen(false), []);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(e.nativeEvent.contentOffset.y);
  }, []);

  if (!open) return null;

  // the menu hangs from the chip; once the chip has scrolled under the grab
  // there is nothing to hang it from
  const menuTop = LANG_ANCHOR - scrollY;

  return (
    <>
      {/* a tap anywhere else shuts the sheet — the stage is NOT dimmed for a
          sheet (the .rr-lr-dscrim is the drawer's). The scrim stops where
          the console begins: its keys are handled before the outside-tap
          fallthrough on the site, so Play plays and the sheet stays. */}
      <Pressable style={[styles.scrim, { bottom }]} onPress={onClose} accessible={false} importantForAccessibility="no" />
      <View
        // the paper is sized from the measured box, one frame after the
        // column lays out — the sheet stays clear until then, so the first
        // frame is not the grab and the discs standing on the bare codex
        style={[styles.sheet, { bottom, opacity: sheetH > 0 ? 1 : 0 }]}
        onLayout={(e) => setSheetH(e.nativeEvent.layout.height)}
        accessibilityLabel="Narrator"
      >
        {sheetH > 0 ? <SheetPaper width={width} height={sheetH} pal={pal} /> : null}

        {/* .rr-lr-sheet-grab — the grabber, which shuts it */}
        <Pressable onPress={onClose} style={styles.grab} accessibilityRole="button" accessibilityLabel="Close">
          <View style={[styles.grabBar, { backgroundColor: pal.grab }]} />
        </Pressable>

        {/* .rr-lr-sheet-in — the printed column, the one scroll on this sheet.
            A finger down anywhere on it shuts the language menu, as the
            site's click fallthrough does — the menu stands outside this box,
            so its own options are not touched. */}
        <View
          style={styles.column}
          onTouchStart={langOpen ? shutLang : undefined}
          onPointerDown={langOpen ? shutLang : undefined}
        >
          <FlatList
            ref={listRef}
            data={items}
            keyExtractor={keyOf}
            renderItem={renderItem}
            stickyHeaderIndices={sticky}
            style={{ maxHeight: innerMax(windowH), flexGrow: 0 }}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 20, paddingHorizontal: gutter }}
            keyboardShouldPersistTaps="handled"
            onScroll={onScroll}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => setLangOpen(false)}
            onScrollToIndexFailed={onScrollToIndexFailed}
            initialNumToRender={14}
            windowSize={5}
            maxToRenderPerBatch={12}
            removeClippedSubviews={false}
          />
        </View>

        {/* .rr-lr-vc-langmenu — over the list, anchored under the chip */}
        {langOpen && menuTop > GRAB_TOP ? (
          <LangMenu
            pal={pal}
            lang={lang}
            windowH={windowH}
            right={gutter}
            top={menuTop}
            onPick={(code) => {
              setLang(code);
              setLangOpen(false);
              listRef.current?.scrollToOffset({ offset: 0, animated: false });
            }}
          />
        ) : null}
      </View>
    </>
  );
}

/* --------------------------------------------------- a shown-not-offered --- */

/** A live reader's disc or row: SHOWN to a guest, and answered with the
 *  refusal on the tap — so RN's `disabled` (which swallows the tap) is out,
 *  and the site's `aria-disabled="true"` has to be carried another way.
 *  accessibilityState says it on a device; on the web react-native-web's
 *  Pressable writes `aria-disabled` from its own `disabled` prop over
 *  anything passed, and drops accessibilityState, so the attribute is set
 *  on the node after mount (React leaves an attribute it never set alone on
 *  re-render). */
function Shown({
  shut,
  children,
  ...rest
}: { shut: boolean; children: ReactNode } & Omit<ComponentProps<typeof Pressable>, "children" | "disabled">) {
  const ref = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const el = ref.current as unknown as { setAttribute?: (k: string, v: string) => void; removeAttribute?: (k: string) => void } | null;
    if (!el?.setAttribute) return;
    if (shut) el.setAttribute("aria-disabled", "true");
    else el.removeAttribute?.("aria-disabled");
  }, [shut]);
  return (
    <Pressable ref={ref} accessibilityRole="button" accessibilityState={{ disabled: shut }} {...rest}>
      {children}
    </Pressable>
  );
}

/* ------------------------------------------------------------- filters --- */

function Filters({
  pal,
  q,
  setQ,
  lang,
  langOpen,
  toggleLang,
}: {
  pal: Palette;
  q: string;
  setQ: (s: string) => void;
  lang: string;
  langOpen: boolean;
  toggleLang: () => void;
}) {
  const chipOn = !!lang;
  const [focus, setFocus] = useState(false);
  return (
    <View style={styles.filters}>
      {/* .rr-lr-vc-find — the ringed search field; :focus-within inks the ring */}
      <View
        style={[
          styles.find,
          { boxShadow: focus ? `inset 0 0 0 1.5px ${pal.findFocusRing}` : `inset 0 0 0 1px ${pal.findRing}` },
        ]}
      >
        <SearchGlyph color={focus ? pal.findFocusIcon : pal.findIcon} />
        <TextInput
          value={q}
          onChangeText={setQ}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder="a reader’s name…"
          placeholderTextColor={pal.findPlaceholder}
          autoCorrect={false}
          autoCapitalize="none"
          // the site's field is type="search" autocomplete="off": no
          // suggestions over the readers' names, a search key on the phone
          autoComplete="off"
          inputMode="search"
          returnKeyType="search"
          enterKeyHint="search"
          accessibilityLabel="Search the readers"
          style={[styles.findIn, NO_OUTLINE, { color: pal.findText }]}
        />
      </View>
      {/* .rr-lr-vc-langs / .rr-lr-vc-chip — the house's own menu. The chip
          keeps its finger-down to itself: the column above shuts the menu on
          any touch, and a chip tap that shut it first would only reopen it. */}
      <Pressable
        onPress={toggleLang}
        onTouchStart={stop}
        onPointerDown={stop}
        accessibilityRole="button"
        accessibilityState={{ expanded: langOpen }}
        aria-expanded={langOpen}
        {...HAS_LISTBOX}
        style={[
          styles.chip,
          chipOn
            ? { backgroundColor: pal.chipOnBg }
            : { backgroundColor: pal.chipFace, boxShadow: `inset 0 0 0 1px ${pal.chipRing}` },
        ]}
      >
        <Text style={[styles.chipText, { color: chipOn ? pal.chipOnText : pal.chipText }]} numberOfLines={1}>
          {lang ? (LANGUAGES.find((g) => g.code === lang)?.label ?? lang) : "All languages"}
        </Text>
        <Caret color={chipOn ? pal.chipOnText : pal.chipText} up={langOpen} />
      </Pressable>
    </View>
  );
}

function LangMenu({
  pal,
  lang,
  windowH,
  right,
  top,
  onPick,
}: {
  pal: Palette;
  lang: string;
  windowH: number;
  right: number;
  top: number;
  onPick: (code: string) => void;
}) {
  const opts = useMemo(
    () => [{ code: "", label: "All languages", count: LIVE.length }, ...LANGUAGES],
    [],
  );
  return (
    <View
      style={[
        styles.langMenu,
        {
          top,
          right,
          maxHeight: Math.min(windowH * 0.46, 320),
          backgroundColor: pal.menuBg,
          boxShadow: `${pal.menuShadow},inset 0 0 0 1px ${pal.menuRing}`,
        },
      ]}
      {...LISTBOX_ROLE}
      accessibilityLabel="Show one language"
    >
      <FlatList
        data={opts}
        keyExtractor={(g) => g.code || "all"}
        initialNumToRender={12}
        renderItem={({ item: g }) => {
          const sel = lang === g.code;
          return (
            <Pressable
              onPress={() => onPick(g.code)}
              role={OPTION_ROLE}
              accessibilityState={{ selected: sel }}
              aria-selected={sel}
              style={[styles.langOpt, sel ? { backgroundColor: pal.optOnBg } : null]}
            >
              <Text style={[styles.langOptText, { color: sel ? pal.optOnText : pal.optText }]}>{g.label}</Text>
              <Text style={[styles.langOptCount, { color: sel ? pal.optOnCount : pal.optCount }]}>{g.count}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

/* ---------------------------------------------------------- clone tile --- */

/** .rr-lr-cv / .rr-lr-cv-row — for a guest the door, not the feature; for
 *  a signed-in reader with no voice yet, paintClone's "Record" pill. The
 *  app carries no recorder, so the pill stands disabled
 *  (.rr-lr-cv-btn[disabled]{opacity:.4}) with the caveat on the control,
 *  as a .rr-lr-cv-note under the row — the house's coming-soon rule. */
function CloneCard({ pal, guest, onSignIn }: { pal: Palette; guest: boolean; onSignIn: () => void }) {
  const body = (
    <>
      <View
        style={[
          styles.cvDisc,
          { backgroundColor: pal.cvDiscBg },
          pal.cvDiscRing ? { boxShadow: `inset 0 0 0 1.5px ${pal.cvDiscRing}` } : null,
        ]}
      >
        <Mic color={pal.cvDiscInk} />
      </View>
      <View style={styles.cvTxt}>
        <Text style={[styles.cvTitle, { color: pal.cvTitle }]}>Clone your voice</Text>
        <Text style={[styles.cvLine, { color: pal.cvLine }]}>
          read aloud for twenty seconds and hear this book in your own voice.
        </Text>
      </View>
      <View style={styles.cvActs}>
        {guest ? (
          <Pressable
            onPress={onSignIn}
            accessibilityRole="link"
            style={[styles.cvBtn, { backgroundColor: pal.cvBtnBg }]}
          >
            <Text style={[styles.cvBtnText, { color: pal.cvBtnInk }]}>Sign in</Text>
          </Pressable>
        ) : (
          <Pressable
            disabled
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            accessibilityHint="Recording your voice is coming to the app soon"
            style={[styles.cvBtn, { backgroundColor: pal.cvBtnBg, opacity: 0.4 }]}
          >
            <Text style={[styles.cvBtnText, { color: pal.cvBtnInk }]}>Record</Text>
          </Pressable>
        )}
      </View>
    </>
  );
  const ring = { boxShadow: `inset 0 0 0 ${pal.cvRingW}px ${pal.cvRing}` };
  return (
    <View style={styles.cv}>
      {/* the row and its mark, in one unclipped box: the mark is the ROW's
          ::after (-14/-18 of the row), and stays the row's when the note
          stands under it */}
      <View>
        {pal.cvWash ? (
          <LinearGradient
            colors={[pal.cvWash[0], pal.cvWash[1]]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[styles.cvRow, ring]}
          >
            {body}
          </LinearGradient>
        ) : (
          <View style={[styles.cvRow, ring, { backgroundColor: pal.cvBg ?? undefined }]}>{body}</View>
        )}
        {/* .rr-lr-cv-row::after — the house mark in ink, bleeding off the
            tile's corner. The row clips (its wash), so the mark rides on
            this box, placed where the row's -14/-18 are. */}
        <Image
          source={MARK}
          tintColor={pal.cvMark}
          contentFit="contain"
          accessible={false}
          alt=""
          style={[styles.cvMark, { opacity: pal.cvMarkAlpha }]}
        />
      </View>
      {/* .rr-lr-cv-note — the caveat the disabled pill needs, on the tile */}
      {guest ? null : (
        <Text style={[styles.cvNote, { color: pal.cvNote }]}>recording your voice is coming to the app soon.</Text>
      )}
    </View>
  );
}

/* -------------------------------------------------------------- styles --- */

const styles = StyleSheet.create({
  // the stage, down to the console's box; the sheet stands on the same line.
  // Over the codex and the veil (1); UNDER both bands (3), because the
  // site's rail and console keys act on their own while a menu stands
  // (onClick returns before the outside-tap fallthrough) — a scrim over
  // the rail would turn Close into shut-the-sheet.
  scrim: { position: "absolute", left: 0, right: 0, top: 0, zIndex: 2 },
  // .rr-lr-sheet{left:0;right:0;bottom:100%} — the paper is drawn by SheetPaper.
  // .rr-lr-menu{z-index:5}: OVER the deck's tear pseudo-layer, which the
  // frame keeps in flow as a TornBand at zIndex 3 — without this the
  // console's teeth print over the sheet's last 17px.
  sheet: { position: "absolute", left: 0, right: 0, zIndex: 5 },
  column: { flexGrow: 0, flexShrink: 1 },
  // .rr-lr-sheet-grab — 76×26, margin 9px auto 0; ::before 38×4 centred
  grab: { alignSelf: "center", width: 76, height: GRAB_H, marginTop: GRAB_TOP, alignItems: "center", justifyContent: "center" },
  grabBar: { width: 38, height: 4, borderRadius: 999 },
  // .rr-lr-vc-filters{display:flex;align-items:center;gap:8px;padding:6px 0 4px}
  filters: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 6, paddingBottom: 4 },
  // .rr-lr-vc-find{min-height:38px;padding:0 14px;border-radius:999px;gap:8px}
  find: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 38, paddingHorizontal: 14, borderRadius: 999 },
  // input{font:500 13px 'Manrope'}
  findIn: { flex: 1, minWidth: 0, fontFamily: FONTS.sansMedium, fontSize: 13, paddingVertical: 0, paddingHorizontal: 0, height: 38 },
  // .rr-lr-vc-chip{min-height:38px;padding:0 15px;gap:9px;font:700 11.5px;letter-spacing:.02em}
  chip: { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 38, paddingHorizontal: 15, borderRadius: 999 },
  chipText: { fontFamily: FONTS.sansBold, fontSize: 11.5, letterSpacing: 0.23, maxWidth: 152 },
  // .rr-lr-vc-langmenu{min-width:210px;padding:6px;border-radius:14px}
  langMenu: { position: "absolute", minWidth: 210, padding: 6, borderRadius: 14, zIndex: 6 },
  // .rr-lr-vc-langopt{gap:10px;padding:9px 11px;border-radius:9px;font:600 12.5px}
  langOpt: { flexDirection: "row", alignItems: "baseline", gap: 10, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 9 },
  langOptText: { fontFamily: FONTS.sansSemi, fontSize: 12.5 },
  // u{margin-left:auto;font:600 10.5px}
  langOptCount: { marginLeft: "auto", fontFamily: FONTS.sansSemi, fontSize: 10.5 },
  // .rr-lr-vc-one{margin:6px 0 2px;padding:9px 2px;border-top:1px solid;font:Cormorant 16px}
  one: { marginTop: 6, marginBottom: 2, paddingVertical: 9, paddingHorizontal: 2, borderTopWidth: 1 },
  oneText: { fontFamily: FONTS.serifRegular, fontSize: 16 },
  // .rr-lr-vc-lab{margin:10px 0 4px;font:700 10px;letter-spacing:.16em;text-transform:uppercase}
  lab: { marginTop: 10, marginBottom: 4, fontFamily: FONTS.sansBold, fontSize: 10, lineHeight: lh("Manrope", 10), letterSpacing: 1.6, textTransform: "uppercase" },
  // .rr-lr-vc-recents{gap:8px;overflow-x:auto;padding:2px 1px 8px;margin:0 -1px}
  recents: { marginHorizontal: -1, flexGrow: 0 },
  recentsIn: { flexDirection: "row", gap: 8, paddingTop: 2, paddingBottom: 8, paddingHorizontal: 1 },
  // .rr-lr-vc-pick{gap:9px;border-radius:999px;padding:6px 15px 6px 6px}
  pickChip: { flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 999, paddingVertical: 6, paddingLeft: 6, paddingRight: 15 },
  // b{font:Cormorant 600 15.5px/1.1;white-space:nowrap}
  pickChipName: { fontFamily: FONTS.serif, ...SERIF_600, fontSize: 15.5, lineHeight: lineOf(15.5, 1.1) },
  // em{font:600 9.5px 'Manrope';letter-spacing:.13em;uppercase}
  pickChipEm: { fontFamily: FONTS.sansSemi, fontSize: 9.5, lineHeight: lh("Manrope", 9.5), letterSpacing: 1.235, textTransform: "uppercase" },
  // .rr-lr-vc-ptick — 18px, ink, shown on the checked chip
  pickTick: { width: PICK_TICK, height: PICK_TICK, borderRadius: PICK_TICK / 2, alignItems: "center", justifyContent: "center" },
  // .rr-lr-nar — three across, gap 4px 6px on a phone
  rack: { flexDirection: "row", flexWrap: "wrap", columnGap: GRID_COL_GAP, rowGap: GRID_ROW_GAP },
  // .rr-lr-nar-pick{padding:8px 2px 6px;gap:8px;align-items:center}
  pick: { alignItems: "center", gap: 8, paddingTop: 8, paddingBottom: 6, paddingHorizontal: 2 },
  // .rr-lr-nar-badge — 21px on a phone, right:-1px bottom:1px
  badge: { position: "absolute", right: -1, bottom: 1, width: 21, height: 21, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  // b{margin-top:2px;font:Cormorant 600 16px}
  pickName: { marginTop: 2, fontFamily: FONTS.serif, ...SERIF_600, fontSize: 16, lineHeight: lh("Cormorant Garamond", 16), textAlign: "center" },
  // em{max-width:16em;font:400 10.5px/1.5 'Manrope';letter-spacing:.015em}
  pickLine: { maxWidth: 168, fontFamily: FONTS.sans, fontSize: 10.5, lineHeight: lineOf(10.5, 1.5), letterSpacing: 0.158, textAlign: "center" },
  // .rr-lr-vc-livesay{margin:0 0 2px;font:400 12px/1.45}
  livesay: { marginBottom: 2, fontFamily: FONTS.sans, fontSize: 12, lineHeight: lineOf(12, 1.45) },
  livesayBad: { fontFamily: FONTS.sansSemi },
  // .rr-lr-vc-tongue{padding:7px 2px 4px;font:700 9.5px;letter-spacing:.15em;uppercase}
  tongue: { paddingTop: 7, paddingBottom: 4, paddingHorizontal: 2, fontFamily: FONTS.sansBold, fontSize: 9.5, lineHeight: lh("Manrope", 9.5), letterSpacing: 1.425, textTransform: "uppercase" },
  // .rr-lr-vc-row{gap:12px;border-top:1px solid;padding:11px 2px}
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, paddingVertical: 11, paddingHorizontal: 2 },
  // .rr-lr-vc-txt{flex:1 1 auto;min-width:0;gap:2px}
  rowTxt: { flex: 1, minWidth: 0, gap: 2 },
  // b{font:Cormorant 600 17px/1.15}
  rowName: { fontFamily: FONTS.serif, ...SERIF_600, fontSize: 17, lineHeight: lineOf(17, 1.15) },
  // em{font:400 11px/1.45 'Manrope'}
  rowLine: { fontFamily: FONTS.sans, fontSize: 11, lineHeight: lineOf(11, 1.45) },
  // .rr-lr-vc-tag{font:700 9.5px;letter-spacing:.13em;uppercase;white-space:nowrap}
  tag: { fontFamily: FONTS.sansBold, fontSize: 9.5, letterSpacing: 1.235, textTransform: "uppercase" },
  // .rr-lr-vc-more{padding:11px 2px 13px;font:600 12px;letter-spacing:.01em;text-align:center}
  more: { paddingTop: 11, paddingBottom: 13, paddingHorizontal: 2, alignItems: "center" },
  moreText: { fontFamily: FONTS.sansSemi, fontSize: 12, letterSpacing: 0.12 },
  // .rr-lr-vc-none{margin:14px 2px;font:500 14.5px/1.5 'Caveat';transform:rotate(-.4deg)}
  none: { marginVertical: 14, marginHorizontal: 2, fontFamily: FONTS.hand, fontSize: 14.5, lineHeight: lineOf(14.5, 1.5), transform: [{ rotate: "-0.4deg" }] },
  // .rr-lr-cv{padding:6px 0 2px}
  cv: { paddingTop: 6, paddingBottom: 2 },
  // ≤520: .rr-lr-cv-row{flex-wrap:wrap;gap:12px 13px;padding:16px 16px 17px;border-radius:18px}
  cvRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", rowGap: 12, columnGap: 13, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 17, borderRadius: 18, overflow: "hidden" },
  // .rr-lr-cv-row::after{right:-14px;bottom:-18px;width:92px;height:92px} — of the ROW
  cvMark: { position: "absolute", right: -14, bottom: -18, width: 92, height: 92, pointerEvents: "none" },
  // .rr-lr-cv-note{margin:8px 0 0;font:500 14px/1.4 'Caveat';transform:rotate(-.4deg)}
  cvNote: { marginTop: 8, fontFamily: FONTS.hand, fontSize: 14, lineHeight: lineOf(14, 1.4), transform: [{ rotate: "-0.4deg" }] },
  // .rr-lr-cv-disc — 54px, filled ink
  cvDisc: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  // .rr-lr-cv-txt{flex:1 1 60%;gap:2px}
  cvTxt: { flexGrow: 1, flexShrink: 1, flexBasis: "60%", minWidth: 0, gap: 2 },
  // b{font:Cormorant 600 19px/1.15}
  cvTitle: { fontFamily: FONTS.serif, fontSize: 19, lineHeight: lineOf(19, 1.15) },
  // em{font:400 11px/1.45}
  cvLine: { fontFamily: FONTS.sans, fontSize: 11, lineHeight: lineOf(11, 1.45) },
  // .rr-lr-cv-acts{flex:1 1 100%;gap:7px}
  cvActs: { flexBasis: "100%", flexDirection: "row", alignItems: "center", gap: 7 },
  // .rr-lr-cv-row .rr-lr-cv-link{flex:1 1 auto;justify-content:center;min-height:36px;padding:8px 17px;border-radius:999px}
  cvBtn: { flex: 1, minHeight: 36, paddingVertical: 8, paddingHorizontal: 17, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  // font:700 11px;letter-spacing:.04em
  cvBtnText: { fontFamily: FONTS.sansBold, fontSize: 11, letterSpacing: 0.44 },
});
