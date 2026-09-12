// Bake the narrator sheet's directory for the app.
//
// The site's picker (`[data-rr-lr-voice-menu]`, painted by ListeningEnhancer's
// paintVoice / paintLiveFeatured / paintLiveReaders) draws on TWO registers
// that are deliberately kept apart on the web — app/data/narrators.ts, the
// house readers the catalogue is PRESSED in, and app/data/liveNarrators.ts,
// the 338 Fish Audio readers who read a book live. The app must not restate
// either, so this imports the SAME modules the enhancer imports and writes
// the slice the sheet paints to ./narrators.json. Same loader hooks as
// src/portal/listening/gen-catalogue.mjs.
//
//   node mobile/src/portal/reader/gen-narrators.mjs      (from the site root)
//
// What rides along, and why it is baked rather than derived on the phone:
//   pressed[]     id, name, note, hue, portrait (ABSOLUTE, on the production
//                 origin — the app has no /public), in narrators.ts order,
//                 which is the Featured grid's order.
//   live[]        id, name, note, hue, locale, gender, language (the code the
//                 sheet groups on), `line` (liveNarratorLine — the one line
//                 under a name, built from the note by the site's own
//                 allowlist so the phone never re-derives it), portrait.
//   featured[]    the live ids that get a DISC under "Featured" — the
//                 enhancer's paintLiveFeatured: English readers with a manner
//                 word on their line, the first six.
//   languages[]   code, label, count — the language menu, English first,
//                 then by label, exactly as liveNarratorsByLanguage sorts.
//
// Node 22+ strips the types on import, so there is no build step to own.

import { writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");

/** Where a portrait is served from. The site's paths are root-relative
 *  (`/assets/narrators/…`); the app fetches them off the production origin. */
const ORIGIN = "https://www.romanreads.com";

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

const { NARRATORS } = await import("../../../../app/data/narrators.ts");
const { LIVE_NARRATORS, liveNarratorLine, liveNarratorsByLanguage, narratorLanguage } =
  await import("../../../../app/data/liveNarrators.ts");

const abs = (path) => (path ? (path.startsWith("http") ? path : ORIGIN + path) : undefined);

const pressed = NARRATORS.map((n, i) => ({
  id: n.id,
  name: n.name,
  note: n.note,
  hue: n.hue,
  portrait: abs(n.portrait),
  featured: i,
}));

const live = LIVE_NARRATORS.map((n) => ({
  id: n.id,
  name: n.name,
  note: n.note,
  hue: n.hue,
  locale: n.locale ?? "en-US",
  gender: n.gender ?? "not_specified",
  language: narratorLanguage(n),
  line: liveNarratorLine(n),
  portrait: abs(n.portrait),
}));

// paintLiveFeatured: "Of the 338, about ten have a manner word recorded
// against them … those ten are the only ones anybody could choose between on
// anything but a name, so they are the ones worth a disc. In the book's own
// language" — English, the house's floor. Falls back to the first few when
// none stand out, so the row is never empty.
const FEATURED = 6;
const groups = liveNarratorsByLanguage();
const en = groups.find((g) => g.code === "en") ?? groups[0];
const standout = en.readers.filter((n) => liveNarratorLine(n).split(" · ").length > 2);
const featured = (standout.length ? standout : en.readers).slice(0, FEATURED).map((n) => n.id);

const languages = groups.map((g) => ({ code: g.code, label: g.label, count: g.readers.length }));

const out = { pressed, live, featured, languages };

writeFileSync(join(HERE, "narrators.json"), JSON.stringify(out, null, 2) + "\n");
console.log(
  `narrators.json — pressed:${pressed.length} live:${live.length} featured:${featured.length} languages:${languages.length}`,
);
