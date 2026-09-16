// The genre floor — `.rr-ly-shelves` from app/data/accountLibraryPage.ts:
// family headings (`.rr-ly-wing`), then one rail of covers per subject
// (`.rr-shf.rr-ly-rail`, built from shelfCard.ts's card), then a "See all"
// that hands the reader to the filter instead of a new page.
//
// The rail card is shelfCard.ts's `.rr-shf-card` at the ≤640px branch —
// flex-basis calc((100vw - 64px)/2.4), two sleeves and a peek of the third —
// with its three cover states exactly as the CSS branches: art that carries
// its own type, art under a bottom gradient with type over it, and a cloth
// spine with the type inside a ruled box. The hover-revealed paddles are
// display:none at this width and are not drawn.
//
// THE FLOOR AND THE GRID ARE NEVER BOTH ON SCREEN — the screen decides that,
// this only draws the floor.
//
// A RAIL'S COVERS EXIST ONLY NEAR THE VIEWPORT. The floor is 24 rails and 232
// covers, and until 16 Sep 2026 every one of them was mounted the moment the
// room was — 232 expo-images decoded and uploaded, a native tree so large that
// re-attaching the room on a tab press was one 142ms frame on a Pixel 8 Pro
// (the site's page can afford it; the browser virtualises paint, the phone's
// renderer does not). Each rail now measures where it sits and mounts its
// row of sleeves only while it is within about a screen and a half of the
// viewport, standing in for itself with a box of exactly the row's height the
// rest of the time, so the page's length and every scroll position are what
// they were. The room feeds the position through `LibraryScroll` — a tiny
// bus, so only the floor re-renders on a scroll tick and never the room.

import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Fragment, memo, useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { SITE_ORIGIN } from "../../lib/config";
import { useTheme } from "../../theme/ThemeProvider";
import { OBJECT, lit, litRgba } from "../../theme/tokens";
import { Rule } from "../../ui/Rule";
import { Txt } from "../../ui/Type";
import { WINGS, type Rail as RailT, type ShelfBook } from "./data";
import { strokeProps } from "../../ui/svgPaint";

/**
 * A COVER IS A THEME ISLAND (theme.ts ISLAND_ROOTS carries .rr-shf-cover):
 * everything inside keeps its DAYLIGHT values after dark — the cloth's ink2
 * type, its brass hairline, the paper type over art. So the sleeve reads the
 * light column directly and never asks the theme.
 */
const LIT_BRASS_38 = litRgba("brass", 0.38);

/** ≤640px: .rr-shf-card{flex-basis:calc((100vw - 64px)/2.4)}; 158px above. */
export const cardWidthFor = (window: number): number => (window <= 640 ? (window - 64) / 2.4 : 158);

/** Where the room's scroller is: content offset and viewport height. */
export type Viewport = { top: number; height: number };

/** The room's scroll position, handed to whoever asks — the floor — without
 *  a re-render of the room. Make one per room with `useLibraryScroll`. */
export type LibraryScroll = {
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  subscribe: (cb: (v: Viewport) => void) => () => void;
  /** The floor's own offset inside the scroller's content — the room knows
   *  the box it put the floor in, and says so from that box's onLayout. */
  setFloorTop: (y: number) => void;
  floorTop: () => number;
};

export function useLibraryScroll(): LibraryScroll {
  const ref = useRef<LibraryScroll | null>(null);
  if (!ref.current) {
    const subs = new Set<(v: Viewport) => void>();
    let floorTop = 0;
    let last: Viewport | null = null;
    ref.current = {
      onScroll: (e) => {
        const v = { top: e.nativeEvent.contentOffset.y, height: e.nativeEvent.layoutMeasurement.height };
        last = v;
        for (const cb of subs) cb(v);
      },
      subscribe: (cb) => {
        subs.add(cb);
        if (last) cb(last);
        return () => {
          subs.delete(cb);
        };
      },
      setFloorTop: (y) => {
        floorTop = y;
      },
      floorTop: () => floorTop,
    };
  }
  return ref.current;
}

/** `.rr-ly-rail-all`'s arrow — the builder's own 12×10 box at 11×9. */
function RailArrow({ color }: { color: string }) {
  return (
    <Svg width={11} height={9} viewBox="0 0 12 10" fill="none">
      <Path d="M1 5h9M6.5 1l4 4-4 4" {...strokeProps(color)} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** `.rr-shf-card` › `.rr-shf-go` › `.rr-shf-cover` — one sleeve. */
export function ShelfCover({ book, width, onPress }: { book: ShelfBook; width: number; onPress?: () => void }) {
  const hasArt = !!book.art;
  const shade = Number.parseFloat(book.shade ?? "48") / 100;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={book.title}
      style={({ pressed }) => [{ width }, pressed && { transform: [{ translateY: -4 }] }]}
    >
      <View
        style={[
          styles.cover,
          // background:var(--bk,var(--t-cream3)) — the spine is inline and never mapped
          { backgroundColor: book.spine ?? lit("cream3") },
        ]}
      >
        {hasArt ? (
          <Image
            source={{ uri: `${SITE_ORIGIN}${book.art}` }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={0}
            // web only: the browser's lazy attribute would leave a rail blank until
            // it is scrolled to; native loads on mount either way
            loading="eager"
          />
        ) : null}
        {book.baked ? null : hasArt ? (
          // .rr-shf-type — inset:auto 0 0; padding:34% 9px 9px; the gradient
          // reaches rgba(11,10,8,.6) at --shade and holds it to the edge; the
          // type is paper, and stays paper: the sleeve is an island.
          <LinearGradient
            colors={["transparent", "rgba(11,10,8,.6)"]}
            locations={[0, Math.min(1, shade)]}
            style={[styles.typeArt, { paddingTop: width * 0.34 }]}
          >
            <Txt family="Cormorant Garamond" weight={600} size={13.12} line={16.4} numberOfLines={3} style={{ color: lit("paper") }}>
              {book.title}
            </Txt>
            <Txt size={10.88} numberOfLines={1} style={{ color: lit("paper"), opacity: 0.82 }}>
              {book.author}
            </Txt>
          </LinearGradient>
        ) : (
          // :not(.has-art) .rr-shf-type — inset:0; padding:14px 10px; a brass
          // hairline box on the cloth; the type is ink2 and sits at the top.
          <View style={[styles.typeCloth, { borderColor: LIT_BRASS_38 }]}>
            <Txt family="Cormorant Garamond" weight={600} size={13.12} line={16.4} numberOfLines={3} style={{ color: lit("ink2") }}>
              {book.title}
            </Txt>
            <Txt size={10.88} numberOfLines={1} style={{ color: lit("ink2"), opacity: 0.82 }}>
              {book.author}
            </Txt>
          </View>
        )}
      </View>
    </Pressable>
  );
}

/** `.rr-shf.rr-ly-rail` — one subject's rail with its head and See all.
 *  `near` false draws the head over a box the row's exact height and no
 *  sleeves at all; `onPlace` reports where the rail sits in its parent. */
export const Rail = memo(function Rail({
  rail,
  onOpen,
  onSeeAll,
  near = true,
  onPlace,
}: {
  rail: RailT;
  onOpen: (book: ShelfBook) => void;
  onSeeAll: (subjectKey: string) => void;
  near?: boolean;
  onPlace?: (key: string, y: number, height: number) => void;
}) {
  const { colors } = useTheme();
  const { width: windowW } = useWindowDimensions();
  const cardW = cardWidthFor(windowW);
  // the row: paddingTop 2 + a 2:3 sleeve + paddingBottom 10 — the placeholder
  // is this tall so a rail measures the same with or without its covers
  const rowH = cardW * 1.5 + 12;

  return (
    <View
      style={{ marginTop: 20 }}
      accessibilityRole="summary"
      accessibilityLabel={rail.label}
      onLayout={onPlace ? (e: LayoutChangeEvent) => onPlace(rail.key, e.nativeEvent.layout.y, e.nativeEvent.layout.height) : undefined}
    >
      {/* .rr-shf-h.rr-ly-rail-h — grid: title and count in column 1, the press
          in column 2 spanning both rows and centred on them */}
      <View style={{ flexDirection: "row", alignItems: "center", columnGap: 12, marginBottom: 4 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt family="Cormorant Garamond" weight={600} size={19} line={1.08} ls={-0.005}>
            {rail.label}
          </Txt>
          {/* row-gap 2 + the paragraph's own margin-top 3 */}
          <Txt size={12.5} line={19.375} tone={0.58} style={{ marginTop: 5 }}>
            {rail.n} book{rail.n === 1 ? "" : "s"}
          </Txt>
        </View>
        <Pressable
          onPress={() => onSeeAll(rail.key)}
          accessibilityRole="button"
          accessibilityLabel={`See all ${rail.label}`}
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
          <RailArrow color={colors.ink} />
        </Pressable>
      </View>
      {near ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          decelerationRate="fast"
          snapToInterval={cardW + 14}
          snapToAlignment="start"
        >
          {rail.books.map((b) => (
            <ShelfCover key={b.slug} book={b} width={cardW} onPress={() => onOpen(b)} />
          ))}
        </ScrollView>
      ) : (
        <View style={{ height: rowH }} />
      )}
    </View>
  );
});

/** How far beyond the viewport a rail keeps its covers: a screen and a half
 *  ahead (the direction a reader is going), two behind. */
const AHEAD = 1.5;
const BEHIND = 2;

/** `.rr-ly-wing` + its rails — one family of shelves. */
export function Floor({
  onOpen,
  onSeeAll,
  scroll,
}: {
  onOpen: (book: ShelfBook) => void;
  onSeeAll: (subjectKey: string) => void;
  /** The room's scroll bus. Without one every rail is drawn, as before. */
  scroll?: LibraryScroll;
}) {
  const { height: windowH } = useWindowDimensions();
  // a first guess before the first scroll event: the scroller at the top,
  // as tall as the window
  const [view, setView] = useState<Viewport>({ top: 0, height: windowH });
  useEffect(() => (scroll ? scroll.subscribe(setView) : undefined), [scroll]);

  // where each rail sits, relative to this floor — the wing head and its
  // rails are direct children here, so one onLayout is the whole answer
  const places = useRef(new Map<string, { y: number; h: number }>());
  const [, bump] = useState(0);
  const onPlace = useRef((key: string, y: number, h: number) => {
    const was = places.current.get(key);
    if (was && was.y === y && was.h === h) return;
    places.current.set(key, { y, h });
    bump((n) => n + 1);
  }).current;

  const floorTop = scroll ? scroll.floorTop() : 0;
  const near = (key: string, index: number): boolean => {
    if (!scroll) return true;
    const p = places.current.get(key);
    // unmeasured: the first few are surely on the first screen
    if (!p) return index < 3;
    const top = floorTop + p.y;
    return top < view.top + view.height * (1 + AHEAD) && top + p.h > view.top - view.height * BEHIND;
  };

  let n = 0;
  return (
    <View>
      {WINGS.map((w, i) => (
        // a Fragment, not a wrapper View: a rail's onLayout is then relative to
        // this floor, which is the one offset the room can add to
        <Fragment key={w.key}>
          {/* .rr-ly-wing{margin:34px 0 2px;padding:16px 0 0;border-top:1px dashed} — 22px on
              the first; the 2px bottom margin collapses into the rail's 20px and is not drawn */}
          <View style={{ marginTop: i === 0 ? 22 : 34 }} accessibilityLabel={w.label}>
            <Rule />
            <View style={{ paddingTop: 16 }}>
              <Txt weight={700} size={8.5} ls={0.24} upper color="gold2">
                Browse by subject
              </Txt>
              <Txt family="Cormorant Garamond" weight={600} size={26} line={1.05} ls={-0.01} style={{ marginTop: 7 }}>
                {w.label}
              </Txt>
              <Txt size={12.5} line={19.375} style={{ marginTop: 5, opacity: 0.58 }}>
                {w.hint} ({w.rails.length} shelves, {w.count} books)
              </Txt>
            </View>
          </View>
          {w.rails.map((r) => (
            <Rail
              key={r.key}
              rail={r}
              onOpen={onOpen}
              onSeeAll={onSeeAll}
              near={near(r.key, n++)}
              onPlace={scroll ? onPlace : undefined}
            />
          ))}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // .rr-shf-row{gap:14px;padding:2px 2px 10px}
  row: { gap: 14, paddingTop: 2, paddingHorizontal: 2, paddingBottom: 10 },
  // .rr-shf-cover — 2/3, 3px radius, the two ink shadows
  cover: {
    aspectRatio: 2 / 3,
    borderRadius: 3,
    overflow: "hidden",
    boxShadow: OBJECT.cover.sleeveShadow,
  },
  typeArt: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 9,
    paddingBottom: 9,
    gap: 2,
  },
  typeCloth: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 2,
    borderWidth: 1,
    borderRadius: 3,
  },
});
