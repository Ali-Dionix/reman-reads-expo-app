// The deck. One player, mounted above the router.
//
// The site's audioStore is a globalThis singleton that owns THE ONE audio
// element, so playback survives navigation between rooms. This is the same
// contract on the phone: the player is created once at the root and shared
// through context, so switching tabs — or leaving the Listening Room entirely
// — never stops the needle.
//
// Band model, unchanged: a book is a list of chapters, and `playBand(slug, n,
// at?)` is the primitive everything else is built from. Auto-advance rolls
// into the next chapter at the end of the current one.
//
// A BOOK IS PRESSED IN ONE OR MORE VOICES. Every pressing reads the same
// reviewed text in the same chapters — only the clock differs — so `now`
// carries which pressing is in force, `chaptersOf()` picks that pressing's
// chapter list, and a narrator switch (`setNarrator`) restates the needle by
// the ratio of the two run lengths rather than resetting it. A seek issued
// before the new source reports ready is dropped by every platform, so it is
// parked in `pendingSeek` and landed once the CURRENT player has loaded.
//
// THE NEEDLE'S MEMORY lives here too — portalClient.ts's `state.listening`,
// one ListeningSpot per slug, kept on the device under the site's own shape
// so a later sync to listening_progress is a rename of keys, not a
// migration. The web's audioStore stamps a spot on every band change and
// every pause, hydrate() merges the server's copy in, and AccountEnhancer
// builds the Continue-listening shelf from it. The recorder runs INSIDE the
// provider, so it lives for the app's life whichever tab mounted first, and
// `begin(slug)` is the site's beginBook: "Play where this book was left, or
// start it from band one. A finished recording starts from the top."
//
// LISTENING IS FOR READERS WITH AN ACCOUNT — the site's `listeningLocked`:
// a guest pass, or nobody signed in, walks the whole room and cannot put a
// record on. The refusal happens HERE, in the motor (`locked`), so nothing
// upstream can play by accident; what the room owes on top is the sentence,
// which `say` carries for the console to print with its "Sign up to listen."
// link. The two PRESSED voices are free to a signed-in reader; the LIVE
// voices (Fish) are on the subscription — see `voiceLocked`.
//
// TWO CLOCKS. The context's `position` ticks at the player's 500ms — enough
// for a groove and a readout, and every useDeck() consumer (the tab bar, the
// rooms) re-renders on it. The read-along needs ten a second or it gilds
// every other word, and that must not cost the whole tree: `useFastPosition`
// subscribes a single component to a 100ms sample of the player's own clock
// through a ref, so only the leaf that paints the gilt re-renders.
//
// WHAT THIS IS NOT, yet: lock-screen and notification transport, and playback
// that survives the app being backgrounded on iOS. Those need
// react-native-track-player, which is not in Expo Go — so they land with the
// development build (Phase 3). expo-audio gives real playback today, in Expo
// Go, which is what the room needs to stop being a picture of a room.

import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import shelf from "../data/listeningShelf.json";
import { audioUrl } from "./audioResolve";
import { useSession } from "./session";
import { cache } from "./storage";

export type Chapter = {
  n: number;
  title: string;
  src: string;
  duration: number;
  /** Bucket key of this chapter's galley — the read-along's whole data need in
   *  one fetch. Pressed editions only; a specimen has no text to follow. */
  galley?: string;
};

/** One voice this book was pressed in, as the turntable prints it. */
export type Voice = { id: string; name: string; note: string; hue: string };

/** One pressing — the same reviewed text, read by one voice. */
export type Pressing = {
  voiceId: string | null;
  voiceLabel: string | null;
  seconds: number;
  chapters: Chapter[];
};

export type Recording = {
  slug: string;
  title: string;
  author: string;
  voice: string;
  /** True when every chapter carries a galley — the reader can follow the words. */
  hasText: boolean;
  /** The pressing the house puts on first. Null for a specimen. */
  voiceId: string | null;
  voices: Voice[];
  pressings: Record<string, Pressing>;
  seconds: number;
  chapters: Chapter[];
};

const RECORDINGS = shelf.recordings as unknown as Record<string, Recording>;

export const recordingFor = (slug: string): Recording | null => RECORDINGS[slug] ?? null;

/**
 * The chapters of one pressing. Falls back to the record's own flattened list,
 * which is what a specimen — pressed in no voice at all — always uses.
 */
export const chaptersOf = (rec: Recording | null, voiceId: string | null): Chapter[] =>
  (voiceId ? rec?.pressings?.[voiceId]?.chapters : null) ?? rec?.chapters ?? [];

/** A PRESSED voice — one the house recorded this book in. Anything else is a
 *  live reader, which is the subscription's. */
export const isPressedVoice = (rec: Recording | null, voiceId: string | null): boolean =>
  !!voiceId && !!rec?.pressings?.[voiceId];

/** Every voice the house has pressed ANY book in — the two house readers.
 *  The pressed-vs-live line, independent of which book is open. */
const PRESSED_IDS = new Set(
  Object.values(RECORDINGS).flatMap((r) => Object.keys(r.pressings ?? {})),
);

/* ----------------------------------------------------------- the spots --- */

/** The site's ListeningSpot: `chapter` is the band index, `seconds` the
 *  position within it, `at` the ms epoch of the last touch (newest wins the
 *  shelf), `listenedS` the seconds actually heard, `finishedAt` when the
 *  book ran to its end. */
export type ListeningSpot = {
  chapter: number;
  seconds: number;
  speed: number;
  at: number;
  listenedS?: number;
  finishedAt?: number;
};

export type Spots = Record<string, ListeningSpot>;

/** portalShared.ts PORTAL_STATE_KEY carries the whole state on the web; the
 *  app keeps the one slice it has under its own key. */
const SPOTS_KEY = "rr-listening";

export async function readSpots(): Promise<Spots> {
  try {
    const raw = await cache.get(SPOTS_KEY);
    const map: unknown = raw ? JSON.parse(raw) : {};
    if (!map || typeof map !== "object") return {};
    const out: Spots = {};
    for (const [slug, v] of Object.entries(map as Record<string, unknown>)) {
      const s = v as Partial<ListeningSpot> | null;
      if (!s || typeof s.chapter !== "number" || typeof s.seconds !== "number") continue;
      out[slug] = {
        chapter: s.chapter,
        seconds: s.seconds,
        speed: typeof s.speed === "number" ? s.speed : 1,
        at: typeof s.at === "number" ? s.at : 0,
        ...(typeof s.listenedS === "number" ? { listenedS: s.listenedS } : {}),
        ...(typeof s.finishedAt === "number" ? { finishedAt: s.finishedAt } : {}),
      };
    }
    return out;
  } catch {
    return {};
  }
}

/** `keep`: a re-cue of the band the stored spot is already on keeps the
 *  stored seconds — the seek that resumes there has not landed yet. */
async function writeSpot(slug: string, spot: ListeningSpot, keep = false): Promise<ListeningSpot> {
  const all = await readSpots();
  const prev = all[slug];
  const next = keep && prev && prev.chapter === spot.chapter ? { ...spot, seconds: prev.seconds } : spot;
  all[slug] = next;
  await cache.set(SPOTS_KEY, JSON.stringify(all));
  return next;
}

/** AccountEnhancer.heardSeconds: whole bands before the needle + the spot. */
export const heardSeconds = (book: Recording, spot: ListeningSpot): number => {
  let s = 0;
  for (let i = 0; i < spot.chapter && i < book.chapters.length; i += 1) {
    s += book.chapters[i].duration;
  }
  return s + Math.max(0, spot.seconds);
};

/**
 * AccountEnhancer's `resumable`: unfinished, with real needle movement or
 * real listening — never an untouched 0/0 — newest first.
 */
export const resumable = (spots: Spots): { slug: string; spot: ListeningSpot; book: Recording }[] =>
  Object.entries(spots)
    .map(([slug, spot]) => ({ slug, spot, book: recordingFor(slug) }))
    .filter((e): e is { slug: string; spot: ListeningSpot; book: Recording } => !!e.book)
    .sort((a, b) => b.spot.at - a.spot.at)
    .filter((e) => e.spot.finishedAt == null)
    .filter((e) => heardSeconds(e.book, e.spot) > 0 || (e.spot.listenedS ?? 0) > 0);

/** The site's spotOnPressing: a spot whose band exists on this pressing. */
const fits = (spot: ListeningSpot | undefined, book: Recording): boolean =>
  !!spot && spot.chapter >= 0 && spot.chapter < book.chapters.length;

/* ------------------------------------------------------------- the deck --- */

type Now = { slug: string; band: number; voice: string | null } | null;

/** The console's sentence for a locked room. The console appends the site's
 *  "Sign up to listen." link itself, so the link can route. */
export const LOCKED_SAY = "Listening needs an account.";

export type DeckValue = {
  /** What is on the platter — null when nothing has been started. */
  now: Now;
  recording: Recording | null;
  chapter: Chapter | null;
  playing: boolean;
  /** Seconds into the current chapter, and its length. */
  position: number;
  duration: number;
  /** True while the chapter is still buffering. */
  loading: boolean;
  /** The slug that just ran to the end of its last band (the site's `ended`
   *  status); cleared by the next playBand. */
  finished: string | null;
  /** Which pressing is in force, and every voice this book was pressed in. */
  voice: string | null;
  voices: Voice[];
  /**
   * Change the reader mid-sentence. Every pressing reads the SAME text in the
   * same chapters, so the needle is restated by the ratio of the two run
   * lengths rather than reset — the web's setNarrator, in the hand.
   */
  setNarrator: (voiceId: string) => void;
  /** Drop the needle on a book at a given band, and optionally a second into
   *  it — the seek waits for the chapter to load (a seek on a player that has
   *  not loaded its source is a seek the platform drops). */
  playBand: (slug: string, band?: number, at?: number) => void;
  /**
   * Drop the needle at an exact spot in a band — what a finger on a printed
   * word asks for. Unlike playBand this does not restart anything: whatever
   * the deck was doing (playing, paused) it goes on doing, from there.
   */
  playAt: (slug: string, band: number, seconds: number) => void;
  /** The site's beginBook: resume where this book rested, or from the top if
   *  it was played through. A recording already on the platter resumes rather
   *  than restarting. False when this build has no recording for the slug —
   *  the caller declines the tap — and false when the room is locked (the
   *  console has been told why). */
  begin: (slug: string) => boolean;
  /** Resume or pause whatever is loaded. */
  toggle: () => void;
  seekTo: (seconds: number) => void;
  /** The ± buttons. */
  nudge: (seconds: number) => void;
  step: (delta: 1 | -1) => void;
  stop: () => void;
  /** The dial — the platter's speed. 1 is 33⅓. */
  rate: number;
  setRate: (rate: number) => void;
  /** The needle positions this device remembers, live: every write the
   *  recorder makes lands here, so a shelf repaints without a second read. */
  spots: Spots;
  /** The site's listeningLocked: a guest pass, or nobody signed in. */
  locked: boolean;
  /** What the console prints under the groove, and whether it is a refusal
   *  (brick, 600) or a muted notice. Null when there is nothing to say. */
  say: { text: string; bad: boolean } | null;
  /** Is THIS voice off limits: a live reader is the subscription's; a
   *  pressed one is free to a signed-in reader; everything is shut to a guest. */
  voiceLocked: (voiceId: string) => boolean;
  /** The read-along's clock — see useFastPosition. */
  subscribePosition: (cb: (seconds: number) => void) => () => void;
};

const DeckContext = createContext<DeckValue | null>(null);

/** How often the needle is written while it is moving. The web writes on
 *  band change and pause only, and the position is restated by the
 *  timeupdate that precedes the pause; here the platform's status ticks
 *  every 500ms, so a periodic write keeps a force-quit from losing more than
 *  a few seconds. */
const TICK_MS = 5000;

/** The read-along's sample rate. A narrator reads about four words a second,
 *  so a clock that reports twice a second gilds every other word. */
const FAST_MS = 100;

/** The player's own tick. Shared by every useDeck() consumer, so it stays at
 *  the transport's rate; the read-along has its own clock above. */
const STATUS_MS = 500;

export function AudioProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState<Now>(null);
  const [wantPlay, setWantPlay] = useState(false);
  const [finished, setFinished] = useState<string | null>(null);

  const recording = now ? (RECORDINGS[now.slug] ?? null) : null;
  const chapters = chaptersOf(recording, now?.voice ?? null);
  const chapter = chapters[now?.band ?? 0] ?? null;
  const uri = chapter ? audioUrl(chapter.src) : null;

  /* --- the shop door --- */
  const { guest, user } = useSession();
  const locked = guest || !user;
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  const [refused, setRefused] = useState(false);
  // Refuse, visibly. Returns true when it refused, so a caller reads
  // `if (refuse()) return;` — the site's refuseLocked.
  const refuse = useCallback((): boolean => {
    if (!lockedRef.current) return false;
    setRefused(true);
    return true;
  }, []);
  // A sign-in unlocks the room and the refusal ink goes with it.
  useEffect(() => {
    if (!locked) setRefused(false);
  }, [locked]);

  // The documented path: hand the hook the source and let it own loading.
  // (An earlier version created the player sourceless and fed it replace() —
  // that leaves `isLoaded` false on some platforms, which is how the transport
  // ended up drawn but dead.)
  //
  // A NEW SOURCE IS A NEW PLAYER: useAudioPlayer keys the instance on the
  // source, so every band change and every narrator switch releases the old
  // player and creates another. useAudioPlayerStatus keeps the LAST status it
  // was handed until the new player emits, which means that for a tick after a
  // re-cue `status` describes a player that no longer exists — isLoaded true,
  // the old chapter's duration. Anything that gates on it (the parked seek,
  // above all) has to know whose status it is reading.
  const player = useAudioPlayer(uri ? { uri } : null, { updateInterval: STATUS_MS });
  const stale = useAudioPlayerStatus(player);
  const status = stale.id === player.id ? stale : player.currentStatus;

  // Keep sounding with the ringer switch flipped — an audiobook the silent
  // switch mutes is an audiobook that appears broken.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(
      (e: unknown) => {
        if (__DEV__) console.log("[deck] setAudioModeAsync threw", String(e));
      },
    );
  }, []);

  // Start or stop whatever is on the platter. Keyed on the URI and the intent,
  // so a re-render never re-cues a chapter mid-sentence.
  //
  // NOT gated on `isLoaded`: play() before the source is ready is queued by
  // every platform's player, whereas waiting for a flag that may never arrive
  // gives you a transport that is drawn and dead.
  useEffect(() => {
    if (!uri) return;
    try {
      if (wantPlay) {
        if (__DEV__) console.log("[deck] play() called", uri);
        player.play();
      } else player.pause();
    } catch (e) {
      if (__DEV__) console.log("[deck] play() threw", String(e));
    }
  }, [uri, wantPlay, player]);

  // DIAGNOSTICS FOR THE PHONE. Expo Go forwards console.log to Metro's
  // terminal, which is the only window there is onto the device. One line per
  // change of the fields that decide whether anything sounds. Temporary.
  const diagKey = __DEV__
    ? JSON.stringify({
        uri,
        wantPlay,
        isLoaded: status.isLoaded,
        playing: status.playing,
        state: status.playbackState,
        waiting: status.reasonForWaitingToPlay,
        t: Math.round(status.currentTime || 0),
        d: Math.round(status.duration || 0),
      })
    : "";
  useEffect(() => {
    if (__DEV__ && diagKey) console.log("[deck]", diagKey);
  }, [diagKey]);

  // The spots — read once at boot, then kept live by the recorder below.
  const [spots, setSpots] = useState<Spots>({});
  const spotsRef = useRef<Spots>({});
  useEffect(() => {
    let alive = true;
    readSpots().then((all) => {
      if (!alive) return;
      spotsRef.current = all;
      setSpots(all);
    });
    return () => {
      alive = false;
    };
  }, []);
  const stampSpot = useCallback((slug: string, spot: ListeningSpot, keep = false) => {
    void writeSpot(slug, spot, keep).then((written) => {
      spotsRef.current = { ...spotsRef.current, [slug]: written };
      setSpots(spotsRef.current);
    });
  }, []);

  // Auto-advance — roll into the next chapter, and stop cleanly at the end of
  // the book rather than looping; the spot takes `finishedAt`, so the next
  // begin() starts it from the top.
  const advancing = useRef(false);
  useEffect(() => {
    if (!status.didJustFinish || !recording || !now || advancing.current) return;
    advancing.current = true;
    const next = now.band + 1;
    if (next < chaptersOf(recording, now.voice).length) setNow({ ...now, band: next });
    else {
      const prev = spotsRef.current[now.slug];
      stampSpot(now.slug, {
        chapter: now.band,
        seconds: status.duration || chaptersOf(recording, now.voice)[now.band]?.duration || 0,
        speed: prev?.speed ?? 1,
        at: Date.now(),
        ...(prev?.listenedS != null ? { listenedS: prev.listenedS } : {}),
        finishedAt: Date.now(),
      });
      setFinished(now.slug);
      setWantPlay(false);
      setNow(null);
    }
    // one tick, so the flag clears after the status settles
    setTimeout(() => {
      advancing.current = false;
    }, 0);
  }, [status.didJustFinish, status.duration, recording, now, stampSpot]);

  // A parked seek, pending until the chapter has loaded: a resume re-cues the
  // band, a narrator switch changes the file under the needle, a finger on a
  // word two chapters on cues that band — and seeking a player that has not
  // loaded its source is a seek the platform drops on the floor, which reads
  // as the switch throwing you back to the top. The web's loadBand restates
  // the seconds itself. Keyed to the pressing it was parked for, and landed
  // only on the CURRENT player's own status (see `status` above).
  const pendingSeek = useRef<{ slug: string; band: number; voice: string | null; seconds: number } | null>(null);
  useEffect(() => {
    const p = pendingSeek.current;
    if (!p || !now || now.slug !== p.slug || now.band !== p.band || now.voice !== p.voice) return;
    if (!status.isLoaded || !(status.duration > 0)) return;
    pendingSeek.current = null;
    if (p.seconds > 0) player.seekTo(Math.min(p.seconds, status.duration));
  }, [now, status.isLoaded, status.duration, player]);

  const playBand = useCallback(
    (slug: string, band = 0, at?: number) => {
      const rec = RECORDINGS[slug];
      if (!rec) return;
      if (refuse()) return;
      const voice = rec.voiceId ?? null;
      pendingSeek.current = at && at > 0 ? { slug, band, voice, seconds: at } : null;
      setFinished(null);
      setNow({ slug, band, voice });
      setWantPlay(true);
    },
    [refuse],
  );

  const playAt = useCallback(
    (slug: string, band: number, seconds: number) => {
      const rec = RECORDINGS[slug];
      if (!rec) return;
      if (refuse()) return;
      // stay on the pressing already in force for this book
      const voiceId = now?.slug === slug ? now.voice : (rec.voiceId ?? null);
      const ch = chaptersOf(rec, voiceId)[band];
      if (!ch) return;
      const at = Math.max(0, Math.min(ch.duration, seconds));
      // same band, same file: the needle just moves. A setNow with identical
      // values would not change the uri, so the pending-seek effect would
      // never fire and the tap would look ignored.
      if (now?.slug === slug && now.band === band) {
        player.seekTo(at);
        return;
      }
      pendingSeek.current = { slug, band, voice: voiceId, seconds: at };
      setFinished(null);
      setNow({ slug, band, voice: voiceId });
    },
    [now, player, refuse],
  );

  /**
   * The turntable. Both pressings hold the same reviewed text in the same
   * chapters — only the clock differs — so the place in the CHAPTER is a
   * proportion, and that proportion is what survives the change of reader.
   */
  const setNarrator = useCallback(
    (voiceId: string) => {
      if (!now || !recording || now.voice === voiceId) return;
      if (refuse()) return;
      const from = chaptersOf(recording, now.voice)[now.band];
      const to = chaptersOf(recording, voiceId)[now.band];
      if (!from || !to) return; // this book has no such pressing
      const at = status.currentTime ?? 0;
      const seconds =
        from.duration && from.duration !== to.duration
          ? Math.max(0, Math.min(to.duration, at * (to.duration / from.duration)))
          : Math.max(0, Math.min(to.duration, at));
      pendingSeek.current = { slug: now.slug, band: now.band, voice: voiceId, seconds };
      setNow({ ...now, voice: voiceId });
    },
    [now, recording, status.currentTime, refuse],
  );

  const toggle = useCallback(() => {
    if (refuse()) return;
    // `wantPlay` is the intent, `status.playing` only reports what the platform
    // got round to. Toggling off the intent means the button always answers.
    setWantPlay((want) => {
      const next = !(want || status.playing);
      try {
        if (next) {
          if (__DEV__) console.log("[deck] play() called", uri);
          player.play();
        } else player.pause();
      } catch (e) {
        if (__DEV__) console.log("[deck] play() threw", String(e));
      }
      return next;
    });
  }, [player, status.playing, uri, refuse]);

  const begin = useCallback(
    (slug: string): boolean => {
      const book = RECORDINGS[slug];
      if (!book) return false;
      if (refuse()) return false;
      // Already on the platter: the needle stays where it is; a paused one resumes.
      if (now?.slug === slug) {
        if (!wantPlay) toggle();
        return true;
      }
      const spot = spotsRef.current[slug];
      if (spot?.finishedAt != null || !fits(spot, book)) {
        playBand(slug, 0, 0);
        return true;
      }
      playBand(slug, spot!.chapter, spot!.seconds);
      return true;
    },
    [now, wantPlay, toggle, playBand, refuse],
  );

  const seekTo = useCallback(
    (seconds: number) => {
      const end = status.duration || 0;
      player.seekTo(Math.max(0, end ? Math.min(seconds, end) : seconds));
    },
    [player, status.duration],
  );

  const nudge = useCallback(
    (seconds: number) => seekTo((status.currentTime || 0) + seconds),
    [seekTo, status.currentTime],
  );

  const step = useCallback(
    (delta: 1 | -1) => {
      if (!recording || !now) return;
      if (refuse()) return;
      const band = now.band + delta;
      if (band < 0 || band >= chaptersOf(recording, now.voice).length) return;
      pendingSeek.current = null;
      setNow({ ...now, band });
      setWantPlay(true);
    },
    [recording, now, refuse],
  );

  const stop = useCallback(() => {
    setWantPlay(false);
    setNow(null);
  }, []);

  // The dial. Re-applied on every re-cue: a new source resets the platform
  // player's rate to 1, and a dial that silently springs back reads as broken.
  const [rate, setRateState] = useState(1);
  const setRate = useCallback(
    (r: number) => {
      setRateState(r);
      try {
        player.setPlaybackRate(r);
      } catch {}
    },
    [player],
  );
  useEffect(() => {
    if (rate === 1) return;
    try {
      player.setPlaybackRate(rate);
    } catch {}
  }, [uri, player, rate]);

  /* --- the recorder: a spot on every band change, every pause and resume,
         and every TICK_MS while playing --- */
  const slug = now?.slug ?? "";
  const band = now?.band ?? 0;
  const playing = !!status.playing;
  const position = status.currentTime ?? 0;

  // Refs, so the interval and the effects read the LIVE values rather than
  // the ones their closures were built with.
  const posRef = useRef(position);
  posRef.current = position;
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const heardRef = useRef<{ slug: string; listenedS: number }>({ slug: "", listenedS: 0 });
  const lastPos = useRef(0);

  // True seconds heard this session on the current slug: position deltas
  // while playing, never a seek's jump.
  useEffect(() => {
    if (!slug) return;
    if (heardRef.current.slug !== slug) {
      heardRef.current = { slug, listenedS: spotsRef.current[slug]?.listenedS ?? 0 };
      lastPos.current = position;
      return;
    }
    if (playing) {
      const d = position - lastPos.current;
      if (d > 0 && d < 3) heardRef.current.listenedS += d;
    }
    lastPos.current = position;
  }, [slug, position, playing]);

  const lastKey = useRef("");
  useEffect(() => {
    if (!slug || !RECORDINGS[slug]) return;
    // The needle the platform reports lags a re-cue by a tick: on a band
    // change posRef still holds the LAST chapter's position, so the first
    // stamp of a new band is written at 0 — which is where a fresh band
    // starts — and the tick or the pause restates the real one.
    const key = `${slug}|${band}`;
    let fresh = lastKey.current !== key;
    lastKey.current = key;
    const stamp = () => {
      stampSpot(
        slug,
        {
          chapter: band,
          seconds: fresh ? 0 : Math.max(0, posRef.current),
          speed: rateRef.current,
          at: Date.now(),
          listenedS: Math.round(heardRef.current.listenedS),
        },
        fresh,
      );
      fresh = false;
    };
    // A band change, a pause, or a resume: write now, with the live needle.
    stamp();
    if (!playing) return;
    const t = setInterval(stamp, TICK_MS);
    return () => clearInterval(t);
  }, [slug, band, playing, stampSpot]);

  /* --- the fast clock: the read-along's, through a ref --- */
  const fastRef = useRef(0);
  const listeners = useRef(new Set<(seconds: number) => void>());
  const tell = (s: number) => {
    fastRef.current = s;
    for (const cb of listeners.current) cb(s);
  };
  const tellRef = useRef(tell);
  tellRef.current = tell;
  const subscribePosition = useCallback((cb: (seconds: number) => void) => {
    listeners.current.add(cb);
    cb(fastRef.current);
    return () => {
      listeners.current.delete(cb);
    };
  }, []);
  // the coarse clock restates it too, so a paused deck, a seek and a re-cue
  // all land without waiting for the next sample
  useEffect(() => {
    tellRef.current(position);
  }, [position, uri]);
  // while playing, sample the player's own clock — a synchronous getter on
  // every platform — ten times a second
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      let s: number;
      try {
        s = player.currentTime;
      } catch {
        s = posRef.current;
      }
      if (Number.isFinite(s)) tellRef.current(s);
    }, FAST_MS);
    return () => clearInterval(t);
  }, [playing, player]);

  /* --- the sentence --- */
  const say = useMemo<DeckValue["say"]>(
    () => (locked ? { text: LOCKED_SAY, bad: refused } : null),
    [locked, refused],
  );

  /**
   * A live voice is the subscription's. The readers row carries no
   * entitlement yet, so every live voice is shut for now.
   *
   * TODO(subscription): read reader_subscriptions (the site's
   * hasActiveSubscription — status in OPEN_STATUSES, current_period_end in
   * the future) for the signed-in reader, and open the live voices on it.
   */
  const voiceLocked = useCallback(
    (voiceId: string): boolean => locked || !PRESSED_IDS.has(voiceId),
    [locked],
  );

  const value = useMemo<DeckValue>(
    () => ({
      now,
      recording,
      chapter,
      playing,
      position,
      duration: status.duration || (chapter?.duration ?? 0),
      loading: !!now && !status.isLoaded,
      finished,
      voice: now?.voice ?? null,
      voices: recording?.voices ?? [],
      setNarrator,
      playBand,
      playAt,
      begin,
      toggle,
      seekTo,
      nudge,
      step,
      stop,
      rate,
      setRate,
      spots,
      locked,
      say,
      voiceLocked,
      subscribePosition,
    }),
    [
      now,
      recording,
      chapter,
      playing,
      position,
      status.duration,
      status.isLoaded,
      finished,
      setNarrator,
      playBand,
      playAt,
      begin,
      toggle,
      seekTo,
      nudge,
      step,
      stop,
      rate,
      setRate,
      spots,
      locked,
      say,
      voiceLocked,
      subscribePosition,
    ],
  );

  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>;
}

export function useDeck(): DeckValue {
  const ctx = useContext(DeckContext);
  if (!ctx) throw new Error("useDeck must be used inside <AudioProvider>");
  return ctx;
}

/**
 * The read-along's clock: the needle, sampled ten times a second while the
 * deck is playing, and only the component that calls this re-renders on it.
 * Everything else reads `useDeck().position` at the transport's rate.
 */
export function useFastPosition(): number {
  const { subscribePosition } = useDeck();
  const [s, setS] = useState(0);
  useEffect(() => subscribePosition(setS), [subscribePosition]);
  return s;
}

/** mm:ss, the shelf's own clock format. */
export const mmss = (s: number): string =>
  `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, "0")}`;
