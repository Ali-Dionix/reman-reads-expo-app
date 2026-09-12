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
import { cache } from "./storage";

export type Chapter = { n: number; title: string; src: string; duration: number };
export type Recording = {
  slug: string;
  title: string;
  author: string;
  voice: string;
  seconds: number;
  chapters: Chapter[];
};

const RECORDINGS = shelf.recordings as Record<string, Recording>;

export const recordingFor = (slug: string): Recording | null => RECORDINGS[slug] ?? null;

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

type Now = { slug: string; band: number } | null;

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
  /** Drop the needle on a book at a given band, and optionally a second into
   *  it — the seek waits for the chapter to load (a seek on a player that has
   *  not loaded its source is a seek the platform drops). */
  playBand: (slug: string, band?: number, at?: number) => void;
  /** The site's beginBook: resume where this book rested, or from the top if
   *  it was played through. A recording already on the platter resumes rather
   *  than restarting. False when this build has no recording for the slug —
   *  the caller declines the tap. */
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
};

const DeckContext = createContext<DeckValue | null>(null);

/** How often the needle is written while it is moving. The web writes on
 *  band change and pause only, and the position is restated by the
 *  timeupdate that precedes the pause; here the platform's status ticks
 *  every 500ms, so a periodic write keeps a force-quit from losing more than
 *  a few seconds. */
const TICK_MS = 5000;

export function AudioProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState<Now>(null);
  const [wantPlay, setWantPlay] = useState(false);
  const [finished, setFinished] = useState<string | null>(null);

  const recording = now ? (RECORDINGS[now.slug] ?? null) : null;
  const chapter = recording?.chapters[now?.band ?? 0] ?? null;
  const uri = chapter ? audioUrl(chapter.src) : null;

  // The documented path: hand the hook the source and let it own loading.
  // (An earlier version created the player sourceless and fed it replace() —
  // that leaves `isLoaded` false on some platforms, which is how the transport
  // ended up drawn but dead.)
  const player = useAudioPlayer(uri ? { uri } : null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);

  // Keep sounding with the ringer switch flipped — an audiobook the silent
  // switch mutes is an audiobook that appears broken.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(
      () => {},
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
    if (wantPlay) player.play();
    else player.pause();
  }, [uri, wantPlay, player]);

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
    if (next < recording.chapters.length) setNow({ slug: now.slug, band: next });
    else {
      const prev = spotsRef.current[now.slug];
      stampSpot(now.slug, {
        chapter: now.band,
        seconds: status.duration || recording.chapters[now.band]?.duration || 0,
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

  // A resume's seek, pending until the chapter has loaded: playBand re-cues
  // the band, and seeking a player that has not loaded its source is a seek
  // the platform drops. The web's loadBand restates the seconds itself.
  const pendingSeek = useRef<{ slug: string; band: number; seconds: number } | null>(null);
  useEffect(() => {
    const p = pendingSeek.current;
    if (!p || !now || now.slug !== p.slug || now.band !== p.band) return;
    if (!status.isLoaded || !(status.duration > 0)) return;
    pendingSeek.current = null;
    if (p.seconds > 0) player.seekTo(Math.min(p.seconds, status.duration));
  }, [now, status.isLoaded, status.duration, player]);

  const playBand = useCallback((slug: string, band = 0, at?: number) => {
    if (!RECORDINGS[slug]) return;
    pendingSeek.current = at && at > 0 ? { slug, band, seconds: at } : null;
    setFinished(null);
    setNow({ slug, band });
    setWantPlay(true);
  }, []);

  const toggle = useCallback(() => {
    // `wantPlay` is the intent, `status.playing` only reports what the platform
    // got round to. Toggling off the intent means the button always answers.
    setWantPlay((want) => {
      const next = !(want || status.playing);
      if (next) player.play();
      else player.pause();
      return next;
    });
  }, [player, status.playing]);

  const begin = useCallback(
    (slug: string): boolean => {
      const book = RECORDINGS[slug];
      if (!book) return false;
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
    [now, wantPlay, toggle, playBand],
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
      const band = now.band + delta;
      if (band < 0 || band >= recording.chapters.length) return;
      pendingSeek.current = null;
      setNow({ slug: now.slug, band });
      setWantPlay(true);
    },
    [recording, now],
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
      playBand,
      begin,
      toggle,
      seekTo,
      nudge,
      step,
      stop,
      rate,
      setRate,
      spots,
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
      playBand,
      begin,
      toggle,
      seekTo,
      nudge,
      step,
      stop,
      rate,
      setRate,
      spots,
    ],
  );

  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>;
}

export function useDeck(): DeckValue {
  const ctx = useContext(DeckContext);
  if (!ctx) throw new Error("useDeck must be used inside <AudioProvider>");
  return ctx;
}

/** mm:ss, the shelf's own clock format. */
export const mmss = (s: number): string =>
  `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, "0")}`;
