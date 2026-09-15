// A book page's data — what app/data/bookPage.ts prints for /books/[slug],
// as the slice gen-book-pages.mjs bakes from the SAME modules the builder
// imports, typed here rather than inferred (TypeScript widens a generated
// object into a union of every shape it sees, so an optional field absent
// from the first entry reads as "does not exist").
//
// The catalogue itself is never restated: title, author, spine, year, pages
// and the subject come from the library floor (../library/data.ts), and this
// slice carries only what the page prints on top of a floor row. Run
//   node mobile/src/portal/book/gen-book-pages.mjs
// from the site's root after any catalogue change.

import pages from "./pages.json";
import { BOOKS, BY_SLUG, type LibraryBook, type ShelfBook } from "../library/data";
import type { CurrencyCode } from "../library/region";

/** What the template prints that the floor's row does not carry. */
export type BookPage = {
  /** CATEGORY_LABEL — "Classics", the kicker and the crumb. */
  cat: string;
  /** Book.authorShort — "Dostoevsky", the related shelf's line. */
  short: string;
  /** formatLabel() of each Book.formats entry — the chips and the fact. */
  fmts: string[];
  /** bindingLabel() lowercased — the price's small ("hardcover"). */
  bind: string;
  /** resolveCover() — the FULL board (the floor's `art` is the -lib tile). */
  art?: string;
  /** Per-art fade height, e.g. "48%". */
  shade?: string;
  /** The art carries its own type — print no overlay. */
  baked?: boolean;
  /** Google's categories, at most three. */
  subjects?: string[];
  isbn13?: string;
  isbn10?: string;
  /** Google's averageRating, 1–5. */
  rating?: number;
  /** A volumeId is on record — "Book data via Google Books." */
  google?: boolean;
  /** stock.ts: absent means in stock (every catalogue title is). */
  lead?: "print";
  /** Same category first, then same author, up to six slugs. */
  rel?: string[];
};

type LeadTime = { chip: string; line: string };

type Pages = {
  /** formatMoney(moneyForTier(tier, currency)) for every rung, per currency. */
  ladder: Record<CurrencyCode, Record<string, string>>;
  lead: { stock: LeadTime; print: LeadTime };
  books: Record<string, BookPage>;
};

const PAGES = pages as Pages;

/** The page for a slug, or null for a title outside the catalogue. */
export const bookPage = (slug: string): BookPage | null => PAGES.books[slug] ?? null;

/** The floor row the page stands on. */
export const bookRow = (slug: string): LibraryBook | null => BY_SLUG.get(slug) ?? null;

/**
 * "Rs 2,400" / "$42.49" — priceToken(tier) resolved in the reader's
 * currency, exactly as withPrices() phrases it on the web. An unknown tier
 * resolves to an empty string rather than leaking a key onto the page.
 */
export const priceLabel = (tier: string, currency: CurrencyCode): string =>
  PAGES.ladder[currency]?.[tier] ?? "";

/** leadTimeFor(slug) — the chip and its line. */
export const leadTimeOf = (page: BookPage): LeadTime => PAGES.lead[page.lead ?? "stock"];

/** The related shelf, as floor cards, in the builder's order. */
export const relatedOf = (page: BookPage): ShelfBook[] =>
  (page.rel ?? []).flatMap((slug) => {
    const b = BY_SLUG.get(slug);
    return b ? [b] : [];
  });

/**
 * "About the book" — the Google description flattened to paragraphs, or []
 * when we are still writing it. The prose lives in notes.json (~345KB) and
 * is required HERE, inside a function, on purpose: Expo's Metro config
 * leaves inlineRequires off, so a top-level import would be evaluated at
 * boot for every launch that never opens a book.
 */
export function bookNotes(slug: string): string[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const notes = require("./notes.json") as Record<string, string[]>;
  return notes[slug] ?? [];
}

/** starsHtml() — "★★★★☆" for a rounded rating. */
export const stars = (rating: number): string => {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
};

/** Every catalogue slug has a page; the floor and this slice are baked together. */
if (__DEV__) {
  const missing = BOOKS.filter((b) => !PAGES.books[b.slug]).map((b) => b.slug);
  if (missing.length) {
    console.warn(
      `[book] floor.json has ${missing.length} books pages.json does not — rerun gen-book-pages.mjs: ` +
        missing.slice(0, 5).join(", "),
    );
  }
}
