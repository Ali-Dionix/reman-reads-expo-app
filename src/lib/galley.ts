// The read-along — where a word's MOMENT lives. Ported from the data half of
// app/components/readAlong.ts.
//
// Two files meet here and neither knows the other exists:
//
//   the GALLEY   (audio/<slug>/en/<voice>/v1/ch-NN.json) — per pressing, per
//                chapter: the paragraph strings, and every word as
//                [paraIdx, charStart, charEnd, tStartMs, tEndMs].
//   the PAGES    (pages/<slug>/v1/pages.json) — per BOOK: every printed run as
//                [paraIdx, charStart, charEnd, pageN, x, y, w, h], normalised.
//
// They meet on CHARACTER OFFSETS into the same paragraph strings. So a word's
// moment (galley, which changes with the narrator) and a word's position on
// paper (pages, which does not) join without either file being regenerated
// when the other changes. That is the whole trick, and it is why switching
// voices mid-chapter keeps the highlight on the right word.
//
// The galley is per PRESSING: Ambrose reads chapter I in 173s and Sylvia in
// 162s, so the timings differ even though the text does not. Cache by
// (slug, voice, band) or a switch paints the old reader's timings.
//
// ABSENT IS A REAL STATE. A specimen recording has no galley at all, and most
// of the shelf will be in that state for a long time — every path here answers
// "no" cheaply and never throws, exactly as pages.ts does.

import { useSyncExternalStore } from "react";

import { audioUrl } from "./audioResolve";
import type { PageBox } from "./pages";

/** [paraIdx, charStart, charEnd, tStartMs, tEndMs] */
export type GalleyWord = [number, number, number, number, number];

export type Galley = {
  v: number;
  slug: string;
  chapter: number;
  title: string;
  durationMs: number;
  paras: string[];
  words: GalleyWord[];
  /** [firstWordIdx, lastWordIdx] per sentence; sentences never cross paras. */
  sents: [number, number][];
  /**
   * A LIVE reading's cue file, as far as the reading has got. The site's
   * /api/voice/read/galley answers `<key>.live.json` with `partial: true`
   * while the chapter is still being read — the paragraphs arrive complete
   * on the first write and only the word rows grow — and the finished file
   * without it. A partial galley is never the last word: refreshGalley()
   * replaces it, and the deck polls while a chapter streams (audioStore's
   * watch), so the strip lights up behind the voice as the words land.
   */
  partial?: boolean;
};

/** Reject anything that would paint a highlight in the wrong place. */
function asGalley(raw: unknown): Galley | null {
  const g = raw as Partial<Galley> | null;
  if (!g || typeof g !== "object") return null;
  const partial = g.partial === true;
  // a partial galley's first write carries the paragraphs and no words yet:
  // real text to show, nothing to gild — kept, so the strip can stand
  if (!Array.isArray(g.paras) || !Array.isArray(g.words) || (!g.words.length && !partial)) return null;
  if (g.words.some((w) => !Array.isArray(w) || w.length < 5)) return null;
  // sentence spans are optional: a pressing without them simply gets no wash
  return { ...(g as Galley), sents: Array.isArray(g.sents) ? g.sents : [], partial };
}

const cache = new Map<string, Galley | null>();
const inflight = new Map<string, Promise<Galley | null>>();

const keyOf = (slug: string, voice: string | null, band: number): string =>
  `${slug}\0${voice ?? "-"}\0${band}`;

/* ------------------------------------------------------- the changes --- */
//
// A galley in the cache is replaced in ONE case: a live reading's partial
// cue file growing, or finishing. Every reader of the cache is a component
// that asked loadGalley() once on mount — so a replacement has to be told,
// or the strip would stand on the two paragraphs the reading had got to
// when the leaf was turned. useGalleyVersion() is that telling: a counter
// that moves on every replacement, for an effect's dependency list.

let version = 0;
const listeners = new Set<() => void>();
const bump = () => {
  version += 1;
  listeners.forEach((cb) => cb());
};
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const snapshot = () => version;

/** A number that changes whenever a cached galley is replaced. Put it in
 *  the dependency list of the effect that calls loadGalley(), and the
 *  chapter is re-read from the cache when a live reading grows. */
export function useGalleyVersion(): number {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * Fetch and validate one chapter's galley. Null means "there is no text to
 * follow" — a specimen, a chapter pressed before the galleys existed, or a
 * network that said no. The reader simply does not gild, which is correct.
 */
export async function loadGalley(
  slug: string,
  voice: string | null,
  band: number,
  path: string | undefined,
): Promise<Galley | null> {
  const key = keyOf(slug, voice, band);
  if (cache.has(key)) return cache.get(key)!;
  if (!path) {
    cache.set(key, null);
    return null;
  }
  return fetchGalley(key, path, false);
}

/**
 * Ask for a chapter's galley AGAIN — the site's refreshGalley(): the cue
 * file of a live reading, re-read while the chapter is being made. Replaces
 * the cached copy and tells every reader of it. Answers whether the reading
 * is finished, for the deck's watch; null when the cue file is not there.
 */
export async function refreshGalley(
  slug: string,
  voice: string | null,
  band: number,
  path: string | undefined,
): Promise<{ partial: boolean; durationMs: number } | null> {
  if (!path) return null;
  const g = await fetchGalley(keyOf(slug, voice, band), path, true);
  return g ? { partial: !!g.partial, durationMs: Number(g.durationMs ?? 0) || 0 } : null;
}

function fetchGalley(key: string, path: string, refresh: boolean): Promise<Galley | null> {
  // one flight per chapter: the reader asks on mount, on band change and on a
  // narrator switch, and those can land in the same tick
  const running = inflight.get(key);
  if (running) return running;

  const flight = (async () => {
    const was = cache.get(key);
    try {
      const res = await fetch(audioUrl(path), refresh ? { cache: "no-store" } : undefined);
      if (!res.ok) throw new Error(String(res.status));
      const g = asGalley(await res.json());
      // a live cue file that is not there yet (a 404 before the first
      // passage lands) is not "no text" — the watch asks again
      if (!g && refresh) return was ?? null;
      cache.set(key, g);
      if (refresh && g !== was) bump();
      return g;
    } catch {
      if (refresh) return was ?? null;
      cache.set(key, null);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, flight);
  return flight;
}

/**
 * The word sounding at `ms`, as an index into `galley.words`, or -1.
 *
 * Binary search on tStart, then one step back: the array is ordered and the
 * gaps between words (breaths, page turns) belong to the word just finished,
 * so a reader who pauses mid-sentence keeps the gilt where they stopped rather
 * than losing it into a gap.
 */
export function wordAt(g: Galley, ms: number): number {
  const w = g.words;
  if (!w.length || ms < w[0][3]) return -1;
  let lo = 0;
  let hi = w.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (w[mid][3] <= ms) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Where a word starts, in ms — what a tap on the paper seeks to. */
export const wordStart = (g: Galley, i: number): number => g.words[i]?.[3] ?? 0;

/**
 * Every printed box overlapping a run of characters in one paragraph.
 *
 * A word is usually one box, but a run can be split by the typesetter — a
 * hyphenated break puts the same word on two lines and two boxes — so this
 * returns ALL the overlapping boxes, never just the first. Boxes carry their
 * own page number, which is what lets the follow turn the leaf.
 */
export function boxesForRun(
  boxes: PageBox[],
  para: number,
  cs: number,
  ce: number,
): PageBox[] {
  const out: PageBox[] = [];
  for (const b of boxes) {
    if (b[0] !== para) continue;
    // half-open overlap: a box ending exactly where the run starts is the
    // PREVIOUS run's, not this one's
    if (b[1] < ce && b[2] > cs) out.push(b);
  }
  return out;
}

/** The printed boxes of one word. */
export const boxesForWord = (boxes: PageBox[], word: GalleyWord): PageBox[] =>
  boxesForRun(boxes, word[0], word[1], word[2]);

/**
 * The sentence a word belongs to, as its printed boxes — what carries the
 * faint wash under the gilt. Sentences never cross paragraphs, so one run
 * covers it. Empty when the pressing shipped without sentence spans.
 */
export function boxesForSentence(
  g: Galley,
  boxes: PageBox[],
  wordIdx: number,
): PageBox[] {
  const s = g.sents?.find(([a, b]) => wordIdx >= a && wordIdx <= b);
  if (!s) return [];
  const first = g.words[s[0]];
  const last = g.words[s[1]];
  if (!first || !last) return [];
  return boxesForRun(boxes, first[0], first[1], last[2]);
}

/**
 * The printed box under a finger, in normalised page space — the NEAREST run
 * on the page, as the site's wordAtPoint (app/components/readAlong.ts) finds
 * it: a fingertip is not a caret, so a tap in the margin beside a line, or in
 * the leading between two lines, reads from the adjacent word rather than
 * doing nothing. Distance is weighted `dy × 3 + dx` (a line of type is
 * ~1.7% of a page tall, so vertical misses count for more) and capped at
 * 0.05 of the page: past that the reader put their finger on a plate, a
 * blank, or the deep margin, and null means "do nothing at all" rather than
 * seek somewhere arbitrary.
 *
 * Separate from the word lookup ON PURPOSE. Boxes live in the BOOK's page
 * manifest, so every chapter's are on hand at once; the words live in a
 * per-chapter galley that has to be fetched. Finding the box first is what
 * lets a tap on a page the sounding chapter is not printed on resolve to the
 * chapter that IS printed there, and only then pay for its galley.
 */
export const TAP_REACH = 0.05;

export function boxAtPoint(
  boxes: PageBox[],
  page: number,
  nx: number,
  ny: number,
): PageBox | null {
  // A non-finite point is NOT "anywhere" — every comparison below would be
  // false and the first box on the page would answer for it, which is how a
  // tap ends up seeking to the top of the chapter.
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return null;

  let best: PageBox | null = null;
  let bestDist = Infinity;
  for (const b of boxes) {
    if (b[3] !== page) continue;
    const dx = nx < b[4] ? b[4] - nx : nx > b[4] + b[6] ? nx - b[4] - b[6] : 0;
    const dy = ny < b[5] ? b[5] - ny : ny > b[5] + b[7] ? ny - b[5] - b[7] : 0;
    const dist = dy * 3 + dx;
    if (dist < bestDist) {
      bestDist = dist;
      best = b;
    }
  }
  return best && bestDist <= TAP_REACH ? best : null;
}

/** The word a printed box belongs to, as an index into `galley.words`, or -1. */
export const wordOfBox = (g: Galley, box: PageBox): number =>
  g.words.findIndex((w) => w[0] === box[0] && w[1] < box[2] && w[2] > box[1]);

/**
 * Forget one chapter's answer — the site's `[data-rr-lr-galley-retry]`: a
 * fetch that failed is remembered as "no text", and asking again is exactly
 * what that button means, so the memory has to go first.
 */
export function forgetGalley(slug: string, voice: string | null, band: number): void {
  cache.delete(keyOf(slug, voice, band));
}

/**
 * One paragraph cut into the runs the reflowed galley sets: every word as
 * its own run (carrying its index into `galley.words`, so the gilt and a
 * finger can find it) and the text between words — spaces, punctuation, a
 * dash — as plain runs. The site's `wrapPara` does the same with spans; here
 * the runs become nested <Text>. Computed once per galley, never per beat.
 */
export type GalleyRun = { text: string; word: number };

export function paraRuns(g: Galley): GalleyRun[][] {
  const out: GalleyRun[][] = g.paras.map(() => []);
  const cursor: number[] = g.paras.map(() => 0);
  g.words.forEach((w, i) => {
    const [p, cs, ce] = w;
    const para = g.paras[p];
    if (para == null) return;
    const runs = out[p];
    const at = cursor[p];
    // a word that overlaps the last one (a bad timing) is skipped, never
    // painted twice
    if (cs < at) return;
    if (cs > at) runs.push({ text: para.slice(at, cs), word: -1 });
    runs.push({ text: para.slice(cs, ce), word: i });
    cursor[p] = ce;
  });
  g.paras.forEach((para, p) => {
    if (cursor[p] < para.length) out[p].push({ text: para.slice(cursor[p]), word: -1 });
  });
  return out;
}

/** The sentence a word belongs to, as [first, last] word indices, or null. */
export const sentenceOf = (g: Galley, wordIdx: number): [number, number] | null =>
  g.sents?.find(([a, b]) => wordIdx >= a && wordIdx <= b) ?? null;
