// The deck. One player, mounted above the router.
//
// The site's audioStore is a globalThis singleton that owns THE ONE audio
// element, so playback survives navigation between rooms. This is the same
// contract on the phone: the player is created once at the root and shared
// through context, so switching tabs — or leaving the Listening Room entirely
// — never stops the needle.
//
// Band model, unchanged: a book is a list of chapters, and `playBand(slug, n)`
// is the primitive everything else is built from. Auto-advance rolls into the
// next chapter at the end of the current one.
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
const chaptersOf = (rec: Recording | null, voiceId: string | null): Chapter[] =>
  (voiceId ? rec?.pressings?.[voiceId]?.chapters : null) ?? rec?.chapters ?? [];

type Now = { slug: string; band: number; voice: string | null } | null;

type DeckValue = {
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
  /** Which pressing is in force, and every voice this book was pressed in. */
  voice: string | null;
  voices: Voice[];
  /**
   * Change the reader mid-sentence. Every pressing reads the SAME text in the
   * same chapters, so the needle is restated by the ratio of the two run
   * lengths rather than reset — the web's setNarrator, in the hand.
   */
  setNarrator: (voiceId: string) => void;
  /** Drop the needle on a book at a given band. */
  playBand: (slug: string, band?: number) => void;
  /**
   * Drop the needle at an exact spot in a band — what a finger on a printed
   * word asks for. Unlike playBand this does not restart anything: whatever
   * the deck was doing (playing, paused) it goes on doing, from there.
   */
  playAt: (slug: string, band: number, seconds: number) => void;
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
};

const DeckContext = createContext<DeckValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState<Now>(null);
  const [wantPlay, setWantPlay] = useState(false);

  const recording = now ? (RECORDINGS[now.slug] ?? null) : null;
  const chapters = chaptersOf(recording, now?.voice ?? null);
  const chapter = chapters[now?.band ?? 0] ?? null;
  const uri = chapter ? audioUrl(chapter.src) : null;

  // Where the needle must land once the NEXT source is loaded. A narrator
  // switch changes the file under the needle, and a seek issued before the new
  // pressing is ready is dropped on the floor — which reads as the switch
  // throwing you back to the top of the chapter.
  const pendingSeek = useRef<number | null>(null);

  // The documented path: hand the hook the source and let it own loading.
  // (An earlier version created the player sourceless and fed it replace() —
  // that leaves `isLoaded` false on some platforms, which is how the transport
  // ended up drawn but dead.)
  // 100ms, not the 500ms a transport needs: the READ-ALONG is what sets this
  // floor. A narrator reads about four words a second, so a needle that
  // reports twice a second gilds every other word and skips the rest — which
  // reads as the highlight lagging, not as a cheaper tick.
  const player = useAudioPlayer(uri ? { uri } : null, { updateInterval: 100 });
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

  // The restated needle, landed as soon as the new pressing reports ready.
  useEffect(() => {
    if (pendingSeek.current == null || !status.isLoaded) return;
    const at = pendingSeek.current;
    pendingSeek.current = null;
    player.seekTo(at);
  }, [status.isLoaded, uri, player]);

  // Auto-advance — roll into the next chapter, and stop cleanly at the end of
  // the book rather than looping.
  const advancing = useRef(false);
  useEffect(() => {
    if (!status.didJustFinish || !recording || !now || advancing.current) return;
    advancing.current = true;
    const next = now.band + 1;
    if (next < chaptersOf(recording, now.voice).length) setNow({ ...now, band: next });
    else {
      setWantPlay(false);
      setNow(null);
    }
    // one tick, so the flag clears after the status settles
    setTimeout(() => {
      advancing.current = false;
    }, 0);
  }, [status.didJustFinish, recording, now]);

  const playBand = useCallback((slug: string, band = 0) => {
    const rec = RECORDINGS[slug];
    if (!rec) return;
    setNow({ slug, band, voice: rec.voiceId ?? null });
    setWantPlay(true);
  }, []);

  const playAt = useCallback(
    (slug: string, band: number, seconds: number) => {
      const rec = RECORDINGS[slug];
      if (!rec) return;
      // stay on the pressing already in force for this book
      const voiceId = now?.slug === slug ? now.voice : (rec.voiceId ?? null);
      const chapters = chaptersOf(rec, voiceId);
      const ch = chapters[band];
      if (!ch) return;
      const at = Math.max(0, Math.min(ch.duration, seconds));
      // same band, same file: the needle just moves. A setNow with identical
      // values would not change the uri, so the pending-seek effect would
      // never fire and the tap would look ignored.
      if (now?.slug === slug && now.band === band) {
        player.seekTo(at);
        return;
      }
      pendingSeek.current = at;
      setNow({ slug, band, voice: voiceId });
    },
    [now, player],
  );

  /**
   * The turntable. Both pressings hold the same reviewed text in the same
   * chapters — only the clock differs — so the place in the CHAPTER is a
   * proportion, and that proportion is what survives the change of reader.
   */
  const setNarrator = useCallback(
    (voiceId: string) => {
      if (!now || !recording || now.voice === voiceId) return;
      const from = chaptersOf(recording, now.voice)[now.band];
      const to = chaptersOf(recording, voiceId)[now.band];
      if (!from || !to) return; // this book has no such pressing
      const at = status.currentTime ?? 0;
      pendingSeek.current =
        from.duration && from.duration !== to.duration
          ? Math.max(0, Math.min(to.duration, at * (to.duration / from.duration)))
          : Math.max(0, Math.min(to.duration, at));
      setNow({ ...now, voice: voiceId });
    },
    [now, recording, status.currentTime],
  );

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
      if (band < 0 || band >= chaptersOf(recording, now.voice).length) return;
      setNow({ ...now, band });
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

  const value = useMemo<DeckValue>(
    () => ({
      now,
      recording,
      chapter,
      playing: !!status.playing,
      position: status.currentTime ?? 0,
      duration: status.duration || (chapter?.duration ?? 0),
      loading: !!now && !status.isLoaded,
      playAt,
      voice: now?.voice ?? null,
      voices: recording?.voices ?? [],
      setNarrator,
      playBand,
      toggle,
      seekTo,
      nudge,
      step,
      stop,
      rate,
      setRate,
    }),
    [
      now,
      recording,
      chapter,
      status.playing,
      status.currentTime,
      status.duration,
      status.isLoaded,
      playAt,
      setNarrator,
      playBand,
      toggle,
      seekTo,
      nudge,
      step,
      stop,
      rate,
      setRate,
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
