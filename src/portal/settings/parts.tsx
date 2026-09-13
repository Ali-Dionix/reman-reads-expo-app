// The settings page's own controls — accountSettingsPage.ts's `.rr-pf-*`
// rules, at their phone values, on the kit's primitives.
//
// Everything here is a transcription of one CSS class, named for it. The kit
// (src/ui, src/portal/KIT.md) draws the group, the row, the switch, the disc
// and the rule, and the fold (a row whose rule comes after its well, with a
// chevron that turns when open — <Fold> in src/ui/Rows.tsx); this file draws
// what the settings page adds on top: the well, the chips, the fields, the
// ink press, the hint, the locked pill, the quiet link. Colours are roles
// from useTheme() / useInk(); type goes through <Txt>. No hex literal anywhere.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";

import { GROUP_LABELS, countryGroups, countryName } from "./countries";
import { useInk } from "../../theme/ink";
import { useTheme } from "../../theme/ThemeProvider";
import { face } from "../../theme/type";
import { Rule } from "../../ui/Rule";
import { Txt } from "../../ui/Type";
import { fillProps, strokeProps } from "../../ui/svgPaint";

/** `.rr-pf-well{padding:4px 2px 22px}` — where a fold's controls sit. */
export function Well({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ paddingTop: 4, paddingHorizontal: 2, paddingBottom: 22 }, style]}>{children}</View>;
}

/* ---------------------------------------------------------------- the act --- */

/** `.rr-pf-act{display:flex;flex-wrap:wrap;gap:11px;margin-top:16px}` */
export function Act({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 11, marginTop: 16 }, style]}>
      {children}
    </View>
  );
}

/**
 * `.rr-pf-mini` — the ink press: padding 11px 17px, ink fill and ring, paper
 * glyphs at 700 10px .08em uppercase, a hard 3px 3px 0 brass shadow at .38
 * (a box-shadow, never mapped on the web — so a constant here too).
 * `[disabled]` is .45 with no shadow.
 *
 * `twoTap` is ProfileEnhancer's confirm-by-tapping-again: the label reads
 * "Certain? Tap again." and only the second press goes through. THE ARMED
 * STATE IS THE SCREEN'S, not the button's — the site keeps ONE armed element
 * and arming a second disarms the first (two presses both reading "Certain?"
 * is the thing it avoids, and one of them signs out every device). So the
 * button is told `armed` and asks to be armed with `onArm`; see
 * useTwoTap() below for the screen's half.
 */
export function MiniButton({
  label,
  onPress,
  disabled = false,
  twoTap,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** From useTwoTap(key). Omit for a press that needs no confirming. */
  twoTap?: { armed: boolean; arm: () => void; fire: () => void };
}) {
  const { colors } = useTheme();
  const armed = !!twoTap?.armed;
  const press = () => {
    if (!twoTap) return onPress();
    if (twoTap.armed) {
      twoTap.fire();
      return onPress();
    }
    twoTap.arm();
  };
  return (
    <Pressable
      onPress={press}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      {!disabled ? (
        <View
          style={{
            pointerEvents: "none",
            position: "absolute",
            left: 3,
            top: 3,
            right: -3,
            bottom: -3,
            backgroundColor: "rgba(155,122,77,.38)",
          }}
        />
      ) : null}
      <View
        style={{
          paddingVertical: 11,
          paddingHorizontal: 17,
          backgroundColor: colors.ink,
          borderWidth: 1,
          borderColor: colors.ink,
        }}
      >
        <Txt weight={700} size={10} ls={0.08} upper color="paper">
          {armed ? "Certain? Tap again." : label}
        </Txt>
      </View>
    </Pressable>
  );
}

/**
 * The screen's half of twoTap: one armed key and one 4.5s timer for the whole
 * page. `twoTap(key)` hands a MiniButton its three verbs; arming any key
 * replaces the one before it, as the site's `disarm()` inside `twoTap()` does.
 */
export function useTwoTap() {
  const [armedKey, setArmedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);
  const disarm = useCallback(() => {
    clear();
    setArmedKey(null);
  }, []);
  const arm = useCallback((key: string) => {
    clear();
    setArmedKey(key);
    timer.current = setTimeout(() => setArmedKey(null), 4500);
  }, []);
  return useCallback(
    (key: string) => ({ armed: armedKey === key, arm: () => arm(key), fire: disarm }),
    [armedKey, arm, disarm],
  );
}

/** `.rr-pf-say` — the hand-written answer beside a press: 500 15px Caveat,
 *  brown, 1° off true; `.is-bad` in brick. */
export function Say({ text, bad = false }: { text: string; bad?: boolean }) {
  if (!text) return null;
  return (
    <Txt
      family="Caveat"
      weight={500}
      size={15}
      color={bad ? "brick" : "brown"}
      style={{ transform: [{ rotate: "-1deg" }] }}
    >
      {text}
    </Txt>
  );
}

/**
 * `.rr-pf-quiet` — the quiet link press: 600 12px Manrope brick, underlined
 * with `text-underline-offset: 3px`, padding 11px 2px. The sign-out row's
 * control. RN has no underline offset, so the line is a 1px View at the
 * baseline + 3: Manrope 12px ascends round(1.065 × 12) = 13, so top + 16.
 */
export function Quiet({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      <View style={{ paddingVertical: 11, paddingHorizontal: 2 }}>
        <View style={{ alignSelf: "flex-start" }}>
          <Txt weight={600} size={12} color="brick">
            {label}
          </Txt>
          <View
            style={{
              pointerEvents: "none",
              position: "absolute",
              left: 0,
              right: 0,
              top: 16,
              height: 1,
              backgroundColor: colors.brick,
            }}
          />
        </View>
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------- the dials --- */

/** `.rr-pf-clbl` — a control's label in the well: margin-top 20; 700 8.5px
 *  .24em uppercase gold2. */
export function ControlLabel({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Txt weight={700} size={8.5} ls={0.24} upper color="gold2" style={[{ marginTop: 20 }, style]}>
      {children}
    </Txt>
  );
}

/** `.rr-pf-hint` — margin 8px 0 0; 400 12.5px/1.6 Manrope ink .55. Pass a
 *  <Txt> tree for a bold run. */
export function Hint({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Txt size={12.5} line={1.6} tone={0.55} style={[{ marginTop: 8 }, style]}>
      {children}
    </Txt>
  );
}

/** `.rr-pf-note` — margin-top 14; a 2px brass rule down the left, 13px in;
 *  400 12.5px/1.6 ink .62. */
export function SideNote({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ marginTop: 14, paddingLeft: 13, borderLeftWidth: 2, borderLeftColor: colors.brass }, style]}>
      <Txt size={12.5} line={1.6} tone={0.62}>
        {children}
      </Txt>
    </View>
  );
}

/**
 * `.rr-pf-chips` / `.rr-pf-chip` — the stops. A chip is the one thing on a
 * white page that keeps its outline: min-height 42, padding 9px 15px, 1px
 * ring at ink .3, a pill, 600 13px at ink .72; `.is-on` is ink filled with
 * paper glyphs. `small` under the label: 500 10px at .7.
 */
export function Chips<T extends string | number>({
  stops,
  value,
  onSelect,
  label,
  style,
}: {
  stops: { value: T; label: string; note?: string }[];
  value: T;
  onSelect: (v: T) => void;
  /** aria-label for the group. */
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const { ink } = useInk();
  return (
    <View
      accessibilityLabel={label}
      style={[{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 }, style]}
    >
      {stops.map((s) => {
        const on = s.value === value;
        return (
          <Pressable
            key={String(s.value)}
            onPress={() => onSelect(s.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
              minHeight: 42,
              paddingVertical: 9,
              paddingHorizontal: 15,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: on ? colors.ink : ink(0.3, "border"),
              backgroundColor: on ? colors.ink : undefined,
              justifyContent: "center",
              // a <button> centres its text: "Off" over its note, "Hardcover" over its.
              alignItems: "center",
            }}
          >
            <Txt
              weight={600}
              size={13}
              color={on ? "paper" : undefined}
              tone={on ? undefined : 0.72}
              style={{ textAlign: "center" }}
            >
              {s.label}
            </Txt>
            {s.note ? (
              <Txt
                weight={500}
                size={10}
                color={on ? "paper" : undefined}
                tone={on ? undefined : 0.72}
                style={{ opacity: 0.7, marginTop: 1, textAlign: "center" }}
              >
                {s.note}
              </Txt>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * `.rr-pf-f` + `.rr-pf-in` — a labelled field: 6px gap, 15px above; the box
 * is min-height 46, 1px at ink .45, white, 12px 14px, 500 14.5px Manrope in
 * ink2; placeholder ink .38. `readonly` is a dashed transparent box at ink
 * .55 — the dashes are SVG, as Locked's are (Android's dashed borders are
 * not to be trusted), sized by onLayout over a borderless input. The brass
 * focus shadow is drawn FIRST, under the box: a negative sibling zIndex is
 * not dependable on Android. `bad` is the `.rr-pf-bad` line under it (500 11.5px brick) — laid
 * out empty too, so the column pays both 6px gaps as the site's does.
 * `bad={false}` is the one field whose third child is a HIDDEN <p> (the
 * Email field's pending note): nothing laid out, one gap.
 */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  readOnly = false,
  bad,
  style,
  ...input
}: TextInputProps & {
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  bad?: string | false;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const { ink } = useInk();
  const [focus, setFocus] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  return (
    <View style={[{ gap: 6, marginTop: 15 }, style]}>
      <Txt weight={700} size={8.5} ls={0.24} upper color="gold2">
        {label}
      </Txt>
      <View>
        {/* :focus — box-shadow:3px 3px 0 rgba(155,122,77,.32), a shadow, never mapped */}
        {focus && !readOnly ? (
          <View
            style={{
              pointerEvents: "none",
              position: "absolute",
              left: 3,
              top: 3,
              right: -3,
              bottom: -3,
              backgroundColor: "rgba(155,122,77,.32)",
            }}
          />
        ) : null}
        <TextInput
          {...input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={ink(0.38)}
          editable={!readOnly}
          onFocus={(e) => {
            setFocus(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            input.onBlur?.(e);
          }}
          onLayout={
            readOnly
              ? (e) => {
                  const { width: w, height: h } = e.nativeEvent.layout;
                  setBox((p) => (p.w === w && p.h === h ? p : { w, h }));
                }
              : input.onLayout
          }
          accessibilityLabel={label}
          style={{
            minHeight: 46,
            // The dashed ring is the SVG below; the box keeps the 1px as padding
            // so the glyphs sit where the bordered ones do.
            paddingVertical: readOnly ? 13 : 12,
            paddingHorizontal: readOnly ? 15 : 14,
            borderWidth: readOnly ? 0 : 1,
            borderColor: focus ? colors.ink : ink(0.45, "border"),
            backgroundColor: readOnly ? "transparent" : colors.white,
            fontFamily: face("Manrope", 500),
            fontSize: 14.5,
            color: readOnly ? ink(0.55) : colors.ink2,
          }}
        />
        {/* [readonly]{border-style:dashed} at ink .3 — a dashed <Rect>, as Locked. */}
        {readOnly && box.w > 0 && box.h > 0 ? (
          <Svg
            width={box.w}
            height={box.h}
            viewBox={`0 0 ${box.w} ${box.h}`}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          >
            <Rect
              x={0.5}
              y={0.5}
              width={box.w - 1}
              height={box.h - 1}
              fill="none"
              {...strokeProps(ink(0.3, "border"))}
              strokeWidth={1}
              strokeDasharray="3 2"
            />
          </Svg>
        ) : null}
      </View>
      {bad === false ? null : <Bad text={bad} />}
    </View>
  );
}

/**
 * `.rr-pf-bad` — the third child of every `.rr-pf-f`, ALWAYS laid out: the
 * site's field pays two 6px gaps whether or not the line has anything to say
 * (`.rr-pf-bad:empty{min-height:0}`), so the box is rendered empty too.
 */
function Bad({ text }: { text?: string }) {
  return (
    <View style={{ minHeight: 0 }}>
      {text ? (
        <Txt weight={500} size={11.5} color="brick">
          {text}
        </Txt>
      ) : null}
    </View>
  );
}

/**
 * `<select class="rr-pf-in" data-rr-pf-country>` — the Country field. The box
 * is `.rr-pf-in` with `padding-right:38px` and the caret the site paints with
 * two 5px gradient squares at `calc(100% - 19px) 20px` / `calc(100% - 14px)
 * 20px`: a ▼ ten wide and five tall, at ink .5, its right edge 14px in from
 * the padding box. "Choose…" is the empty option, in the field's own ink —
 * a select has no placeholder colour. The list itself is a sheet
 * (ProfileEnhancer.drawCountries's two optgroups, labelled the same way).
 */
export function CountryField({
  label,
  value,
  onSelect,
  bad,
  style,
}: {
  label: string;
  value: string;
  onSelect: (code: string) => void;
  bad?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, chrome } = useTheme();
  const { ink } = useInk();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const groups = useMemo(countryGroups, []);
  return (
    <View style={[{ gap: 6, marginTop: 15 }, style]}>
      <Txt weight={700} size={8.5} ls={0.24} upper color="gold2">
        {label}
      </Txt>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value ? countryName(value) : "Choose…" }}
        style={{
          minHeight: 46,
          paddingVertical: 12,
          paddingLeft: 14,
          paddingRight: 38,
          borderWidth: 1,
          borderColor: ink(0.45, "border"),
          backgroundColor: colors.white,
          justifyContent: "center",
        }}
      >
        <Txt weight={500} size={14.5} color="ink2" numberOfLines={1}>
          {value ? countryName(value) : "Choose…"}
        </Txt>
        <Svg
          width={10}
          height={5}
          viewBox="0 0 10 5"
          pointerEvents="none"
          style={{ position: "absolute", right: 14, top: 20 }}
        >
          <Path d="M0 0H10L5 5Z" {...fillProps(ink(0.5))} />
        </Svg>
      </Pressable>
      <Bad text={bad} />
      <Modal transparent visible={open} statusBarTranslucent onRequestClose={() => setOpen(false)} animationType="fade">
        <Pressable
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close"
          // .rr-pt-scrim — the sheet's own token, never mapped on the web.
          style={[StyleSheet.absoluteFill, { backgroundColor: chrome.scrim }]}
        />
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: "72%",
            backgroundColor: colors.white,
            paddingHorizontal: 18,
            paddingTop: 14,
            // 28 clear of the home indicator, not 28 under it.
            paddingBottom: 28 + insets.bottom,
          }}
        >
          <SectionList
            sections={[
              { title: GROUP_LABELS.direct, data: groups.direct },
              { title: GROUP_LABELS.quoted, data: groups.quoted },
            ]}
            keyExtractor={(c) => c.code}
            stickySectionHeadersEnabled={false}
            initialNumToRender={24}
            renderSectionHeader={({ section }) => (
              <View style={{ paddingTop: 14, paddingBottom: 6 }}>
                <Txt weight={700} size={8.5} ls={0.24} upper color="gold2">
                  {section.title}
                </Txt>
                <Rule />
              </View>
            )}
            renderItem={({ item }) => {
              const on = item.code === value;
              return (
                <Pressable
                  onPress={() => {
                    onSelect(item.code);
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 2 }}
                >
                  <Txt weight={on ? 700 : 500} size={14.5} color="ink2">
                    {item.name}
                  </Txt>
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

/** `.rr-pf-row{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}` */
export function FieldPair({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", columnGap: 14 }}>{children}</View>;
}

/**
 * `.rr-pf-locked` — a dashed pill saying why a row has no switch: height 24,
 * padding 0 10px, 1px dashed at ink .3, 700 8px .2em uppercase at ink .5.
 * Dashed, so it is SVG (Android's dashed borders are not to be trusted).
 */
export function Locked({ children }: { children: string }) {
  const { ink } = useInk();
  const [w, setW] = useState(0);
  return (
    <View
      style={{ height: 24, paddingHorizontal: 10, justifyContent: "center" }}
      onLayout={(e) => {
        const width = e.nativeEvent.layout.width;
        setW((p) => (p === width ? p : width));
      }}
    >
      {w > 0 ? (
        <Svg width={w} height={24} viewBox={`0 0 ${w} 24`} style={StyleSheet.absoluteFill}>
          <Rect x={0.5} y={0.5} width={w - 1} height={23} rx={11.5} fill="none" {...strokeProps(ink(0.3, "border"))} strokeWidth={1} strokeDasharray="3 2" />
        </Svg>
      ) : null}
      <Txt weight={700} size={8} ls={0.2} upper tone={0.5} numberOfLines={1}>
        {children}
      </Txt>
    </View>
  );
}

/** `.rr-pf-drawer.is-open` — a second-level drawer: margin-top 14, 2px of
 *  padding under a brown dashed rule at .45. */
export function Drawer({ open, children }: { open: boolean; children: ReactNode }) {
  const { brownLine } = useInk();
  if (!open) return null;
  return (
    <View style={{ marginTop: 14 }}>
      <Rule color={brownLine(0.45)} />
      <View style={{ paddingTop: 2 }}>{children}</View>
    </View>
  );
}

/**
 * `<ul class="rr-ap-rows">` inside a well — the rows on their top rule (or
 * without it, for `style="border-top:0"`).
 */
export function RowList({ children, top = true, style }: { children: ReactNode; top?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      {top ? <Rule /> : null}
      {children}
    </View>
  );
}
