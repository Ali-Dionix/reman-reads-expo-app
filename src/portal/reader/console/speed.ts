// The dial's memory and the creep — app/components/audioStore.ts's
// SPEED_MIN / SPEED_MAX / SPEED_STEP / quantSpeed, `speedByBook`,
// `speedFor`, `speedShownFor`, `setSpeed(speed, slug)`, `setSpeedRamp` and
// `runRamp` (RAMP_EVERY_S, RAMP_CEIL), kept beside the console until
// src/lib/audioStore carries them itself.
//
// THE DIAL IS PER BOOK. The site's chain is `speedByBook[slug] ??
// listening[slug].speed ?? state.audioSpeed ?? 1`: the figure a reader last
// set on THIS volume, else the one its spot remembers, else the reader's own
// default from /account/profile/settings, else the pace it was recorded at.
// The deck's own `rate` is one global that starts at 1 every launch, so a
// reader who listened at 1.5× yesterday would reopen the volume to a dial
// that says 1× — and a second book would inherit the first's. `speedFor`
// reads the site's chain (the app's spot already carries `speed`, written
// off the deck on every stamp; the settings slice is read once, below).
//
// THE PLATTER FOLLOWS THE BOOK, NOT THE CONSOLE. The site's loadBand sets
// `st.speed = speedFor(slug)` on EVERY cue, whether or not a volume stands
// open; `useFollowBookSpeed` is that, and belongs ONCE at the listening
// room's root so a book begun from the shelf with the volume shut plays at
// its own rate — not the previous book's, which the recorder would then
// stamp into the new book's spot as if the reader had set it. `useBookSpeed`
// keeps the platter on the open book's dial while that book sounds.
//
// EVERY ARRIVAL AT A NEW SPEED is quantised here — chip, stepper, slider,
// the ramp, the restore — so no caller can put 1.0500000000000003× on the
// dial: 0.05 is not 0.05 in binary, and Math.round(v * 20) / 20 is the
// twentieth the site snaps to.
//
// THE RAMP ("Speed up as you go") adds a twentieth every five minutes
// actually heard and stops at 2×. The site counts heard seconds off
// timeupdate — forward deltas between beats, never a seek's jump — and its
// runRamp lives in the store, so the creep keeps climbing with the volume
// shut. Here `useSpeedRamp` counts off the deck's 500ms clock and belongs at
// the room's root (SpeedFollower.tsx mounts it beside `useFollowBookSpeed`);
// the console's own call is a stand-in that counts only while no root does,
// so the volume never counts a second twice. Arming it (either way)
// restarts the five minutes: a reader who switches it off and straight back
// on has not banked four of them.
//
// THE CEILING IS THE PLATTER'S. The site's HTMLAudio turns at 3×; expo-audio
// 57 clamps the native rate at 2.0 on both platforms (ios/AudioModule.swift
// `min(rate, 2.0)`, android AudioPlayer.kt `coerceIn(0.1f, 2.0f)`), so on a
// phone the dial stops at 2× — a figure it prints must be a pace it turns.
// TODO(shared: a patch-package on expo-audio lifting the clamp — AVPlayer
// plays past 2× under .spectral, ExoPlayer to 8 — restores the site's 3×
// here in one line).
//
// Session memory, like the site's `speedByBook` — the persisted half is the
// spot, which the deck's recorder writes.

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { Platform } from "react-native";

import { useDeck, useDeckClock, type Spots } from "../../../lib/audioStore";
import { ownerOf } from "../../../lib/portalState";
import { useSession } from "../../../lib/session";
import { readSettings } from "../../settings/state";

export const SPEED_MIN = 0.5;
export const SPEED_MAX = Platform.OS === "web" ? 3 : 2;
export const SPEED_STEP = 0.05;

/** Five minutes actually heard, per twentieth. */
export const RAMP_EVERY_S = 300;
/** The ramp is a nudge, not a runaway. */
export const RAMP_CEIL = 2;

/** Snap to the twentieth and hold the range. */
export const quantSpeed = (v: number): number =>
  Math.min(SPEED_MAX, Math.max(SPEED_MIN, Math.round(v * 20) / 20));

/** setSpeedUI's speedShort — the dial's own figure, as short as it is honest. */
export const speedShort = (speed: number): string => `${speed}×`;

/* ------------------------------------------------------------ the store --- */

export type SpeedState = {
  /** The site's `speedByBook`. */
  byBook: Record<string, number>;
  /** The creep, armed. One flag for the deck, as `st.ramp` is. */
  ramp: boolean;
  /** The reader's own default — settings.audioSpeed, the chain's third link.
   *  Null until the ledger has been read for this reader. */
  dflt: number | null;
  /** Whose ledger `dflt` came from, so a sign-in re-reads it. */
  dfltOwner: string | null;
};

let state: SpeedState = { byBook: {}, ramp: false, dflt: null, dfltOwner: null };
/** Seconds heard towards the next twentieth — a counter, not a render. */
let rampHeard = 0;

const subs = new Set<() => void>();
const emit = () => {
  for (const cb of subs) cb();
};
const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
};
const read = () => state;

/** The site's `setSpeed(speed, slug)` — quantised, remembered for the book. */
export function setSpeedFor(slug: string, speed: number): void {
  if (!slug || !Number.isFinite(speed)) return;
  const v = quantSpeed(speed);
  if (state.byBook[slug] === v) return;
  state = { ...state, byBook: { ...state.byBook, [slug]: v } };
  emit();
}

/** Arm or disarm the creep. The five minutes restart either way. */
export function setSpeedRamp(on: boolean): void {
  rampHeard = 0;
  if (state.ramp === on) return;
  state = { ...state, ramp: on };
  emit();
}

/** The reader's default, read once per owner off the settings ledger. */
let dfltJob: string | null = null;
function ensureDefault(owner: string): void {
  if (state.dfltOwner === owner || dfltJob === owner) return;
  dfltJob = owner;
  readSettings(owner)
    .then((s) => {
      if (dfltJob !== owner) return;
      dfltJob = null;
      state = { ...state, dflt: Number.isFinite(s.audioSpeed) ? s.audioSpeed : 1, dfltOwner: owner };
      emit();
    })
    .catch(() => {
      if (dfltJob !== owner) return;
      dfltJob = null;
      state = { ...state, dflt: 1, dfltOwner: owner };
      emit();
    });
}

/** The site's `speedFor(slug)` — this session's dial, else the spot's, else
 *  the reader's default, else as recorded. Pure: hand it the deck's spots. */
export function speedFor(slug: string, spots: Spots, st: SpeedState = state): number {
  return quantSpeed(st.byBook[slug] ?? spots[slug]?.speed ?? st.dflt ?? 1);
}

/* ------------------------------------------------------------- the hooks --- */

/** Subscribe to the store, and see the reader's default is on its way. */
function useSpeedStore(): SpeedState {
  const { user } = useSession();
  const owner = ownerOf(user?.id);
  useEffect(() => {
    ensureDefault(owner);
  }, [owner]);
  return useSyncExternalStore(subscribe, read, read);
}

/**
 * The dial for one book: the figure it stands at, how to turn it, and the
 * ramp. While THIS book is on the platter the deck's rate follows the figure
 * — on open, on every re-cue (a new source is a new player, whose rate the
 * deck restates), and on every turn.
 */
export function useBookSpeed(slug: string) {
  const { now, spots, rate, setRate } = useDeck();
  const st = useSpeedStore();
  const here = now?.slug === slug;
  // speedShownFor: this session's dial, else the spot's, else the reader's
  // default, else as recorded
  const speed = speedFor(slug, spots, st);

  useEffect(() => {
    if (here && rate !== speed) setRate(speed);
  }, [here, rate, speed, setRate]);

  const set = useCallback((v: number) => setSpeedFor(slug, v), [slug]);
  return { speed, set, ramp: st.ramp, setRamp: setSpeedRamp, here };
}

/**
 * The site's loadBand: every book that lands on the platter takes ITS OWN
 * dial, whether or not a volume stands open. Mount ONCE at the listening
 * room's root (it needs the deck and the session). The figure resolved is
 * also pinned as the book's session dial, so the recorder's first stamp —
 * which reads the deck's rate a tick before setRate lands — cannot become
 * the book's remembered speed.
 */
export function useFollowBookSpeed(): void {
  const { now, spots, setRate } = useDeck();
  const st = useSpeedStore();
  const slug = now?.slug ?? "";
  const ready = st.dfltOwner !== null;
  // the live spots and store, read at the moment of the cue — the effect
  // keys on the SLUG (and on the default arriving), not on every stamp
  const live = useRef({ spots, st });
  live.current = { spots, st };
  useEffect(() => {
    if (!slug || !ready) return;
    const v = speedFor(slug, live.current.spots, live.current.st);
    setSpeedFor(slug, v);
    setRate(v);
  }, [slug, ready, setRate]);
}

/** How many room-root ramps stand mounted: while one does, a console's
 *  stand-in call counts nothing (see the header). */
let roomRamps = 0;

/**
 * The creep, run off the deck's clock: forward deltas between beats while
 * this book plays count as heard; a seek's jump (either way) does not;
 * every RAMP_EVERY_S the dial goes up a twentieth, to RAMP_CEIL and no
 * further. `owner` says who is counting — the "room" root, which keeps
 * counting with the volume shut (the site's runRamp), or a "console", whose
 * count stands in only until a root is mounted.
 */
export function useSpeedRamp(slug: string, owner: "room" | "console" = "console"): void {
  const { now, playing } = useDeck();
  // the beat the creep counts by — the clock, not the deck, so only this
  // (null-rendering) follower ticks with it
  const { position } = useDeckClock();
  const { speed, set, ramp } = useBookSpeed(slug);
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (owner !== "room") return;
    roomRamps += 1;
    return () => {
      roomRamps -= 1;
    };
  }, [owner]);
  useEffect(() => {
    if (!slug || now?.slug !== slug || !playing || (owner === "console" && roomRamps > 0)) {
      // every pause and every re-cue re-bases the clock, as a seek does
      last.current = null;
      return;
    }
    const t0 = last.current;
    last.current = position;
    if (t0 == null || !ramp) return;
    const d = position - t0;
    // the ceiling only guards anomalies (a throttled tick at 2× is a
    // multi-second delta; a fifteen-second jog is not listening)
    if (d > 0 && d < 5) rampHeard += d;
    if (rampHeard < RAMP_EVERY_S) return;
    rampHeard -= RAMP_EVERY_S;
    const next = quantSpeed(speed + SPEED_STEP);
    if (next > speed && next <= RAMP_CEIL) set(next);
  }, [now?.slug, slug, owner, playing, position, ramp, speed, set]);
}
