// The console — `.rr-lr-deck`, the torn tail band of the opened volume.
//
// Site: app/data/accountListeningPage.ts, `<footer class="rr-lr-deck">` in
// readerHtml and its rules (`.rr-lr-groovebox`, `.rr-lr-groove`,
// `.rr-lr-groove-track`, `.rr-lr-groove-hd`, `.rr-lr-groove-row`,
// `.rr-lr-time`, `.rr-lr-deck-line`, `.rr-lr-clock`, `.rr-lr-deck-say`,
// `.rr-lr-deck-ctrl`, `.rr-lr-narbtn`, `.rr-lr-nar-face`, `.rr-lr-jog`,
// `.rr-lr-big`, `.rr-lr-speed`) at the ≤900px / ≤620px / ≤560px branches.
// Behaviour: ListeningEnhancer.tsx paintDeck / paintTimes / paintGroove /
// paintFolio / say / refuseLocked.
//
// THE GROOVE ACROSS THE TOP, its two clocks at either end of the readout
// line under it, the sentence, then ONE ROW OF FIVE: the narrator's label,
// back fifteen, the big key, forward fifteen, the dial. At ≤620px the
// narrator's printed name drops to the bare face (the sheet prints it in
// full) and the dial drops its rpm figure.
//
// The accessible names are the site's own aria-labels, verbatim — the parity
// rig drives both sides by them.

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { Image } from "expo-image";

import { mmss, useDeck, type Recording } from "../../lib/audioStore";
import { useInk, em } from "../../theme/ink";
import { useTheme } from "../../theme/ThemeProvider";
import { FONTS } from "../../theme/type";
import { Jump } from "../Transport";
import narrators from "./narrators.json";

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

export function Console({
  recording,
  night,
  leaf,
  total,
  clockRemaining,
  onClock,
  onOpen,
  onSignUp,
  onLayoutHeight,
  bandPad,
  bottomInset,
}: {
  recording: Recording;
  night: boolean;
  /** The codex's standing leaf and page count — the folio, when pages exist. */
  leaf: number;
  total: number;
  /** The clock button's state: the chapter's length, or the time left. */
  clockRemaining: boolean;
  onClock: () => void;
  /** Open a sheet — the narrator's, the dial's. */
  onOpen: (sheet: Sheet) => void;
  /** The say line's "Sign up to listen." link. */
  onSignUp: () => void;
  onLayoutHeight: (h: number) => void;
  /** padding-inline:clamp(8px,2.6vw,16px), measured by the frame. */
  bandPad: number;
  bottomInset: number;
}) {
  const { ink } = useInk();
  const { colors } = useTheme();
  const {
    now,
    chapter,
    playing,
    position,
    duration,
    loading,
    finished,
    toggle,
    nudge,
    seekTo,
    rate,
    voice,
    say,
  } = useDeck();

  // paintDeck: this book on the platter, or the idle readout
  const here = now?.slug === recording.slug;
  const band = here ? (now?.band ?? 0) : null;
  const chapters = recording.chapters;

  // paintFolio's percent is the WHOLE BOOK'S, measured in audio time (bands
  // already behind you, plus where the needle stands in this one) — not the
  // page count. A book's chapters are not equal lengths, so the two disagree.
  const whole = chapters.reduce((s, c) => s + c.duration, 0);
  const done = chapters.slice(0, band ?? 0).reduce((s, c) => s + c.duration, 0) + (here ? position : 0);
  const pct = whole ? Math.round((done / whole) * 100) : 0;
  const printed = total ? `Page ${leaf + 1} of ${total}` : leftOf(whole - done);

  const cur = here ? position : 0;
  const dur = here ? duration : (chapters[0]?.duration ?? 0);
  const gpct = dur > 0 ? Math.min(1, cur / dur) : 0;

  // who is reading, and the letter their label wears. narrators.ts is the
  // authority; a specimen names no one, so the house answers for it. The
  // pressing in force is the deck's while THIS book sounds, else the house's
  // default for it — the face must not go blank on a volume opened to browse.
  const voiceId = here ? voice : (recording.voiceId ?? null);
  const voices = recording.voices ?? [];
  const nowVoice = voices.find((v) => v.id === voiceId) ?? voices[0] ?? null;
  const face = nowVoice ? PRESSED.get(nowVoice.id) : undefined;
  const voiceInitial =
    nowVoice?.name?.[0]?.toUpperCase() ??
    /^read by\s+(\w)/i.exec(recording.voice)?.[1]?.toUpperCase() ??
    "R";

  const railInk = night ? "#E8DECB" : "#171411";
  // .rr-lr-deck-line em, and its dark override
  const deckEmInk = night ? "rgba(210,175,105,.9)" : "rgba(110,86,58,.95)";
  const timeInk = night ? "rgba(240,229,207,.62)" : ink(0.6);
  const sayInk = night ? "rgba(240,229,207,.55)" : "rgba(11,10,8,.55)";

  // the groove's measured width, for tap-to-seek
  const [grooveW, setGrooveW] = useState(0);
  const grooveAt = (x: number) => {
    if (!grooveW || !dur || !here) return;
    seekTo((x / grooveW) * dur);
  };

  return (
    <View
      style={[styles.deck, { paddingBottom: bottomInset + 9, paddingHorizontal: bandPad }]}
      onLayout={(e) => onLayoutHeight(e.nativeEvent.layout.height)}
      accessibilityLabel="Player controls"
    >
      {/* .rr-lr-groovebox — the groove FIRST, its readout directly beneath */}
      <View style={styles.groovebox}>
        <Pressable
          onPress={(e) => grooveAt(e.nativeEvent.locationX)}
          onLayout={(e) => setGrooveW(e.nativeEvent.layout.width)}
          accessibilityRole="adjustable"
          accessibilityLabel="Seek within this chapter"
          accessibilityValue={{ min: 0, max: Math.round(dur), now: Math.round(cur), text: `${mmss(cur)} of ${mmss(dur)}` }}
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

        {/* .rr-lr-groove-row — the clock, the readout, the clock button */}
        <View style={styles.grooveRow}>
          <Text style={[styles.time, { color: timeInk }]}>{mmss(cur)}</Text>

          {/* .rr-lr-deck-line — the band, "Chapter N of M", and the
              whole-book readout; idle, one compact segment */}
          <View style={styles.deckLine}>
            {band !== null ? (
              <>
                <Text style={[styles.deckBand, { color: night ? "#EADFC6" : "#171411" }]} numberOfLines={1}>
                  {loading ? "Cueing…" : (chapter?.title ?? "")}
                </Text>
                <Text style={[styles.deckEm, { color: deckEmInk }]} numberOfLines={1}>
                  {`Chapter ${ROMAN[band] ?? band + 1} of ${ROMAN[chapters.length - 1] ?? chapters.length}`}
                </Text>
              </>
            ) : (
              <Text style={[styles.deckEm, { color: deckEmInk }]} numberOfLines={1}>
                {finished === recording.slug ? "Finished" : `Not playing · ${chapters.length} chapters`}
              </Text>
            )}
            <Text style={[styles.deckEm, { color: deckEmInk }]} numberOfLines={1}>
              {`${pct}% · ${printed}`}
            </Text>
          </View>

          <Pressable
            onPress={onClock}
            accessibilityRole="button"
            accessibilityLabel="Chapter length, tap to show time left"
            style={styles.clock}
          >
            <Text style={[styles.time, { color: timeInk }]}>
              {clockRemaining ? `−${mmss(Math.max(0, dur - cur))}` : `/ ${mmss(dur)}`}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* .rr-lr-deck-say — the sentence; brick and 600 when it is a refusal */}
      {say ? (
        <Text style={[styles.say, { color: say.bad ? "#7E2D1F" : sayInk }, say.bad && styles.sayBad]}>
          {say.text}{" "}
          <Text onPress={onSignUp} accessibilityRole="link" style={styles.sayLink}>
            Sign up to listen.
          </Text>
        </Text>
      ) : null}

      {/* .rr-lr-deck-ctrl — the five slots, in the site's order */}
      <View style={styles.deckCtrl}>
        {/* THE VOICE. The disc is the button: it wears the reader's face (or
            initial in their own label hue) and opens the narrator sheet. */}
        <Pressable
          onPress={() => onOpen("voice")}
          style={styles.narBtn}
          accessibilityRole="button"
          accessibilityLabel="Narrator, choose who reads it"
        >
          <View style={[styles.narFace, { backgroundColor: nowVoice?.hue ?? "#7E2D1F" }]}>
            {face?.portrait ? (
              <Image source={{ uri: face.portrait }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <Text style={styles.narInitial}>{voiceInitial}</Text>
            )}
          </View>
        </Pressable>

        {/* ≤520px: 42px circles carrying the circular-arrow 15s */}
        <Pressable
          onPress={() => nudge(-15)}
          style={[styles.jog, { borderColor: ink(0.22) }]}
          accessibilityRole="button"
          accessibilityLabel="Back fifteen seconds"
        >
          <Jump back color={railInk} />
        </Pressable>

        {/* .rr-lr-big — ink by day; at night the token itself turns the
            platter cream. 46px at this width. */}
        <Pressable
          onPress={toggle}
          style={[styles.big, { backgroundColor: colors.ink }]}
          accessibilityRole="button"
          accessibilityLabel="Play or pause"
          accessibilityState={{ selected: playing }}
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
          accessibilityRole="button"
          accessibilityLabel="Forward fifteen seconds"
        >
          <Jump color={railInk} />
        </Pressable>

        {/* the dial — .rr-lr-speed, the rpm figure hidden at this width;
            it opens the playback-speed sheet */}
        <Pressable
          onPress={() => onOpen("speed")}
          style={[styles.speed, { borderColor: ink(0.26) }]}
          accessibilityRole="button"
          accessibilityLabel="Playback speed"
        >
          <Text style={[styles.speedText, { color: railInk }]}>
            {`${rate}`.replace(/^0\./, ".")}×
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------- styles --- */

const styles = StyleSheet.create({
  // ≤900px: .rr-lr-deck{gap:6px 7px;padding:12px clamp(8px,2.6vw,16px)
  // calc(9px + safe-area)}; ≤520px narrows the column gap to 4px
  deck: { paddingTop: 12, gap: 6 },
  groovebox: { gap: 2 },
  // .rr-lr-deck-ctrl — the five slots, centred, gap 4 at ≤620
  deckCtrl: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
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
  // .rr-lr-narbtn{padding:5px 3px} inside a .rr-lr-tool's 40px floor
  narBtn: { minHeight: 40, paddingVertical: 5, paddingHorizontal: 3, alignItems: "center", justifyContent: "center" },
  // .rr-lr-nar-face — the narrator's hue, the portrait or the initial in cream
  narFace: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  // .rr-lr-clock{padding:4px 2px}
  clock: { paddingVertical: 4, paddingHorizontal: 2 },
  // the 28px hit strip is TRANSPARENT; the 6px pill inside is the track
  groove: { height: 28, justifyContent: "center" },
  grooveTrack: { height: 6, borderRadius: 999, overflow: "hidden" },
  grooveFill: { position: "absolute", left: 0, top: 0, bottom: 0 },
  grooveHd: { position: "absolute", top: 7, width: 14, height: 14, marginLeft: -7, borderRadius: 7, borderWidth: 1 },
  // .rr-lr-deck-line{display:flex;align-items:baseline;justify-content:center;gap:9px}
  deckLine: { flex: 1, flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 9 },
  deckBand: { fontFamily: FONTS.serif, fontSize: 14, maxWidth: 220 },
  deckEm: { fontFamily: FONTS.sansSemi, fontSize: 10.5, letterSpacing: em(10.5, 0.04), fontVariant: ["tabular-nums"] },
  // .rr-lr-deck-say{text-align:center;font:400 12px/1.45 'Manrope';color:rgba(11,10,8,.55)}
  say: { textAlign: "center", fontFamily: FONTS.sans, fontSize: 12, lineHeight: 17.390625 },
  // .rr-lr-deck-say.is-bad{font-weight:600;color:#7E2D1F}
  sayBad: { fontFamily: FONTS.sansSemi },
  // .rr-lr-deck-say a{font-weight:600;text-decoration:underline;text-underline-offset:2px}
  sayLink: { fontFamily: FONTS.sansSemi, textDecorationLine: "underline" },
});
