// Bake the Audiobooks room's catalogue for the app.
//
// accountListeningPage.ts composes ALL_AUDIO at module scope — AUDIO_BOOKS
// first (playable, with their real runtime), then the recording room's queue
// (AUDIO_SOON, resolved through the lite catalogue) — and derives the filter
// pills from that list. The app must not restate any of it, so this imports
// the SAME modules the builder imports and writes exactly the slice the phone
// paints to ./catalogue.json. Same idea (and the same loader hooks) as
// scripts/gen-mobile-shelf.mjs in the site repo.
//
//   node mobile/src/portal/listening/gen-catalogue.mjs      (from the site root)
//
// Node 22+ strips the types on import, so there is no build step to own.

import { writeFileSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");

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

const { AUDIO_BOOKS, AUDIO_SOON, audioBookDuration } = await import(
  "../../../../app/data/audioLibrary.ts"
);

const lite = JSON.parse(readFileSync(join(ROOT, "app/data/catalogLite.json"), "utf8"));
const LITE = new Map(lite.map((b) => [b.slug, b]));

// The site's strings are authored as HTML ("Saint-Exup&eacute;ry"). React
// Native renders text, not markup, so entities are decoded here, once.
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", aacute: "á", ocirc: "ô",
  ouml: "ö", uuml: "ü", auml: "ä", ccedil: "ç", ntilde: "ñ", iacute: "í",
  oacute: "ó", uacute: "ú", mdash: "—", ndash: "–", hellip: "…", rsquo: "’",
  lsquo: "‘", rdquo: "”", ldquo: "“", middot: "·" };
const decode = (s) =>
  String(s ?? "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") return String.fromCodePoint(parseInt(e[1] === "x" ? e.slice(2) : e.slice(1), e[1] === "x" ? 16 : 10));
    return ENTITIES[e] ?? m;
  });

/** accountListeningPage.ts runShort — breaks to hours at 60 minutes. */
const runShort = (secs) => {
  const m = Math.max(1, Math.round(secs / 60));
  const h = Math.floor(m / 60);
  if (!h) return `${m} min`;
  return m % 60 ? `${h} hr ${m % 60} min` : `${h} hr`;
};

const SOON_SHELF = AUDIO_SOON.map((slug) => LITE.get(slug)).filter((b) => !!b?.art);

const entries = [
  ...AUDIO_BOOKS.map((b) => {
    const l = LITE.get(b.slug);
    if (!l) return null;
    return {
      slug: b.slug,
      title: decode(l.title),
      author: decode(l.authorShort),
      art: l.art,
      spine: l.spine,
      category: l.category,
      state: "now",
      meta: runShort(audioBookDuration(b)),
    };
  }).filter(Boolean),
  ...SOON_SHELF.map((b) => ({
    slug: b.slug,
    title: decode(b.title),
    author: decode(b.authorShort),
    art: b.art,
    spine: b.spine,
    category: b.category,
    state: "soon",
    meta: "In production",
  })),
];

// A cell that looks playable must have a recording behind it on the phone.
// listeningShelf.json is baked separately (npm run mobile:shelf); if the two
// have come apart, fail here rather than ship a dead tap.
const shelf = JSON.parse(readFileSync(join(HERE, "..", "..", "data", "listeningShelf.json"), "utf8"));
const unplayable = entries.filter((e) => e.state === "now" && !shelf.recordings?.[e.slug]).map((e) => e.slug);
if (unplayable.length) {
  throw new Error(
    `catalogue.json: ${unplayable.join(", ")} would show as playable but listeningShelf.json has no recording — run npm run mobile:shelf first`,
  );
}

const playsNow = entries.filter((e) => e.state === "now").length;
const cats = [...new Set(entries.map((e) => e.category))].sort();
const filters = [
  { f: "now", label: "Plays now", n: playsNow },
  { f: "all", label: "All", n: entries.length },
  { f: "soon", label: "In production", n: entries.length - playsNow },
  ...cats.map((c) => ({
    f: c,
    label: c.charAt(0).toUpperCase() + c.slice(1),
    n: entries.filter((e) => e.category === c).length,
  })),
];

const first = AUDIO_BOOKS[0];
const firstLite = first ? LITE.get(first.slug) : undefined;
const billboard = first
  ? {
      slug: first.slug,
      title: decode(first.title),
      author: decode(first.author),
      blurb: decode(first.blurb),
      labelHue: first.labelHue,
      art: firstLite?.art,
      spine: firstLite?.spine ?? "#4A3B27",
    }
  : null;

const out = { billboard, entries, filters, categories: cats };
writeFileSync(join(HERE, "catalogue.json"), JSON.stringify(out, null, 2) + "\n");
console.log(
  `catalogue.json — billboard:${billboard ? 1 : 0} entries:${entries.length} (now ${playsNow}) filters:${filters.map((f) => f.f).join(",")}`,
);
