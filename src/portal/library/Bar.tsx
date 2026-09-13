// The bar — `.rr-ly-bar` from app/data/accountLibraryPage.ts at its app pass:
// search over the shelf tabs, then the filter field. It sticks under the top
// bar (`position:sticky; top:var(--ap-toph)`), which the screen arranges; this
// draws what sticks.
//
//   .rr-ly-bar        padding 8px 0 10px on the desk's own paper (its 6px
//                     margin is the screen's, see library.tsx)
//   .rr-ly-bar-in     flex wrap, gap 10px 16px, no rule
//   .rr-ly-search     order 1, the whole row, 46px, 1px ink .45 square edge,
//                     13px in, 17px glyph at ink2 .72, 500 14.5 Manrope
//   .rr-ly-tabs       order 2, gap 20, padding 2px 0 0, scrolls sideways;
//                     each tab 600 19px/1.1 Cormorant, ink .45 (ink when on),
//                     padding 4px 0 9px, the squiggle 2px up from the bottom,
//                     the count 700 10px Manrope brass 4px on (brick when on)
//   .rr-ly-count      order 3 — the Files tab's own readout, hidden elsewhere
//   .rr-ly-filters    margin-top 16: the kicker line, then the words, on a
//                     solid ink .14 rule (the ≤600px branch: column-gap 16,
//                     the break carrying 11px under the kicker)
//
// Night: the search field takes the builder's hand-written rules
// (rgba(20,27,46,.42) paper, ink .44 edge, ink2 .76 glyph, ink2 .56
// placeholder) — none of them tokens, restated here from the same lines.

import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { useInk } from "../../theme/ink";
import { useTheme } from "../../theme/ThemeProvider";
import { FONTS } from "../../theme/type";
import { Squiggle } from "../../ui/Squiggle";
import { Txt } from "../../ui/Type";
import { TABS, pickCount, useFacets, type FacetKey, type Picks, type Tab } from "./data";
import { strokeProps } from "../../ui/svgPaint";

/** html[data-rr-theme="dark"] .rr-ly-search{background:rgba(20,27,46,.42)} */
const NIGHT_FIELD = "rgba(20,27,46,.42)";
/** html[data-rr-theme="dark"] .rr-ly-search:focus-within — the night rule
 *  outranks the app pass: a deeper navy, a brass edge, a 2px brass halo. */
const NIGHT_FIELD_FOCUS = "rgba(25,34,54,.72)";
const NIGHT_EDGE_FOCUS = "rgba(201,166,98,.9)";
const NIGHT_HALO = "0 0 0 2px rgba(201,166,98,.14)";
/** .rr-ly-search:focus-within at the app pass — solid ink edge, a brass offset. */
const DAY_SHADOW = "3px 3px 0 rgba(155,122,77,.32)";

/** `#rrggbb` at an alpha — the night bar is the desk's own navy, not quite opaque. */
const withAlpha = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** The builder's own 16-box search glyph, at 17px (the bar) or 15px (a find line). */
export function SearchGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle cx={7} cy={7} r={5} {...strokeProps(color)} strokeWidth={1.6} />
      <Path d="M11 11l4 4" {...strokeProps(color)} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

/** `.rr-ly-fs>summary::after` — a 5px chevron, 1.3px strokes, opened or not.
 *  content-box on the web: the 1.3px borders sit OUTSIDE the 5px, so the box is
 *  6.3px — RN's borders are inside, hence the width here. */
function FoldChevron({ color, open }: { color: string; open: boolean }) {
  return (
    <View
      style={{
        width: 6.3,
        height: 6.3,
        borderRightWidth: 1.3,
        borderBottomWidth: 1.3,
        borderColor: color,
        opacity: 0.75,
        transform: [{ translateY: open ? 2 : -2 }, { rotate: open ? "225deg" : "45deg" }],
      }}
    />
  );
}

export function Bar({
  q,
  onQuery,
  tab,
  onTab,
  counts,
  picks,
  openFacet,
  onOpenFacet,
  onClearPicks,
  onUnpick,
  countText,
}: {
  q: string;
  onQuery: (q: string) => void;
  tab: Tab;
  onTab: (t: Tab) => void;
  /** The three tab badges — files, owned, saved. "All" carries none. */
  counts: Record<Exclude<Tab, "all">, number>;
  picks: Picks;
  openFacet: FacetKey | null;
  onOpenFacet: (f: FacetKey | null) => void;
  onClearPicks: () => void;
  onUnpick: (f: FacetKey, key: string) => void;
  /** `.rr-ly-filtercount` — "469 books" / "3 books matched". */
  countText: string;
}) {
  const { colors, mode } = useTheme();
  const { ink, rgba } = useInk();
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [focused, setFocused] = useState(false);
  const FACETS = useFacets();
  const night = mode === "dark";
  const onFiles = tab === "files";
  const live = pickCount(picks);

  return (
    <View style={{ paddingTop: 8, paddingBottom: 10, backgroundColor: night ? undefined : colors.desk }}>
      {night ? (
        // html[data-rr-theme="dark"] .rr-ly-bar{background:linear-gradient(180deg,
        // rgba(13,19,34,.98),rgba(13,19,34,.93))} — the floor shows through, faintly
        <LinearGradient
          colors={[withAlpha(colors.desk, 0.98), withAlpha(colors.desk, 0.93)]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {/* .rr-ly-search */}
      <View
        style={{
          minHeight: 46,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingLeft: 13,
          paddingRight: 6,
          backgroundColor: night ? (focused ? NIGHT_FIELD_FOCUS : NIGHT_FIELD) : colors.white,
          borderWidth: 1,
          borderColor: night
            ? focused
              ? NIGHT_EDGE_FOCUS
              : ink(0.44, "border")
            : focused
              ? colors.ink
              : ink(0.45, "border"),
          boxShadow: focused ? (night ? NIGHT_HALO : DAY_SHADOW) : undefined,
        }}
      >
        <View style={{ opacity: 0.72 }}>
          <SearchGlyph size={17} color={night ? rgba("ink2", 0.76) : colors.ink2} />
        </View>
        <TextInput
          value={q}
          onChangeText={onQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search title, author, or ISBN..."
          placeholderTextColor={night ? rgba("ink2", 0.56) : ink(0.5)}
          accessibilityLabel="Search your library by title, author, or ISBN"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={{
            flex: 1,
            minWidth: 0,
            padding: 0,
            fontFamily: FONTS.sansMedium,
            fontSize: 14.5,
            color: night ? colors.ink : colors.ink2,
          }}
        />
        {q ? (
          // .rr-ly-searchx — 32px, 1px ink .3 ring, ×; after dark the night
          // rule outranks the app pass: a faint cream fill, the × at .72
          <Pressable
            onPress={() => onQuery("")}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: ink(0.3, "border"),
              backgroundColor: night ? ink(0.08) : undefined,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Txt size={17} line={17} tone={night ? 0.72 : 0.7}>
              ×
            </Txt>
          </Pressable>
        ) : null}
      </View>

      {/* .rr-ly-tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 10 }}
        contentContainerStyle={{ flexDirection: "row", gap: 20, paddingTop: 2 }}
      >
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => onTab(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                setWidths((prev) => (prev[t.key] === w ? prev : { ...prev, [t.key]: w }));
              }}
              style={{ paddingTop: 4, paddingBottom: 9 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Txt
                  family="Cormorant Garamond"
                  weight={600}
                  size={19}
                  line={1.1}
                  // the pill era's night rule outranks the app pass: ink .62 after dark
                  style={{ color: on ? colors.ink : ink(night ? 0.62 : 0.45) }}
                >
                  {t.label}
                </Txt>
                {t.key !== "all" ? (
                  // centred on the word's 20.9px line (a flex item: vertical-align is moot);
                  // Chrome snaps the 14px box's fractional centre up one pixel
                  <Txt weight={700} size={10} color={on ? "brick" : "brass"} style={{ marginLeft: 4, marginTop: -1 }}>
                    {counts[t.key]}
                  </Txt>
                ) : null}
              </View>
              {on && widths[t.key] ? (
                <Squiggle width={widths[t.key]} style={{ position: "absolute", left: 0, bottom: 2 }} />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {onFiles ? (
        // .rr-ly-count — the Files tab's own readout, margin-left auto
        <Txt weight={600} size={11} tone={0.5} style={{ marginTop: 10, alignSelf: "flex-end" }}>
          {countText}
        </Txt>
      ) : (
        // .rr-ly-filters — hidden on the Files tab: uploads have no facets
        <View style={{ marginTop: 16 }}>
          <View style={{ paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: ink(0.14, "border") }}>
            {/* the kicker line — label, the readout at the far end, Clear all */}
            <View style={{ flexDirection: "row", alignItems: "baseline", columnGap: 16 }}>
              <Txt weight={700} size={8.5} ls={0.24} upper color="gold2">
                Filter by
              </Txt>
              <Txt weight={500} size={11} style={{ marginLeft: "auto", opacity: 0.5 }}>
                {countText}
              </Txt>
              {live ? (
                <Pressable onPress={onClearPicks} accessibilityRole="button" hitSlop={6}>
                  <Txt
                    weight={600}
                    size={11}
                    color="brick"
                    style={{ borderBottomWidth: 1, borderBottomColor: colors.brick }}
                  >
                    Clear all
                  </Txt>
                </Pressable>
              ) : null}
            </View>
            {/* ::after — the break, 3 + 11 + 3 under the kicker line */}
            <View style={{ height: 0, marginTop: 3, marginBottom: 11 }} />
            {/* the words */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 3, marginTop: 3 }}>
              {FACETS.map((f) => {
                const open = openFacet === f.key;
                const n = picks[f.key].size;
                const lit = open || n > 0;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => onOpenFacet(open ? null : f.key)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    style={{ minHeight: 40, flexDirection: "row", alignItems: "center", gap: 7, opacity: lit ? 1 : 0.52 }}
                  >
                    <Txt weight={600} size={13.5}>
                      {f.title}
                    </Txt>
                    {n > 0 ? (
                      <Txt weight={700} size={9.5} color="brick" style={{ transform: [{ translateY: -5 }] }}>
                        {n}
                      </Txt>
                    ) : null}
                    <FoldChevron color={colors.ink} open={open} />
                    {open ? (
                      <View
                        style={{ position: "absolute", left: 0, right: 0, bottom: 9, height: 1.5, backgroundColor: colors.ink }}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
          {live ? (
            // .rr-ly-chips — every live pick restated, each its own undo
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 13 }}>
              {FACETS.flatMap((f) =>
                [...picks[f.key]].map((key) => {
                  const opt = f.options.find((o) => o.key === key);
                  return (
                    <Pressable
                      key={`${f.key}:${key}`}
                      onPress={() => onUnpick(f.key, key)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${opt?.label ?? key}`}
                      style={{
                        minHeight: 30,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 9,
                        paddingVertical: 4,
                        paddingHorizontal: 10,
                        backgroundColor: colors.white,
                        borderWidth: 1,
                        borderColor: ink(0.28, "border"),
                      }}
                    >
                      <Txt weight={500} size={11.5} line={1.4}>
                        {opt?.label ?? key}
                      </Txt>
                      <Txt size={15} line={15} style={{ opacity: 0.55 }}>
                        ×
                      </Txt>
                    </Pressable>
                  );
                }),
              )}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
