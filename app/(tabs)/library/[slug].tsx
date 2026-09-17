// /books/[slug] — a book's page, in the app.
//
// A transcription of app/data/bookPage.ts's `body` at the ≤760px branch, in
// its order: the crumb, the hero (the cover over the main column — kicker,
// title, by, the stat line, the price row, the two presses, the note, the
// format chips, the read-aloud line, "About the book"), "The details",
// "More books like this", and the closing band outside the wrap. The frame
// is the portal's (the site's public nav and footer are not the app's
// chrome); the measures inside it are the book page's own, `.rr-bk-wrap`'s
// 5vw gutters and all.
//
// BUYING IS IN THE APP NOW. Browsing moved into the app on 9 Sep 2026 and
// buying followed on the 14th (owner: "integrate Stripe directly in the
// app"): the site's "Add to cart" is "Order this book" here, and it opens
// the checkout screen behind this page (./checkout.tsx), which takes the
// delivery address and the card in Stripe's own sheet — the site prices and
// settles, the app presents (src/lib/payments.ts). The wishlist heart flips
// the same shelf_items row the site's does
// (../../../src/portal/library/marks.ts), so the Wishlist shelf in the room
// behind this page and the site's own counter agree.
//
// WHAT THE APP ADDS. The site's read-aloud line is a sentence; here, on a
// book the house has pressed, it is also the way in — a tap opens the
// volume in Audiobooks (`/listening?book=<slug>`, the room's own deep link).
// The app is the listening client; a page that names the audiobook and
// cannot open it would be the one thing worse than the website.
//
// The data is the floor's row (title, author, spine, year, pages, subject)
// plus the page slice (../../../src/portal/book/data.ts), both baked from
// the site's modules; the prose is required on first open, never at boot.

import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";

import { recordingFor } from "../../../src/lib/audioStore";
import { HERO_MAX, HeroCover } from "../../../src/portal/book/Cover";
import {
  bookNotes,
  bookPage,
  bookRow,
  leadTimeOf,
  priceLabel,
  relatedOf,
  stars,
  type BookPage,
} from "../../../src/portal/book/data";
import { bookHref } from "../../../src/portal/book/href";
import { Chip, Crumb, Facts, Fmt, Press, Sect, Shelf, Stat, type Fact } from "../../../src/portal/book/parts";
import { EmptyRoom } from "../../../src/portal/library/Grid";
import { useSaved } from "../../../src/portal/library/marks";
import { useCurrency } from "../../../src/portal/library/region";
import { PortalPage, Wrap } from "../../../src/portal/PortalPage";
import { useInk } from "../../../src/theme/ink";
import { Txt } from "../../../src/ui/Type";
import { haptic } from "../../../src/ui/haptics";

/** ShopDock's two labels for [data-rr-shop-wish], verbatim. */
const WISH_OFF = "Add to wishlist";
const WISH_ON = "On your wishlist ✓";

export default function Book() {
  const { slug: raw } = useLocalSearchParams<{ slug: string }>();
  const slug = typeof raw === "string" ? raw : "";
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { ink, brown, vw, clamp } = useInk();

  const row = bookRow(slug);
  const page = bookPage(slug);
  const currency = useCurrency();
  const { saved, ready, toggle } = useSaved();
  // the prose, on first open only (data.ts explains the require)
  const notes = useMemo(() => (row ? bookNotes(slug) : []), [row, slug]);

  // .rr-bk-wrap{padding:0 5vw} — the page's own gutters, not the portal's 20
  const gutter = vw(5);
  const inner = width - gutter * 2;

  const toLibrary = () => router.navigate("/library");

  if (!row || !page) {
    // a slug outside the catalogue — the site 404s; the app keeps its frame
    return (
      <PortalPage title="Book" eyebrow="Library" back="/library">
        <Wrap>
          <EmptyRoom
            head="Not in the catalogue"
            sub="We do not list this book. Every title we do is on the shelf behind this page."
            cta="Browse all books"
            onCta={toLibrary}
          />
        </Wrap>
      </PortalPage>
    );
  }

  const price = priceLabel(row.tier, currency);
  const lead = leadTimeOf(page);
  const related = relatedOf(page);
  const onList = saved.has(slug);
  const recording = recordingFor(slug);

  // the order is placed and paid IN the app — the checkout screen behind
  // this page; it opens the website itself on a build with no sheet
  const order = () => router.push({ pathname: "/library/checkout", params: { slug } });
  const wish = () => {
    // the rows have not been read yet: a flip now would be overwritten by
    // the read landing a moment later
    if (!ready) return;
    haptic.tap();
    void toggle(slug);
  };
  const listen = () => router.navigate({ pathname: "/listening", params: { book: slug } });

  const stat = [row.year, row.pages ? `${row.pages} pages` : null, "Original or simplified"].filter(
    (s): s is string => !!s,
  );

  const facts: Fact[] = [
    { label: "Published", value: row.year },
    ...(row.pages ? [{ label: "Length", value: `${row.pages} pages` }] : []),
    { label: "Category", value: page.cat },
    { label: "Formats", value: page.fmts.join(", ") },
    ...(page.subjects?.length ? [{ label: "Subjects", value: page.subjects.join(", ") }] : []),
    ...(page.isbn13 ? [{ label: "ISBN-13", value: page.isbn13 }] : []),
    ...(page.isbn10 ? [{ label: "ISBN-10", value: page.isbn10 }] : []),
    { label: "Publisher", value: "Roman Reads Press" },
  ];

  return (
    <PortalPage title={row.title} eyebrow="Library" back="/library">
      {/* .rr-bk-wrap */}
      <View style={{ paddingHorizontal: gutter, maxWidth: 1080, width: "100%", alignSelf: "center" }}>
        {/* .rr-bk-crumb{padding:30px 0 0} — 30 under the nav's box; the frame
            already hangs the tear's 20 */}
        <View style={{ paddingTop: 10 }}>
          <Crumb category={page.cat} title={row.title} onBooks={toLibrary} />
        </View>

        {/* .rr-bk-hero — one column at this width: gap 24, padding 26px 0 8px */}
        <View style={{ paddingTop: 26, paddingBottom: 8, gap: 24 }} accessibilityLabel={row.title}>
          {/* .rr-bk-covwrap{max-width:250px} */}
          <HeroCover page={page} title={row.title} author={row.author} spine={row.spine} width={Math.min(HERO_MAX, inner)} />

          {/* .rr-bk-main */}
          <View>
            <Txt weight={700} size={10} ls={0.2} upper color="brass">
              {page.cat}
            </Txt>
            {/* .rr-bk-h1 — clamp(34px,4.6vw,52px)/1.03, -.01em, Cormorant 500 */}
            <Txt family="Cormorant Garamond" weight={500} size={clamp(34, 4.6, 52)} line={1.03} ls={-0.01} style={{ marginTop: 10 }}>
              {row.title}
            </Txt>
            <Txt size={16} tone={0.7} style={{ marginTop: 12 }}>
              by{" "}
              <Txt weight={700} size={16} color="ink2">
                {row.author}
              </Txt>
            </Txt>
            <Stat items={stat} stars={page.rating ? stars(page.rating) : undefined} />

            {/* .rr-bk-buy — 22 above, 18 of padding under a brown .28 rule */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                columnGap: 18,
                rowGap: 14,
                marginTop: 22,
                paddingTop: 18,
                borderTopWidth: 1,
                borderTopColor: brown(0.28, "border"),
              }}
            >
              <Txt weight={800} size={21} color="ink2" style={{ fontVariant: ["tabular-nums"] }}>
                {price}
                <Txt weight={600} size={12} tone={0.5}>
                  {"  "}
                  {page.bind}
                </Txt>
              </Txt>
              <Chip label={lead.chip} />
            </View>

            {/* .rr-bk-cta — the site's "Add to cart" is the order press here */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 22 }}>
              <Press label="Order this book" onPress={order} accessibilityLabel={`Order ${row.title}`} />
              <Press
                label={onList ? WISH_ON : WISH_OFF}
                ghost
                on={onList}
                onPress={wish}
                accessibilityLabel={onList ? `Take ${row.title} off your wishlist` : `Add ${row.title} to your wishlist`}
              />
            </View>

            {/* .rr-bk-note — Caveat 500 15px brown, rotated -.6deg */}
            <Txt family="Caveat" weight={500} size={15} color="brown" style={{ marginTop: 12, transform: [{ rotate: "-0.6deg" }] }}>
              it is in stock, and it reaches you in 1 to 2 days.
            </Txt>

            {/* .rr-bk-fmts */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 22 }}>
              {page.fmts.map((f) => (
                <Fmt key={f} label={f} />
              ))}
            </View>

            {/* .rr-bk-incl — and, on a pressed book, the way into the volume */}
            <Txt size={12.5} line={1.6} tone={0.55} style={{ marginTop: 12, maxWidth: 52 * 7 }}>
              <Txt weight={700} size={12.5} line={1.6} tone={0.75}>
                This book is read out loud, in a voice you pick.
              </Txt>{" "}
              The audiobook needs the subscription, $14.99 a month.
            </Txt>
            {recording ? (
              <Pressable
                onPress={listen}
                accessibilityRole="link"
                accessibilityLabel={`Open ${row.title} in Audiobooks`}
                hitSlop={6}
                style={{ alignSelf: "flex-start", marginTop: 10, paddingBottom: 3, borderBottomWidth: 1.5, borderBottomColor: ink(1, "border") }}
              >
                <Txt weight={700} size={9} ls={0.14} upper>
                  Open it in Audiobooks →
                </Txt>
              </Pressable>
            ) : null}

            {/* .rr-bk-desc */}
            <View style={{ marginTop: 26 }}>
              <Txt family="Cormorant Garamond" weight={600} size={20} color="ink2" style={{ marginBottom: 10 }}>
                About the book
              </Txt>
              {notes.length ? (
                notes.map((p, i) => (
                  <Txt key={i} size={15.5} line={1.7} tone={0.78} style={{ marginBottom: i === notes.length - 1 ? 0 : 12, maxWidth: 60 * 8.5 }}>
                    {p}
                  </Txt>
                ))
              ) : (
                // .muted — italic on a face with no italic cut: the browser
                // slants it, and so does the phone
                <Txt size={15.5} line={1.7} tone={0.55} style={{ fontStyle: "italic", maxWidth: 60 * 8.5 }}>
                  We are still writing the description. In the meantime: {row.title} comes in the Original or the
                  Simplified edition, printed, with AI notes in the margin explaining the difficult lines.
                </Txt>
              )}
            </View>
          </View>
        </View>

        <Sect title="The details" label="Edition details">
          <Facts facts={facts} />
          {page.google ? (
            <Txt weight={500} size={11.5} tone={0.42} style={{ marginTop: 12 }}>
              Book data via Google Books.
            </Txt>
          ) : null}
        </Sect>

        {related.length ? (
          <Sect title="More books like this">
            <Shelf books={related} shortOf={shortOf} width={inner} onOpen={(s) => router.push(bookHref(s))} />
          </Sect>
        ) : null}
      </View>

      {/* .rr-bk-close — outside the wrap: 56 above, a 1px ink .12 rule, centred */}
      <View
        accessibilityLabel="Get the book"
        style={{
          marginTop: 56,
          paddingTop: 44,
          paddingBottom: 56,
          paddingHorizontal: gutter,
          borderTopWidth: 1,
          borderTopColor: ink(0.12, "border"),
          alignItems: "center",
        }}
      >
        <Txt family="Cormorant Garamond" weight={500} size={clamp(24, 3, 34)} style={{ textAlign: "center" }}>
          Order this book.
        </Txt>
        <Txt size={14} line={1.7} tone={0.65} style={{ marginTop: 10, maxWidth: 440, textAlign: "center" }}>
          {price} for the printed copy.
        </Txt>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 22 }}>
          <Press label="Order this book" onPress={order} accessibilityLabel={`Order ${row.title}`} />
          <Press label="Back to all books" ghost onPress={toLibrary} />
        </View>
      </View>
    </PortalPage>
  );
}

/** Book.authorShort for a related tile — the page slice carries it per book. */
const shortOf = (slug: string): string => {
  const p: BookPage | null = bookPage(slug);
  return p?.short ?? bookRow(slug)?.author ?? "";
};
