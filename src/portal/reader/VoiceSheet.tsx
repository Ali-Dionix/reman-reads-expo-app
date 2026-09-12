// The narrator sheet — `[data-rr-lr-voice-menu]`, `.rr-lr-menu.rr-lr-sheet`
// with `.rr-lr-sheet-grab`, `.rr-lr-sheet-in`, `.rr-lr-vc-filters`
// (`.rr-lr-vc-find`, `.rr-lr-vc-langs` / `.rr-lr-vc-chip` /
// `.rr-lr-vc-langmenu` / `.rr-lr-vc-langopt`), `.rr-lr-vc-one`,
// `.rr-lr-vc-lab`, `.rr-lr-vc-recents` (`.rr-lr-vc-pick`), the FEATURED
// grid `.rr-lr-nar` (`.rr-lr-nar-pick`, `.rr-lr-nar-disc`,
// `.rr-lr-nar-badge`, the state line) and `.rr-lr-nar--live`, the clone card
// `.rr-lr-cv`, and the directory `.rr-lr-vc-list` (`.rr-lr-vc-tongue`,
// `.rr-lr-vc-row`, `.rr-lr-vc-face`, `.rr-lr-vc-txt`, `.rr-lr-vc-tag`,
// `.rr-lr-vc-more`), `.rr-lr-vc-none`.
//
// Site: app/data/accountListeningPage.ts (the markup and every rule above,
// at the ≤620px branch); behaviour in app/components/ListeningEnhancer.tsx —
// paintVoice, paintLiveFeatured, paintLiveReaders, paintLiveTags,
// paintLangChip, filterVoices, paintClone.
//
// ONE PLACE PER READER, which is the whole shape of this sheet: recents for
// what has actually been on, Featured for the readers worth a portrait (the
// house pair AND the few live readers with a manner word against them), and
// the language lists for everyone else — nobody appears in more than one.
//
// THE LOCKS. A guest sees every reader and can play none: the pressed pair
// wear a lock badge and "sign up to listen"; the live readers' second line
// says the same and their rows are tagged "Sign up to listen". Signed in, a
// pressed reader is "reads this book" / "on the platter"; a LIVE reader is
// the subscription's (useDeck().voiceLocked) — gated on pressed-vs-live,
// never on "Featured". Choosing a live reader here is not yet wired: it
// needs the live-reading pipeline (a chapter synthesized on request), which
// the app does not carry.
//
// The directory is baked by ./gen-narrators.mjs into ./narrators.json —
// rerun it when app/data/narrators.ts or the Fish register changes.

import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useDeck, type Recording } from "../../lib/audioStore";
import { useInk, em } from "../../theme/ink";
import { FONTS } from "../../theme/type";
import narrators from "./narrators.json";

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

/** ListeningEnhancer's LIVE_CAP — rows past it fold under "Show N more". */
const LIVE_CAP = 5;

/** The word every voice in the picker wears while the room is locked. */
const LOCKED_TAG = "Sign up to listen";

/** narratorInitial — by codepoint, because a live reader may be named in a
 *  script whose first letter is a surrogate pair. */
const initialOf = (name: string): string => [...name.trim()][0]?.toUpperCase() || "R";

const IC_SEARCH = "M7 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11Zm7.5 2.5-3.6-3.6";
const IC_TICK = "M3 8.5l3.2 3L13 4.5";
const IC_LOCK = "M4.5 7V5.5a3.5 3.5 0 0 1 7 0V7M3.5 7h9v6.5h-9z";

function Glyph({ d, color, size = 14 }: { d: string; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d={d} stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** `.rr-lr-nar-disc` / `.rr-lr-vc-face` — the reader's face: the portrait
 *  over their label hue, or their initial in cream. A theme island. */
function Face({
  hue,
  portrait,
  name,
  size,
  dim,
}: {
  hue: string;
  portrait?: string;
  name: string;
  size: number;
  dim?: boolean;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: hue,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        opacity: dim ? 0.55 : 1,
      }}
    >
      {portrait ? (
        <Image source={{ uri: portrait }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Text style={{ fontFamily: FONTS.serifRegular, fontSize: size * 0.4, color: "#F1E4C4" }}>
          {initialOf(name)}
        </Text>
      )}
    </View>
  );
}

export function VoiceSheet({
  open,
  onClose,
  recording,
  night,
  bottom,
  maxHeight,
}: {
  open: boolean;
  onClose: () => void;
  recording: Recording;
  night: boolean;
  /** Where the sheet's foot sits — over the console's tear. */
  bottom: number;
  maxHeight: number;
}) {
  const { ink } = useInk();
  const { now, voice: deckVoice, setNarrator, locked, voiceLocked } = useDeck();
  // the pressings are the BOOK's; the deck's voice counts only while this
  // book is on the platter
  const voices = recording.voices ?? [];
  const here = now?.slug === recording.slug;
  const voice = here ? deckVoice : null;
  const [q, setQ] = useState("");
  const [lang, setLang] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const [unfolded, setUnfolded] = useState<Set<string>>(() => new Set());

  // one pressing (or none yet) → the caption; two or more → the picker
  const picker = voices.length > 1;
  const on = voice ?? recording.voiceId ?? null;

  const needle = q.trim().toLowerCase();
  const matches = (name: string) => !needle || name.toLowerCase().includes(needle);

  // Only where there is something to read: a specimen has no published text,
  // so there is nothing for an unpressed voice to say.
  const offerLive = recording.hasText;
  const featuredLive = useMemo(
    () => FEATURED_LIVE.map((id) => LIVE.find((n) => n.id === id)).filter((n): n is Live => !!n),
    [],
  );
  const featuredIds = useMemo(() => new Set(FEATURED_LIVE), []);
  // EVERY OTHER READER, by language — the featured ones are not repeated
  const groups = useMemo(
    () =>
      LANGUAGES.map((g) => ({
        ...g,
        readers: LIVE.filter((n) => n.language === g.code && !featuredIds.has(n.id)),
      })).filter((g) => g.readers.length),
    [featuredIds],
  );

  const inkHead = night ? "#F4EBD6" : "#0B0A08";
  const inkBody = night ? "#F4EBD6" : "#171411";
  const inkMuted = night ? "rgba(240,229,207,.62)" : "rgba(11,10,8,.6)";
  const inkLab = night ? "#C9A662" : "#8C6A3F";

  if (!open) return null;

  const pressedState = (id: string): { here: boolean; pressed: boolean; line: string } => {
    const has = voices.some((v) => v.id === id);
    const pressed = has && !locked;
    const here = pressed && id === on;
    return {
      here,
      pressed,
      line: here ? "on the platter" : pressed ? "reads this book" : locked ? "sign up to listen" : "not on this title",
    };
  };

  const liveTag = (id: string): string =>
    voiceLocked(id) ? LOCKED_TAG : id === on ? "Playing" : "Available";

  const anyMatch =
    PRESSED.some((n) => matches(n.name)) ||
    featuredLive.some((n) => matches(n.name)) ||
    groups.some((g) => (!lang || g.code === lang) && g.readers.some((n) => matches(n.name)));

  return (
    <>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View
        style={[styles.sheet, night ? styles.sheetNight : styles.sheetDay, { bottom, maxHeight }]}
        accessibilityLabel="Narrator"
      >
        {/* .rr-lr-sheet-grab — the grabber, which shuts it */}
        <Pressable onPress={onClose} style={styles.grab} accessibilityRole="button" accessibilityLabel="Close">
          <View style={[styles.grabBar, { backgroundColor: ink(0.28) }]} />
        </Pressable>

        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* .rr-lr-vc-filters — the search and the language chip */}
          <View style={styles.filters}>
            <View style={[styles.find, { borderColor: ink(0.28) }]}>
              <Glyph d={IC_SEARCH} color={inkMuted} size={15} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="a reader’s name…"
                placeholderTextColor={inkMuted}
                autoCorrect={false}
                autoCapitalize="none"
                accessibilityLabel="Search the readers"
                style={[styles.findIn, { color: inkBody }]}
              />
            </View>
            <View>
              <Pressable
                onPress={() => setLangOpen((o) => !o)}
                accessibilityRole="button"
                accessibilityState={{ expanded: langOpen }}
                style={[styles.chip, { borderColor: ink(0.28) }]}
              >
                <Text style={[styles.chipText, { color: inkBody }]}>
                  {lang ? (LANGUAGES.find((g) => g.code === lang)?.label ?? lang) : "All languages"}
                </Text>
                <Text style={{ color: inkMuted, fontSize: 10 }}>▾</Text>
              </Pressable>
              {langOpen ? (
                <View
                  style={[styles.langMenu, night ? styles.sheetNight : styles.sheetDay, { borderColor: ink(0.2) }]}
                  accessibilityLabel="Show one language"
                >
                  <ScrollView style={{ maxHeight: 260 }}>
                    {[{ code: "", label: "All languages", count: LIVE.length }, ...LANGUAGES].map((g) => (
                      <Pressable
                        key={g.code || "all"}
                        onPress={() => {
                          setLang(g.code);
                          setLangOpen(false);
                        }}
                        accessibilityRole="menuitem"
                        accessibilityState={{ selected: lang === g.code }}
                        style={styles.langOpt}
                      >
                        <Text style={[styles.langOptText, { color: inkBody }]}>{g.label}</Text>
                        <Text style={[styles.langOptCount, { color: inkMuted }]}>{g.count}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          </View>

          {/* .rr-lr-vc-one — one pressing: the caption, no picker */}
          {!picker ? <Text style={[styles.one, { color: inkMuted }]}>{recording.voice}</Text> : null}

          {/* Recent voices — the reader's own history; a fresh pass has none.
              TODO(state.audioRecents): read the recents off the portal state
              once the app records them. */}

          {/* FEATURED — the house readers and the unpressed readers with
              something recorded about how they sound, in ONE grid */}
          {picker ? (
            <>
              <Text style={[styles.lab, { color: inkLab }]}>Featured</Text>
              <View style={styles.rack} accessibilityLabel="Choose a narrator">
                {PRESSED.filter((n) => matches(n.name)).map((n) => {
                  const st = pressedState(n.id);
                  return (
                    <Pressable
                      key={n.id}
                      onPress={() => {
                        if (!st.pressed) return;
                        setNarrator(n.id);
                        onClose();
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: st.here, disabled: !st.pressed }}
                      aria-disabled={!st.pressed || undefined}
                      accessibilityLabel={n.name}
                      accessibilityHint={n.note}
                      style={styles.pick}
                    >
                      <View>
                        <Face hue={n.hue} portrait={n.portrait} name={n.name} size={76} dim={!st.pressed} />
                        {/* .rr-lr-nar-badge — a tick on the platter, a lock when shut */}
                        {st.here || !st.pressed ? (
                          <View style={[styles.badge, { backgroundColor: night ? "#1D2537" : "#FFFEFC", borderColor: ink(0.28) }]}>
                            <Glyph d={st.here ? IC_TICK : IC_LOCK} color={st.here ? "#7E2D1F" : inkMuted} size={11} />
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.pickName, { color: inkBody }]}>{n.name}</Text>
                      <Text style={[styles.pickNote, { color: inkMuted }]}>{st.line}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {offerLive ? (
                <View style={styles.rack} accessibilityLabel="More featured readers">
                  {featuredLive
                    .filter((n) => matches(n.name) && (!lang || n.language === lang))
                    .map((n) => {
                      const shut = voiceLocked(n.id);
                      return (
                        <Pressable
                          key={n.id}
                          disabled={shut}
                          aria-disabled={shut || undefined}
                          accessibilityRole="button"
                          accessibilityLabel={n.name}
                          style={styles.pick}
                        >
                          <Face hue={n.hue} portrait={n.portrait} name={n.name} size={76} dim={shut} />
                          <Text style={[styles.pickName, { color: inkBody }]}>{n.name}</Text>
                          <Text style={[styles.pickNote, { color: inkMuted }]}>
                            {shut ? "sign up to listen" : n.line.split(" · ").slice(2).join(", ") || "reads this book"}
                          </Text>
                        </Pressable>
                      );
                    })}
                </View>
              ) : null}
            </>
          ) : null}

          {/* .rr-lr-cv — the clone card. A guest is offered the door. */}
          <View style={[styles.cv, { borderColor: ink(0.6) }]}>
            <View style={[styles.cvDisc, { borderColor: ink(0.6) }]}>
              <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                <Path d="M8 1.5a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-5 0V4A2.5 2.5 0 0 1 8 1.5ZM3.5 8a4.5 4.5 0 0 0 9 0M8 12.5v2" stroke={inkBody} strokeWidth={1.4} strokeLinecap="round" />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cvTitle, { color: inkBody }]}>Clone your voice</Text>
              <Text style={[styles.cvLine, { color: inkMuted }]}>
                read aloud for twenty seconds and hear this book in your own voice.
              </Text>
            </View>
          </View>

          {/* EVERY OTHER READER, by language */}
          {offerLive ? (
            <>
              <Text style={[styles.lab, { color: inkLab }]}>Read it in another voice</Text>
              <Text style={[styles.livesay, { color: inkMuted }]}>
                These readers are not pressed. Pick one and they begin reading this chapter to you
                straight away, and it is kept for next time.
              </Text>
              {groups
                .filter((g) => !lang || g.code === lang)
                .map((g) => {
                  const rows = g.readers.filter((n) => matches(n.name));
                  if (!rows.length) return null;
                  const folded = !unfolded.has(g.code) && !needle;
                  const shown = folded ? rows.slice(0, LIVE_CAP) : rows;
                  const rest = rows.length - shown.length;
                  return (
                    <View key={g.code}>
                      <Text style={[styles.tongue, { color: inkLab, borderBottomColor: ink(0.12) }]}>{g.label}</Text>
                      {shown.map((n) => {
                        const shut = voiceLocked(n.id);
                        return (
                          <Pressable
                            key={n.id}
                            disabled={shut}
                            aria-disabled={shut || undefined}
                            accessibilityRole="button"
                            accessibilityLabel={n.name}
                            style={[styles.row, { borderBottomColor: ink(0.1) }]}
                          >
                            <Face hue={n.hue} portrait={n.portrait} name={n.name} size={34} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={[styles.rowName, { color: inkBody }]} numberOfLines={1}>
                                {n.name}
                              </Text>
                              <Text style={[styles.rowLine, { color: inkMuted }]} numberOfLines={1}>
                                {n.line || n.note}
                              </Text>
                            </View>
                            <Text style={[styles.tag, { color: inkMuted }]}>{liveTag(n.id)}</Text>
                          </Pressable>
                        );
                      })}
                      {rest > 0 ? (
                        <Pressable
                          onPress={() => setUnfolded((s) => new Set(s).add(g.code))}
                          accessibilityRole="button"
                          style={styles.more}
                        >
                          <Text style={[styles.moreText, { color: inkLab }]}>
                            {`Show ${rest} more ${g.label} ${rest === 1 ? "reader" : "readers"}`}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
            </>
          ) : null}

          {!anyMatch ? <Text style={[styles.none, { color: inkMuted }]}>no reader by that name.</Text> : null}
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </>
  );
}

/* -------------------------------------------------------------- styles --- */

const styles = StyleSheet.create({
  // .rr-lr-dscrim{background:rgba(11,10,8,.28)}
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(11,10,8,.28)" },
  // ≤900px: a bottom sheet over the dimmed stage — rising from the console
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    shadowColor: "#362A1C",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
    elevation: 8,
  },
  sheetDay: { backgroundColor: "#FFFEFC" },
  sheetNight: { backgroundColor: "#1D2537" },
  // .rr-lr-sheet-grab — the pill, 36×4, centred
  grab: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  grabBar: { width: 36, height: 4, borderRadius: 2 },
  scroll: { flexGrow: 0, paddingHorizontal: 20 },
  // .rr-lr-vc-filters{display:flex;gap:10px;align-items:center}
  filters: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 8, paddingBottom: 10 },
  // .rr-lr-vc-find — the ringed search field
  find: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40, paddingHorizontal: 14, borderWidth: 1, borderRadius: 999 },
  findIn: { flex: 1, fontFamily: FONTS.sans, fontSize: 14, paddingVertical: 8 },
  // .rr-lr-vc-chip — the language chip
  chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: 14, borderWidth: 1, borderRadius: 999 },
  chipText: { fontFamily: FONTS.sansSemi, fontSize: 13 },
  langMenu: { position: "absolute", top: 44, right: 0, minWidth: 200, borderWidth: 1, borderRadius: 8, zIndex: 10, paddingVertical: 6 },
  langOpt: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 9, paddingHorizontal: 14 },
  langOptText: { fontFamily: FONTS.sans, fontSize: 13.5 },
  langOptCount: { fontFamily: FONTS.sansSemi, fontSize: 11, marginLeft: 12 },
  one: { fontFamily: FONTS.serifItalicLight, fontSize: 15, textAlign: "center", paddingVertical: 8 },
  // .rr-lr-vc-lab — 700 9.5px .22em uppercase
  lab: { fontFamily: FONTS.sansBold, fontSize: 9.5, letterSpacing: em(9.5, 0.22), textTransform: "uppercase", paddingTop: 12, paddingBottom: 4 },
  // .rr-lr-nar — the rack of discs, three across on a phone
  rack: { flexDirection: "row", flexWrap: "wrap", paddingTop: 6, paddingBottom: 6 },
  // .rr-lr-nar-pick{padding:10px 4px 8px;gap:8px}
  pick: { width: "33.333%", alignItems: "center", gap: 8, paddingTop: 10, paddingBottom: 8, paddingHorizontal: 4 },
  // .rr-lr-nar-badge — bottom right of the disc
  badge: { position: "absolute", right: 0, bottom: 0, width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pickName: { marginTop: 2, fontFamily: FONTS.serif, fontSize: 16, textAlign: "center" },
  // the one-line state under the name is Manrope
  pickNote: { fontFamily: FONTS.sans, fontSize: 10.5, lineHeight: 16.3, letterSpacing: em(10.5, 0.015), textAlign: "center" },
  // .rr-lr-cv — the clone card, a ringed row
  cv: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, padding: 14, borderWidth: 1.5, borderRadius: 14 },
  cvDisc: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  cvTitle: { fontFamily: FONTS.serif, fontSize: 17 },
  cvLine: { fontFamily: FONTS.sans, fontSize: 11.5, lineHeight: 16.5 },
  livesay: { fontFamily: FONTS.sans, fontSize: 12, lineHeight: 17.390625, paddingBottom: 6 },
  // .rr-lr-vc-tongue — the language heading over its rows
  tongue: { fontFamily: FONTS.serifMedium, fontSize: 15, paddingTop: 12, paddingBottom: 6, borderBottomWidth: 1 },
  // .rr-lr-vc-row — face, name and line, the tag at the right
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  rowName: { fontFamily: FONTS.serif, fontSize: 16 },
  rowLine: { fontFamily: FONTS.sans, fontSize: 11, lineHeight: 15.5 },
  tag: { fontFamily: FONTS.sansSemi, fontSize: 10, letterSpacing: em(10, 0.04) },
  more: { paddingVertical: 10 },
  moreText: { fontFamily: FONTS.sansSemi, fontSize: 12, textDecorationLine: "underline" },
  none: { fontFamily: FONTS.serifItalicLight, fontSize: 15, textAlign: "center", paddingVertical: 16 },
});
