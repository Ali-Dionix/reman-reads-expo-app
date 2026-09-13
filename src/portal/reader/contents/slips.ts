// The slips — bookmarks, the site's ListeningMark (portalClient.ts), kept per
// book under `rr-account-state`'s listening[slug].marks: the SAME key and the
// same slot the site writes (audioStore.ts addBookmark), through
// portalState.ts, so the marks carry the reader's owner stamp with the rest
// of their state. A read for a different owner starts empty, and the key's
// removal — session.tsx's sign-out, the settings' "clear all my data" —
// takes the marks with it, as the site's clearSession / clearAllPortalData
// do. Nothing here is a ledger of its own.
//
// The app's deck still keeps its needle under `rr-listening` (audioStore.tsx),
// not in this slot; when it moves here the spot's other keys ride along —
// every write spreads the stored spot and replaces only `marks`.

import { useCallback, useEffect, useState } from "react";

import { readState, writeState, type Owner } from "../../../lib/portalState";

export type { Owner };

export type ListeningMark = {
  id: string;
  band: number;
  seconds: number;
  note?: string;
  at: number;
  /** Galley word index the slip is pressed on — set when the sounding
   *  chapter's galley was standing at the press. */
  word?: number;
  /** ~6 words of the sounding sentence, so the drawer can show where the
   *  slip sits without fetching the galley. */
  excerpt?: string;
};

/** readAlong.ts wordAnchor() — the word and its excerpt, or null when no
 *  galley for the sounding band is standing. */
export type WordAnchor = { word: number; excerpt: string };

/** audioStore.ts MAX_MARKS — a book holds this many slips. */
export const MAX_MARKS = 20;

/** portalShared.ts's ListeningSpot, as far as this file reads it. */
type Spot = Record<string, unknown> & { marks?: unknown };
type Listening = Record<string, Spot>;

const listeners = new Set<() => void>();
const announce = () => listeners.forEach((fn) => fn());

const isMark = (m: unknown): m is ListeningMark =>
  !!m &&
  typeof m === "object" &&
  typeof (m as ListeningMark).id === "string" &&
  typeof (m as ListeningMark).band === "number" &&
  typeof (m as ListeningMark).seconds === "number";

/** The owner's listening slice, whole, and the marks of one book in it. */
async function readMarks(owner: Owner, slug: string): Promise<{ listening: Listening; marks: ListeningMark[] }> {
  const state = await readState(owner);
  const raw = state.listening;
  const listening: Listening = raw && typeof raw === "object" && !Array.isArray(raw) ? { ...(raw as Listening) } : {};
  const spot = listening[slug];
  const marks = spot && typeof spot === "object" && Array.isArray(spot.marks) ? spot.marks.filter(isMark) : [];
  return { listening, marks };
}

/** Put a book's marks back on its spot — the spot's other keys untouched —
 *  and stamp the owner. */
async function writeMarks(owner: Owner, listening: Listening, slug: string, marks: ListeningMark[]): Promise<void> {
  const { marks: _old, ...rest } = listening[slug] ?? {};
  const spot: Spot = marks.length ? { ...rest, marks } : rest;
  const next: Listening = { ...listening };
  if (Object.keys(spot).length) next[slug] = spot;
  else delete next[slug];
  await writeState(owner, { listening: next });
  announce();
}

export async function bookmarksFor(owner: Owner, slug: string): Promise<ListeningMark[]> {
  return (await readMarks(owner, slug)).marks;
}

/** Press a slip at (band, seconds). Returns the mark, or null at the cap;
 *  a slip already within three seconds answers instead of doubling. With
 *  the read-along's word standing, the slip is pressed ON the word — the
 *  index and its excerpt ride the mark, as the site's addBookmark writes. */
export async function addBookmark(
  owner: Owner,
  slug: string,
  band: number,
  seconds: number,
  anchor?: WordAnchor | null,
): Promise<{ mark: ListeningMark; already: boolean } | null> {
  const { listening, marks } = await readMarks(owner, slug);
  const near = marks.find((m) => m.band === band && Math.abs(m.seconds - seconds) < 3);
  if (near) return { mark: near, already: true };
  if (marks.length >= MAX_MARKS) return null;
  let at = Date.now();
  while (marks.some((m) => m.id === String(at))) at += 1;
  const mark: ListeningMark = {
    id: String(at),
    band,
    seconds: Math.max(0, Math.round(seconds)),
    at,
    ...(anchor ? { word: anchor.word, excerpt: anchor.excerpt.slice(0, 120) } : {}),
  };
  await writeMarks(owner, listening, slug, [...marks, mark]);
  return { mark, already: false };
}

/** The site's noteBookmark: a word to remember it by, written once onto a
 *  fresh slip (trimmed, 200 characters at most — the input's maxlength). */
export async function noteBookmark(owner: Owner, slug: string, id: string, note: string): Promise<void> {
  const text = note.trim().slice(0, 200);
  if (!text) return;
  const { listening, marks } = await readMarks(owner, slug);
  if (!marks.some((m) => m.id === id)) return;
  await writeMarks(owner, listening, slug, marks.map((m) => (m.id === id ? { ...m, note: text } : m)));
}

export async function removeBookmark(owner: Owner, slug: string, id: string): Promise<void> {
  const { listening, marks } = await readMarks(owner, slug);
  if (!marks.some((m) => m.id === id)) return;
  await writeMarks(owner, listening, slug, marks.filter((m) => m.id !== id));
}

/** A book's slips, live — sorted by band then seconds, as paintSlips does.
 *  Re-read for a new owner: another reader's marks are never shown. */
export function useBookmarks(owner: Owner, slug: string): ListeningMark[] {
  const [marks, setMarks] = useState<ListeningMark[]>([]);
  const load = useCallback(() => {
    let alive = true;
    void bookmarksFor(owner, slug).then((m) => {
      if (alive) setMarks(m.slice().sort((a, b) => a.band - b.band || a.seconds - b.seconds));
    });
    return () => {
      alive = false;
    };
  }, [owner, slug]);
  useEffect(() => {
    setMarks([]);
    const stop = load();
    const fn = () => void load();
    listeners.add(fn);
    return () => {
      stop();
      listeners.delete(fn);
    };
  }, [load]);
  return marks;
}
