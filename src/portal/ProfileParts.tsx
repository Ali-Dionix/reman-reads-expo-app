// The particulars' controls — `.rr-pf-*` from app/data/accountProfilePage.ts.
//
// Every dial on that page is one of four things, and they are transcribed here
// once each: a LEAF (a white sheet with a numbered heading), a FIELD, a CHIP
// row ("pick a stop"), and a SWITCH row ("on or off"). The page's own rule —
// nothing has a Save button; every control writes the moment it changes — is
// carried over: these components take a value and an onChange, never a form.

import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useInk, em } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { FONTS } from "../theme/type";

/* ----------------------------------------------------------------- leaf --- */

/** `.rr-pf-leaf` — ≤560px: padding 18px 16px 16px. */
export function Leaf({
  numeral,
  title,
  hint,
  danger,
  children,
}: {
  numeral: string;
  title: string;
  hint?: string;
  /** `.rr-pf-out` — the last leaf, ruled in red ink. */
  danger?: boolean;
  children?: ReactNode;
}) {
  const { ink } = useInk();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.leaf,
        {
          backgroundColor: colors.white,
          borderColor: danger ? "rgba(126,45,31,.3)" : ink(0.12),
        },
      ]}
    >
      <Text style={[styles.leafH, { color: colors.ink2 }]}>
        <Text style={[styles.leafNum, { color: danger ? colors.brick : colors.brass }]}>
          {numeral}{" "}
        </Text>
        {title}
      </Text>
      {hint ? <Text style={[styles.hint, { color: ink(0.55) }]}>{hint}</Text> : null}
      {children}
    </View>
  );
}

/** `.rr-pf-clbl` used as a sub-heading inside a leaf. */
export function LeafLabel({ children, style }: { children: ReactNode; style?: object }) {
  const { colors } = useTheme();
  return <Text style={[styles.clbl, { color: colors.gold2 }, style]}>{children}</Text>;
}

/* ---------------------------------------------------------------- field --- */

/** `.rr-pf-f` + `.rr-pf-in`. `readOnly` takes the dashed, transparent variant. */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  readOnly,
  error,
  ...rest
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  error?: string;
} & Omit<React.ComponentProps<typeof TextInput>, "style" | "value" | "onChangeText">) {
  const { ink } = useInk();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.f}>
      <Text style={[styles.fLabel, { color: colors.gold2 }]}>{label}</Text>
      <TextInput
        {...rest}
        value={value}
        onChangeText={onChangeText}
        editable={!readOnly}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={ink(0.38)}
        selectionColor={colors.brass}
        style={[
          styles.in,
          readOnly
            ? {
                backgroundColor: "transparent",
                borderStyle: "dashed",
                borderColor: ink(0.22),
                color: ink(0.55),
              }
            : {
                backgroundColor: colors.cream6,
                borderColor: error
                  ? "rgba(126,45,31,.7)"
                  : focused
                    ? ink(0.6)
                    : ink(0.22),
                color: colors.ink2,
              },
        ]}
      />
      {error ? (
        <Text style={[styles.bad, { color: colors.brick }]}>{error}</Text>
      ) : null}
    </View>
  );
}

/* ----------------------------------------------------------------- chip --- */

export type Stop = { value: string | number; label: string; note?: string };

/** `.rr-pf-chips` — pick one stop on a dial. */
export function ChipRow({
  stops,
  value,
  onPick,
  label,
}: {
  stops: Stop[];
  value: string | number | null;
  onPick: (v: string | number) => void;
  label: string;
}) {
  const { ink } = useInk();
  const { colors } = useTheme();

  return (
    <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {stops.map((s) => {
        const on = value === s.value;
        return (
          <Pressable
            key={String(s.value)}
            onPress={() => onPick(s.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[
              styles.chip,
              on
                ? { backgroundColor: colors.ink, borderColor: colors.ink }
                : { borderColor: ink(0.25) },
            ]}
          >
            <Text style={[styles.chipText, { color: on ? colors.paper : ink(0.7) }]}>
              {s.label}
            </Text>
            {s.note ? (
              <Text
                style={[styles.chipNote, { color: on ? colors.paper : ink(0.7) }]}
                numberOfLines={2}
              >
                {s.note}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/* --------------------------------------------------------------- switch --- */

/** `.rr-pf-sw-row` — the switch, and copy saying what turning it off stops. */
export function SwitchRow({
  on,
  onToggle,
  title,
  note,
  first,
  /** `.rr-pf-locked` — a pill instead of a switch, for what cannot be turned off. */
  locked,
}: {
  on?: boolean;
  onToggle?: () => void;
  title: string;
  note: string;
  first?: boolean;
  locked?: string;
}) {
  const { ink } = useInk();
  const { colors } = useTheme();

  return (
    <View style={[styles.swRow, !first && { borderTopColor: ink(0.09), borderTopWidth: 1 }]}>
      {locked ? (
        <View style={[styles.locked, { borderColor: ink(0.25) }]}>
          <Text style={[styles.lockedText, { color: ink(0.5) }]}>{locked}</Text>
        </View>
      ) : (
        <Pressable
          onPress={onToggle}
          accessibilityRole="switch"
          accessibilityState={{ checked: !!on }}
          accessibilityLabel={title}
          style={[
            styles.sw,
            on
              ? { backgroundColor: colors.ink, borderColor: colors.ink }
              : { backgroundColor: colors.cream6, borderColor: ink(0.35) },
          ]}
        >
          <View
            style={[
              styles.swKnob,
              {
                backgroundColor: on ? colors.paper : ink(0.45),
                transform: [{ translateX: on ? 18 : 0 }],
              },
            ]}
          />
        </Pressable>
      )}

      <View style={styles.swCopy}>
        <Text style={[styles.swB, { color: colors.ink2 }]}>{title}</Text>
        <Text style={[styles.swEm, { color: ink(0.58) }]}>{note}</Text>
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- misc --- */

/** `.rr-pf-mini` — a quiet inline action inside a leaf. */
export function Mini({
  children,
  onPress,
  danger,
  disabled,
}: {
  children: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const { ink } = useInk();
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.mini,
        {
          borderColor: danger
            ? "rgba(126,45,31,.45)"
            : ink(pressed ? 0.6 : 0.3),
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Text style={[styles.miniText, { color: danger ? colors.brick : colors.ink2 }]}>
        {children}
      </Text>
    </Pressable>
  );
}

/** `.rr-pf-danger` — a dashed red box inside the last leaf. */
export function Danger({ title, children }: { title: string; children?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.danger}>
      <Text style={[styles.dangerH, { color: colors.brick }]}>{title}</Text>
      {children}
    </View>
  );
}

/** `.rr-pf-hint`. */
export function Hint({ children, style }: { children: ReactNode; style?: object }) {
  const { ink } = useInk();
  return <Text style={[styles.hint, { color: ink(0.55) }, style]}>{children}</Text>;
}

/** `.rr-pf-act` — a row of actions. */
export function Act({ children }: { children: ReactNode }) {
  return <View style={styles.act}>{children}</View>;
}

const styles = StyleSheet.create({
  leaf: {
    borderWidth: 1,
    borderRadius: 16,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginBottom: 16,
  },
  leafH: { fontFamily: FONTS.serif, fontSize: 20, lineHeight: 24, marginBottom: 4 },
  leafNum: { fontFamily: FONTS.serifItalic, fontSize: 14 },
  clbl: {
    fontFamily: FONTS.sansBold,
    fontSize: 8.5,
    letterSpacing: em(8.5, 0.18),
    textTransform: "uppercase",
  },
  hint: { fontFamily: FONTS.sans, fontSize: 12.5, lineHeight: 20 },

  f: { gap: 7, marginTop: 16 },
  fLabel: {
    fontFamily: FONTS.sansBold,
    fontSize: 8.5,
    letterSpacing: em(8.5, 0.18),
    textTransform: "uppercase",
  },
  in: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontFamily: FONTS.sansSemi,
    fontSize: 14.5,
  },
  bad: { fontFamily: FONTS.sansSemi, fontSize: 11.5, minHeight: 15 },

  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 14 },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 999,
    maxWidth: "100%",
  },
  chipText: { fontFamily: FONTS.sansSemi, fontSize: 13 },
  chipNote: { fontFamily: FONTS.sansSemi, fontSize: 10, opacity: 0.7, marginTop: 1 },

  swRow: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingVertical: 14 },
  sw: {
    width: 44,
    height: 26,
    borderWidth: 1.5,
    borderRadius: 999,
    marginTop: 2,
    justifyContent: "center",
  },
  swKnob: { width: 16, height: 16, borderRadius: 8, marginHorizontal: 3 },
  swCopy: { flex: 1, gap: 3, minWidth: 0 },
  swB: { fontFamily: FONTS.sansSemi, fontSize: 14 },
  swEm: { fontFamily: FONTS.sans, fontSize: 12.5, lineHeight: 19.4 },
  locked: {
    height: 26,
    marginTop: 2,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 999,
  },
  lockedText: {
    fontFamily: FONTS.sansBold,
    fontSize: 8.5,
    letterSpacing: em(8.5, 0.14),
    textTransform: "uppercase",
  },

  act: { flexDirection: "row", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 16 },
  mini: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderWidth: 1,
    borderRadius: 999,
  },
  miniText: {
    fontFamily: FONTS.sansBold,
    fontSize: 10.5,
    letterSpacing: em(10.5, 0.08),
    textTransform: "uppercase",
  },

  danger: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(126,45,31,.45)",
    borderRadius: 14,
  },
  dangerH: { fontFamily: FONTS.serif, fontSize: 17, lineHeight: 20, marginBottom: 5 },
});
