// /hermes — `/account/hermes`, the Ask AI page: app/data/accountHermesPage.ts
// at its phone branch (≤920px: one column, the margin no longer sticky;
// ≤760px: the desk head's gap closes to 6px and its scrawl drops to a row of
// its own, the thread caps at 56vh, slips widen to 94%, the quick-question
// chips stop wrapping and scroll sideways past the gutter, the Send button
// takes a whole line).
//
// TWO SURFACES, top to bottom, in the builder's order:
//   the conversation   head · blotter (the thread of slips) · quick-question
//                      chips · the spoiler-safe book panel · the ask row ·
//                      "Typing…" · clear
//   the sample pages   divider · the drop zone · the upload figure · two
//                      specimen pages · the answer-style chips · the AI note
//                      in the margin · a scrawl
// then the app band, full bleed, outside the gutters.
//
// Behaviour is HermesEnhancer.tsx's: a chip sends its preset question, a
// hard word lights and its meaning typewrites into the margin in the chosen
// style, "About a book…" opens the companion panel whose bookmark gates the
// answers and whose pick types the book's opening slip once, a picked photo
// fills the upload figure and the margin, and "clear the conversation" asks
// twice. The wire and the memory are src/portal/hermes/engine.ts (Phase 4
// seam: /api/hermes on the site, the site's own ledger words when it does
// not answer); the reader's own shelf and orders come from
// src/portal/hermes/reader.ts, never from the specimen data. The memory is
// stamped with its owner (a guest, or the reader's id), so one reader's
// conversation never surfaces for the next on the same phone.
//
// ONE DELIBERATE DIVERGENCE: the site refocuses the ask field after every
// reply (`inputEl()?.focus()`), chip or typed. On a phone a focus raises
// the keyboard, so here the field is refocused only when the question was
// typed into it — after a chip tap the keyboard stays down.
//
// The page scrolls itself (PortalPage scroll={false}) so the scroller can
// keep taps alive under the keyboard — RN's default swallows the first tap
// on Send to dismiss it — and sit in a KeyboardAvoidingView on iOS.
//
// The room is reached from the + sheet, not the tab bar; the route lives
// here so the sheet's row and the home screen's rows have somewhere to go.

import { useEffect, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import hermes from "../../src/data/hermes.json";
import { useSession } from "../../src/lib/session";
import { openOnSite } from "../../src/lib/web";
import { Head, PortalPage, Wrap, useContentInsets } from "../../src/portal/PortalPage";
import {
  askHermes,
  companionFor,
  ownerOf,
  readBookmarks,
  readLog,
  writeBookmark,
  writeLog,
  type Companion,
  type HermesTurn,
} from "../../src/portal/hermes/engine";
import { ISLAND } from "../../src/portal/hermes/island";
import { DashedBox, hairline } from "../../src/ui/DashedBox";
import { H2, InkButton, Pill, STAMP_BASELINE, Stamp, StepDisc, TextLink } from "../../src/portal/hermes/parts";
import { useReader } from "../../src/portal/hermes/reader";
import { SLIP_ROT, Slip } from "../../src/portal/hermes/Slip";
import { Specimen } from "../../src/portal/hermes/Specimen";
import { CAN_PICK, pickPage, type PickedPage } from "../../src/portal/hermes/upload";
import { useInk } from "../../src/theme/ink";
import { useTheme } from "../../src/theme/ThemeProvider";
import { face } from "../../src/theme/type";
import { Rule } from "../../src/ui/Rule";
import { Txt } from "../../src/ui/Type";
import { strokeProps } from "../../src/ui/svgPaint";

/* --------------------------------------------------------------- copy --- */

const PRESETS: Record<string, string> = {
  orders: "How are my orders coming along?",
  shelf: "What's on my shelf?",
  recommend: "Recommend me something to read next.",
};

const IDLE_NOTE = "tap an underlined word and its meaning appears here.";
/** HermesEnhancer's IDLE_NOTE — the comma line the margin shows once
 *  "remove" has run with no word lit; the builder's "and" line is only ever
 *  the page as served. */
const IDLE_NOTE_CLEARED = "tap an underlined word, its meaning appears here.";
const UPLOAD_NOTE =
  "a fine-looking page. on the website the AI only reads the two sample pages below, reading a photo of your own book is coming with the app.";
const CLEAR_LABEL = "clear the conversation";
const CLEAR_ARMED = "tap again. This permanently deletes the conversation";

/**
 * The upload figure is `hidden` on the web until a photo lands — and shown
 * regardless, because `.rr-hm-upfig{display:flex}` outranks `[hidden]` (the
 * same trap portalShared.ts guards `.rr-pt-btn` against). The page as it is
 * served today therefore carries an empty 64px frame and a "remove" link
 * under the drop zone, and parity is against the page as served. Flip this
 * when the site guards the figure.
 */
const UPFIG_SHOWN_EMPTY = true;

type Lang = "english" | "simple" | "aloud";
type Picked = { of: string; word: string };

/* ------------------------------------------------------------- screen --- */

export default function Hermes() {
  const { colors } = useTheme();
  const { ink, brown, vw, clamp } = useInk();
  const { height: viewportH } = useWindowDimensions();
  const { user } = useSession();
  const ledger = useReader();
  const pad = useContentInsets();

  /* --- the conversation --- */
  const [log, setLog] = useState<HermesTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState<{ index: number; text: string } | null>(null);
  /** Which brain wrote each reply answered this session (`.rr-hm-slip-src`);
   *  the web marks the slip the same way and, like here, not after a reload. */
  const [sources, setSources] = useState<Record<number, string>>({});
  const [armed, setArmed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [companionSlug, setCompanionSlug] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<Record<string, number>>({});
  const thread = useRef<ScrollView>(null);
  const input = useRef<TextInput>(null);
  const timers = useRef<{ type?: ReturnType<typeof setInterval>; arm?: ReturnType<typeof setTimeout> }>({});

  /* --- the sample pages --- */
  const [lang, setLang] = useState<Lang>("english");
  const [picked, setPicked] = useState<Picked | null>(null);
  const [upload, setUpload] = useState<PickedPage | null>(null);
  /** "remove" has run with no word lit: the margin shows the enhancer's idle line. */
  const [cleared, setCleared] = useState(false);
  const [shown, setShown] = useState(0);

  // whose memory: a guest's, or this reader's — another reader's is discarded
  const owner = ownerOf(user?.id);

  // the memory: the last forty turns and every bookmark, as the web keeps them
  useEffect(() => {
    let alive = true;
    Promise.all([readLog(owner), readBookmarks(owner)]).then(([l, b]) => {
      if (!alive) return;
      setLog(l);
      setBookmarks(b);
    });
    return () => {
      alive = false;
      clearInterval(timers.current.type);
      clearTimeout(timers.current.arm);
    };
  }, [owner]);

  const book: Companion | undefined = companionSlug ? companionFor(companionSlug) : undefined;
  const unit = book ? Math.min(Math.max(bookmarks[book.slug] ?? 1, 1), book.units) : 1;

  const scrollToEnd = () => thread.current?.scrollToEnd({ animated: true });

  /** The reply typewrites onto its slip, 14ms a character, as on the web. */
  const typewrite = (index: number, text: string, source: string) => {
    clearInterval(timers.current.type);
    let i = 0;
    setSources((m) => ({ ...m, [index]: source }));
    setTyping({ index, text: "" });
    timers.current.type = setInterval(() => {
      i += 1;
      setTyping({ index, text: text.slice(0, i) });
      if (i % 40 === 0) scrollToEnd();
      if (i >= text.length) {
        clearInterval(timers.current.type);
        setTyping(null);
        scrollToEnd();
      }
    }, 14);
  };

  const send = (raw: string, from: "input" | "chip" = "chip") => {
    const question = raw.trim();
    if (!question || sending) return;
    const history = log.slice(-8);
    const asked: HermesTurn = { role: "reader", text: question, at: Date.now() };
    const next = [...log, asked];
    setLog(next);
    writeLog(owner, next);
    setSending(true);
    setTimeout(scrollToEnd, 0);
    askHermes(question, {
      name: user?.name ?? "Guest reader",
      shelf: ledger.shelf,
      waitlist: ledger.waitlist,
      // the reader's OWN orders — never the Orders room's specimen rows
      orders: ledger.orders,
      companion: book ? { slug: book.slug, unit } : null,
      history,
    })
      .then((answer) => {
        const reply: HermesTurn = { role: "hermes", text: answer.text, at: Date.now() };
        const withReply = [...next, reply];
        setLog(withReply);
        writeLog(owner, withReply);
        typewrite(withReply.length - 1, answer.text, answer.source === "api" ? "live AI reply" : "answered from our catalog");
      })
      .finally(() => {
        setSending(false);
        // the site's inputEl()?.focus() — see the header: typed questions only
        if (from === "input") input.current?.focus();
      });
  };

  const clearConversation = () => {
    if (!armed) {
      setArmed(true);
      clearTimeout(timers.current.arm);
      timers.current.arm = setTimeout(() => setArmed(false), 4000);
      return;
    }
    clearTimeout(timers.current.arm);
    clearInterval(timers.current.type);
    setTyping(null);
    setArmed(false);
    setSources({});
    setLog([]);
    writeLog(owner, []);
  };

  /** Append the book's opening slip, once — the log is the dedupe, as on the web. */
  const announceOpening = (opening: string) => {
    if (log.some((t) => t.role === "hermes" && t.text === opening)) return;
    const slip: HermesTurn = { role: "hermes", text: opening, at: Date.now() };
    const next = [...log, slip];
    setLog(next);
    writeLog(owner, next);
    typewrite(next.length - 1, opening, "");
  };

  const selectBook = (slug: string | null, announce = false) => {
    setPickerOpen(false);
    const chosen = slug ? companionFor(slug) : undefined;
    if (!slug || !chosen) {
      setCompanionSlug(null);
      return;
    }
    setCompanionSlug(slug);
    const u = Math.min(Math.max(bookmarks[slug] ?? 1, 1), chosen.units);
    setBookmarks((b) => ({ ...b, [slug]: u }));
    writeBookmark(owner, slug, u);
    if (announce) announceOpening(chosen.opening);
  };

  /** The site's showUpload: the figure fills, the lit word goes out, the
   *  margin types the honest note. */
  const showUpload = (page: PickedPage) => {
    setUpload(page);
    setPicked(null);
    setCleared(false);
  };

  /** The site's clearUpload: the figure empties and, with no word lit, the
   *  margin drops to the enhancer's idle line — whether or not a page was
   *  ever there, since the empty figure's "remove" is live as served. */
  const clearUpload = () => {
    setUpload(null);
    if (!picked) setCleared(true);
  };

  const openPicker = () => {
    if (!CAN_PICK) return;
    void pickPage().then((page) => {
      if (page) showUpload(page);
    });
  };

  const stepUnit = (delta: number) => {
    if (!book) return;
    const u = Math.min(Math.max(unit + delta, 1), book.units);
    setBookmarks((b) => ({ ...b, [book.slug]: u }));
    writeBookmark(owner, book.slug, u);
  };

  /** `.rr-hm-out`: the lit word's gloss, the upload note, or the idle line. */
  const note = (() => {
    if (picked) {
      const spec = hermes.specimens.find((s) => s.id === picked.of);
      const w = spec?.words.find((x) => x.word === picked.word);
      if (w) return { word: w.word, text: `${w.word}: ${w.notes[lang]}` };
    }
    if (upload) return { word: "", text: UPLOAD_NOTE };
    return null;
  })();

  // the margin note typewrites too: 14ms a character over the WHOLE text,
  // the bold word first, then ": " and the note (the site's walker order)
  useEffect(() => {
    if (!note) return;
    const full = note.text;
    let i = 0;
    setShown(0);
    const t = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= full.length) clearInterval(t);
    }, 14);
    return () => clearInterval(t);
  }, [note?.text]); // eslint-disable-line react-hooks/exhaustive-deps

  const shelved = new Set(ledger.shelf);
  /** markShelfOptions on the site rewrites the option text; the closed
   *  <select> echoes it, so the field and the rows share one rule. */
  const bookLabel = (b: Companion) => `${b.title}, ${b.author}${shelved.has(b.slug) ? " · on your shelf" : ""}`;

  const showStarters = log.length === 0;
  const chipFor = (kind: string, label: string) => (
    <Pill key={kind} label={label} paper onPress={() => send(PRESETS[kind])} />
  );

  return (
    <PortalPage title="Ask AI" scroll={false} contentStyle={{ paddingTop: 0, paddingBottom: 0 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // NOT painted opaque: the site's own type on this page is greyscale
        // (PortalPage's header, "EXCEPT WHERE") — the kit's lcd={false} case
        contentContainerStyle={{ paddingTop: pad.top, paddingBottom: pad.bottom }}
      >
      <Wrap>
        {/* .rr-pt-head — kicker is display:none in the app shell; the h1's <em> wears the swoosh */}
        <Head
          title="Ask AI "
          em="about any book."
          sub="Ask about your orders, your wishlist, what to read next, or any book we sell: one line, one chapter, or everything up to your bookmark. Below, tap a hard word to see what it means."
        />

        {/* ================= the conversation (.rr-hm-desk) ================= */}
        <View accessibilityLabel="Chat with the AI" style={{ maxWidth: 820, paddingTop: 2, paddingBottom: 8 }}>
          {/* .rr-hm-desk-head — ≤760: gap 6, the scrawl on its own row (order:3) */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: 6, marginBottom: 14 }}>
            <H2>Your conversation.</H2>
            {/* margin-left:auto, on the h2's baseline: Cormorant 22's ascent
                (round(.924 × 22) = 20) less the stamp's own. */}
            <Stamp style={{ marginLeft: "auto", marginTop: 20 - STAMP_BASELINE }} />
            <Txt
              family="Caveat"
              weight={500}
              size={14.5}
              line={1.45}
              color="brown"
              style={{ flexBasis: "100%", transform: [{ rotate: "-1deg" }] }}
            >
              every reply is written by AI, from your account and our catalogue.
            </Txt>
          </View>

          {/* .rr-hm-blotter + .rr-hm-thread — ≤760: max-height 56vh, 16px 14px 14px */}
          <View style={{ backgroundColor: colors.white, overflow: "hidden" }}>
            <ScrollView
              ref={thread}
              accessibilityLabel="Messages and replies"
              style={{ maxHeight: Math.round(viewportH * 0.56) }}
              contentContainerStyle={{ gap: 14, paddingTop: 16, paddingHorizontal: 14, paddingBottom: 14 }}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {showStarters ? (
                <>
                  <Slip role="hermes" rot={-0.5}>
                    I am the AI built into your Roman Reads account. Ask me about your orders, your wishlist, or
                    what to read next. You can also ask about any book we sell, one line or the whole thing. Type
                    a message below.
                  </Slip>
                  {/* :nth-child(even) flips --slip-rot:.55deg */}
                  <Slip role="hermes" rot={-0.55}>
                    Spoiler-safe book chat: tap{" "}
                    {/* <i> at the slip's own 500 */}
                    <Txt family="Cormorant Garamond" weight={500} italic size={16.5} line={1.6} style={{ color: ISLAND.ink2 }}>
                      About a book…
                    </Txt>
                    , set your bookmark, and I answer only up to where you have read.
                  </Slip>
                </>
              ) : (
                log.map((turn, i) => {
                  const live = typing && typing.index === i ? typing : null;
                  return (
                    <Slip
                      key={turn.at + ":" + i}
                      role={turn.role}
                      rot={i % 2 ? -SLIP_ROT[turn.role] : SLIP_ROT[turn.role]}
                      source={turn.role === "hermes" ? sources[i] : undefined}
                    >
                      {live ? live.text : turn.text}
                    </Slip>
                  );
                })
              )}
            </ScrollView>
          </View>

          {/* .rr-hm-chips — ≤760: nowrap, scrolls sideways, −5vw past the gutter */}
          <ScrollView
            horizontal
            accessibilityLabel="Quick questions"
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 16, marginHorizontal: -vw(5) }}
            contentContainerStyle={{ flexDirection: "row", gap: 8, paddingVertical: 2, paddingHorizontal: vw(5) }}
          >
            {chipFor("orders", "My orders")}
            {chipFor("shelf", "My wishlist")}
            {chipFor("recommend", "Recommend me something")}
            <Pill
              label="About a book…"
              paper
              on={panelOpen}
              expanded={panelOpen}
              onPress={() => setPanelOpen((v) => !v)}
            />
          </ScrollView>

          {/* .rr-hm-comp — the spoiler-safe book panel */}
          {panelOpen ? (
            <View
              style={{
                marginTop: 14,
                paddingTop: 16 + hairline(1.5),
                paddingHorizontal: 18 + hairline(1.5),
                paddingBottom: 14 + hairline(1.5),
                borderRadius: 14,
                backgroundColor: colors.white,
                gap: 12,
              }}
            >
              <DashedBox color={brown(0.5, "border")} width={1.5} radius={14} />
              <View style={{ gap: 6 }}>
                <Txt weight={700} size={8.5} ls={0.24} upper color="gold2">
                  Spoiler-safe book chat
                </Txt>
                {/* the web's <select>; a phone's is a field that opens its rows beneath */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: pickerOpen }}
                  onPress={() => setPickerOpen((v) => !v)}
                  style={{
                    minHeight: 44,
                    paddingVertical: 10,
                    paddingLeft: 14,
                    paddingRight: 38,
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: ink(0.3, "border"),
                    borderRadius: 10,
                    backgroundColor: colors.white,
                  }}
                >
                  <Txt weight={600} size={13} color="ink2" numberOfLines={1}>
                    {book ? bookLabel(book) : "choose a book…"}
                  </Txt>
                  <View style={{ position: "absolute", right: 13, top: 0, bottom: 0, justifyContent: "center" }}>
                    <Svg width={12} height={8} viewBox="0 0 12 8">
                      <Path d="M1 1l5 5 5-5" fill="none" {...strokeProps(colors.brass)} strokeWidth={1.5} strokeLinecap="round" />
                    </Svg>
                  </View>
                </Pressable>
                {pickerOpen ? (
                  <View>
                    <Rule />
                    {hermes.companions.map((b) => (
                      <Pressable
                        key={b.slug}
                        accessibilityRole="button"
                        onPress={() => selectBook(b.slug, true)}
                        style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 14 }}
                      >
                        <Txt weight={600} size={13} color="ink2" numberOfLines={1}>
                          {bookLabel(b)}
                        </Txt>
                        <Rule style={{ position: "absolute", left: 0, right: 0, bottom: 0 }} />
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
              {book ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <StepDisc
                    glyph="−"
                    label="Move the bookmark back one"
                    disabled={unit <= 1}
                    onPress={() => stepUnit(-1)}
                  />
                  <Txt weight={600} size={13} tone={0.75} style={{ flex: 1, textAlign: "center" }}>
                    I'm on {book.unitLabel} {unit} of {book.units}
                  </Txt>
                  <StepDisc
                    glyph="+"
                    label="Move the bookmark forward one"
                    disabled={unit >= book.units}
                    onPress={() => stepUnit(1)}
                  />
                </View>
              ) : null}
              <Txt family="Caveat" weight={500} size={14.5} color="brown" style={{ transform: [{ rotate: "-0.8deg" }] }}>
                answers stop at your bookmark. nothing past it gets mentioned.
              </Txt>
            </View>
          ) : null}

          {/* .rr-hm-mode — the companion-active row */}
          {book ? (
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
              <View style={{ paddingVertical: 9, paddingHorizontal: 15, borderRadius: 999, backgroundColor: colors.ink }}>
                <Txt weight={700} size={10} ls={0.08} upper color="paper">
                  spoiler-safe book chat · {book.title} · {book.unitLabel} {unit}
                </Txt>
              </View>
              <TextLink label="stop book chat" size={12.5} color={colors.brick} onPress={() => selectBook(null)} />
            </View>
          ) : null}

          {/* .rr-hm-ask — the input takes the line, the button the next (flex:1 1 auto) */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
            <TextInput
              ref={input}
              accessibilityLabel="Ask a question"
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask a question…"
              placeholderTextColor={ink(0.4)}
              selectionColor={colors.brass}
              maxLength={400}
              autoCorrect={false}
              returnKeyType="send"
              editable={!sending}
              onSubmitEditing={() => {
                const v = draft;
                setDraft("");
                send(v, "input");
              }}
              style={{
                flexGrow: 1,
                flexShrink: 1,
                flexBasis: 260,
                minHeight: 48,
                paddingVertical: 12,
                paddingHorizontal: 18,
                fontFamily: face("Manrope", 500),
                fontSize: 15,
                color: colors.ink,
                backgroundColor: colors.white,
                borderWidth: 1,
                borderColor: ink(0.3, "border"),
                borderRadius: 999,
                opacity: sending ? 0.55 : 1,
              }}
            />
            <InkButton
              label="Send"
              disabled={sending}
              onPress={() => {
                const v = draft;
                setDraft("");
                send(v, "input");
              }}
              style={{ flexGrow: 1, flexShrink: 1 }}
            />
          </View>

          {/* .rr-hm-writing */}
          {sending ? (
            <Txt
              family="Caveat"
              weight={500}
              size={15.5}
              color="brown"
              accessibilityLiveRegion="polite"
              style={{ marginTop: 10, marginHorizontal: 2, minHeight: 22, transform: [{ rotate: "-1deg" }] }}
            >
              Typing…
            </Txt>
          ) : null}

          {/* .rr-hm-actions */}
          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 6 }}>
            <TextLink
              label={armed ? CLEAR_ARMED : CLEAR_LABEL}
              color={armed ? colors.brick : ink(0.5)}
              onPress={clearConversation}
            />
          </View>
        </View>

        {/* ================= the sample pages ================= */}
        {/* .rr-hm-divider — a solid hairline, 46 above, 34 inside, 18 below */}
        <View style={{ marginTop: 46, marginBottom: 18, gap: 6 }}>
          <Rule kind="solid" color={ink(0.12, "border")} style={{ marginBottom: 34 - 6 }} />
          <H2>Try it. Tap a word.</H2>
          <Txt size={14} line={1.7} tone={0.6} style={{ maxWidth: 540 }}>
            Tap any underlined word in the sample pages below and the AI explains it beside the text, in
            whichever style you pick.
          </Txt>
        </View>

        {/* .rr-hm-grid — ≤920: one column, gap 36, padding 6 0 56 */}
        <View style={{ gap: 36, paddingTop: 6, paddingBottom: 56 }}>
          <View>
            {/* .rr-hm-drop — 1.5px dashed brown at .55, radius 16, white */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Upload a photograph of a book page"
              accessibilityState={{ disabled: !CAN_PICK }}
              disabled={!CAN_PICK}
              onPress={openPicker}
              style={{
                alignItems: "center",
                gap: 10,
                paddingVertical: 34 + hairline(1.5),
                paddingHorizontal: 22 + hairline(1.5),
                borderRadius: 16,
                backgroundColor: colors.white,
              }}
            >
              <DashedBox color={brown(0.55, "border")} width={1.5} radius={16} />
              <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3M12 4v11m0-11L7.5 8.5M12 4l4.5 4.5"
                  {...strokeProps(colors.brass)}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Txt family="Cormorant Garamond" weight={600} size={21} color="ink2" style={{ textAlign: "center" }}>
                Upload a page
              </Txt>
              <Txt size={13} tone={0.55} style={{ textAlign: "center" }}>
                photograph or drag in a page, JPG or PNG, any classic
              </Txt>
            </Pressable>

            {/* .rr-hm-upfig — the picked page, or (see UPFIG_SHOWN_EMPTY) the empty frame */}
            {upload || UPFIG_SHOWN_EMPTY ? (
              <View
                style={{
                  marginTop: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  paddingVertical: 12 + 1,
                  paddingHorizontal: 2,
                }}
              >
                <Rule color={brown(0.4, "border")} style={{ position: "absolute", left: 0, right: 0, top: 0 }} />
                <Rule color={brown(0.4, "border")} style={{ position: "absolute", left: 0, right: 0, bottom: 0 }} />
                <Image
                  accessibilityLabel="Your uploaded page"
                  source={upload ? { uri: upload.uri } : undefined}
                  resizeMode="cover"
                  style={{ width: 64, height: 64, borderRadius: 8, borderWidth: 1, borderColor: ink(0.2, "border") }}
                />
                <Txt size={12.5} line={1.6} tone={0.6} style={{ flexShrink: 1 }}>
                  {upload ? `${upload.name}, uploaded.` : ""}
                </Txt>
                <View style={{ marginLeft: "auto" }}>
                  <TextLink label="remove" color={colors.brick} minHeight={0} onPress={clearUpload} />
                </View>
              </View>
            ) : null}

            {/* .rr-hm-or */}
            <Txt
              family="Caveat"
              weight={500}
              size={16.5}
              color="brown"
              style={{ marginTop: 22, marginBottom: 14, transform: [{ rotate: "-1deg" }] }}
            >
              no photo handy? two sample pages are waiting below ↓
            </Txt>

            {/* .rr-hm-specs */}
            <View style={{ gap: 22 }}>
              {hermes.specimens.map((s, i) => (
                <Specimen
                  key={s.id}
                  spec={s}
                  rot={i % 2 ? 0.6 : -0.5}
                  picked={picked?.of === s.id ? picked.word : null}
                  onPick={(word) => {
                    setPicked({ of: s.id, word });
                    setCleared(false);
                  }}
                />
              ))}
            </View>
          </View>

          {/* .rr-hm-margin — static here (≤920), gap 14 */}
          <View accessibilityLabel="What the AI says about the word" style={{ gap: 14 }}>
            {/* .rr-hm-langs */}
            <View accessibilityLabel="How should the answer be written?" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
              {hermes.langs.map((l) => (
                <Pill key={l.value} label={l.label} on={lang === l.value} onPress={() => setLang(l.value as Lang)} />
              ))}
            </View>

            {/* .rr-hm-note — a dashed brown rule above, 18px 2px 16px */}
            <View style={{ paddingTop: 18 + 1, paddingHorizontal: 2, paddingBottom: 16 }}>
              <Rule color={brown(0.42, "border")} style={{ position: "absolute", left: 0, right: 0, top: 0 }} />
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingBottom: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: ink(0.08, "border"),
                }}
              >
                <Txt weight={700} size={9.5} ls={0.2} upper color="gold2">
                  AI note in the margin
                </Txt>
                <Stamp style={{ marginLeft: "auto" }} />
              </View>
              {note ? (
                <Txt
                  family="Cormorant Garamond"
                  weight={500}
                  size={18}
                  line={1.7}
                  color="ink2"
                  accessibilityLiveRegion="polite"
                  style={{ marginTop: 14, minHeight: 76 }}
                >
                  {/* .rr-hm-out b — Cormorant 700, brick: the revealed prefix up to the word's end */}
                  <Txt family="Cormorant Garamond" weight={700} size={18} line={1.7} color="brick">
                    {note.text.slice(0, Math.min(shown, note.word.length))}
                  </Txt>
                  {note.text.slice(note.word.length, shown)}
                </Txt>
              ) : (
                <Txt
                  family="Cormorant Garamond"
                  weight={500}
                  italic
                  size={16}
                  line={1.7}
                  tone={0.45}
                  style={{ marginTop: 14, minHeight: 76 }}
                >
                  {cleared ? IDLE_NOTE_CLEARED : IDLE_NOTE}
                </Txt>
              )}
            </View>

            {/* .rr-hm-margin-scrawl — a <p> with its default 1em margins */}
            <Txt
              family="Caveat"
              weight={500}
              size={15}
              line={1.55}
              color="brown"
              style={{ marginVertical: 15, transform: [{ rotate: "-1deg" }] }}
            >
              this demo reads the two sample pages only. reading a photo of your own page comes with the app.
            </Txt>
          </View>
        </View>
      </Wrap>

      {/* .rr-hm-band — full bleed, a hairline above, white, centred */}
      <View
        style={{
          alignItems: "center",
          paddingTop: 52 + 1,
          paddingBottom: 60,
          paddingHorizontal: vw(5),
          backgroundColor: colors.white,
        }}
      >
        <Rule kind="solid" color={ink(0.12, "border")} style={{ position: "absolute", left: 0, right: 0, top: 0 }} />
        <Txt family="Cormorant Garamond" weight={500} size={clamp(24, 3, 34)} style={{ textAlign: "center" }}>
          This is coming to the app too.
        </Txt>
        <Txt size={14} line={1.7} tone={0.65} style={{ marginTop: 10, maxWidth: 440, textAlign: "center" }}>
          The app will add the camera, your own PDFs read aloud, and the whole audiobook library. It is coming
          to iOS and Android, and is not in the stores yet.
        </Txt>
        <InkButton label="About the app" onPress={() => openOnSite("/app")} style={{ marginTop: 22 }} />
      </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </PortalPage>
  );
}
