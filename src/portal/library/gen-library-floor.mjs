// Bake Your Library's floor for the app.
//
// The app must not restate the site's data. This imports the SAME modules
// app/data/accountLibraryPage.ts imports (catalog, bookMeta, covers, pricing)
// and writes the slice the phone paints — the genre floor (wings and rails,
// RAIL_MIN 8 / RAIL_CAP 10, covers first), the four facet lists with their
// counts, and one row per catalogue book for the grid — to
// mobile/src/portal/library/floor.json.
//
// Same idea and the same loader hooks as scripts/gen-mobile-shelf.mjs; run it
// from the SITE repo's root after any catalogue change:
//
//   node mobile/src/portal/library/gen-library-floor.mjs
//
// Node 22+ strips the types on import, so there is no build step to own.

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

const { BOOKS, SHELF_GROUPS, SUBJECTS, bookSubject, subjectLabel } = await import(site("app/data/catalog.ts"));
const { bookMeta, coverIsBaked, resolveCover } = await import(site("app/data/bookMeta.ts"));
const { gridCover } = await import(site("app/data/covers.ts"));
const { bookSlug } = await import(site("app/data/portalShared.ts"));
const { PRICE_BANDS, bandKeyForTier, bandLabel } = await import(site("app/data/pricing.ts"));
const { CURRENCIES } = await import(site("app/data/region.ts"));
const { CATALOG_SIZE_CLAIM } = await import(site("app/data/site.ts"));

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

/* coversFirst — accountLibraryPage.ts, kept identical on purpose. */
const hasCover = (b) => !!resolveCover(b);
const coversFirst = (books) =>
  books
    .map((b, i) => ({ b, i, cover: hasCover(b) }))
    .sort((x, y) => Number(y.cover) - Number(x.cover) || x.i - y.i)
    .map((x) => x.b);

const RAIL_MIN = 8;
const RAIL_CAP = 10;

const LY_LENGTH_BANDS = [
  { key: "s", label: "Short", hint: "under 150 pages", hit: (p) => p > 0 && p < 150 },
  { key: "m", label: "Medium", hint: "150–349 pages", hit: (p) => p >= 150 && p < 350 },
  { key: "l", label: "Long", hint: "350–599 pages", hit: (p) => p >= 350 && p < 600 },
  { key: "x", label: "Epic", hint: "600 pages and up", hit: (p) => p >= 600 },
];
const lyPages = (b) => bookMeta(bookSlug(b))?.pageCount ?? 0;
const lyLengthKey = (b) => LY_LENGTH_BANDS.find((x) => x.hit(lyPages(b)))?.key ?? "u";
const lyPriceKey = (b) => bandKeyForTier(b.priceTier);

/** searchText() — accountLibraryPage.ts, kept identical: title, author,
 *  category, subject, year, keywords and both ISBNs, lowercased, quotes out. */
const searchText = (b) => {
  const meta = bookMeta(bookSlug(b));
  return [
    b.titleSearch ?? b.title,
    b.authorSearch ?? b.author,
    b.category.replace(/-/g, " "),
    subjectLabel(bookSubject(b)),
    b.year,
    b.keywords ?? "",
    meta?.isbn13 ?? "",
    meta?.isbn10 ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .replace(/"/g, "");
};

/** One shelf card — the fields shelfCardHtml() takes. */
const card = (b) => {
  const art = resolveCover(b);
  const o = {
    slug: bookSlug(b),
    title: decode(b.title),
    author: decode(b.author),
    spine: b.spine,
  };
  if (art) o.art = gridCover(art);
  if (b.coverShade) o.shade = b.coverShade;
  if (coverIsBaked(b)) o.baked = true;
  return o;
};

/** One grid row — the fields cardHtml() prints. */
const row = (b) => {
  const slug = bookSlug(b);
  const pages = bookMeta(slug)?.pageCount;
  const o = {
    ...card(b),
    subject: bookSubject(b),
    subjectLabel: decode(subjectLabel(bookSubject(b))),
    author_key: b.authorSlug,
    year: b.year,
    len: lyLengthKey(b),
    price: lyPriceKey(b),
    tier: b.priceTier,
    search: searchText(b),
  };
  if (pages) o.pages = pages;
  return o;
};

const wings = SHELF_GROUPS.map((g) => {
  const subs = g.subjects
    .map((s) => ({
      key: s.key,
      label: decode(subjectLabel(s.key)),
      n: BOOKS.filter((b) => bookSubject(b) === s.key).length,
    }))
    .filter((s) => s.n >= RAIL_MIN);
  if (!subs.length) return null;
  return {
    key: g.key,
    label: decode(g.label),
    hint: decode(g.hint),
    count: g.count,
    rails: subs.map((s) => ({
      key: s.key,
      label: s.label,
      n: s.n,
      books: coversFirst(BOOKS.filter((b) => bookSubject(b) === s.key))
        .slice(0, RAIL_CAP)
        .map(card),
    })),
  };
}).filter(Boolean);

const count = (hit) => BOOKS.filter(hit).length;
const facets = {
  subjects: SUBJECTS.map((s) => ({
    key: s.key,
    label: decode(subjectLabel(s.key)),
    n: count((b) => bookSubject(b) === s.key),
  })).filter((s) => s.n > 0),
  authors: [...new Map(BOOKS.map((b) => [b.authorSlug, b])).values()]
    .map((b) => ({ key: b.authorSlug, label: decode(b.author), n: count((x) => x.authorSlug === b.authorSlug) }))
    .sort((a, z) => z.n - a.n || a.label.localeCompare(z.label)),
  lengths: LY_LENGTH_BANDS.map((b) => ({
    key: b.key,
    label: b.label,
    hint: b.hint,
    n: count((x) => lyLengthKey(x) === b.key),
  })),
  prices: PRICE_BANDS.map((b) => ({ key: b.key, n: count((x) => lyPriceKey(x) === b.key) })),
};

/* The four band labels in each of the three currencies, phrased by
   pricing.ts's own bandLabel() — the phone picks the column its region
   reads (region.ts CURRENCY_OF), exactly as withPrices() does on the web. */
const bands = Object.fromEntries(
  CURRENCIES.map((c) => [c, Object.fromEntries(PRICE_BANDS.map((b) => [b.key, decode(bandLabel(b.key, c))]))]),
);

const out = {
  total: BOOKS.length,
  claim: CATALOG_SIZE_CLAIM,
  wings,
  facets,
  bands,
  books: coversFirst(BOOKS).map(row),
};

writeFileSync(join(HERE, "floor.json"), JSON.stringify(out) + "\n");
console.log(
  `floor.json: ${out.total} books, ${wings.length} wings, ${wings.reduce((n, w) => n + w.rails.length, 0)} rails, ${facets.subjects.length} subjects, ${facets.authors.length} authors`,
);
