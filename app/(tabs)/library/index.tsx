// /account/library — Your library.
//
// A transcription of app/data/accountLibraryPage.ts's `bodyHtml` at its app
// pass, in its order: the room head inside `.rr-pt-wrap`, then `.rr-ly-zone`
// — the sticky bar (search, the four shelf tabs, the filter field), the genre
// floor OR the list (never both), the pager and the empty room — and, outside
// the wrap, edge to edge, the "Cannot find the book you want?" band. The
// frame, bar and tab bar are the kit's; the pieces are src/portal/library/.
//
// THE BAR STICKS UNDER THE TOP BAR, at `--ap-toph` (the 60px bar plus the
// 20px its tear hangs) — the kit frame's `sticky` seam: the head is the
// `lead`, the bar the `sticky` child, and the flow spacing between them is
// the builder's own (2 + 2 + 6px between the paragraph and the bar).
//
// BROWSE OR RESULTS, NEVER BOTH (LibraryRoomEnhancer.tsx): the floor shows
// while the reader is on the whole catalogue with nothing typed and nothing
// ticked; the moment a query, a pick or another tab lands, the list replaces
// it. Tapping a book pushes its page (./[slug].tsx) on this room's own stack
// — the site's /books/<slug>, in the app; only the ORDER press on that page
// leaves for the website, since docs/APP-FULL-PARITY.md §2 keeps buying there.

import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";

import { Head, PortalPage, TOP_BOX, Wrap } from "../../../src/portal/PortalPage";
import { Band } from "../../../src/portal/library/Band";
import { Bar } from "../../../src/portal/library/Bar";
import { FilterSheet } from "../../../src/portal/library/Filters";
import { Floor, useLibraryScroll } from "../../../src/portal/library/Floor";
import { BookRow, EmptyRoom, FileNote, PAGE_SIZE, Pager } from "../../../src/portal/library/Grid";
import {
  BOOKS,
  CLAIM,
  EMPTY,
  FILTERED_EMPTY,
  emptyPicks,
  hits,
  ownLine,
  ownedMarks,
  pickCount,
  type FacetKey,
  type Picks,
  type Tab,
} from "../../../src/portal/library/data";
import { useSaved } from "../../../src/portal/library/marks";
import { bookHref } from "../../../src/portal/book/href";
import { Txt } from "../../../src/ui/Type";

export default function Library() {
  const router = useRouter();

  // The reader's marks. The wishlist is live (marks.ts — the same set the
  // book page's heart flips); the owned shelf stays empty until the orders
  // arrive through the session in Phase 2 (see data.ts).
  const { saved } = useSaved();
  const owned = useMemo(() => ownedMarks(), []);
  const marks = useMemo(() => ({ owned, saved }), [owned, saved]);

  // Land on the shelf that actually has something on it (the enhancer's rule).
  const [tab, setTab] = useState<Tab>(() => (marks.owned.size ? "owned" : "all"));

  // The book's own page, on this room's stack — back returns here.
  const open = (slug: string) => router.push(bookHref(slug));

  // The band's "Browse all books" — the site's /library, which is this room:
  // the whole catalogue, nothing typed, nothing ticked, from the top.
  const browseAll = () => {
    setTab("all");
    setQ("");
    setPicks(emptyPicks());
    setOpenFacet(null);
    setPage(1);
    scroller.current?.scrollTo({ y: 0, animated: true });
  };
  const [q, setQ] = useState("");
  const [picks, setPicks] = useState<Picks>(emptyPicks);
  const [openFacet, setOpenFacet] = useState<FacetKey | null>(null);
  const [page, setPage] = useState(1);

  // scrollToGrid() — the enhancer lands the reader on the new rows: the
  // gridzone's top 150px from the VIEWPORT's top, so the bar and a breath of
  // paper stay above. gridY is in scroller content coordinates and the
  // scroller itself starts TOP_BOX below the screen top (the web viewport
  // already excludes the status bar), so the box comes back in.
  const scroller = useRef<ScrollView>(null);
  const wrapY = useRef(0);
  const gridY = useRef(0);
  // the floor mounts covers near the viewport only; this carries the
  // scroller's position to it without a render of this room (Floor.tsx)
  const floorScroll = useLibraryScroll();
  const goPage = (n: number) => {
    setPage(n);
    scroller.current?.scrollTo({ y: Math.max(0, gridY.current - 150 + TOP_BOX), animated: true });
  };

  const onFiles = tab === "files";
  const live = pickCount(picks);
  const browsing = tab === "all" && !q.trim() && live === 0;

  const inTab = useMemo(
    () =>
      tab === "all"
        ? BOOKS
        : tab === "owned"
          ? BOOKS.filter((b) => marks.owned.has(b.slug))
          : tab === "saved"
            ? BOOKS.filter((b) => marks.saved.has(b.slug))
            : [],
    [tab, marks],
  );
  const found = useMemo(() => hits(inTab, q, picks), [inTab, q, picks]);
  const pages = Math.max(1, Math.ceil(found.length / PAGE_SIZE));
  const at = Math.min(page, pages);
  const shown = found.slice((at - 1) * PAGE_SIZE, at * PAGE_SIZE);

  // TODO(imports): the Files shelf is GET /api/imports on the web; the app has
  // no import sheet yet, so the shelf is honestly empty for now.
  const fileRows = 0;
  const n = onFiles ? fileRows : found.length;
  const noun = onFiles ? (n === 1 ? "file" : "files") : n === 1 ? "book" : "books";
  const countText = q.trim() ? `${n} ${noun} matched` : `${n} ${noun}`;

  const pick = (f: FacetKey, key: string) => {
    setPicks((p) => {
      const next = new Set(p[f]);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...p, [f]: next };
    });
    setPage(1);
  };
  const clearPicks = () => {
    setPicks(emptyPicks());
    setPage(1);
  };
  const seeAll = (subject: string) => {
    // "See all" opens that subject in the grid — the same pick as the fold's.
    setPicks({ ...emptyPicks(), s: new Set([subject]) });
    setTab("all");
    setPage(1);
  };
  const empty = live
    ? FILTERED_EMPTY
    : q.trim()
      ? EMPTY.all
      : EMPTY[tab];
  const onEmptyCta = () => {
    if (live) clearPicks();
    else if (q.trim()) setQ("");
    else setTab("all");
    setPage(1);
  };

  return (
    <PortalPage
      ref={scroller}
      title="Library"
      back="/"
      keyboardShouldPersistTaps="handled"
      onScroll={floorScroll.onScroll}
      // the filter panel stands over the room, pinned to the window — the
      // site's position:fixed; inside the scroller it sat at the foot of
      // the floor, out of sight from the chips that open it
      overlay={
        openFacet ? (
          <FilterSheet
            facet={openFacet}
            picks={picks}
            onPick={pick}
            onClose={() => setOpenFacet(null)}
            hitCount={found.length}
          />
        ) : null
      }
      lead={
        // .rr-ly-head — padding 2px 0 (the kit's Head, at this room's -.012em);
        // then .rr-ly-zone's own 2px and the bar's 6px
        <Wrap style={{ marginBottom: 2 + 6 }}>
          <Head
            title="Your library."
            ls={-0.012}
            sub={`The books you own, the ones you saved for later, and the ${CLAIM} more you can buy. Every book here is in stock and reaches you in 1–2 days.`}
          />
        </Wrap>
      }
      sticky={
        // .rr-ly-bar — sticky under the top bar
        <Wrap>
            <Bar
              q={q}
              onQuery={(v) => {
                setQ(v);
                setPage(1);
              }}
              tab={tab}
              onTab={(t) => {
                setTab(t);
                setPage(1);
                setOpenFacet(null);
              }}
              counts={{ files: fileRows, owned: marks.owned.size, saved: marks.saved.size }}
              picks={picks}
              openFacet={openFacet}
              onOpenFacet={setOpenFacet}
              onClearPicks={clearPicks}
              onUnpick={pick}
              countText={countText}
            />
        </Wrap>
      }
    >
        <View
          onLayout={(e) => {
            // The gridzone's offset in the scroller is this box's plus its own.
            wrapY.current = e.nativeEvent.layout.y;
            // and the floor is this box's first child
            floorScroll.setFloorTop(e.nativeEvent.layout.y);
          }}
        >
          <Wrap style={{ paddingBottom: 24 }}>
            {browsing ? (
              <Floor onOpen={(b) => open(b.slug)} onSeeAll={seeAll} scroll={floorScroll} />
            ) : (
              <>
                {onFiles ? null : (
                  // .rr-ly-regnote — hidden while browsing and on the Files tab
                  <Txt size={12.5} line={19.375} tone={0.55} style={{ marginTop: 10, marginHorizontal: 2 }}>
                    Every book you buy or add shows up on this shelf.
                  </Txt>
                )}
                {/* .rr-ly-gridzone */}
                <View
                  style={{ paddingTop: 18, paddingBottom: 8 }}
                  onLayout={(e) => {
                    gridY.current = wrapY.current + e.nativeEvent.layout.y;
                  }}
                >
                  {onFiles ? (
                    // renderFiles(): a query that matches no file is one line, no head
                    q.trim() ? (
                      <FileNote body="No file of yours matches that." />
                    ) : (
                      <FileNote head={EMPTY.files.head} body={EMPTY.files.sub} />
                    )
                  ) : shown.length ? (
                    <>
                      <View>
                        {shown.map((b, i) => (
                          <BookRow
                            key={b.slug}
                            book={b}
                            ownLine={marks.owned.has(b.slug) ? ownLine(marks.owned.get(b.slug)!) : undefined}
                            first={i === 0}
                            onPress={() => open(b.slug)}
                          />
                        ))}
                      </View>
                      <Pager page={at} pages={pages} onPage={goPage} />
                    </>
                  ) : (
                    <EmptyRoom head={empty.head} sub={empty.sub} cta={empty.cta} onCta={onEmptyCta} />
                  )}
                </View>
              </>
            )}
          </Wrap>
        </View>

        <Band onBrowse={browseAll} />
    </PortalPage>
  );
}
