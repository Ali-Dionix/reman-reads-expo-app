// What a bound volume prints about itself — the frontispiece's plate and
// caption, the title page's facts, the contents' foot, the colophon's line.
//
// The site bakes these off `AudioBook` (app/data/audioLibrary.ts's
// pressedBook()) and `sleeveFor()` (accountListeningPage.ts). The app's
// Recording carries none of the sleeve fields, so they are derived here from
// the same rules and the same data slices the shelf already ships:
//
//   art / spine   library.json (catalogLite's ten fields; the art is already
//                 the "-lib" grid variant gridCover() would pick)
//   labelHue      hueFor(slug) — the three pressed inks, picked by the slug's
//                 character sum, exactly as audioLibrary.ts picks them
//   blurb         runtimeLine(seconds) — "18 hr 56 min, read end to end."
//   sleeveNote    pressedBook()'s constant scrawl
//   colophon      pressedBook()'s line, in the narrator's name
//
// Byte-for-byte with the site or the leaves drift.

import library from "../../../data/library.json";
import type { Recording } from "../../../lib/audioStore";

export type Sleeve = {
  art?: string;
  spine: string;
  /** The sleeve label's ink — `--lab` on `.rr-lr-fr-disc`. */
  labelHue: string;
  /** `.rr-lr-fr-cap` — one deadpan line under the plate. */
  blurb: string;
  /** `.rr-lr-tp-scrawl` — the lowercase hand on the title page. */
  sleeveNote: string;
  /** `.rr-lr-end p` — the closing leaf's line. */
  colophon: string;
};

type LiteBook = { slug: string; title: string; spine: string; art?: string };
const LITE_BY_SLUG = new Map<string, LiteBook>(
  (library.books as LiteBook[]).map((b) => [b.slug, b]),
);

// audioLibrary.ts PRESSED_HUES — per SLUG, never per voice
const PRESSED_HUES = ["#7E2D1F", "#9B7A4D", "#171411"];
const hueFor = (slug: string): string =>
  PRESSED_HUES[[...slug].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % PRESSED_HUES.length] ??
  "#171411";

/** audioLibrary.ts runtimeLine — floor BOTH parts. */
export const runtimeLine = (secs: number): string => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h === 0) return `${m} minutes, read end to end.`;
  return `${h} hr ${m} min, read end to end.`;
};

/** accountListeningPage.ts runShort — breaks to hours at 60 minutes. */
export const runShort = (secs: number): string => {
  const m = Math.max(1, Math.round(secs / 60));
  const h = Math.floor(m / 60);
  if (!h) return `${m} min`;
  return m % 60 ? `${h} hr ${m % 60} min` : `${h} hr`;
};

/** The narrator's printed name for the pressing in force — `voiceName(book)`. */
export function voiceName(rec: Recording, voice: string | null): string {
  const id = voice ?? rec.voiceId;
  const v = rec.voices.find((x) => x.id === id) ?? rec.voices[0];
  if (v) return v.name;
  // "Read by Ambrose Reed." → "Ambrose Reed"
  const m = /^Read by (.+?)\.?$/.exec(rec.voice ?? "");
  return m?.[1] ?? "Our default narrator";
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
/** The contents' numerals — Roman to ten, then the plain figure. */
export const roman = (n: number): string => ROMAN[n] ?? String(n + 1);

export function sleeveFor(rec: Recording, voice: string | null): Sleeve {
  const lite = LITE_BY_SLUG.get(rec.slug);
  const name = voiceName(rec, voice);
  return {
    art: lite?.art,
    spine: lite?.spine ?? "#4A3B27",
    labelHue: hueFor(rec.slug),
    blurb: runtimeLine(rec.seconds),
    sleeveNote: "the full recording. we keep your place.",
    colophon: `Recorded for Roman Reads; the text on these pages is the same text ${name} reads, word for word.`,
  };
}
