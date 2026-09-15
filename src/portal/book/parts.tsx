// The book page's pieces — app/data/bookPage.ts's classes at the phone
// branch, one component per class, in the order the page prints them.
//
//   .rr-bk-crumb   Books › Classics › the title: 600 12px ink .5, gap 8, the
//                  links ink .6 and the separators at .5 of that
//   .rr-bk-chip    the lead-time pill: 700 10px .08em caps, 7px 13px; is-live
//                  is ink on paper, inverted at night as the kit's Button is
//   .rr-bk-btn     the page's own press — NOT .rr-pt-btn: 700 12px .06em,
//                  min-height 50, 14px 26px. --ghost is ink2 in an ink .3
//                  ring; is-on (the wishlist heart) is brick in a brick .5 ring
//   .rr-bk-fmt     a format chip: 600 11px .05em ink .7 in an ink .2 ring
//   .rr-bk-facts   "The details": one column on a phone — white cells in a
//                  brown .24 frame, 14px radius, the 2px gaps drawing the rules
//   .rr-bk-shelf   "More books like this": two columns of -lib tiles, 20px 16px
//                  gaps, no type on the covers (every piece is display:none)
//
// Colours by scope, as the site's theme maps them: an ink BACKGROUND flips
// to the pale ink at night (the chip, the press), an ink alpha as a border
// takes the border scope, and the one thing the web leaves unmapped — the
// stat line's 3px dots, `background:rgba(11,10,8,.3)` on a text/border-only
// token — stays lit here too.

import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { SITE_ORIGIN } from "../../lib/config";
import { useInk } from "../../theme/ink";
import { useTheme } from "../../theme/ThemeProvider";
import { OBJECT, litRgba } from "../../theme/tokens";
import { Txt } from "../../ui/Type";
import type { ShelfBook } from "../library/data";

/* ------------------------------------------------------------- crumb --- */

/** `.rr-bk-crumb` — Books › the category › the title. */
export function Crumb({ category, title, onBooks }: { category: string; title: string; onBooks: () => void }) {
  const link = (label: string) => (
    <Pressable onPress={onBooks} accessibilityRole="link" hitSlop={6}>
      <Txt weight={600} size={12} tone={0.6}>
        {label}
      </Txt>
    </Pressable>
  );
  const sep = (
    <Txt weight={600} size={12} tone={0.5} style={{ opacity: 0.5 }}>
      ›
    </Txt>
  );
  return (
    <View accessibilityRole="none" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      {link("Books")}
      {sep}
      {link(category)}
      {sep}
      <Txt weight={600} size={12} tone={0.5} numberOfLines={1} style={{ flexShrink: 1 }}>
        {title}
      </Txt>
    </View>
  );
}

/* -------------------------------------------------------------- stat --- */

/** `.rr-bk-stat .dot` — 3px, ink .3 as a background: unmapped on the web, lit here. */
const DOT = litRgba("ink", 0.3);

/** `.rr-bk-stat` — the year, the length, the edition, the stars, dotted apart. */
export function Stat({ items, stars }: { items: string[]; stars?: string }) {
  const { colors } = useTheme();
  const dot = <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: DOT }} />;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 14, rowGap: 8, marginTop: 16 }}>
      {items.map((it, i) => (
        <View key={it} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          {i > 0 ? dot : null}
          <Txt weight={600} size={12.5} tone={0.6}>
            {it}
          </Txt>
        </View>
      ))}
      {stars ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          {dot}
          {/* .rr-bk-stars{color:#9B7A4D;letter-spacing:1px} — the page's own
              font (Manrope 600 12.5) carries the glyphs */}
          <Txt weight={600} size={12.5} style={{ color: colors.brass, letterSpacing: 1 }}>
            {stars}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------- chip --- */

/** `.rr-bk-chip.is-live` — the lead-time pill. */
export function Chip({ label }: { label: string }) {
  const { bg } = useTheme();
  return (
    <View style={{ paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999, backgroundColor: bg("ink") }}>
      <Txt weight={700} size={10} ls={0.08} upper color="paper" numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}

/* ------------------------------------------------------------- press --- */

/**
 * `.rr-bk-btn` — the page's press. `ghost` is `--ghost`; `on` is `is-on`,
 * the wishlist heart's lit state (brick letters in a brick .5 ring, no fill).
 * Pressed: the ink press goes inkhover, the ghost's ring goes to .6 — the
 * :hover rules, since a phone has no hover.
 */
export function Press({
  label,
  ghost = false,
  on = false,
  onPress,
  accessibilityLabel,
  style,
}: {
  label: string;
  ghost?: boolean;
  on?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { bg, border } = useTheme();
  const { ink, brick } = useInk();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={on ? { selected: true } : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.press,
        on
          ? { backgroundColor: "transparent", borderColor: brick(0.5, "border") }
          : ghost
            ? { backgroundColor: "transparent", borderColor: ink(pressed ? 0.6 : 0.3, "border") }
            : { backgroundColor: pressed ? bg("inkhover") : bg("ink"), borderColor: border("ink") },
        style,
      ]}
    >
      <Txt
        weight={700}
        size={12}
        ls={0.06}
        upper
        color={on ? "brick" : ghost ? "ink2" : "paper"}
        numberOfLines={1}
      >
        {label}
      </Txt>
    </Pressable>
  );
}

/* --------------------------------------------------------------- fmt --- */

/** `.rr-bk-fmt` — one format chip. */
export function Fmt({ label }: { label: string }) {
  const { ink } = useInk();
  return (
    <View style={{ paddingVertical: 8, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, borderColor: ink(0.2, "border") }}>
      <Txt weight={600} size={11} ls={0.05} tone={0.7} numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}

/* ------------------------------------------------------------- facts --- */

export type Fact = { label: string; value: string };

/** `.rr-bk-facts` — the details table, one column at this width. */
export function Facts({ facts }: { facts: Fact[] }) {
  const { bg } = useTheme();
  const { rgba } = useInk();
  const frame = rgba("brown", 0.24, "border");
  return (
    <View style={{ borderWidth: 1, borderColor: frame, borderRadius: 14, overflow: "hidden", backgroundColor: rgba("brown", 0.24, "bg"), gap: 2 }}>
      {facts.map((f) => (
        <View key={f.label} style={{ backgroundColor: bg("white"), paddingVertical: 16, paddingHorizontal: 18 }}>
          <Txt weight={700} size={9} ls={0.24} upper color="gold2" style={{ marginBottom: 6 }}>
            {f.label}
          </Txt>
          <Txt weight={500} size={14} color="ink2">
            {f.value}
          </Txt>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------- shelf --- */

/** `.rr-bk-shelf{gap:20px 16px}` — two columns at the phone width. */
const SHELF_COL_GAP = 16;
const SHELF_ROW_GAP = 20;

/**
 * `.rr-bk-rel` — one related book: the -lib tile (art whole, or the cloth
 * under the wash with no type on it), then the title and the short author.
 */
function Related({ book, short, width, onPress }: { book: ShelfBook; short: string; width: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${book.title}, ${short}`}
      style={({ pressed }) => [{ width, gap: 9 }, pressed && { transform: [{ translateY: -4 }] }]}
    >
      <View style={[styles.tile, { width, height: width * 1.5, backgroundColor: book.spine || OBJECT.cover.cloth }]}>
        {book.art ? (
          <Image source={{ uri: `${SITE_ORIGIN}${book.art}` }} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />
        ) : (
          <LinearGradient
            colors={["rgba(255,255,255,.1)", "rgba(0,0,0,.22)"]}
            start={{ x: 0.279, y: -0.05 }}
            end={{ x: 0.721, y: 1.05 }}
            style={StyleSheet.absoluteFill}
          />
        )}
      </View>
      <Txt family="Cormorant Garamond" weight={600} size={15} line={1.2} color="ink2">
        {book.title}
      </Txt>
      <Txt weight={500} size={11.5} tone={0.55}>
        {short}
      </Txt>
    </Pressable>
  );
}

/** `.rr-bk-shelf` — the related shelf, wrapped two across. */
export function Shelf({
  books,
  shortOf,
  width,
  onOpen,
}: {
  books: ShelfBook[];
  /** Book.authorShort for a slug — the page slice carries it. */
  shortOf: (slug: string) => string;
  /** The shelf's own width — the wrap's, gutters out. */
  width: number;
  onOpen: (slug: string) => void;
}) {
  const col = (width - SHELF_COL_GAP) / 2;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: SHELF_COL_GAP, rowGap: SHELF_ROW_GAP }}>
      {books.map((b) => (
        <Related key={b.slug} book={b} short={shortOf(b.slug)} width={col} onPress={() => onOpen(b.slug)} />
      ))}
    </View>
  );
}

/* -------------------------------------------------------------- sect --- */

/** `.rr-bk-sect` — a titled section: 44px above, the serif line 18px over its body. */
export function Sect({ title, children, label }: { title: string; children: ReactNode; label?: string }) {
  return (
    <View style={{ paddingTop: 44 }} accessibilityLabel={label ?? title}>
      <Txt family="Cormorant Garamond" weight={500} size={26} style={{ marginBottom: 18 }}>
        {title}
      </Txt>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  press: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 50,
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderWidth: 1,
    borderRadius: 999,
  },
  // .rr-bk-rel .rr-bk-cover — 8px radius, 0 10px 22px -14px rgba(11,10,8,.4)
  tile: {
    borderRadius: 8,
    overflow: "hidden",
    boxShadow: "0 10px 22px -14px rgba(11,10,8,.4)",
  },
});
