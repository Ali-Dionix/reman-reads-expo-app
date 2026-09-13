// The reader's STANDING narrator — the site's `audioVoice` — and the voices
// they have lately been listening in.
//
// On the site a tap on a record label is a WRITE, not a component state:
// audioStore.setNarrator writes `audioVoice` (the reader's choice for every
// book from here on) and moves this book's spot onto the new pressing, so the
// next press of Play drops the chosen pressing, the choice outlives closing
// the volume, and audioLibrary.voiceInForce(slug) answers the same voice from
// every room. This module is that ledger on the phone, under the portal
// state's own key (src/lib/portalState.ts — one JSON, merged writes, stamped
// with its owner), with the site's field name for the choice.
//
// TWO FIELDS THE SITE DERIVES, KEPT PLAINLY HERE. The site reads the pressing
// a book was last played in off its ListeningSpot's `editionId`, and the
// recents strip off the spots' editionIds by `at`. The app's spots
// (audioStore.tsx) carry no edition yet, so the per-book pressing is kept as
// `audioVoiceBySlug` and the strip as `audioRecents` (newest first, RECENTS
// deep) — both a rename away from the site's shape once the deck stamps its
// spots. The deck is meant to read `voiceInForce()` for playBand/playAt and
// call `noteHeard()` on every band change; until it does, VoiceSheet hands
// the choice over the moment the book lands on the platter.
//
// One in-memory copy per owner, shared by every mount through
// useSyncExternalStore, hydrated once from the store; writes land in memory
// first (the tick moves on the tap) and are merged into the store after.

import { useEffect, useSyncExternalStore } from "react";

import { readState, writeState, type Owner } from "../../../lib/portalState";

export type Standing = {
  /** portalClient's `audioVoice` — the reader's choice for every book. */
  audioVoice: string | null;
  /** The pressing each book was last put on — the app's stand-in for the
   *  spot's `editionId`. */
  audioVoiceBySlug: Record<string, string>;
  /** Provider voice ids, newest first — the site's recentVoices(). */
  audioRecents: string[];
};

/** ListeningEnhancer's RECENTS — how many voices the strip carries. */
export const RECENTS = 6;

const EMPTY: Standing = { audioVoice: null, audioVoiceBySlug: {}, audioRecents: [] };

let owner: Owner | null = null;
let standing: Standing = EMPTY;
let hydrated: Owner | null = null;
const subs = new Set<() => void>();

const notify = () => subs.forEach((cb) => cb());

const parse = (raw: unknown): Standing => {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const bySlug: Record<string, string> = {};
  if (s.audioVoiceBySlug && typeof s.audioVoiceBySlug === "object") {
    for (const [k, v] of Object.entries(s.audioVoiceBySlug as Record<string, unknown>)) {
      if (typeof v === "string" && v) bySlug[k] = v;
    }
  }
  return {
    audioVoice: typeof s.audioVoice === "string" && s.audioVoice ? s.audioVoice : null,
    audioVoiceBySlug: bySlug,
    audioRecents: Array.isArray(s.audioRecents)
      ? (s.audioRecents.filter((v): v is string => typeof v === "string" && !!v) as string[]).slice(0, RECENTS)
      : [],
  };
};

/** Read the ledger for this owner into memory, once per owner. A reader who
 *  signs in after a guest starts from the guest's nothing, as the site's
 *  owner stamp arranges. */
async function hydrate(who: Owner): Promise<void> {
  if (hydrated === who) return;
  hydrated = who;
  owner = who;
  standing = EMPTY;
  notify();
  const state = await readState(who);
  if (hydrated !== who) return; // another owner took over meanwhile
  standing = parse(state);
  notify();
}

function commit(next: Standing): void {
  standing = next;
  notify();
  if (owner) {
    void writeState(owner, {
      audioVoice: next.audioVoice,
      audioVoiceBySlug: next.audioVoiceBySlug,
      audioRecents: next.audioRecents,
    });
  }
}

/** The pressing in force for a book — the site's voiceInForce: the pressing
 *  the book was last put on, else the reader's standing choice, else the
 *  book's default. `pressed` is every voice the book was pressed in; a stale
 *  choice naming no pressing of THIS book falls through. */
export function voiceInForce(
  slug: string,
  pressed: string[],
  fallback: string | null,
  st: Standing = standing,
): string | null {
  const by = st.audioVoiceBySlug[slug];
  if (by && pressed.includes(by)) return by;
  const pref = st.audioVoice;
  if (pref && pressed.includes(pref)) return pref;
  return fallback;
}

/** The site's setNarrator, the ledger half: the reader's choice from here
 *  on, and this book's pressing — whether or not the book is on the platter. */
export function chooseVoice(slug: string, voiceId: string): void {
  commit({
    ...standing,
    audioVoice: voiceId,
    audioVoiceBySlug: { ...standing.audioVoiceBySlug, [slug]: voiceId },
  });
}

/** A pressing actually sounded on this book — the front of the recents
 *  strip. The recents only: which pressing the book is ON is the reader's
 *  choice (chooseVoice), and a deck that is still being handed that choice
 *  must not write its passing default over it. */
export function noteHeard(_slug: string, voiceId: string | null): void {
  if (!voiceId) return;
  const rest = standing.audioRecents.filter((v) => v !== voiceId);
  const recents = [voiceId, ...rest].slice(0, RECENTS);
  const same =
    recents.length === standing.audioRecents.length
    && recents.every((v, i) => v === standing.audioRecents[i]);
  if (same) return;
  commit({ ...standing, audioRecents: recents });
}

const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
};
const snapshot = () => standing;

/** The ledger, live, for this owner. */
export function useStanding(who: Owner): Standing {
  useEffect(() => {
    void hydrate(who);
  }, [who]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
