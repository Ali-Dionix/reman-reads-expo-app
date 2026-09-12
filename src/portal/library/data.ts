// Your Library's data — the slice gen-library-floor.mjs bakes from the SAME
// modules app/data/accountLibraryPage.ts imports, typed here rather than
// inferred (TypeScript widens a generated array into a union of every literal
// shape it sees, so an optional field absent from the first entry reads as
// "does not exist").
//
// Everything the web's LibraryRoomEnhancer decides at runtime — which tab is
// up, what matched, which facet holds a pick — is decided by the hooks below
// over these records. The catalogue itself is never restated: run
//   node mobile/src/portal/library/gen-library-floor.mjs
// from the site's root after any catalogue change.

import { useMemo } from "react";

import floor from "./floor.json";
import { useCurrency, type CurrencyCode } from "./region";

/** One shelf card — the fields shelfCardHtml() takes. */
export type ShelfBook = {
  slug: string;
  title: string;
  author: string;
  spine: string;
  /** -lib.webp tile, already through gridCover(); a site path. */
  art?: string;
  /** Per-art fade height, e.g. "48%". */
  shade?: string;
  /** The art carries its own type — print no overlay. */
  baked?: boolean;
};

/** One grid row — the fields cardHtml() prints, plus its facet keys. */
export type LibraryBook = ShelfBook & {
  subject: string;
  subjectLabel: string;
  author_key: string;
  year: string;
  /** Length band key: s / m / l / x, or u for an unknown page count. */
  len: string;
  /** Price band key: 1–4. */
  price: string;
  tier: string;
  pages?: number;
  /** searchText() from accountLibraryPage.ts — title, author, category,
   *  subject, year, keywords and both ISBNs, lowercased, quotes out. */
  search: string;
};

export type Rail = { key: string; label: string; n: number; books: ShelfBook[] };
export type Wing = { key: string; label: string; hint: string; count: number; rails: Rail[] };

export type Facet = { key: string; label: string; n: number; hint?: string };

type Floor = {
  total: number;
  claim: string;
  wings: Wing[];
  facets: {
    subjects: Facet[];
    authors: Facet[];
    lengths: Facet[];
    prices: { key: string; n: number }[];
  };
  /** bandLabel(key, currency) from pricing.ts, for each of the three currencies. */
  bands: Record<CurrencyCode, Record<string, string>>;
  books: LibraryBook[];
};

const FLOOR = floor as Floor;

/** Every catalogue book, covers first — the grid's order. */
export const BOOKS: LibraryBook[] = FLOOR.books;
export const TOTAL = FLOOR.total;
/** CATALOG_SIZE_CLAIM — "20,000+". */
export const CLAIM = FLOOR.claim;
export const WINGS: Wing[] = FLOOR.wings;
export const BY_SLUG = new Map(BOOKS.map((b) => [b.slug, b]));

/* ----------------------------------------------------------- the tabs --- */

export type Tab = "files" | "owned" | "saved" | "all";
export const TAB_KEYS: Tab[] = ["files", "owned", "saved", "all"];

/** TABS from accountLibraryPage.ts, verbatim. */
export const TABS: { key: Tab; label: string }[] = [
  { key: "files", label: "Your files" },
  { key: "owned", label: "Yours" },
  { key: "saved", label: "Wishlist" },
  { key: "all", label: "All" },
];

/** HEADING / EMPTY from LibraryRoomEnhancer.tsx, verbatim. */
export const HEADING: Record<Tab, string> = {
  files: "Files you brought in",
  owned: "Books you own",
  saved: "Your wishlist",
  all: "The whole catalogue",
};

export const EMPTY: Record<Tab, { head: string; sub: string; cta: string }> = {
  files: {
    head: "Nothing brought in yet",
    sub: "Anything you upload appears here beside the books you own. Use the plus button to bring in a PDF, an EPUB, a page from the web, or photographs of a page.",
    cta: "Browse all books",
  },
  owned: {
    head: "Nothing on your shelf yet",
    sub: "Buy a printed book and it appears here the moment you order it.",
    cta: "Browse all books",
  },
  saved: {
    head: "Nothing on your wishlist",
    sub: "Tap the heart on any book and it waits here until you want it. The shelf doesn't judge.",
    cta: "Browse all books",
  },
  all: {
    head: "Nothing matched",
    sub: "Try a different spelling, or name the book outright and we'll print a copy for you.",
    cta: "Clear the search",
  },
};

export const FILTERED_EMPTY = {
  head: "No books match these filters",
  sub: "Try removing a filter or changing your search.",
  cta: "Clear filters",
};

/* --------------------------------------------------------- the facets --- */

export type FacetKey = "s" | "a" | "n" | "p";
export type Picks = Record<FacetKey, Set<string>>;

export const emptyPicks = (): Picks => ({ s: new Set(), a: new Set(), n: new Set(), p: new Set() });
export const pickCount = (p: Picks): number => p.s.size + p.a.size + p.n.size + p.p.size;

/**
 * A price band's label in the reader's currency — pricing.ts's bandLabel(),
 * baked per currency into the slice so "Rs 801 – 1,200" and "$26.50 – 30.49"
 * are the site's own strings, never re-phrased here.
 */
export const bandLabel = (key: string, currency: CurrencyCode): string => FLOOR.bands[currency]?.[key] ?? "";

export type FacetFold = { key: FacetKey; title: string; hint: string; noun?: string; options: Facet[] };

/** FACETS — the four folds, in the row's order, with their titles and hints.
 *  Only the Price fold's labels differ by currency; the keys never do. */
export const facetsFor = (currency: CurrencyCode): FacetFold[] => [
  { key: "s", title: "Subject", hint: `${FLOOR.facets.subjects.length} subjects`, noun: "a subject", options: FLOOR.facets.subjects },
  { key: "a", title: "Author", hint: `${FLOOR.facets.authors.length} authors`, noun: "an author", options: FLOOR.facets.authors },
  { key: "n", title: "Length", hint: "By page count", options: FLOOR.facets.lengths },
  {
    key: "p",
    title: "Price",
    hint: `${FLOOR.facets.prices.length} price ranges`,
    options: FLOOR.facets.prices.map((b) => ({ key: b.key, label: bandLabel(b.key, currency), n: b.n })),
  },
];

/** The folds in the reader's own currency (region.ts: ROW -> USD until known). */
export function useFacets(): FacetFold[] {
  const currency = useCurrency();
  return useMemo(() => facetsFor(currency), [currency]);
}

export const facetValue = (b: LibraryBook, f: FacetKey): string =>
  f === "s" ? b.subject : f === "a" ? b.author_key : f === "n" ? b.len : b.price;

/** Which catalogue rows a search + the picks leave standing, in shelf order.
 *  The needle is tested against the slice's own searchText() blob — the same
 *  eight fields the web's filter reads, ISBNs included. */
export function hits(books: LibraryBook[], q: string, picks: Picks): LibraryBook[] {
  const needle = q.trim().toLowerCase();
  return books.filter((b) => {
    if (needle && !b.search.includes(needle)) return false;
    for (const f of ["s", "a", "n", "p"] as FacetKey[]) {
      if (picks[f].size && !picks[f].has(facetValue(b, f))) return false;
    }
    return true;
  });
}

/* ---------------------------------------------------- the reader's marks --- */

/** What ownedBySlug() holds per slug on the web: the order's binding and status. */
export type OwnedCopy = { binding: string; statusLine: string };
export type Marks = { owned: Map<string, OwnedCopy>; saved: Set<string> };

/** The row's own line — LibraryRoomEnhancer.tsx render(): the binding cut at
 *  its first comma or dash, a middle dot, the status line. */
export const ownLine = (copy: OwnedCopy): string =>
  `${copy.binding.split(/[,—]/)[0].trim()} · ${copy.statusLine}`;

/**
 * The reader's own marks — what LibraryRoomEnhancer draws from PortalState.
 * The guest's state is portalClient.ts's defaultPortalState(): three on the
 * shelf, two on the old waitlist, read together and cut to the catalogue.
 */
const DEFAULT_SHELF = ["crime-and-punishment", "meditations", "the-little-prince"];
const DEFAULT_WAITLIST = ["the-brothers-karamazov", "1984"];

export function guestMarks(): Marks {
  return {
    owned: new Map(),
    saved: new Set([...DEFAULT_SHELF, ...DEFAULT_WAITLIST].filter((s) => BY_SLUG.has(s))),
  };
}

/**
 * The marks the room draws for this session. A guest reads the sample state
 * above; a signed-in reader's shelf_items and orders are not yet read through
 * the session, so their shelf is honestly empty — the site's own empty rooms
 * (savedSet() / ownedBySlug() over an empty PortalState), never the guest's
 * sample under a real name.
 * TODO(Phase 2): read the signed-in reader's shelf_items and orders here.
 */
export function readerMarks(guest: boolean): Marks {
  return guest ? guestMarks() : { owned: new Map(), saved: new Set() };
}
