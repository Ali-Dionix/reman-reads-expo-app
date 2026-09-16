// Where a book's RENDERED PAGES live — ported from app/data/audioPages.ts.
//
// The audio is per VOICE; the paper is per BOOK. A PDF does not change when a
// second narrator reads it, so pages/<slug>/v1/ is published once and every
// pressing points at the same leaves.
//
// ABSENT IS A REAL STATE, not an error: a book with no rendered pages falls
// back to the reflowed galley. Most of the shelf will be in that state for a
// long time, so every path here answers "no" cheaply and never throws.
//
// asBookPages() is the gate everything off the wire goes through — a
// half-written manifest must degrade to the galley, never paint a book with
// holes in it.
//
// THE MANIFEST IS READ LIGHT. pages.json carries every chapter's word boxes
// — 9.2 MB for crime-and-punishment — and a phone parses JSON on the one
// thread it also draws with: opening that book stalled the app for the
// parse of boxes it would not need for hours. So the press tool cuts two
// more shapes of the same data beside the immutable pages.json
// (scripts/audio-press.mjs `split`): leaves.json, the manifest less its
// boxes, and boxes/NN.json, one chapter's boxes each. loadPages reads the
// first; loadBoxes fetches a chapter's as it is opened; a bucket without the
// split (a press from before it) falls back to pages.json, whose inline
// boxes go straight into the same cache. Nothing here parses a book's worth
// of boxes when it can help it.

import { audioUrl } from "./audioResolve";

/**
 * One run of characters, printed once, on one page.
 *
 *   [paraIdx, charStart, charEnd, pageN, x, y, w, h]
 *
 * charStart/charEnd index the SAME paragraph strings the galley uses, which is
 * what lets a word's timing (galley) and a word's position (here) meet without
 * either file knowing about the other. x/y/w/h are NORMALISED 0..1 against
 * pageW/pageH, origin top-left — so a client scales them to whatever size it
 * happens to be rendering the page at.
 */
export type PageBox = [number, number, number, number, number, number, number, number];

export type BookPages = {
  v: number;
  slug: string;
  pageW: number;
  pageH: number;
  pages: { n: number; image: string }[];
  /** The chapters' page ranges. A chapter's word boxes are NOT carried
   *  here — boxesNow() / loadBoxes() hand them out per chapter. */
  chapters: { idx: number; firstPage: number; lastPage: number }[];
};

/** The light manifest's name beside pages.json, and a chapter's boxes file —
 *  the press tool's own spelling (audio-press.mjs boxesKeyOf). */
const LEAVES_FILE = "leaves.json";

/** The committed pointer, mirrored from audioEditions.json. */
type PagesRecord = { v: number; n: number; w: number; h: number; manifest: string };

// Every `pages` record in app/data/audioEditions.json, in that file's
// order — three books are rendered (crime-and-punishment 767pp at 646×968,
// meditations 128pp and the-little-prince 54pp at 1191×1684). A book missing
// here never stands the codex — hasPages() says no and the reflowed galley
// stands instead — so this table must follow the site's: re-mirror it when a
// fourth book is rendered (scripts/gen-mobile-shelf.mjs does not emit it yet).
const PAGES: Record<string, PagesRecord> = {
  "crime-and-punishment": {
    v: 1,
    n: 767,
    w: 646,
    h: 968,
    manifest: "pages/crime-and-punishment/v1/pages.json",
  },
  "meditations": {
    v: 1,
    n: 128,
    w: 1191,
    h: 1684,
    manifest: "pages/meditations/v1/pages.json",
  },
  "the-little-prince": {
    v: 1,
    n: 54,
    w: 1191,
    h: 1684,
    manifest: "pages/the-little-prince/v1/pages.json",
  },
};

/** True when this book has rendered pages to read from. */
export const hasPages = (slug: string): boolean => !!PAGES[slug];

/**
 * What the pointer claims about the shape of the book WITHOUT fetching: page
 * count and rendered pixel size. Enough to stand a correctly proportioned
 * sheet of paper before a single byte of art has arrived — which is the whole
 * reason the pointer is committed rather than derived.
 */
export const pagesShape = (slug: string): { n: number; w: number; h: number } | null => {
  const p = PAGES[slug];
  return p ? { n: p.n, w: p.w, h: p.h } : null;
};

const dirFor = (slug: string): string => {
  const path = PAGES[slug]?.manifest ?? "";
  const cut = path.lastIndexOf("/");
  return cut < 0 ? "" : path.slice(0, cut + 1);
};

/** What a chapter's boxes are on the wire: inline (pages.json) or the
 *  bucket-relative key of their own file (leaves.json). */
type RawChapter = { idx: number; firstPage: number; lastPage: number; boxes?: unknown };

/** Reject anything that would paint a book with holes in it. The chapters'
 *  boxes — inline or by key — come back beside the manifest, never in it. */
function asBookPages(
  raw: unknown,
  slug: string,
): { man: BookPages; boxes: Map<number, PageBox[] | string> } | null {
  const m = raw as (Omit<Partial<BookPages>, "chapters"> & { chapters?: RawChapter[] }) | null;
  if (!m || typeof m !== "object") return null;
  if (!Array.isArray(m.pages) || !m.pages.length) return null;
  if (!Array.isArray(m.chapters)) return null;
  if (!(m.pageW! > 0) || !(m.pageH! > 0)) return null;
  if (m.pages.some((p) => typeof p?.image !== "string" || !(p.n >= 0))) return null;
  const boxes = new Map<number, PageBox[] | string>();
  const chapters: BookPages["chapters"] = [];
  for (const c of m.chapters) {
    if (!c || typeof c !== "object" || !(c.idx >= 0)) continue;
    chapters.push({ idx: c.idx, firstPage: c.firstPage, lastPage: c.lastPage });
    if (typeof c.boxes === "string") boxes.set(c.idx, c.boxes);
    else if (Array.isArray(c.boxes)) {
      const bs: PageBox[] = [];
      for (const b of c.boxes) {
        if (Array.isArray(b) && b.length >= 8 && b.every((n) => typeof n === "number")) bs.push(b.slice(0, 8) as PageBox);
      }
      boxes.set(c.idx, bs);
    } else boxes.set(c.idx, []);
  }
  return {
    man: { v: m.v ?? 1, slug, pageW: m.pageW!, pageH: m.pageH!, pages: m.pages, chapters },
    boxes,
  };
}

const cache = new Map<string, BookPages | null>();
// one fetch between everyone who asks while it is in the post — the frame
// and the codex both ask on the same tap
const posted = new Map<string, Promise<BookPages | null>>();

// A chapter's boxes: loaded, or the key they can be fetched from, per
// `slug/idx`. Filled by loadPages (inline boxes, or keys) and loadBoxes.
const boxCache = new Map<string, PageBox[]>();
const boxKeys = new Map<string, string>();
const boxPosted = new Map<string, Promise<PageBox[]>>();
const boxId = (slug: string, idx: number) => `${slug}/${idx}`;

/** Fetch and validate a book's page manifest. Null means "read the galley". */
export function loadPages(slug: string): Promise<BookPages | null> {
  if (cache.has(slug)) return Promise.resolve(cache.get(slug)!);
  const pending = posted.get(slug);
  if (pending) return pending;
  const p = fetchPages(slug).finally(() => posted.delete(slug));
  posted.set(slug, p);
  return p;
}

async function fetchPages(slug: string): Promise<BookPages | null> {
  const path = PAGES[slug]?.manifest;
  if (!path) {
    cache.set(slug, null);
    return null;
  }
  try {
    // the light manifest first; a bucket from before the split has only
    // pages.json, whose boxes come inline and go straight into the cache
    let res = await fetch(audioUrl(dirFor(slug) + LEAVES_FILE));
    if (!res.ok) res = await fetch(audioUrl(path));
    if (!res.ok) throw new Error(String(res.status));
    const got = asBookPages(await res.json(), slug);
    if (!got) throw new Error("manifest");
    for (const [idx, b] of got.boxes) {
      if (typeof b === "string") boxKeys.set(boxId(slug, idx), dirFor(slug) + b);
      else boxCache.set(boxId(slug, idx), b);
    }
    cache.set(slug, got.man);
    return got.man;
  } catch {
    cache.set(slug, null);
    return null;
  }
}

/** A chapter's word boxes, if they are already here — [] for a chapter with
 *  none, undefined while they are still to be fetched. */
export const boxesNow = (slug: string, idx: number): PageBox[] | undefined => boxCache.get(boxId(slug, idx));

/**
 * A chapter's word boxes, fetched on first ask (its own small file — a few
 * hundred KB at most, parsed in a few ms). Never throws: a chapter whose
 * boxes cannot be had carries none, and the pages still turn — the gilt is
 * the only thing that goes missing. Waits for the manifest itself when it
 * is asked before the manifest has arrived.
 */
export function loadBoxes(slug: string, idx: number): Promise<PageBox[]> {
  const id = boxId(slug, idx);
  const have = boxCache.get(id);
  if (have) return Promise.resolve(have);
  const pending = boxPosted.get(id);
  if (pending) return pending;
  const p = fetchBoxes(slug, idx).finally(() => boxPosted.delete(id));
  boxPosted.set(id, p);
  return p;
}

async function fetchBoxes(slug: string, idx: number): Promise<PageBox[]> {
  const id = boxId(slug, idx);
  if (!boxKeys.has(id)) await loadPages(slug);
  const have = boxCache.get(id);
  if (have) return have;
  const key = boxKeys.get(id);
  if (!key) {
    boxCache.set(id, []);
    return [];
  }
  try {
    const res = await fetch(audioUrl(key));
    if (!res.ok) throw new Error(String(res.status));
    const raw = (await res.json()) as unknown;
    const bs: PageBox[] = [];
    for (const b of Array.isArray(raw) ? raw : []) {
      if (Array.isArray(b) && b.length >= 8 && b.every((n) => typeof n === "number")) bs.push(b.slice(0, 8) as PageBox);
    }
    boxCache.set(id, bs);
    return bs;
  } catch {
    // not cached: the next ask tries the wire again
    return [];
  }
}

/** The absolute URL of one rendered page. */
export const pageImageUrl = (slug: string, image: string): string =>
  audioUrl(dirFor(slug) + image);

/** Leaf index (0-based, into `pages`) for a printed page number. */
export function leafOfPage(man: BookPages, pageN: number): number {
  const i = man.pages.findIndex((p) => p.n === pageN);
  return i < 0 ? 0 : i;
}

/** The first leaf of a chapter — where the needle drops a reader. */
export function leafOfChapter(man: BookPages, chapter: number): number {
  const ch = man.chapters.find((c) => c.idx === chapter);
  return ch ? leafOfPage(man, ch.firstPage) : 0;
}
