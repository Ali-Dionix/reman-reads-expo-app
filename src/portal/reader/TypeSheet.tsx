// The text settings sheet — `[data-rr-lr-type-menu]`, `.rr-lr-menu.rr-lr-sheet`
// with `.rr-lr-sheet-grab`, `.rr-lr-sheet-in`, `.rr-lr-menu-h`,
// `.rr-lr-menu-row` (`[data-rr-lr-type-fs="1..5"]`,
// `[data-rr-lr-type-face="serif|sans"]`, `[data-rr-lr-type-lh="1|2|3"]`,
// `[data-rr-lr-type-gild]`, `[data-rr-lr-type-pages]`), `.rr-lr-menu-foot`.
//
// Site: app/data/accountListeningPage.ts (markup and rules at the ≤620px
// branch); behaviour in app/components/ListeningEnhancer.tsx — typePrefs,
// saveTypePrefs / applyTypePrefs, the -type-* handlers.
//
// "this sets the read-along text. the book pages keep their own type." The
// settings dress the REFLOWED galley view, which the app does not stand yet —
// it reads off the rendered pages — so the choices are kept by the frame
// (`TypePrefs`) and applied nowhere until the galley layer lands. The
// pages-per-view row is the codex's `--per`, hidden at one leaf.
//
// THE PHONE CONSOLE HAS NO OPENER for this sheet on the site (keyboard A);
// see LampSheet.tsx for the same note.

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useInk, em } from "../../theme/ink";
import { FONTS } from "../../theme/type";

export type TypePrefs = {
  /** 1–5. */
  fs: 1 | 2 | 3 | 4 | 5;
  face: "serif" | "sans";
  /** 1 tight, 2 normal, 3 loose. */
  lh: 1 | 2 | 3;
  /** Word-by-word highlight. */
  gild: boolean;
  /** Pages per view — the codex's --per; one leaf on a phone. */
  per: 1 | 2;
};

export const TYPE_DEFAULTS: TypePrefs = { fs: 3, face: "serif", lh: 2, gild: true, per: 1 };

export function TypeSheet({
  open,
  onClose,
  night,
  prefs,
  setPrefs,
  bottom,
  maxHeight,
}: {
  open: boolean;
  onClose: () => void;
  night: boolean;
  prefs: TypePrefs;
  setPrefs: (next: TypePrefs) => void;
  bottom: number;
  maxHeight: number;
}) {
  const { ink } = useInk();
  if (!open) return null;

  const inkHead = night ? "#F4EBD6" : "#0B0A08";
  const inkBody = night ? "#F4EBD6" : "#171411";
  const inkMuted = night ? "rgba(240,229,207,.62)" : "rgba(11,10,8,.6)";
  const lit = night ? "#E0B770" : "#7E2D1F";

  const Row = ({
    label,
    note,
    on,
    onPress,
  }: {
    label: string;
    note?: string;
    on?: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      style={[styles.row, { borderBottomColor: ink(0.1) }]}
    >
      <Text style={[styles.rowLabel, { color: on ? lit : inkBody }]}>{label}</Text>
      {note ? <Text style={[styles.rowNote, { color: inkMuted }]}>{note}</Text> : null}
    </Pressable>
  );

  return (
    <>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View
        style={[styles.sheet, night ? styles.sheetNight : styles.sheetDay, { bottom, maxHeight }]}
        accessibilityLabel="Text settings"
      >
        <Pressable onPress={onClose} style={styles.grab} accessibilityRole="button" accessibilityLabel="Close">
          <View style={[styles.grabBar, { backgroundColor: ink(0.28) }]} />
        </Pressable>

        <Text style={[styles.menuH, { color: inkHead, borderBottomColor: night ? "rgba(201,166,98,.35)" : "rgba(110,86,58,.3)" }]}>
          Text settings
        </Text>

        <ScrollView style={{ flexGrow: 0 }}>
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <Row
              key={n}
              label={`Text size ${n}`}
              note={n === 1 ? "smallest" : n === 5 ? "largest" : undefined}
              on={prefs.fs === n}
              onPress={() => setPrefs({ ...prefs, fs: n })}
            />
          ))}
          <Row label="Serif type" on={prefs.face === "serif"} onPress={() => setPrefs({ ...prefs, face: "serif" })} />
          <Row label="Sans-serif type" on={prefs.face === "sans"} onPress={() => setPrefs({ ...prefs, face: "sans" })} />
          <Row label="Tight line spacing" on={prefs.lh === 1} onPress={() => setPrefs({ ...prefs, lh: 1 })} />
          <Row label="Normal line spacing" on={prefs.lh === 2} onPress={() => setPrefs({ ...prefs, lh: 2 })} />
          <Row label="Loose line spacing" on={prefs.lh === 3} onPress={() => setPrefs({ ...prefs, lh: 3 })} />
          <Row
            label="Word-by-word highlight"
            note={prefs.gild ? "on" : "off"}
            onPress={() => setPrefs({ ...prefs, gild: !prefs.gild })}
          />
          {/* [data-rr-lr-type-pages] is hidden on the site's phone view: one
              leaf is all a phone stands, so there is nothing to toggle */}
          <Text style={[styles.foot, { color: inkMuted }]}>
            this sets the read-along text. the book pages keep their own type.
          </Text>
        </ScrollView>
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
  menuH: {
    fontFamily: FONTS.serifMedium,
    fontSize: 14.5,
    letterSpacing: em(14.5, 0.16),
    fontVariant: ["small-caps"],
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  row: { paddingVertical: 12, borderBottomWidth: 1, flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  rowLabel: { fontFamily: FONTS.serif, fontSize: 16 },
  rowNote: { fontFamily: FONTS.serifItalicLight, fontSize: 13.5 },
  foot: { fontFamily: FONTS.sans, fontSize: 11.5, lineHeight: 16.5, paddingTop: 12 },
});
