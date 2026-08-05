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

type Now = { slug: string; band: number } | null;

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
  /** Drop the needle on a book at a given band. */
  playBand: (slug: string, band?: number) => void;
  /** Resume or pause whatever is loaded. */
  toggle: () => void;
  seekTo: (seconds: number) => void;
  /** The ± buttons. */
  nudge: (seconds: number) => void;
  step: (delta: 1 | -1) => void;
  stop: () => void;
};

const DeckContext = createContext<DeckValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState<Now>(null);
  const [wantPlay, setWantPlay] = useState(false);

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

  // Auto-advance — roll into the next chapter, and stop cleanly at the end of
  // the book rather than looping.
  const advancing = useRef(false);
  useEffect(() => {
    if (!status.didJustFinish || !recording || !now || advancing.current) return;
    advancing.current = true;
    const next = now.band + 1;
    if (next < recording.chapters.length) setNow({ slug: now.slug, band: next });
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
    if (!RECORDINGS[slug]) return;
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
      setNow({ slug: now.slug, band });
      setWantPlay(true);
    },
    [recording, now],
  );

  const stop = useCallback(() => {
    setWantPlay(false);
    setNow(null);
  }, []);

  const value = useMemo<DeckValue>(
    () => ({
      now,
      recording,
      chapter,
      playing: !!status.playing,
      position: status.currentTime ?? 0,
      duration: status.duration || (chapter?.duration ?? 0),
      loading: !!now && !status.isLoaded,
      playBand,
      toggle,
      seekTo,
      nudge,
      step,
      stop,
    }),
    [
      now,
      recording,
      chapter,
      status.playing,
      status.currentTime,
      status.duration,
      status.isLoaded,
      playBand,
      toggle,
      seekTo,
      nudge,
      step,
      stop,
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
