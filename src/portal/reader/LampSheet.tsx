// The sleep timer's sheet — `[data-rr-lr-lamp-menu]`, `.rr-lr-menu.rr-lr-sheet`
// with `.rr-lr-sheet-grab`, `.rr-lr-sheet-in`, `.rr-lr-menu-h`,
// `.rr-lr-menu-row` (`[data-rr-lr-lamp-set]`, `[data-rr-lr-lamp-add]`,
// `[data-rr-lr-lamp-off]`), `.rr-lr-lamp-line`, `.rr-lr-menu-foot`.
//
// Site: app/data/accountListeningPage.ts (markup and rules at the ≤620px
// branch); behaviour in app/components/ListeningEnhancer.tsx — paintLamp,
// setSleep, extendSleep — and the stage lamp that dims as the timer runs
// down (`.rr-lr-reader[data-lamp="75|50|30"] .rr-lr-lamp`).
//
// THE PHONE CONSOLE HAS NO OPENER for this sheet on the site: the lamp's
// button left the console when it became five slots, and the sheet is
// reached by the keyboard (T) — see the "toggleMenu('lamp')" handlers. The
// frame keeps the sheet in its `sheet` state so a room may open it; nothing
// on the console does yet.
//
// The timer itself — pausing playback when it lands, and the lamp dimming
// through 75/50/30 — is the frame's (`lamp` state) and still a TODO: this
// sheet only sets and clears the request.

import { Pressable, StyleSheet, Text, View } from "react-native";

import { useInk, em } from "../../theme/ink";
import { FONTS } from "../../theme/type";

/** What the reader asked for: the end of this chapter, or minutes from now. */
export type Lamp = { kind: "band" } | { kind: "at"; endsAt: number } | null;

const MINUTES = [15, 30, 45, 60];

/** paintLamp's line: "pauses at the end of this chapter" / "pauses in 14 min". */
const lampLine = (lamp: Lamp): string => {
  if (!lamp) return " ";
  if (lamp.kind === "band") return "pauses at the end of this chapter";
  const left = Math.max(0, Math.round((lamp.endsAt - Date.now()) / 60000));
  return `pauses in ${left} min`;
};

export function LampSheet({
  open,
  onClose,
  night,
  lamp,
  setLamp,
  bottom,
  maxHeight,
}: {
  open: boolean;
  onClose: () => void;
  night: boolean;
  lamp: Lamp;
  setLamp: (next: Lamp) => void;
  bottom: number;
  maxHeight: number;
}) {
  const { ink } = useInk();
  if (!open) return null;

  const inkHead = night ? "#F4EBD6" : "#0B0A08";
  const inkBody = night ? "#F4EBD6" : "#171411";
  const inkMuted = night ? "rgba(240,229,207,.62)" : "rgba(11,10,8,.6)";

  const Row = ({ label, note, onPress }: { label: string; note?: string; onPress: () => void }) => (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.row, { borderBottomColor: ink(0.1) }]}>
      <Text style={[styles.rowLabel, { color: inkBody }]}>{label}</Text>
      {note ? <Text style={[styles.rowNote, { color: inkMuted }]}>{note}</Text> : null}
    </Pressable>
  );

  return (
    <>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View
        style={[styles.sheet, night ? styles.sheetNight : styles.sheetDay, { bottom, maxHeight }]}
        accessibilityLabel="Sleep timer"
      >
        <Pressable onPress={onClose} style={styles.grab} accessibilityRole="button" accessibilityLabel="Close">
          <View style={[styles.grabBar, { backgroundColor: ink(0.28) }]} />
        </Pressable>

        {/* .rr-lr-menu-h — the card's own head, ruled under */}
        <Text style={[styles.menuH, { color: inkHead, borderBottomColor: night ? "rgba(201,166,98,.35)" : "rgba(110,86,58,.3)" }]}>
          Sleep timer
        </Text>

        {!lamp ? (
          <View>
            <Row
              label="at the end of this chapter"
              note="whichever one is playing then"
              onPress={() => {
                setLamp({ kind: "band" });
                onClose();
              }}
            />
            {MINUTES.map((m) => (
              <Row
                key={m}
                label={`in ${m} minutes`}
                onPress={() => {
                  setLamp({ kind: "at", endsAt: Date.now() + m * 60000 });
                  onClose();
                }}
              />
            ))}
          </View>
        ) : (
          <View>
            <Text style={[styles.lampLine, { color: inkHead }]}>{lampLine(lamp)}</Text>
            <Row
              label="+15 minutes"
              onPress={() =>
                setLamp(
                  lamp.kind === "at"
                    ? { kind: "at", endsAt: lamp.endsAt + 15 * 60000 }
                    : { kind: "at", endsAt: Date.now() + 15 * 60000 },
                )
              }
            />
            <Row
              label="Turn the timer off"
              onPress={() => {
                setLamp(null);
                onClose();
              }}
            />
          </View>
        )}

        {/* .rr-lr-menu-foot */}
        <Text style={[styles.foot, { color: inkMuted }]}>playback pauses; your place is kept.</Text>
      </View>
    </>
  );
}

/* -------------------------------------------------------------- styles --- */

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(11,10,8,.28)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingHorizontal: 20,
    paddingBottom: 24,
    shadowColor: "#362A1C",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
    elevation: 8,
  },
  sheetDay: { backgroundColor: "#FFFEFC" },
  sheetNight: { backgroundColor: "#1D2537" },
  grab: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  grabBar: { width: 36, height: 4, borderRadius: 2 },
  // .rr-lr-menu-h — the card's own head, ruled under
  menuH: {
    fontFamily: FONTS.serifMedium,
    fontSize: 14.5,
    letterSpacing: em(14.5, 0.16),
    fontVariant: ["small-caps"],
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  // .rr-lr-menu-row — a full-width row, the note in italics beside it
  row: { paddingVertical: 12, borderBottomWidth: 1, flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  rowLabel: { fontFamily: FONTS.serif, fontSize: 16 },
  rowNote: { fontFamily: FONTS.serifItalicLight, fontSize: 13.5 },
  // .rr-lr-lamp-line — Cormorant 19px, tabular
  lampLine: { fontFamily: FONTS.serifRegular, fontSize: 19, fontVariant: ["tabular-nums"], paddingTop: 10, paddingBottom: 4 },
  foot: { fontFamily: FONTS.sans, fontSize: 11.5, lineHeight: 16.5, paddingTop: 12 },
});
