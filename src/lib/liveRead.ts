// The live readers — a catalogue chapter read by a voice the press never
// saw. The wire to the site, and the registry the deck plays from.
//
// Ported from the site in two halves: the registry half of
// app/data/audioLibrary.ts (liveBookFor, registerLiveVoice, noteLiveTicket,
// noteLiveDuration, noteLiveSaved) and the asking half of
// app/components/ListeningEnhancer.tsx (ensureLiveChapter, peekReading).
//
// THE SHELF HAS TWO KINDS OF PRESSING. Ambrose and Sylvia were at the press,
// so their chapters are bytes in a bucket and the app plays them from
// listeningShelf.json. The three hundred and thirty-eight in
// src/portal/reader/narrators.json were not: pick one and the chapter is
// synthesized from the SAME published text, by the site —
//
//   GET /api/voice/read?slug&ch&voice     the decision: already made (a plain
//                                         href), or may be made (an href
//                                         carrying a signed pass). Signed in,
//                                         AND SUBSCRIBED — a 402 otherwise,
//                                         which is the paywall this app draws
//                                         its padlocks from.
//   GET /api/voice/read/audio?…&t=<pass>  the bytes, read down the response
//                                         AS THEY ARE MADE the first time,
//                                         an ordinary seekable mp3 after
//   GET /api/voice/read/galley?…          the cue file — `partial: true`
//                                         while the reading is still going
//
// "LIKE ANYTHING ELSE" IS THE WHOLE DESIGN, on the phone as on the site. A
// live reading is registered as a PRESSING of the book — into the same
// `pressings` map the two house pressings live in — so chaptersOf,
// voiceInForce, setNarrator, the console, the codex and the read-along all
// keep working with no knowledge that it exists. The seam that makes it
// possible is audioResolve.ts: a site-absolute `src` resolves to the route
// and plays. What the deck has to treat differently is in audioStore.tsx —
// a live chapter has to be ASKED FOR before it will play, and a chapter
// being read has nothing behind the playhead to seek into.
//
// CLIENT ONLY, and never persisted. The registry is rebuilt from what the
// reader picks, because the durations in it are only as good as the
// chapters that have actually been read (see registerLiveVoice). After a
// restart a standing live choice falls back to the house pressing until the
// reader picks the voice again — exactly as the site behaves after a reload.
//
// THE ENTITLEMENT IS THE SITE'S. Nothing here decides who may listen: the
// route says 402 and this module carries the sentence back. The app's own
// copy of the answer (src/lib/subscription.tsx) is for drawing padlocks and
// for sparing a reader the round trip when the answer is already known.

import { apiUrl } from "./config";
import { audioUrl } from "./audioResolve";
import { readerBearerToken } from "./supabase";
import type { Chapter, Pressing, Recording, Voice } from "./audioStore";

/* ------------------------------------------------------------ the hrefs --- */

/**
 * Where a live reading's audio and cues are asked for. A PLAIN HREF PLAYS
 * ONLY WHAT IS ALREADY MADE: the route behind it refuses to synthesize for
 * an address alone. A chapter that has never been read needs the signed
 * pass the maker route issues, put on by noteLiveTicket.
 */
export const liveChapterHref = (
  slug: string,
  voiceId: string,
  chapter: number,
  which: "audio" | "galley",
): string =>
  `/api/voice/read/${which}?slug=${encodeURIComponent(slug)}&ch=${chapter}`
  + `&voice=${encodeURIComponent(voiceId)}`;

/** `slug:voice:band` — the key everything below is filed under. */
export const liveKey = (slug: string, voiceId: string, band: number): string =>
  `${slug}:${voiceId}:${band}`;

/** A pass on an href means "this chapter is being made as you listen". */
export const isStreamingHref = (src: string): boolean => /[?&]t=/.test(src);

/* --------------------------------------------------------- the registry --- */

/** `slug:voice` of every live pressing registered this run. */
const LIVE = new Set<string>();

/** Is this voice a live reading of this book rather than a pressed one? */
export const isLivePressing = (slug: string, voiceId: string | null): boolean =>
  !!voiceId && LIVE.has(`${slug}:${voiceId}`);

/** The narrator as the sheet knows them — what the label prints. */
export type LiveNarrator = { id: string; name: string; note: string; hue: string };

/**
 * Register (or replace) a live pressing of `rec` in `voiceId`, built from
 * the house pressing's own chapters.
 *
 * EVERY VOICE READS THE SAME REVIEWED TEXT, chapter for chapter — the deck
 * already relies on that to move a reader's place between narrators — so
 * the chapter list is the pressed one with two things swapped: the audio
 * and cue paths become routes, and the duration becomes an estimate.
 *
 * THE DURATIONS ARE ESTIMATES UNTIL THE CHAPTER IS READ. Nothing knows how
 * long a reader takes over a chapter until they have taken it, so the house
 * pressing's own duration stands in — same words, a different mouth, so it
 * is close and not exact. noteLiveDuration replaces it with the real figure
 * the moment the site returns one. What an estimate costs while it stands is
 * a slightly wrong "18 hr 51 min left"; what it buys is a transport that
 * works on chapter one instead of after the whole book has been synthesized.
 *
 * Only a book pressed in a house voice can carry a live reading: the text a
 * live voice reads is the pressing's own published galley, so a specimen has
 * nothing to read. Answers false for one.
 */
export function registerLiveVoice(rec: Recording, narrator: LiveNarrator): boolean {
  const from = rec.voiceId ? rec.pressings?.[rec.voiceId] : null;
  if (!from || !rec.hasText) return false;
  const key = `${rec.slug}:${narrator.id}`;
  if (LIVE.has(key) && rec.pressings[narrator.id]) return true;
  const chapters: Chapter[] = from.chapters.map((c, i) => ({
    ...c,
    src: liveChapterHref(rec.slug, narrator.id, i, "audio"),
    galley: liveChapterHref(rec.slug, narrator.id, i, "galley"),
  }));
  const pressing: Pressing = {
    voiceId: narrator.id,
    voiceLabel: narrator.name,
    seconds: from.seconds,
    chapters,
  };
  // the same map the house pressings live in, so nothing downstream learns
  // a live one exists — the site's byVoice.set
  rec.pressings[narrator.id] = pressing;
  if (!rec.voices.some((v) => v.id === narrator.id)) {
    const voice: Voice = { id: narrator.id, name: narrator.name, note: narrator.note, hue: narrator.hue };
    rec.voices.push(voice);
  }
  LIVE.add(key);
  return true;
}

/**
 * Put the maker route's signed href on a chapter, so it can be READ rather
 * than only played back. Only ever a href for THIS chapter of THIS voice:
 * the src is what the player will fetch, and a mistake here would play the
 * wrong chapter.
 */
export function noteLiveTicket(rec: Recording, voiceId: string, band: number, href: string): void {
  const book = isLivePressing(rec.slug, voiceId) ? rec.pressings[voiceId] : null;
  const was = book?.chapters[band];
  if (!book || !was || !href) return;
  if (!href.startsWith(liveChapterHref(rec.slug, voiceId, band, "audio"))) return;
  book.chapters[band] = { ...was, src: href };
}

/** Replace a live chapter's estimated duration with the measured one. */
export function noteLiveDuration(rec: Recording, voiceId: string, band: number, durationMs: number): void {
  const book = isLivePressing(rec.slug, voiceId) ? rec.pressings[voiceId] : null;
  const was = book?.chapters[band];
  const seconds = Math.round(durationMs / 1000);
  if (!book || !was || seconds <= 0) return;
  book.chapters[band] = { ...was, duration: seconds };
  book.seconds = book.chapters.reduce((s, c) => s + c.duration, 0);
}

/**
 * The reading finished and is in the bucket: take the pass off again. What
 * this buys is SEEKING — the plain href is an ordinary immutable mp3 with
 * ranges. The deck calls this on the reader's first seek after the
 * reading is saved, never while the stream is still sounding (a new src is
 * a new player on this platform, and it would put a gap mid-sentence).
 */
export function noteLiveSaved(rec: Recording, voiceId: string, band: number): void {
  const book = isLivePressing(rec.slug, voiceId) ? rec.pressings[voiceId] : null;
  const was = book?.chapters[band];
  if (!book || !was) return;
  book.chapters[band] = { ...was, src: liveChapterHref(rec.slug, voiceId, band, "audio") };
}

/* ------------------------------------------------------------ the asking --- */

/**
 * What the site said when a chapter was asked for.
 *
 * `made` is the answer callers act on. `href` is the address to put on the
 * chapter when the house issued a fresh one (carrying the pass); `reading`
 * is true while it is being read to us and false when it came out of the
 * bucket whole. `subscribe` is the desk's 402 — signed in, not a subscriber
 * — so a caller can offer the door rather than only the sentence.
 */
export type LiveOpened = {
  made: boolean;
  href?: string;
  reading?: boolean;
  /** The reading that was being made has since been filed in the bucket
   *  (the deck's watch saw the finished cue file). The href keeps its pass
   *  until the reader's first seek, and the pass now opens the finished
   *  object — so a later play of this chapter is an ordinary, seekable one. */
  saved?: boolean;
  /** The measured length, when there is one. A chapter being made has only
   *  the pressed edition's estimate. */
  durationMs?: number;
  /** The refusal, phrased for the reader. Empty on a yes. */
  why: string;
  subscribe?: boolean;
  status?: number;
};

/** Every live chapter opened this run, by key — whether it came out of the
 *  bucket or is being read to us now. */
const opened = new Map<string, LiveOpened>();
/** The same key, while the site is being asked — so two taps ask once. */
const making = new Map<string, Promise<LiveOpened>>();

/** The site's answer for a chapter this run has opened, or null. */
export const liveOpenedFor = (slug: string, voiceId: string, band: number): LiveOpened | null =>
  opened.get(liveKey(slug, voiceId, band)) ?? null;

/** The reading being made has been filed — the site's noteReadingSaved,
 *  the registry half: from here the chapter is played, not read. */
export function noteReadingSaved(slug: string, voiceId: string, band: number): void {
  const o = opened.get(liveKey(slug, voiceId, band));
  if (o?.made) opened.set(liveKey(slug, voiceId, band), { ...o, reading: false, saved: true });
}

/** The site's own words for a reader the door is shut to. */
const SAY_SIGN_IN = "Sign in to hear the book read in one of these voices.";
const SAY_FAILED = "That reader could not read the chapter.";

/**
 * Open a live chapter — which means ASKING, not waiting.
 *
 * The chapter is read down the audio href itself, so what comes back from
 * here is a decision and an address: either the chapter is already in the
 * bucket, or it may be made and the href — carrying the signed pass — will
 * read it as it plays. Asked once per chapter per run: a second ask would
 * mint a second pass for a chapter already being read.
 */
export function ensureLiveChapter(slug: string, voiceId: string, band: number): Promise<LiveOpened> {
  const key = liveKey(slug, voiceId, band);
  const done = opened.get(key);
  if (done) return Promise.resolve(done);
  const running = making.get(key);
  if (running) return running;

  const job = (async (): Promise<LiveOpened> => {
    try {
      const token = await readerBearerToken();
      if (!token) return { made: false, why: SAY_SIGN_IN, status: 401 };
      const res = await fetch(
        apiUrl(`/api/voice/read?slug=${encodeURIComponent(slug)}&ch=${band}&voice=${encodeURIComponent(voiceId)}`),
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const body = (await res.json().catch(() => ({}))) as {
        audio?: unknown;
        durationMs?: unknown;
        making?: unknown;
        error?: unknown;
        subscribe?: unknown;
      };
      if (!res.ok) {
        const why = typeof body.error === "string" && body.error ? body.error : SAY_FAILED;
        return {
          made: false,
          why: res.status === 401 ? SAY_SIGN_IN : why,
          subscribe: res.status === 402 || body.subscribe === true,
          status: res.status,
        };
      }
      const answer: LiveOpened = {
        made: true,
        href: typeof body.audio === "string" ? body.audio : undefined,
        reading: body.making === true,
        // a chapter being made has only the pressed estimate, and the
        // estimate is already on the shelf; the measured figure arrives
        // with the finished galley
        durationMs: body.making === true ? 0 : Number(body.durationMs ?? 0) || 0,
        why: "",
        status: res.status,
      };
      opened.set(key, answer);
      return answer;
    } catch {
      return { made: false, why: SAY_FAILED };
    }
  })();

  making.set(key, job);
  void job.finally(() => {
    making.delete(key);
  });
  return job;
}

/** Put the site's answer on the chapter: the href to play, and the length
 *  when it is a real one rather than the pressed estimate. */
export function dressLiveChapter(rec: Recording, voiceId: string, band: number, o: LiveOpened): void {
  if (o.href) noteLiveTicket(rec, voiceId, band, o.href);
  if (o.durationMs) noteLiveDuration(rec, voiceId, band, o.durationMs);
}

/**
 * Has the reading finished? Asked of the cue file directly — the site's
 * peekReading — for a deck that has no strip to refresh. The galley route
 * answers the finished file, or the partial one with `partial: true`, or a
 * 404 before the first passage has landed (null here: not finished).
 */
export async function peekReading(
  path: string | undefined,
): Promise<{ partial: boolean; durationMs: number } | null> {
  if (!path) return null;
  try {
    const res = await fetch(audioUrl(path), { cache: "no-store" });
    if (!res.ok) return null;
    const g = (await res.json()) as { partial?: boolean; durationMs?: number };
    return { partial: !!g.partial, durationMs: Number(g.durationMs ?? 0) || 0 };
  } catch {
    return null;
  }
}
