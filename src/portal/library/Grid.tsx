// The list — `.rr-ly-gridzone` from app/data/accountLibraryPage.ts at its app
// pass: ONE ROW PER THING, on a hairline each, no cards. Shown in place of the
// floor the moment a search, a filter or a tab other than "All" lands.
//
//   .rr-ly-gridzone   padding 18px 0 8px
//   .rr-ly-card       flex, gap 10, padding 10px 0, 1px ink .1 under each
//                     (and over the first); ink .16 after dark
//   .rr-ly-bk         40px wide, 2:3, 4px radius — the cover block, a theme
//                     island: art whole, or the spine colour under a
//                     165° white-to-black wash with the site's own rule
//   .rr-ly-stamp      the owned mark: a 4px brick bar down the ROW's left
//                     edge (absolute on the card, top 0 to bottom 0)
//   .rr-ly-info       gap 1: name 600 15.5/1.25 Cormorant ink2, one line;
//                     by 400 11.5 Manrope ink .58; meta 600 10px .02em ink .48
//                     with the subject in gold2; own 600 10.5 brick — the
//                     enhancer's "${binding} · ${statusLine}"
//   .rr-ly-price      display:none on a phone — the row opens the book
//   .rr-ly-pager      gap 8, 34px above: two 42px discs and the rounded chips
//   .rr-ly-empty      the kit's empty room: the mark at .13, a serif line, prose
//
// Rows are windowed through a plain map over ONE PAGE (LIBRARY_PAGE_SIZE 24),
// exactly the web's pager; the 469 rows are never mounted at once.

import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";

import { SITE_ORIGIN } from "../../lib/config";
import { useInk } from "../../theme/ink";
import { useTheme } from "../../theme/ThemeProvider";
import { litRgba } from "../../theme/tokens";
import { Disc } from "../../ui/Disc";
import { Txt } from "../../ui/Type";
import { Button } from "../../ui/Button";
import type { LibraryBook } from "./data";

const MARK = require("../../../assets/mark.png");

/** LIBRARY_PAGE_SIZE — app/data/libraryConfig.ts. */
export const PAGE_SIZE = 24;

/** .rr-ly-bk is a theme island: its inset hairline stays daylight ink. */
const LIT_INK_16 = litRgba("ink", 0.16);

/** `.rr-ly-bk` — the cover block at row size. */
function CoverBlock({ book }: { book: LibraryBook }) {
  return (
    <View style={[styles.bk, { backgroundColor: book.spine }]}>
      {book.art ? (
        <>
          <Image source={{ uri: `${SITE_ORIGIN}${book.art}` }} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />
          {/* box-shadow:inset 0 0 0 1px rgba(11,10,8,.16) */}
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderWidth: 1, borderColor: LIT_INK_16, borderRadius: 4 }]} />
        </>
      ) : (
        <>
          <LinearGradient
            colors={["rgba(255,255,255,.1)", "rgba(0,0,0,.22)"]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* .rr-ly-bk-rule — the spine keeps the site's own mark */}
          <View style={{ width: 18, height: 1, backgroundColor: "rgba(243,226,188,.45)" }} />
        </>
      )}
    </View>
  );
}

/** `.rr-ly-card` — one row. */
export function BookRow({
  book,
  ownLine,
  first,
  onPress,
}: {
  book: LibraryBook;
  /** The owned row's line ("Hardcover · Delivered"); absent when not owned. */
  ownLine?: string;
  first: boolean;
  onPress: () => void;
}) {
  const { colors, mode } = useTheme();
  const { ink } = useInk();
  const hair = mode === "dark" ? ink(0.16, "border") : ink(0.1, "border");
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${book.title}, ${book.author}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: hair,
        borderTopWidth: first ? 1 : 0,
        borderTopColor: hair,
      }}
    >
      {ownLine ? (
        // .rr-ly-stamp — on the card, the row's full height
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            backgroundColor: colors.brick,
            borderTopLeftRadius: 4,
            borderBottomLeftRadius: 4,
          }}
        />
      ) : null}
      <CoverBlock book={book} />
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Txt family="Cormorant Garamond" weight={600} size={15.5} line={1.25} color="ink2" numberOfLines={1}>
          {book.title}
        </Txt>
        <Txt size={11.5} tone={0.58} numberOfLines={1}>
          {book.author}
        </Txt>
        <Txt weight={600} size={10} ls={0.02} tone={0.48} numberOfLines={1}>
          <Txt weight={600} size={10} ls={0.02} color="gold2">
            {book.subjectLabel}
          </Txt>
          {" · "}
          {book.year}
          {book.pages ? ` · ${book.pages} pages` : ""}
        </Txt>
        {ownLine ? (
          <Txt weight={600} size={10.5} ls={0.02} color="brick" numberOfLines={1}>
            {ownLine}
          </Txt>
        ) : null}
      </View>
      {/* .rr-ly-foot — the price is display:none at this width; the gap stays */}
      <View />
    </Pressable>
  );
}

/** pageWindow() — LibraryRoomEnhancer.tsx, kept identical. */
function pageWindow(page: number, pages: number): (number | "gap")[] {
  const wanted = new Set<number>([1, 2, page - 1, page, page + 1, pages - 1, pages]);
  const out: (number | "gap")[] = [];
  let prev = 0;
  for (let n = 1; n <= pages; n += 1) {
    if (!wanted.has(n)) continue;
    if (prev && n - prev > 1) out.push("gap");
    out.push(n);
    prev = n;
  }
  return out;
}

/** `.rr-ly-pager` */
export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (n: number) => void }) {
  const { colors } = useTheme();
  const { ink } = useInk();
  if (pages <= 1) return null;
  const arrow = (label: string, target: number, disabled: boolean, a11y: string) => (
    <View style={{ opacity: disabled ? 0.35 : 1 }} pointerEvents={disabled ? "none" : "auto"}>
      <Disc size={42} ring={ink(0.7, "border")} ringWidth={1.5} fill={colors.white} onPress={() => onPage(target)} accessibilityLabel={a11y}>
        <Txt size={17} line={17}>
          {label}
        </Txt>
      </Disc>
    </View>
  );
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 34 }}>
      {arrow("‹", page - 1, page <= 1, "Previous page")}
      {pageWindow(page, pages).map((n, i) =>
        n === "gap" ? (
          <Txt key={`gap${i}`} weight={600} size={13} tone={0.4} style={{ paddingHorizontal: 2 }}>
            …
          </Txt>
        ) : (
          <Pressable
            key={n}
            onPress={() => onPage(n)}
            accessibilityRole="button"
            accessibilityLabel={`Page ${n}`}
            accessibilityState={{ selected: n === page }}
            style={{
              minWidth: 42,
              minHeight: 42,
              paddingVertical: 10,
              paddingHorizontal: 12,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: n === page ? colors.ink : ink(0.25, "border"),
              backgroundColor: n === page ? colors.ink : "transparent",
            }}
          >
            <Txt weight={600} size={13} color={n === page ? "paper" : "ink"} style={n === page ? null : { opacity: 0.75 }}>
              {n}
            </Txt>
          </Pressable>
        ),
      )}
      {arrow("›", page + 1, page >= pages, "Next page")}
    </View>
  );
}

/** `.rr-ly-empty` — the kit's empty room. */
export function EmptyRoom({ head, sub, cta, onCta }: { head: string; sub: string; cta: string; onCta: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 9, paddingTop: 40, paddingBottom: 36, paddingHorizontal: 8 }}>
      {/* ::before — the house mark, ink at .13 */}
      <Image source={MARK} style={{ width: 54, height: 54, opacity: 0.13 }} tintColor={colors.ink} contentFit="contain" />
      <Txt family="Cormorant Garamond" weight={600} size={22} style={{ marginTop: 2, textAlign: "center" }}>
        {head}
      </Txt>
      <Txt size={13.5} line={22.275} tone={0.62} style={{ maxWidth: 480, textAlign: "center" }}>
        {sub}
      </Txt>
      {/* .rr-ly-empty-act{margin-top:20px} — the base sheet's, never overridden */}
      <View style={{ marginTop: 20 }}>
        <Button label={cta} ghost onPress={onCta} />
      </View>
    </View>
  );
}

/** `.rr-ly-fnote` — the Files tab's own empty and loading lines. */
export function FileNote({ head, body }: { head?: string; body: string }) {
  return (
    <View style={{ paddingVertical: 26, paddingHorizontal: 4 }}>
      {head ? (
        // display:block b — inherits the note's 13px/1.7 line-height: a 34px line box
        <Txt family="Cormorant Garamond" weight={600} size={20} line={34} color="ink2" style={{ marginBottom: 4 }}>
          {head}
        </Txt>
      ) : null}
      <Txt size={13} line={1.7} tone={0.58}>
        {body}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  bk: {
    width: 40,
    aspectRatio: 2 / 3,
    borderRadius: 4,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
