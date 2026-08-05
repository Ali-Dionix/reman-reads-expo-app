// /account/library — Your Library.
//
// A transcription of app/data/accountLibraryPage.ts at its ≤860px / ≤760px
// branches: the register drops from four cells to TWO (rows 3 and 4 gain a
// dashed top rule and cell 3 loses its left one), the search bar takes the
// full row, the tabs stop wrapping and scroll sideways, and the grid goes from
// three columns to TWO with 20/12 gaps and tighter card padding.
//
// The set-piece is the register — "a ledger rule, not furniture" — and the
// cover blocks are theme islands, lit at night.
//
// The 470-card grid is a FlatList here rather than a rendered-then-hidden
// grid: the web ships every card and filters with `display:none` because the
// markup is already in the document; a phone would pay for 470 mounted views
// to show twelve. Same cards, same order, windowed.

import { Image } from "expo-image";
import { useMemo, useState } from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import data from "../../src/data/library.json";
import { SITE_ORIGIN } from "../../src/lib/config";
import { PortalPage } from "../../src/portal/PortalPage";
import { ShelfRow } from "../../src/portal/ShelfRow";
import { useInk, em } from "../../src/theme/ink";
import { useTheme } from "../../src/theme/ThemeProvider";
import { FONTS } from "../../src/theme/type";

// Declared rather than inferred from the JSON: TypeScript widens a generated
// array into a union of every literal shape it sees, so an optional field that
// happens to be absent from the first entry reads as "does not exist".
type Book = {
  slug: string;
  title: string;
  author: string;
  year: string;
  tier: string;
  spine: string;
  art?: string;
  /** Per-art fade height, e.g. "48%". */
  shade?: string;
  baked?: boolean;
  pages?: number;
  audio?: boolean;
};

const BOOKS = data.books as Book[];

const TABS = [
  { key: "owned", label: "Yours" },
  { key: "saved", label: "Wishlist" },
  { key: "all", label: "All" },
] as const;

const PAGE = 24;

/** `.rr-ly-cell` — one ruled cell of the reader's own count. */
function Cell({
  value,
  label,
  note,
  ruledLeft,
  ruledTop,
}: {
  value: string;
  label: string;
  note: string;
  ruledLeft?: boolean;
  ruledTop?: boolean;
}) {
  const { ink } = useInk();
  const { colors } = useTheme();
  const none = value === "0";

  return (
    <View
      style={[
        styles.cell,
        ruledLeft && { borderLeftWidth: 1, borderLeftColor: "rgba(110,86,58,.34)" },
        ruledTop && { borderTopWidth: 1, borderTopColor: "rgba(110,86,58,.34)" },
      ]}
    >
      <Text style={[styles.cellB, { color: none ? ink(0.32) : colors.ink }]}>{value}</Text>
      <Text style={[styles.cellSpan, { color: colors.gold2 }]}>{label}</Text>
      <Text style={[styles.cellEm, { color: ink(0.5) }]}>{note}</Text>
    </View>
  );
}

/** `.rr-ly-card`. */
function Card({ book, price }: { book: Book; price: string }) {
  const { ink } = useInk();
  const { colors } = useTheme();
  const hasArt = !!book.art;
  const shade = Number.parseFloat(book.shade ?? "48") / 100;

  return (
    <View style={[styles.card, { backgroundColor: colors.white, borderColor: ink(0.12) }]}>
      <View style={[styles.bk, { backgroundColor: hasArt ? "#E8D7B9" : book.spine }]}>
        {hasArt ? (
          <Image
            source={{ uri: `${SITE_ORIGIN}${book.art}` }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={140}
          />
        ) : null}

        {book.baked ? null : hasArt ? (
          <View style={[styles.bkWash, { height: `${shade * 100}%` }]} />
        ) : null}

        {book.baked ? null : (
          <View style={hasArt ? styles.bkTypeArt : styles.bkTypeCloth}>
            <Text style={[styles.bkBrand, hasArt && styles.bkBrandArt]}>Roman Reads</Text>
            <Text style={[styles.bkTitle, hasArt && styles.bkTitleArt]} numberOfLines={4}>
              {book.title}
            </Text>
            <View style={[styles.bkRule, hasArt && { backgroundColor: book.spine, height: 3, width: 28 }]} />
            <Text style={[styles.bkAuthor, hasArt && styles.bkAuthorArt]} numberOfLines={2}>
              {book.author}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.ink2 }]} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={[styles.by, { color: ink(0.58) }]} numberOfLines={1}>
          {book.author}
        </Text>
        <Text style={[styles.meta, { color: ink(0.48) }]} numberOfLines={1}>
          {book.year}
          {book.pages ? ` · ${book.pages} pp` : ""}
          {book.audio ? " · " : ""}
          {book.audio ? <Text style={{ color: colors.gold2 }}>read aloud</Text> : null}
        </Text>
      </View>

      <View style={[styles.foot, { borderTopColor: ink(0.09) }]}>
        <View>
          <Text style={[styles.price, { color: colors.ink2 }]}>{price}</Text>
          <Text style={[styles.incl, { color: ink(0.45) }]}>+ digital, free</Text>
        </View>
        <View style={styles.acts}>
          <Pressable style={[styles.act, { backgroundColor: colors.ink, borderColor: colors.ink }]}>
            <Text style={[styles.actText, { color: colors.paper }]}>Buy</Text>
          </Pressable>
          <Pressable style={[styles.icon, { borderColor: ink(0.28) }]}>
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <Path
                d="M8 14S1.5 10.2 1.5 5.9A3.4 3.4 0 0 1 8 4.3a3.4 3.4 0 0 1 6.5 1.6C14.5 10.2 8 14 8 14Z"
                stroke={ink(0.62)}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function Library() {
  const { ink, vw, mode } = useInk();
  const { colors } = useTheme();

  const [q, setQ] = useState("");
  const [tab, setTab] = useState<string>("all");
  const [shown, setShown] = useState(PAGE);

  const priceFor = (tier: string) =>
    (data.ladder as Record<string, Record<string, string>>).PKR?.[tier] ?? "";

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    // The reader's own shelves arrive in Phase 2; until then "Yours" and
    // "Wishlist" are honestly empty rather than pretending.
    if (tab !== "all") return [];
    if (!needle) return BOOKS;
    return BOOKS.filter(
      (b) =>
        b.title.toLowerCase().includes(needle) ||
        b.author.toLowerCase().includes(needle) ||
        String(b.year).includes(needle),
    );
  }, [q, tab]);

  return (
    <PortalPage
      kicker="Roman Reads · Your Account"
      title="Your Library."
      sub="Every copy you own, everything you’ve marked, and the whole catalogue behind them — one shelf, one search. Any book here can be bound and posted in seven days."
    >
      <View style={styles.zone}>
        {/* .rr-ly-reg — ≤860px: two columns */}
        <View style={styles.reg}>
          <View style={styles.regRow}>
            <Cell value="0" label="Yours" note="on the shelf, or on the bench" />
            <Cell value="0" label="Wishlist" note="marked for later" ruledLeft />
            <Cell
              value={String(data.total)}
              label="Catalogue"
              note="every title we can bind"
              ruledTop
            />
            <Cell value="7" label="Days" note="to bind and post any of them" ruledLeft ruledTop />
          </View>
        </View>

        <Text style={[styles.regnote, { color: colors.brown }]}>
          every hardcover brings its digital edition along — free, always.
        </Text>

        {/* fill row: "Your books, read aloud." — absent until it has content */}
        <ShelfRow
          title="Your books, read aloud."
          sub="titles from your shelves the house has pressed — the needle keeps your place."
          cards={[]}
        />

        {/* .rr-ly-bar */}
        <View style={[styles.bar, { borderTopColor: "rgba(126,45,31,.26)", borderBottomColor: ink(0.18) }]}>
          <View style={[styles.search, { borderColor: ink(0.4), backgroundColor: colors.white }]}>
            <Svg width={17} height={17} viewBox="0 0 16 16" fill="none">
              <Circle cx={7} cy={7} r={5} stroke={colors.ink2} strokeWidth={1.6} />
              <Path d="M11 11l4 4" stroke={colors.ink2} strokeWidth={1.6} strokeLinecap="round" />
            </Svg>
            <TextInput
              value={q}
              onChangeText={(v) => {
                setQ(v);
                setShown(PAGE);
              }}
              placeholder="Search title, author, or ISBN..."
              placeholderTextColor={ink(0.5)}
              selectionColor={colors.brass}
              style={[styles.searchIn, { color: colors.ink2 }]}
              autoCorrect={false}
            />
            {q ? (
              <Pressable onPress={() => setQ("")} style={[styles.searchX, { backgroundColor: ink(0.06) }]}>
                <Text style={{ color: ink(0.7), fontSize: 17, lineHeight: 20 }}>×</Text>
              </Pressable>
            ) : null}
          </View>

          {/* ≤760px: the tabs fill the row and scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.tabs, { borderColor: ink(0.26) }]}
            contentContainerStyle={{ gap: 3 }}
          >
            {TABS.map((t) => {
              const on = tab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => {
                    setTab(t.key);
                    setShown(PAGE);
                  }}
                  style={[styles.tab, on && { backgroundColor: colors.ink }]}
                >
                  <Text style={[styles.tabText, { color: on ? colors.paper : ink(0.62) }]}>
                    {t.label}
                  </Text>
                  <Text
                    style={[
                      styles.tabCount,
                      on
                        ? { color: colors.paper, borderColor: "transparent", backgroundColor: "rgba(250,247,239,.18)" }
                        : { color: ink(0.45), borderColor: ink(0.2) },
                    ]}
                  >
                    {t.key === "all" ? data.total : 0}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[styles.count, { color: ink(0.55) }]}>
            {results.length} {results.length === 1 ? "book" : "books"}
          </Text>
        </View>

        {/* .rr-ly-grid — ≤760px: two columns, gap 20/12 */}
        {results.length ? (
          <FlatList
            data={results.slice(0, shown)}
            keyExtractor={(b) => b.slug}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <View style={{ flex: 1 }}>
                <Card book={item} price={priceFor(item.tier)} />
              </View>
            )}
            onEndReachedThreshold={0.6}
            ListFooterComponent={
              shown < results.length ? (
                <Pressable
                  onPress={() => setShown((n) => n + PAGE)}
                  style={[styles.more, { borderColor: ink(0.3) }]}
                >
                  <Text style={[styles.moreText, { color: colors.ink2 }]}>
                    Show more ({results.length - shown} left)
                  </Text>
                </Pressable>
              ) : null
            }
          />
        ) : (
          /* .rr-ly-empty */
          <View style={styles.empty}>
            <Text style={[styles.emptyH, { color: colors.ink }]}>
              {tab === "owned" ? "Nothing on the shelf yet" : tab === "saved" ? "Nothing marked yet" : "No match"}
            </Text>
            <Text style={[styles.emptyP, { color: ink(0.6) }]}>
              {tab === "all"
                ? "Try a different title, author or year."
                : "Your own shelves arrive with Phase 2 — the catalogue below is live now."}
            </Text>
            <Pressable
              onPress={() => setTab("all")}
              style={[styles.btnGhost, { borderColor: ink(0.3) }]}
            >
              <Text style={[styles.btnText, { color: colors.ink2 }]}>Browse all books</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* .rr-ly-band */}
      <View
        style={[
          styles.band,
          {
            marginHorizontal: -vw(5),
            paddingHorizontal: vw(5),
            borderTopColor: ink(0.12),
            backgroundColor: mode === "dark" ? colors.cream1 : "#F6F1E6",
          },
        ]}
      >
        <Text style={[styles.bandH, { color: colors.ink }]}>Not on the shelf?</Text>
        <Text style={[styles.bandP, { color: ink(0.65) }]}>
          Name any book at all — in or out of the catalogue — and it comes back bound in
          seven days.
        </Text>
      </View>
    </PortalPage>
  );
}

const styles = StyleSheet.create({
  zone: { paddingTop: 2, paddingBottom: 24 },

  reg: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(126,45,31,.3)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(11,10,8,.16)",
  },
  regRow: { flexDirection: "row", flexWrap: "wrap" },
  // ≤760px: padding 13px 14px 12px
  cell: { width: "50%", gap: 1, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 12 },
  cellB: { fontFamily: FONTS.serifRegular, fontSize: 29, lineHeight: 29, letterSpacing: em(29, -0.02) },
  cellSpan: {
    marginTop: 7,
    fontFamily: FONTS.sansBold,
    fontSize: 8.5,
    letterSpacing: em(8.5, 0.22),
    textTransform: "uppercase",
  },
  cellEm: { fontFamily: FONTS.sans, fontSize: 11.5, lineHeight: 17.25 },
  regnote: {
    marginTop: 12,
    marginHorizontal: 2,
    fontFamily: FONTS.hand,
    fontSize: 15.5,
    transform: [{ rotate: "-0.7deg" }],
  },

  // ≤760px: padding 9px 0 10px; gap 10
  bar: {
    marginTop: 26,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    gap: 10,
  },
  search: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingLeft: 15,
    paddingRight: 8,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderRadius: 8,
  },
  searchIn: { flex: 1, fontFamily: FONTS.sansSemi, fontSize: 15.5, padding: 0 },
  searchX: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  tabs: { borderWidth: 1, borderRadius: 10, padding: 3, flexGrow: 0 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 7,
  },
  tabText: { fontFamily: FONTS.sansBold, fontSize: 12.5 },
  tabCount: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: "hidden",
  },
  count: { fontFamily: FONTS.sansBold, fontSize: 11, textAlign: "right", width: "100%" },

  grid: { paddingTop: 26, paddingBottom: 8, gap: 20 },
  // ≤760px: border-radius 14; padding 8
  card: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 8 },
  bk: {
    aspectRatio: 2 / 3,
    borderRadius: 10,
    overflow: "hidden",
  },
  bkWash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(239,222,190,.9)",
  },
  bkTypeCloth: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  bkTypeArt: { position: "absolute", top: 14, left: 13, right: 13 },
  bkBrand: {
    fontFamily: FONTS.sansBold,
    fontSize: 6.5,
    letterSpacing: em(6.5, 0.3),
    textTransform: "uppercase",
    color: "rgba(243,226,188,.7)",
    textAlign: "center",
  },
  bkBrandArt: {
    fontSize: 6,
    letterSpacing: em(6, 0.26),
    color: "rgba(23,20,17,.72)",
    textAlign: "left",
    marginBottom: 8,
  },
  bkTitle: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    lineHeight: 16.5,
    color: "#F3E2BC",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  bkTitleArt: {
    fontSize: 16,
    lineHeight: 15,
    letterSpacing: em(16, -0.025),
    textTransform: "uppercase",
    color: "#171411",
    textAlign: "left",
    paddingHorizontal: 0,
  },
  bkRule: { width: 24, height: 1, backgroundColor: "rgba(243,226,188,.45)", marginVertical: 10 },
  bkAuthor: {
    fontFamily: FONTS.sansBold,
    fontSize: 7,
    letterSpacing: em(7, 0.2),
    textTransform: "uppercase",
    color: "rgba(243,226,188,.75)",
    textAlign: "center",
  },
  bkAuthorArt: {
    fontSize: 6.6,
    letterSpacing: em(6.6, 0.16),
    color: "rgba(23,20,17,.76)",
    textAlign: "left",
  },

  // ≤760px: padding 10px 3px 9px
  info: { gap: 3, paddingHorizontal: 3, paddingTop: 10, paddingBottom: 9 },
  name: { fontFamily: FONTS.serif, fontSize: 15.5, lineHeight: 18.6 },
  by: { fontFamily: FONTS.sans, fontSize: 11.5 },
  meta: { fontFamily: FONTS.sansSemi, fontSize: 10, marginTop: 1 },

  // ≤760px: padding 9px 3px 2px; gap 7
  foot: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 7,
    flexWrap: "wrap",
    paddingHorizontal: 3,
    paddingTop: 9,
    paddingBottom: 2,
    borderTopWidth: 1,
  },
  price: { fontFamily: FONTS.sansBold, fontSize: 13 },
  incl: { fontFamily: FONTS.sansSemi, fontSize: 9.5, marginTop: 1 },
  acts: { flexDirection: "row", alignItems: "center", gap: 5, marginLeft: "auto" },
  act: {
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 999,
  },
  actText: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    letterSpacing: em(10, 0.08),
    textTransform: "uppercase",
  },
  // ≤760px: 32px
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  more: {
    marginTop: 22,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderWidth: 1,
    borderRadius: 999,
  },
  moreText: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    letterSpacing: em(11, 0.08),
    textTransform: "uppercase",
  },

  empty: { paddingTop: 40, paddingBottom: 20, alignItems: "center", gap: 10 },
  emptyH: { fontFamily: FONTS.serifRegular, fontSize: 24, textAlign: "center" },
  emptyP: { fontFamily: FONTS.sans, fontSize: 13.5, lineHeight: 21.6, textAlign: "center", maxWidth: 400 },
  btnGhost: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 999,
  },
  btnText: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    letterSpacing: em(11, 0.08),
    textTransform: "uppercase",
  },

  band: { borderTopWidth: 1, paddingTop: 52, paddingBottom: 60, alignItems: "center" },
  bandH: { fontFamily: FONTS.serifRegular, fontSize: 24, lineHeight: 28, textAlign: "center" },
  bandP: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    lineHeight: 23.8,
    marginTop: 10,
    maxWidth: 440,
    textAlign: "center",
  },
});
