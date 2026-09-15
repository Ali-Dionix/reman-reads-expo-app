// The filter panel — `.rr-ly-fs-b` from app/data/accountLibraryPage.ts at the
// ≤600px branch: a sheet standing clear of the tab bar
// (`position:fixed; inset:auto 12px calc(var(--ap-tab) + safe-area + 12px)`),
// square, ink-edged, on the order slip's two shadows, at most 62dvh tall.
//
//   .rr-ly-fs-head      h3 600 23px/1.08 Cormorant; p 500 11.5/1.5 gold2
//                       "42 subjects · select any"; the 32px close disc
//   .rr-ly-afind        a glyph and a rule, no box: 15px glyph at .55, 500 16px
//                       input, 1.5px ink .2 rule (ink when focused)
//   .rr-ly-opts         one column on a phone; tall lists scroll inside
//                       clamp(120px, 32dvh, 270px)
//   .rr-ly-opt          42px rows: a 15px box (1.5px ink .32; ink-filled with a
//                       drawn tick when picked), 500 14px/1.35 label (700 when
//                       picked), 400 11.5 hint at .62, the count at .45 right
//   .rr-ly-filters-foot "Changes update your library instantly." and the house
//                       press "Show N books" — ink ground, paper letters, square
//
// Options multi-select; every tap re-renders the room behind the sheet, which
// is what "instantly" means. One panel at a time, as the native <details
// name=> group keeps it on the web.

import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDockHeight } from "../dockSpace";
import { useInk } from "../../theme/ink";
import { useTheme } from "../../theme/ThemeProvider";
import { FONTS } from "../../theme/type";
import { Disc } from "../../ui/Disc";
import { Icon } from "../../ui/Icon";
import { Txt } from "../../ui/Type";
import { SearchGlyph } from "./Bar";
import { useFacets, type Facet, type FacetKey, type Picks } from "./data";

/** The shadows are the order slip's, never mapped on the web either. */
const SLIP_SHADOW = "2px 3px 1px rgba(54,42,28,.14), 10px 14px 30px rgba(54,42,28,.16)";
/** --ap-tab */
const TAB_H = 64;

function Option({ opt, picked, onPress }: { opt: Facet; picked: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const { ink } = useInk();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: picked }}
      style={{
        minHeight: 42,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 9,
        paddingHorizontal: 2,
        opacity: picked ? 1 : 0.82,
      }}
    >
      {/* ::before — the box; ::after — the tick, drawn */}
      <View
        style={{
          width: 15,
          height: 15,
          borderWidth: 1.5,
          borderColor: picked ? colors.ink : ink(0.32, "border"),
          backgroundColor: picked ? colors.ink : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {picked ? (
          <View
            style={{
              width: 8,
              height: 4,
              borderLeftWidth: 1.6,
              borderBottomWidth: 1.6,
              borderColor: colors.paper,
              transform: [{ translateY: -1 }, { rotate: "-45deg" }],
            }}
          />
        ) : null}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Txt weight={picked ? 700 : 500} size={14} line={1.35} color="ink2">
          {opt.label}
        </Txt>
        {opt.hint ? (
          <Txt size={11.5} line={1.35} style={{ opacity: 0.62 }}>
            {opt.hint}
          </Txt>
        ) : null}
      </View>
      <Txt weight={500} size={11.5} style={{ opacity: 0.45, minWidth: 22, textAlign: "right" }}>
        {opt.n}
      </Txt>
    </Pressable>
  );
}

export function FilterSheet({
  facet,
  picks,
  onPick,
  onClose,
  hitCount,
}: {
  facet: FacetKey;
  picks: Picks;
  onPick: (f: FacetKey, key: string) => void;
  onClose: () => void;
  /** How many books the current picks leave — the press says it. */
  hitCount: number;
}) {
  const { colors } = useTheme();
  const { ink } = useInk();
  const insets = useSafeAreaInsets();
  const dock = useDockHeight();
  const { height: winH } = useWindowDimensions();
  const [find, setFind] = useState("");
  const [focused, setFocused] = useState(false);
  const FACETS = useFacets();
  const f = FACETS.find((x) => x.key === facet)!;
  const tall = f.noun !== undefined;
  const needle = find.trim().toLowerCase();
  // filterOptions() — a picked option never hides under the needle.
  const shown = needle
    ? f.options.filter((o) => picks[facet].has(o.key) || o.label.toLowerCase().includes(needle))
    : f.options;

  return (
    // The sheet is pinned above the tab bar with a field inside it: on iOS the
    // keyboard would cover the list and the press, so the whole sheet lifts by
    // the keyboard's height (Android resizes the window itself).
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      pointerEvents="box-none"
      style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end", zIndex: 50 }}
    >
      {/* The enhancer closes an open fold on any click outside [data-rr-ly-fs]:
          a transparent catch over the room — the site draws no scrim. */}
      <Pressable
        pointerEvents="auto"
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close filters"
        style={StyleSheet.absoluteFill}
      />
      <View
        accessibilityViewIsModal
        style={{
          marginHorizontal: 12,
          // clear of the bar — and of the record docked above it, when there is one
          marginBottom: TAB_H + insets.bottom + 12 + dock,
          maxHeight: winH * 0.62,
          paddingTop: 18,
          paddingHorizontal: 18,
          paddingBottom: 15,
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: ink(0.5, "border"),
          boxShadow: SLIP_SHADOW,
        }}
      >
        {/* .rr-ly-fs-head */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt family="Cormorant Garamond" weight={600} size={23} line={1.08} ls={-0.01} color="ink2">
              {f.title}
            </Txt>
            <Txt weight={500} size={11.5} line={1.5} color="gold2" style={{ marginTop: 5 }}>
              {f.hint} · select any
            </Txt>
          </View>
          <Disc size={32} ring={ink(0.28, "border")} onPress={onClose} accessibilityLabel={`Close ${f.title.toLowerCase()} filters`}>
            <Icon name="close" size={14} color={colors.ink} />
          </Disc>
        </View>

        {tall ? (
          // .rr-ly-afind
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 9,
              minHeight: 32,
              marginBottom: 4,
              paddingHorizontal: 1,
              paddingBottom: 8,
              borderBottomWidth: 1.5,
              borderBottomColor: focused ? colors.ink : ink(0.2, "border"),
            }}
          >
            <View style={{ opacity: 0.55 }}>
              <SearchGlyph size={15} color={colors.ink2} />
            </View>
            <TextInput
              value={find}
              onChangeText={setFind}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={`Find ${f.noun}`}
              placeholderTextColor={ink(0.42)}
              accessibilityLabel={`Find ${f.noun} in the filter list`}
              autoCorrect={false}
              autoCapitalize="none"
              style={{ flex: 1, minWidth: 0, minHeight: 26, padding: 0, fontFamily: FONTS.sansMedium, fontSize: 16, color: colors.ink2 }}
            />
          </View>
        ) : null}

        <ScrollView
          style={tall ? { maxHeight: Math.min(270, Math.max(120, winH * 0.32)) } : null}
          showsVerticalScrollIndicator={false}
        >
          {shown.map((o) => (
            <Option key={o.key} opt={o} picked={picks[facet].has(o.key)} onPress={() => onPick(facet, o.key)} />
          ))}
          {tall && !shown.length ? (
            // .rr-ly-nohit
            <Txt size={13.5} line={1.5} style={{ marginVertical: 16, marginHorizontal: 2, opacity: 0.55 }}>
              {facet === "s" ? "No subject by that name." : "No author by that name."}
            </Txt>
          ) : null}
        </ScrollView>

        {/* .rr-ly-filters-foot */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginTop: 14,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: ink(0.14, "border"),
          }}
        >
          <Txt size={11.5} line={1.5} style={{ maxWidth: "52%", opacity: 0.5 }}>
            Changes update your library instantly.
          </Txt>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={{
              minHeight: 42,
              paddingHorizontal: 17,
              justifyContent: "center",
              backgroundColor: colors.ink,
              borderWidth: 1,
              borderColor: colors.ink,
            }}
          >
            <Txt weight={600} size={12.5} color="paper">
              Show {hitCount} {hitCount === 1 ? "book" : "books"}
            </Txt>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
