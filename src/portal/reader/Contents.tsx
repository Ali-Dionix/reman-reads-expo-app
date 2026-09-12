// The contents drawer — `[data-rr-lr-drawer]`, `.rr-lr-drawer` with
// `.rr-lr-drawer-tabs` (`.rr-lr-dtab` × 2, `.rr-lr-drawer-x`),
// `.rr-lr-drawer-pane` × 2, the chapters `.rr-lr-toc` (`.rr-lr-band-go`,
// `.rr-lr-go-row` — the numeral `i`, the label `b`, the dotted
// `.rr-lr-go-lead`, `.rr-lr-go-time` — `.rr-lr-go-needle`, `.rr-lr-go-here`)
// and the bookmarks pane (`.rr-lr-slips`, `.rr-lr-slips-empty`), under the
// scrim `.rr-lr-dscrim`.
//
// Site: app/data/accountListeningPage.ts — drawerBandsHtml and the drawer's
// rules at the ≤900px branch (a bottom sheet rising from the console,
// `bottom:calc(100% + 6px)`, left/right 8, capped at 70vh, the torn card's
// slight anticlockwise set); behaviour in app/components/ListeningEnhancer.tsx
// — openDrawer / shutDrawer / paintDrawer, the [data-rr-lr-band-go] handler,
// markPlayingLeaf, and the slips pane (paintSlips).
//
// TWO TABS, because the site has two: "Chapters" and "Bookmarks". The
// bookmarks pane holds the site's own empty line — a slip is pressed by the
// console's slip button, which the app's console does not carry yet, so the
// pane can only ever be empty for now.
//
// A chapter row PLAYS that chapter (the site's band-go); a guest is refused
// by the deck and told why on the console, but the leaf still turns to the
// chapter, because a guest may read the contents.

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { chaptersOf, mmss, useDeck, type Recording } from "../../lib/audioStore";
import { useInk, em } from "../../theme/ink";
import { FONTS } from "../../theme/type";

/** roman() — the drawer's numerals. */
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
const roman = (i: number): string => {
  if (ROMAN[i]) return ROMAN[i];
  // past the table: the tens and units, enough for any book on the shelf
  const tens = ["", "X", "XX", "XXX", "XL", "L"];
  const n = i + 1;
  return `${tens[Math.floor(n / 10)] ?? ""}${["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"][n % 10]}`;
};

export type Pane = "bands" | "slips";

export function Contents({
  open,
  pane,
  onPane,
  onClose,
  recording,
  night,
  onBand,
  bottom,
  maxHeight,
}: {
  open: boolean;
  pane: Pane;
  onPane: (pane: Pane) => void;
  onClose: () => void;
  recording: Recording;
  night: boolean;
  /** A chapter row was tapped — the frame cues it and turns the leaf. */
  onBand: (band: number) => void;
  bottom: number;
  maxHeight: number;
}) {
  const { ink } = useInk();
  const { now, playing, voice } = useDeck();
  if (!open) return null;

  const here = now?.slug === recording.slug;
  const band = here ? (now?.band ?? -1) : -1;
  const chapters = chaptersOf(recording, here ? voice : (recording.voiceId ?? null));

  const railInk = night ? "#E8DECB" : "#171411";
  const railMuted = night ? "rgba(232,222,203,.66)" : "rgba(11,10,8,.66)";
  const numeral = night ? "#C9A662" : "#8C6A3F";
  const lit = night ? "#E0B770" : "#7E2D1F";

  return (
    <>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close chapters and bookmarks" />
      <View
        style={[styles.drawer, night ? styles.drawerNight : styles.drawerDay, { bottom, maxHeight }]}
        accessibilityLabel="Chapters and bookmarks"
      >
        {/* .rr-lr-drawer-tabs — Chapters / Bookmarks, and the × */}
        <View style={styles.tabs} accessibilityLabel="Choose chapters or bookmarks">
          {(["bands", "slips"] as const).map((which) => {
            const on = pane === which;
            return (
              <Pressable
                key={which}
                onPress={() => onPane(which)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[styles.dtab, on && { borderBottomColor: night ? "#D2AF69" : "#7E2D1F" }]}
              >
                <Text
                  style={[
                    styles.dtabText,
                    { color: on ? (night ? "#F4EBD6" : "#0B0A08") : night ? "rgba(240,229,207,.7)" : ink(0.55) },
                  ]}
                >
                  {which === "bands" ? "Chapters" : "Bookmarks"}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={onClose}
            style={styles.drawerX}
            accessibilityRole="button"
            accessibilityLabel="Close chapters and bookmarks"
          >
            <Text style={{ fontSize: 15, color: night ? "rgba(240,229,207,.6)" : ink(0.6) }}>×</Text>
          </Pressable>
        </View>

        {pane === "bands" ? (
          <ScrollView style={styles.pane} accessibilityLabel="Chapters">
            {chapters.map((c, i) => {
              const isHere = i === band;
              return (
                <Pressable
                  key={c.n}
                  onPress={() => {
                    onBand(i);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isHere }}
                  style={[styles.row, { borderBottomColor: ink(0.1) }]}
                >
                  <Text style={[styles.num, { color: numeral }]}>{roman(i)}</Text>
                  <Text style={[styles.label, { color: isHere ? lit : railInk }]} numberOfLines={1}>
                    {c.title}
                  </Text>
                  {/* .rr-lr-go-lead — the dotted leader to the time */}
                  <View style={[styles.lead, { borderBottomColor: ink(0.3) }]} />
                  <Text style={[styles.time, { color: railMuted }]}>{mmss(c.duration)}</Text>
                  {isHere && playing ? (
                    <Text style={[styles.here, { color: lit }]}>now playing</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <ScrollView style={styles.pane} accessibilityLabel="Bookmarks">
            {/* the site's own empty line, in the hand */}
            <Text style={[styles.slipsEmpty, { color: night ? "#C4A37A" : "#6E563A" }]}>
              no bookmarks yet. your place is saved automatically, and a bookmark marks a moment you
              want to find again.
            </Text>
          </ScrollView>
        )}
      </View>
    </>
  );
}

/* -------------------------------------------------------------- styles --- */

const styles = StyleSheet.create({
  // .rr-lr-dscrim{background:rgba(11,10,8,.28)}
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(11,10,8,.28)" },
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
  tabs: { flexDirection: "row", alignItems: "center", gap: 2, paddingTop: 19, paddingHorizontal: 20 },
  // .rr-lr-dtab — small caps, ruled under when selected
  dtab: { paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 2, borderBottomColor: "transparent" },
  dtabText: {
    fontFamily: FONTS.serifMedium,
    fontSize: 14.5,
    letterSpacing: em(14.5, 0.16),
    fontVariant: ["small-caps"],
  },
  drawerX: { marginLeft: "auto", paddingVertical: 6, paddingHorizontal: 9 },
  // .rr-lr-drawer-pane{padding:6px 22px 24px}
  pane: { flexGrow: 0, paddingTop: 6, paddingHorizontal: 22, marginBottom: 24 },
  // .rr-lr-go-row — numeral, label, leader, time
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  num: { fontFamily: FONTS.serifItalic, fontSize: 13, minWidth: 22 },
  label: { flexShrink: 1, fontFamily: FONTS.serif, fontSize: 16 },
  lead: { flex: 1, borderBottomWidth: 1, borderStyle: "dotted", height: 1, marginBottom: 4 },
  time: { fontFamily: FONTS.serifRegular, fontSize: 14, fontVariant: ["tabular-nums"] },
  here: { fontFamily: FONTS.sansSemi, fontSize: 9.5, letterSpacing: em(9.5, 0.1), textTransform: "uppercase" },
  // .rr-lr-slips-empty — the hand, at its slight set
  slipsEmpty: {
    marginVertical: 12,
    marginHorizontal: 2,
    fontFamily: FONTS.hand,
    fontSize: 14.5,
    lineHeight: 21.75,
    transform: [{ rotate: "-0.5deg" }],
  },
});
