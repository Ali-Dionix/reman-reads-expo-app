// `.rr-lr-all` — "All audiobooks.", the whole shelf as a grid, from
// accountListeningPage.ts (allAudioHtml + lrShelvesHtml), phone branch:
//
//   .rr-lr-all      margin 34px 0 0 (collapses into the billboard's 34)
//   .rr-lr-all-h    h2 600 23px/1.08 -.005em Cormorant ink; p 400 12.5/1.55 ink .58, 5px under
//   .rr-lr-allseg   flex, baseline; gap 20; margin 16px 0 0; padding 0 2px 2px; scrolls x
//   .rr-lr-pill     600 18px/1.1 Cormorant; padding 4px 0 9px; span ink at .45 opacity
//                   (1 when checked); i 700 10px Manrope super, brass, 4px after
//   ::after         the squiggle under the checked pill: left 0, right 0, bottom 2, 5px
//   .rr-lr-allgrid  grid, auto-fill minmax(94px,1fr) — three columns at 350px;
//                   gap 20px 12px; margin 18px 0 0
//   .rr-lr-ac       cover 2/3, radius 3, --bk under --art, two ink shadows;
//                   b 600 12px/1.3 ink2, two lines; em 500 10.5px ink .55, one line;
//                   i 700 8px .14em uppercase gold2 (ink .45 in production)
//   li[data-s=soon] cover saturate(.55) brightness(.92) opacity .8 — RN has no
//                   CSS filter, so the art is drawn through an SVG <Filter> of
//                   two FeColorMatrix primitives (DimArt); the opacity stays
//                   on the box
//
// BROWSE OR RESULTS, DECIDED BY THE PILLS. "All" is the browse state and shows
// the genre rails (lrRailHtml — shelfCard.ts's rr-shf-* at ≤640px); every
// other pill is a query and shows the flat grid. Two :has() rules on the web;
// one piece of state here.
//
//   .rr-lr-gr       margin 22px 0 0
//   .rr-lr-gr-h     grid minmax(0,1fr) auto; h3 19px; p 3px under; "See all" in
//                   column 2 across both rows, 700 9px .14em uppercase ink on a
//                   1.5px underline, 6px before an 11×9 arrow
//   .rr-shf-row     flex; gap 14; padding 2px 2px 10px; scrolls x
//   .rr-shf-card    flex-basis calc((100vw - 64px)/2.4)
//   .rr-shf-cover   2/3, radius 3, the same two shadows
//   .rr-shf-meta    7px under, .72rem/1.35 Manrope brown
//   .is-dim         the cover at .8 through the same two-matrix filter

import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useInk } from "../../theme/ink";
import { useTheme } from "../../theme/ThemeProvider";
import { Cover } from "../../ui/Cover";
import { Seg } from "../../ui/Seg";
import { Head, Lede, Txt } from "../../ui/Type";

export type AudioEntry = {
  slug: string;
  title: string;
  author: string;
  art?: string;
  spine: string;
  category: string;
  /** "now" = a recording exists and plays. "soon" = still being made. */
  state: "now" | "soon";
  meta: string;
};

export type AudioFilter = { f: string; label: string; n: number };

/** `.rr-lr-allgrid`: repeat(auto-fill, minmax(94px, 1fr)); gap 20px 12px. */
const GRID_MIN = 94;
const GRID_GAP_X = 12;
const GRID_GAP_Y = 20;

/** One grid cell — `.rr-lr-ac`. A playable title presses; one in production is a fact. */
function Cell({
  e,
  width,
  onPlay,
}: {
  e: AudioEntry;
  width: number;
  onPlay?: (slug: string) => void;
}) {
  const { ink } = useInk();
  const soon = e.state === "soon";
  const body = (
    <>
      <Cover art={e.art} spine={e.spine} width={width} dim={soon} />
      <Txt weight={600} size={12} line={1.3} color="ink2" numberOfLines={2} style={{ marginTop: 8 }}>
        {e.title}
      </Txt>
      <Txt weight={500} size={10.5} tone={0.55} numberOfLines={1} style={{ marginTop: 2 }}>
        {e.author}
      </Txt>
      <Txt
        weight={700}
        size={8}
        ls={0.14}
        upper
        numberOfLines={1}
        style={{ marginTop: 4, color: soon ? ink(0.45) : undefined }}
        color="gold2"
      >
        {e.meta}
      </Txt>
    </>
  );
  if (soon) {
    return (
      <View style={{ width }} accessibilityLabel={`${e.title}, being recorded`}>
        {body}
      </View>
    );
  }
  return (
    <Pressable style={{ width }} onPress={() => onPlay?.(e.slug)} accessibilityRole="button" accessibilityLabel={e.title}>
      {body}
    </Pressable>
  );
}

/** `.rr-lr-allgrid` — the flat grid, auto-filled. */
function Grid({ entries, onPlay }: { entries: AudioEntry[]; onPlay?: (slug: string) => void }) {
  const [w, setW] = useState(0);
  const cols = w > 0 ? Math.max(1, Math.floor((w + GRID_GAP_X) / (GRID_MIN + GRID_GAP_X))) : 3;
  const cell = w > 0 ? (w - GRID_GAP_X * (cols - 1)) / cols : 0;
  return (
    <View
      onLayout={(e) => {
        const width = e.nativeEvent.layout.width;
        setW((prev) => (prev === width ? prev : width));
      }}
      style={{
        marginTop: 18,
        flexDirection: "row",
        flexWrap: "wrap",
        columnGap: GRID_GAP_X,
        rowGap: GRID_GAP_Y,
      }}
    >
      {cell > 0 ? entries.map((e) => <Cell key={e.slug} e={e} width={cell} onPlay={onPlay} />) : null}
    </View>
  );
}

const railArrow = "M1 5h9M6.5 1l4 4-4 4";

/** One genre floor — `lrRailHtml`: a shelfCard rail with a "See all" press. */
function Rail({
  cat,
  entries,
  onPlay,
  onSeeAll,
}: {
  cat: string;
  entries: AudioEntry[];
  onPlay?: (slug: string) => void;
  onSeeAll: () => void;
}) {
  const { colors } = useTheme();
  const { width } = useInk();
  const label = cat.charAt(0).toUpperCase() + cat.slice(1);
  const plays = entries.filter((e) => e.state === "now").length;
  // .rr-shf-card{flex-basis:calc((100vw - 64px)/2.4)} at ≤640px
  const card = (width - 64) / 2.4;
  return (
    <View style={{ marginTop: 22 }} accessibilityLabel={`${label} audiobooks`}>
      {/* .rr-lr-gr-h: grid with a 2px row gap under the h3 (so p sits 3+2 under it); .rr-shf-h margin-bottom 4 */}
      <View style={{ flexDirection: "row", alignItems: "center", columnGap: 12, marginBottom: 4 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt family="Cormorant Garamond" weight={600} size={19} line={1.08} ls={-0.005}>
            {label}
          </Txt>
          <Lede tone={0.58} style={{ marginTop: 5 }}>
            {entries.length} recording{entries.length === 1 ? "" : "s"}
            {plays ? ` · ${plays} playing now` : ""}
          </Lede>
        </View>
        <Pressable
          onPress={onSeeAll}
          accessibilityRole="button"
          hitSlop={6}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingBottom: 3,
            borderBottomWidth: 1.5,
            borderBottomColor: colors.ink,
          }}
        >
          <Txt weight={700} size={9} ls={0.14} upper>
            See all
          </Txt>
          <Svg width={11} height={9} viewBox="0 0 12 10">
            <Path d={railArrow} stroke={colors.ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: "row", gap: 14, paddingHorizontal: 2, paddingTop: 2, paddingBottom: 10 }}
      >
        {entries.map((e) => {
          const dim = e.state === "soon";
          const inner = (
            <>
              <Cover art={e.art} spine={e.spine} width={card} dim={dim} />
              {/* .rr-shf-meta — .72rem/1.35 brown, 7px under the sleeve */}
              <Txt size={11.52} line={1.35} color="brown" style={{ marginTop: 7 }}>
                {e.meta}
              </Txt>
            </>
          );
          return dim ? (
            <View key={e.slug} style={{ width: card }} accessibilityLabel={`${e.title}, being recorded`}>
              {inner}
            </View>
          ) : (
            <Pressable
              key={e.slug}
              style={{ width: card }}
              onPress={() => onPlay?.(e.slug)}
              accessibilityRole="button"
              accessibilityLabel={e.title}
            >
              {inner}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function Catalogue({
  entries,
  filters,
  categories,
  onPlay,
}: {
  entries: AudioEntry[];
  filters: AudioFilter[];
  categories: string[];
  onPlay?: (slug: string) => void;
}) {
  // PLAYS NOW COMES FIRST, AND FIRST MEANS SELECTED (audioPillHtml checks index 0).
  const [filter, setFilter] = useState(filters[0]?.f ?? "now");
  const playsNow = entries.filter((e) => e.state === "now").length;

  const shown =
    filter === "now"
      ? entries.filter((e) => e.state === "now")
      : filter === "soon"
        ? entries.filter((e) => e.state === "soon")
        : entries.filter((e) => e.category === filter);

  return (
    <View accessibilityLabel="Every audiobook">
      {/* .rr-lr-all-h's margin-bottom:2px collapses into the seg's 16 — so no margin here */}
      <View>
        <Head>All audiobooks.</Head>
        <Lede tone={0.58} style={{ marginTop: 5 }}>
          {entries.length} recordings on Roman Reads. {playsNow} you can play today,{" "}
          {entries.length - playsNow} still being recorded.
        </Lede>
      </View>
      {/* .rr-lr-pill — the kit's segment at this page's cut: 18px, gap 20,
          16px above, the count on the label's baseline (inline-flex, so
          vertical-align:super has no effect), radios. */}
      <Seg
        segments={filters.map((p) => ({ key: p.f, label: p.label, count: p.n }))}
        selected={filter}
        onSelect={setFilter}
        size={18}
        gap={20}
        top={16}
        count="baseline"
        role="radio"
        accessibilityLabel="Filter the audiobooks"
      />
      {filter === "all" ? (
        <View>
          {categories.map((c) => (
            <Rail
              key={c}
              cat={c}
              entries={entries.filter((e) => e.category === c)}
              onPlay={onPlay}
              onSeeAll={() => setFilter(c)}
            />
          ))}
        </View>
      ) : (
        <Grid entries={shown} onPlay={onPlay} />
      )}
    </View>
  );
}
