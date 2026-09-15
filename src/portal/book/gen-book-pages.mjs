// Bake the book pages for the app.
//
// /books/[slug] on the site is app/data/bookPage.ts: one template over the
// catalogue, folding in the Google Books cache (description, page count,
// ISBNs, subjects, rating), the price ladder, the lead time and a related
// shelf. The app must not restate any of it, so this imports the SAME
// modules the builder imports and writes exactly the slice the phone paints
// — everything the library floor (floor.json) does not already carry — to
// ./pages.json. Same idea and the same loader hooks as gen-library-floor.mjs
// next door; run it from the SITE repo's root after any catalogue change or
// a `npm run books:enrich`:
//
//   node mobile/src/portal/book/gen-book-pages.mjs
//
// Node 22+ strips the types on import, so there is no build step to own.
//
// TWO FILES, AND THE SPLIT IS THE POINT. The descriptions are the weight:
// ~340KB of prose across 443 books. They ride in the bundle rather than over
// the wire because the site has no route that answers them (the page is
// server-rendered HTML), and a book page that needs the network to say what
// the book is about is a worse app than one that carries a few hundred
// kilobytes. But Expo's Metro config leaves inlineRequires OFF, so anything a
// route file imports at the top is evaluated at boot; the prose therefore
// goes to notes.json, which data.ts require()s inside a function — parsed on
// the first book opened, never at launch — and everything else (a few
// short fields per book, the ladder, the lead times) stays in pages.json.

import { writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");

const site = (p) => pathToFileURL(join(ROOT, p)).href;

const EXTS = [".ts", ".tsx", ".json", "/index.ts"];
registerHooks({
  resolve(specifier, context, next) {
    let result;
    try {
      result = next(specifier, context);
    } catch (err) {
      if (err?.code !== "ERR_MODULE_NOT_FOUND" || !specifier.startsWith(".")) throw err;
      for (const ext of EXTS) {
        try {
          result = next(specifier + ext, context);
          break;
        } catch {
          /* try the next one */
        }
      }
      if (!result) throw err;
    }
    if (result.url?.endsWith(".json")) {
      result.importAttributes = { ...result.importAttributes, type: "json" };
    }
    return result;
  },
});

const { BOOKS, bindingLabel } = await import(site("app/data/catalog.ts"));
const { bookMeta, coverIsBaked, resolveCover } = await import(site("app/data/bookMeta.ts"));
const { bookSlug } = await import(site("app/data/portalShared.ts"));
const { PRICE_TIERS, formatMoney, moneyForTier } = await import(site("app/data/pricing.ts"));
const { CURRENCIES } = await import(site("app/data/region.ts"));
const { IN_STOCK_LEAD, PRINTED_LEAD, isInStock } = await import(site("app/data/stock.ts"));

/* The site's strings are authored as HTML; the phone renders text. Decoded once here. */
const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", hellip: "…", middot: "·",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", ccedil: "ç",
  uuml: "ü", ouml: "ö", auml: "ä", ntilde: "ñ", iacute: "í",
  oacute: "ó", aacute: "á", uacute: "ú", szlig: "ß", oslash: "ø",
  aring: "å", ae: "æ", sect: "§", ordm: "º", rarr: "→", larr: "←",
};
const decode = (s) =>
  typeof s === "string"
    ? s
        .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16)))
        .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name] ?? ENTITIES[name.toLowerCase()] ?? m)
    : s;

/* CATEGORY_LABEL and FORMAT_LABEL — bookPage.ts, kept identical. */
const CATEGORY_LABEL = {
  classics: "Classics",
  philosophy: "Philosophy",
  fiction: "Fiction",
  "self-growth": "Self-Growth",
  knowledge: "Knowledge",
};
const FORMAT_LABEL = { simplified: "Simplified", "ai-notes": "AI margin notes" };
const formatLabel = (f, book) => (f === "physical" ? bindingLabel(book) : FORMAT_LABEL[f]);

/** descParagraphs() — bookPage.ts: Google descriptions arrive with stray
 *  HTML; flatten to clean paragraphs. The site escapes them for HTML at the
 *  end; the phone decodes them for text instead. */
const descParagraphs = (raw) => {
  if (!raw) return [];
  return raw
    .replace(/<\/(p|div)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(decode);
};

/** related — bookPage.ts: same category first, then same author, up to 6. */
const relatedOf = (book) =>
  [
    ...BOOKS.filter((b) => b !== book && b.category === book.category),
    ...BOOKS.filter((b) => b !== book && b.category !== book.category && b.authorSlug === book.authorSlug),
  ]
    .filter((b, i, a) => a.indexOf(b) === i)
    .slice(0, 6)
    .map(bookSlug);

/** One page — what the template prints that the floor's row does not carry. */
const page = (b) => {
  const slug = bookSlug(b);
  const meta = bookMeta(slug);
  const art = resolveCover(b);
  const o = {
    cat: CATEGORY_LABEL[b.category],
    short: decode(b.authorShort),
    fmts: b.formats.map((f) => formatLabel(f, b)),
    bind: bindingLabel(b).toLowerCase(),
  };
  // the hero paints the full board (not the -lib tile the floor carries)
  if (art) o.art = art;
  if (art && b.coverShade) o.shade = b.coverShade;
  if (art && coverIsBaked(b)) o.baked = true;
  if (meta?.categories?.length) o.subjects = meta.categories.slice(0, 3).map(decode);
  if (meta?.isbn13) o.isbn13 = String(meta.isbn13);
  if (meta?.isbn10) o.isbn10 = String(meta.isbn10);
  if (meta?.averageRating) o.rating = meta.averageRating;
  if (meta?.volumeId) o.google = true;
  if (!isInStock(slug)) o.lead = "print";
  const rel = relatedOf(b);
  if (rel.length) o.rel = rel;
  return [slug, o];
};

/** One book's prose — "About the book" — for notes.json. */
const notes = (b) => [bookSlug(b), descParagraphs(bookMeta(bookSlug(b))?.description)];

/* Every rung of the ladder in each of the three currencies, phrased by
   pricing.ts's own formatMoney() — the phone picks the column its region
   reads, exactly as withPrices() does on the web. */
const ladder = Object.fromEntries(
  CURRENCIES.map((c) => [c, Object.fromEntries(PRICE_TIERS.map((t) => [t, formatMoney(moneyForTier(t, c))]))]),
);

const out = {
  ladder,
  lead: {
    stock: { chip: decode(IN_STOCK_LEAD.chip), line: decode(IN_STOCK_LEAD.line) },
    print: { chip: decode(PRINTED_LEAD.chip), line: decode(PRINTED_LEAD.line) },
  },
  books: Object.fromEntries(BOOKS.map(page)),
};

const json = JSON.stringify(out);
writeFileSync(join(HERE, "pages.json"), json + "\n");

const prose = Object.fromEntries(BOOKS.map(notes).filter(([, paras]) => paras.length));
const proseJson = JSON.stringify(prose);
writeFileSync(join(HERE, "notes.json"), proseJson + "\n");

const kb = (n) => Math.round(n / 1024);
console.log(
  `pages.json: ${Object.keys(out.books).length} books, ${kb(json.length)}KB · ` +
    `notes.json: ${Object.keys(prose).length} descriptions, ${kb(proseJson.length)}KB`,
);
