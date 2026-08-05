// /account/hermes — the Hermes Desk, now taking correspondence.
//
// A transcription of app/data/accountHermesPage.ts at its ≤920px / ≤760px
// branches: `.rr-hm-grid` becomes one column so the margin stops being sticky
// and sits under the specimens, the thread caps at 56vh, slips widen to 94%,
// and `.rr-hm-chips` stops wrapping — it scrolls sideways, breaking the 5vw
// gutter on both sides.
//
// ONE METAPHOR, carried whole: a clerk's desk with two working surfaces. The
// blotter holds the correspondence — the reader's notes are cream slips in
// handwriting, Hermes' replies are white ruled slips with the dashed AI stamp.
// Below it is the specimen drawer: tap an underlined word and the meaning
// appears in the margin.
//
// The slips and specimen pages are paper artifacts — theme islands on the web,
// so their colours are literals here and never flip at night.
//
// Not wired yet: /api/hermes (Phase 4). The specimen drawer works today off
// the same glosses the site ships, which is exactly what it does on the web
// until the wire goes live.

import { useRef, useState } from "react";
import Svg, { Path } from "react-native-svg";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import hermes from "../../src/data/hermes.json";
import { PortalPage } from "../../src/portal/PortalPage";
import { useInk, em } from "../../src/theme/ink";
import { useTheme } from "../../src/theme/ThemeProvider";
import { FONTS } from "../../src/theme/type";

type Lang = string;
type Note = { id: number; from: "reader" | "hermes"; text: string };

const SLIP = {
  reader: "#FBF5E4",
  hermes: "#FFFFFF",
  spec: "#FDFAF0",
  ink: "#171411",
  gold: "#8C6A3F",
  brown: "#6E563A",
  brick: "#7E2D1F",
  edge: "rgba(11,10,8,.3)",
  specEdge: "rgba(11,10,8,.5)",
  rule: "rgba(110,86,58,.45)",
} as const;

/** `.rr-hm-stamp` — the dashed AI mark. */
function Stamp({ size = 8.5 }: { size?: number }) {
  return (
    <Text style={[styles.stamp, { fontSize: size, letterSpacing: em(size, 0.22) }]}>AI</Text>
  );
}

/** `.rr-hm-slip` — a paper slip pinned to the blotter. */
function Slip({ note, index }: { note: Note; index: number }) {
  const reader = note.from === "reader";
  // .rr-hm-thread > .rr-hm-slip:nth-child(even) flips the tilt
  const base = reader ? 0.7 : -0.45;
  const rot = index % 2 === 1 ? -base : base;

  return (
    <View
      style={[
        styles.slip,
        reader ? styles.slipReader : styles.slipHermes,
        { transform: [{ rotate: `${rot}deg` }] },
      ]}
    >
      {!reader ? (
        <View style={styles.slipHead}>
          <Text style={styles.slipHeadB}>Hermes</Text>
          <Stamp size={7.5} />
        </View>
      ) : null}
      <Text style={reader ? styles.slipTextReader : styles.slipTextHermes}>{note.text}</Text>
    </View>
  );
}

export default function Hermes() {
  const { ink, vw, mode } = useInk();
  const { colors } = useTheme();

  const nextId = useRef(3);
  const [notes, setNotes] = useState<Note[]>([
    {
      id: 1,
      from: "hermes",
      text: "The desk is open. I keep this house’s ledger — your orders, your shelf, what to read next — and I can sit with any book you name. Leave a note below.",
    },
    {
      id: 2,
      from: "hermes",
      text: "House specialty: tap About a book…, set your bookmark, and nothing past it leaves my mouth.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [companionOpen, setCompanionOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("english");
  const [picked, setPicked] = useState<{ of: string; word: string } | null>(null);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setNotes((n) => [...n, { id: nextId.current++, from: "reader", text }]);
    // Phase 4 replaces this with /api/hermes — the same route the site calls.
    setNotes((n) => [
      ...n,
      {
        id: nextId.current++,
        from: "hermes",
        text: "The wire to the desk is not live in the app yet. Everything below the fold — the specimen drawer — reads word by word today.",
      },
    ]);
  };

  const gloss = (() => {
    if (!picked) return null;
    const spec = hermes.specimens.find((s) => s.id === picked.of);
    const w = spec?.words.find((x) => x.word === picked.word);
    return w ? (w.notes as Record<string, string>)[lang] : null;
  })();

  return (
    <PortalPage
      kicker="Roman Reads · Your Account"
      title="The Hermes Desk — now taking correspondence."
      sub="Leave a note and the clerk answers — your orders, your shelf, what to read next, or the book under your bookmark. The specimen drawer below still reads word by word."
    >
      {/* ================= the correspondence ================= */}
      <View style={styles.desk}>
        {/* ≤760px: .rr-hm-desk-head{gap:6px} and the scrawl drops to its own row */}
        <View style={styles.deskHead}>
          <Text style={[styles.h2, { color: colors.ink }]}>The correspondence.</Text>
          <Stamp />
          <Text style={[styles.deskScrawl, { color: colors.brown }]}>
            every reply is drafted by an AI clerk — from the desk’s own ledger until the
            wire goes live.
          </Text>
        </View>

        {/* .rr-hm-blotter */}
        <View
          style={[
            styles.blotter,
            {
              borderColor: ink(0.16),
              backgroundColor: mode === "dark" ? colors.cream1 : "#F6F1E6",
            },
          ]}
        >
          <ScrollView
            style={styles.thread}
            contentContainerStyle={styles.threadInner}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {notes.map((n, i) => (
              <Slip key={n.id} note={n} index={i} />
            ))}
          </ScrollView>
        </View>

        {/* .rr-hm-chips — ≤760px: no wrap, scrolls sideways past the gutter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -vw(5) }}
          contentContainerStyle={[styles.chips, { paddingHorizontal: vw(5) }]}
        >
          {["My orders", "My shelf", "Recommend me something"].map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              style={[styles.chip, { backgroundColor: colors.white, borderColor: ink(0.25) }]}
            >
              <Text style={[styles.chipText, { color: ink(0.75) }]}>{c}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setCompanionOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: companionOpen }}
            style={[
              styles.chip,
              companionOpen
                ? { backgroundColor: colors.ink, borderColor: colors.ink }
                : { backgroundColor: colors.white, borderColor: ink(0.25) },
            ]}
          >
            <Text
              style={[styles.chipText, { color: companionOpen ? colors.paper : ink(0.75) }]}
            >
              About a book…
            </Text>
          </Pressable>
        </ScrollView>

        {/* .rr-hm-comp */}
        {companionOpen ? (
          <View style={[styles.comp, { backgroundColor: colors.white }]}>
            <Text style={[styles.compLabel, { color: colors.gold2 }]}>Reading companion</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.compRow}
            >
              {hermes.companions.map((b) => (
                <Pressable
                  key={b.slug}
                  style={[styles.compBook, { borderColor: ink(0.3), backgroundColor: colors.paper }]}
                >
                  <Text style={[styles.compBookT, { color: colors.ink2 }]} numberOfLines={1}>
                    {b.title}
                  </Text>
                  <Text style={[styles.compBookA, { color: ink(0.55) }]} numberOfLines={1}>
                    {b.author}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={[styles.compNote, { color: colors.brown }]}>
              answers stop at your bookmark — hermes keeps a tidy desk.
            </Text>
          </View>
        ) : null}

        {/* .rr-hm-ask */}
        <View style={styles.ask}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Leave a note at the desk…"
            placeholderTextColor={ink(0.4)}
            selectionColor={colors.brass}
            maxLength={400}
            returnKeyType="send"
            onSubmitEditing={send}
            style={[
              styles.askIn,
              { backgroundColor: colors.white, borderColor: ink(0.3), color: colors.ink },
            ]}
          />
          <Pressable
            onPress={send}
            accessibilityRole="button"
            style={[styles.btn, { backgroundColor: colors.ink }]}
          >
            <Text style={[styles.btnText, { color: colors.paper }]}>Send it up</Text>
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => setNotes([])} hitSlop={6}>
            <Text style={[styles.clear, { color: ink(0.5) }]}>clear the correspondence</Text>
          </Pressable>
        </View>
      </View>

      {/* ================= the specimen drawer ================= */}
      <View style={[styles.divider, { borderTopColor: ink(0.12) }]}>
        <Text style={[styles.h2, { color: colors.ink }]}>The specimen drawer.</Text>
        <Text style={[styles.dividerSub, { color: ink(0.6) }]}>
          The app’s margin, on paper: lay a page on the desk or tap a word on a specimen,
          and the meaning appears beside the text.
        </Text>
      </View>

      <View style={styles.grid}>
        {/* .rr-hm-drop */}
        <View style={[styles.drop, { backgroundColor: colors.white }]}>
          <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
            <Path
              d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3M12 4v11m0-11L7.5 8.5M12 4l4.5 4.5"
              stroke={colors.brass}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={[styles.dropB, { color: colors.ink2 }]}>Lay the page on the desk</Text>
          <Text style={[styles.dropSpan, { color: ink(0.55) }]}>
            photograph or drop a page — JPG or PNG, any classic
          </Text>
        </View>

        <Text style={[styles.or, { color: colors.brown }]}>
          no photo handy? the drawer keeps two specimen pages ↓
        </Text>

        {/* .rr-hm-specs — theme islands, lit at night */}
        <View style={styles.specs}>
          {hermes.specimens.map((s, i) => (
            <View
              key={s.id}
              style={[styles.spec, { transform: [{ rotate: i % 2 ? "0.6deg" : "-0.5deg" }] }]}
            >
              <View style={styles.specHead}>
                <Text style={styles.specHeadB}>{s.title}</Text>
                <Text style={styles.specHeadI}>{s.source}</Text>
              </View>
              <Text style={styles.specTxt}>
                {s.runs.map((run, j) =>
                  run.word ? (
                    <Text
                      key={j}
                      onPress={() => setPicked({ of: s.id, word: run.text })}
                      suppressHighlighting
                      style={[
                        styles.word,
                        picked?.of === s.id && picked.word === run.text && styles.wordOn,
                      ]}
                    >
                      {run.text}
                    </Text>
                  ) : (
                    <Text key={j}>{run.text}</Text>
                  ),
                )}
              </Text>
            </View>
          ))}
        </View>

        {/* .rr-hm-margin — static here, not sticky (≤920px) */}
        <View style={styles.margin}>
          <View style={styles.langs}>
            {hermes.langs.map((l) => {
              const on = lang === l.value;
              return (
                <Pressable
                  key={String(l.value)}
                  onPress={() => setLang(String(l.value))}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[
                    styles.lang,
                    on
                      ? { backgroundColor: colors.ink, borderColor: colors.ink }
                      : { borderColor: ink(0.25) },
                  ]}
                >
                  <Text style={[styles.langText, { color: on ? colors.paper : ink(0.7) }]}>
                    {l.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.note, { backgroundColor: colors.white, borderColor: ink(0.14) }]}>
            <View style={[styles.noteHead, { borderBottomColor: ink(0.08) }]}>
              <Text style={[styles.noteHeadB, { color: colors.gold2 }]}>
                Hermes, in the margin
              </Text>
              <Stamp />
            </View>
            <Text
              style={[
                styles.out,
                { color: gloss ? colors.ink2 : ink(0.45) },
                !gloss && styles.outIdle,
                lang === "urdu" && gloss ? styles.outUrdu : null,
              ]}
            >
              {gloss ?? "tap an underlined word — the margin fills itself."}
            </Text>
          </View>

          <Text style={[styles.marginScrawl, { color: colors.brown }]}>
            the drawer reads the specimen pages only. the real camera desk arrives with
            Phase 4.
          </Text>
        </View>
      </View>

      {/* .rr-hm-band */}
      <View
        style={[
          styles.band,
          {
            marginHorizontal: -vw(5),
            paddingHorizontal: vw(5),
            borderTopColor: ink(0.12),
            backgroundColor: mode === "dark" ? colors.cream1 : "#F6F1E6",
          },
        ]}
      >
        <Text style={[styles.bandH, { color: colors.ink }]}>
          Hermes travels better in your pocket.
        </Text>
        <Text style={[styles.bandP, { color: ink(0.65) }]}>
          The full desk — camera, every language, the whole library — arrives here with
          Phase 4.
        </Text>
      </View>
    </PortalPage>
  );
}

const styles = StyleSheet.create({
  desk: { maxWidth: 820, paddingTop: 2, paddingBottom: 8 },
  deskHead: { flexDirection: "row", alignItems: "baseline", gap: 6, flexWrap: "wrap", marginBottom: 14 },
  // clamp(22px,2.6vw,30px) — a phone sits on the 22px floor
  h2: { fontFamily: FONTS.serifRegular, fontSize: 22, lineHeight: 26 },
  deskScrawl: {
    fontFamily: FONTS.hand,
    fontSize: 14.5,
    lineHeight: 21,
    transform: [{ rotate: "-1deg" }],
    flexBasis: "100%",
  },
  stamp: {
    fontFamily: FONTS.sansBold,
    textTransform: "uppercase",
    color: SLIP.brick,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(126,45,31,.55)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    transform: [{ rotate: "-6deg" }],
    overflow: "hidden",
  },

  blotter: { borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  // ≤760px: max-height 56vh; padding 16px 14px 14px
  thread: { maxHeight: 420 },
  threadInner: { gap: 14, paddingTop: 16, paddingHorizontal: 14, paddingBottom: 14 },

  // ≤760px: max-width 94%
  slip: {
    maxWidth: "94%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: SLIP.edge,
    shadowColor: "#362A1C",
    shadowOpacity: 0.12,
    shadowRadius: 9,
    shadowOffset: { width: 2, height: 5 },
    elevation: 2,
  },
  slipReader: { alignSelf: "flex-end", backgroundColor: SLIP.reader },
  slipHermes: { alignSelf: "flex-start", backgroundColor: SLIP.hermes, paddingBottom: 22 },
  slipHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 },
  slipHeadB: {
    fontFamily: FONTS.sansBold,
    fontSize: 8.5,
    letterSpacing: em(8.5, 0.22),
    textTransform: "uppercase",
    color: SLIP.gold,
  },
  slipTextReader: { fontFamily: FONTS.hand, fontSize: 18.5, lineHeight: 26.8, color: SLIP.ink },
  slipTextHermes: { fontFamily: FONTS.serifRegular, fontSize: 16.5, lineHeight: 26.4, color: SLIP.ink },

  chips: { flexDirection: "row", gap: 8, marginTop: 16 },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 999,
  },
  chipText: { fontFamily: FONTS.sansSemi, fontSize: 13 },

  comp: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(110,86,58,.5)",
    borderRadius: 14,
    gap: 12,
  },
  compLabel: {
    fontFamily: FONTS.sansBold,
    fontSize: 8.5,
    letterSpacing: em(8.5, 0.18),
    textTransform: "uppercase",
  },
  compRow: { gap: 10 },
  compBook: {
    width: 200,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
  },
  compBookT: { fontFamily: FONTS.sansSemi, fontSize: 13 },
  compBookA: { fontFamily: FONTS.sans, fontSize: 11, marginTop: 2 },
  compNote: {
    fontFamily: FONTS.hand,
    fontSize: 14.5,
    transform: [{ rotate: "-0.8deg" }],
  },

  ask: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 16 },
  askIn: {
    flexGrow: 1,
    flexBasis: 260,
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 999,
    fontFamily: FONTS.sansSemi,
    fontSize: 15,
  },
  btn: {
    flexGrow: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  btnText: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    letterSpacing: em(11, 0.08),
    textTransform: "uppercase",
  },
  actions: { alignItems: "flex-end", marginTop: 6 },
  clear: {
    fontFamily: FONTS.sansSemi,
    fontSize: 12,
    padding: 8,
    textDecorationLine: "underline",
  },

  divider: { marginTop: 46, marginBottom: 18, paddingTop: 34, borderTopWidth: 1, gap: 6 },
  dividerSub: { fontFamily: FONTS.sans, fontSize: 14, lineHeight: 23.8, maxWidth: 540 },

  // ≤920px: one column, gap 36, padding-bottom 56
  grid: { gap: 36, paddingTop: 6, paddingBottom: 56 },
  drop: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 34,
    paddingHorizontal: 22,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(110,86,58,.55)",
    borderRadius: 16,
  },
  dropB: { fontFamily: FONTS.serif, fontSize: 21, textAlign: "center" },
  dropSpan: { fontFamily: FONTS.sans, fontSize: 13, textAlign: "center" },
  or: {
    fontFamily: FONTS.hand,
    fontSize: 16.5,
    transform: [{ rotate: "-1deg" }],
    marginTop: -14,
  },

  specs: { gap: 22 },
  spec: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    backgroundColor: SLIP.spec,
    borderWidth: 1,
    borderColor: SLIP.specEdge,
    shadowColor: "#362A1C",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 3, height: 6 },
    elevation: 3,
  },
  specHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: SLIP.rule,
  },
  specHeadB: {
    fontFamily: FONTS.sansBold,
    fontSize: 9,
    letterSpacing: em(9, 0.2),
    textTransform: "uppercase",
    color: SLIP.gold,
  },
  specHeadI: { fontFamily: FONTS.serifItalicLight, fontSize: 13, color: SLIP.brown },
  specTxt: {
    marginTop: 14,
    fontFamily: FONTS.serifRegular,
    fontSize: 18,
    lineHeight: 33.3,
    color: SLIP.ink,
  },
  word: {
    color: SLIP.ink,
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
    textDecorationColor: "rgba(126,45,31,.65)",
  },
  wordOn: { backgroundColor: "rgba(155,122,77,.22)", color: SLIP.brick },

  margin: { gap: 14 },
  langs: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 20 },
  lang: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 999,
  },
  langText: { fontFamily: FONTS.sansSemi, fontSize: 13 },
  note: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 18, minHeight: 180 },
  noteHead: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 12, borderBottomWidth: 1 },
  noteHeadB: {
    flex: 1,
    fontFamily: FONTS.sansBold,
    fontSize: 9.5,
    letterSpacing: em(9.5, 0.2),
    textTransform: "uppercase",
  },
  out: { marginTop: 14, fontFamily: FONTS.serifRegular, fontSize: 18, lineHeight: 30.6, minHeight: 76 },
  outIdle: { fontFamily: FONTS.serifItalicLight, fontSize: 16 },
  outUrdu: { fontSize: 20, lineHeight: 40, textAlign: "right", writingDirection: "rtl" },
  marginScrawl: { fontFamily: FONTS.hand, fontSize: 15, lineHeight: 23, transform: [{ rotate: "-1deg" }] },

  band: { borderTopWidth: 1, paddingTop: 52, paddingBottom: 60, alignItems: "center" },
  bandH: { fontFamily: FONTS.serifRegular, fontSize: 24, lineHeight: 28, textAlign: "center" },
  bandP: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    lineHeight: 23.8,
    marginTop: 10,
    maxWidth: 440,
    textAlign: "center",
  },
});
