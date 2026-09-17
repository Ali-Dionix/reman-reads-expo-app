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
// voices (Fish) are on the subscription — see `voiceLocked`, which reads the
// entitlement (src/lib/subscription.tsx). The subscription is bought on the
// WEBSITE; the app only knows the answer.
//
// THE LIVE READERS. A book can be put on in one of the 338 live voices
// (src/lib/liveRead.ts), and the deck treats such a pressing like any other
// with two exceptions, both the site's (ListeningEnhancer's gateLiveBand
// and audioStore's `streaming`):
//
//   A LIVE CHAPTER IS ASKED FOR BEFORE IT PLAYS. Its plain href plays only
//   what is already in the bucket; a chapter never read needs the signed
//   pass the site's maker route issues. So the player's source is withheld
//   (`uri` null) until ensureLiveChapter has answered, for every path that
//   moves the needle onto a live band — a pick, a chapter jog, the
//   auto-advance. A refusal (the 402, a limit) pauses the deck and says so.
//
//   A CHAPTER BEING READ CANNOT BE SEEKED INTO. A pass on the href means the
//   chapter streams as it is synthesized: it starts at the top whatever the
//   ledger says, the scrubber and the jogs are refused and told why, and the
//   duration is the pressed estimate until the reading is filed. The deck
//   polls the cue file while it streams (the site's watchReading) so the
//   read-along grows behind the voice, and when the file comes back finished
//   the chapter is "saved": the first seek then reloads from the finished
//   object at that second — one seam, at the moment the reader chose to jump
//   — and never before, because on this platform a new source is a new
//   player and swapping it under a listener would put a gap mid-sentence.
//
// TWO CLOCKS, NEITHER ON THE DECK. `position` ticks at the player's 500ms —
// enough for a groove and a readout — and it lives in its OWN context
// (useDeckClock), because until 16 Sep 2026 it sat on the deck's value and
// every useDeck() consumer (the home room, the audiobooks room, the reader,
// the voice sheet, the dock) re-rendered twice a second for as long as a
// chapter played; on a phone that was the stutter the owner felt in every
// room. Only the chrome that PRINTS a time reads the clock. The read-along
// needs ten a second or it gilds every other word, and that must not cost
// even the console: `useFastPosition` subscribes a single component to a
// 100ms sample of the player's own clock through a ref, so only the leaf
// that paints the gilt re-renders.
//
// AND NOTHING ELSE ON THE VALUE MAY TICK. The value is a useMemo over every
// field and callback it carries; one callback that closes over a ticking
// status field (`nudge` did, over currentTime, until 16 Sep 2026) rebuilds
// the whole value twice a second and the clock is back on the deck by
// another door — measured as a 25-60 ms re-render of the entire reader
// every 500 ms. A callback that needs the needle reads it through a ref.
//
// THE LOCK SCREEN AND THE SHADE. Since 16 Sep 2026 the playing chapter is
// handed to expo-audio's lock-screen controls (setActiveForLockScreen: a
// media session with the book's title, the chapter, the author and the
// cover, ±15 s and play/pause in the notification shade and on the lock
// screen). On Android that same call is what keeps a backgrounded chapter
// sounding: without it the OS stops playback after about three minutes
// (expo-audio's own note on shouldPlayInBackground — measured before the
// change: no notification, no foreground service). interruptionMode is
// doNotMix for it, which is also what pauses the book for a phone call and
// resumes it after.

import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync, type AudioMetadata } from "expo-audio";
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
import { useStanding, voiceInForce } from "../portal/reader/voice/standing";
import { audioUrl } from "./audioResolve";
import { SITE_ORIGIN } from "./config";
import { refreshGalley } from "./galley";
import {
  dressLiveChapter,
  ensureLiveChapter,
  isLivePressing,
  isStreamingHref,
  liveKey,
  liveOpenedFor,
  noteLiveDuration,
  noteLiveSaved,
  noteReadingSaved,
} from "./liveRead";
import { NO_OWNER, ownerOf, type Owner } from "./portalState";
import { useSession } from "./session";
import { cache } from "./storage";
import { useSubscription } from "./subscription";

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

/** The ids this book was pressed in — what voiceInForce() may choose from. */
const pressedIds = (rec: Recording): string[] => Object.keys(rec.pressings ?? {});

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
  /** Which pressing these numbers refer to — the site's `editionId` (the
   *  voice id here, which is what a pressing is keyed by). A spot from the
   *  other pressing is restated onto this clock (see fitSpot). */
  editionId?: string;
};

export type Spots = Record<string, ListeningSpot>;

/** portalShared.ts PORTAL_STATE_KEY carries the whole state on the web; the
 *  app keeps the one slice it has under its own key. */
const SPOTS_KEY = "rr-listening";
/** Whose spots they are — the site's rr-account-owner, for this slice. A
 *  change of owner (a guest after a reader, a reader after a guest, reader B
 *  after reader A) drops the last owner's needle positions, as the site's
 *  adoptSession / clearSession do with the state they ride in there. */
const SPOTS_OWNER_KEY = "rr-listening-owner";

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
        ...(typeof s.editionId === "string" && s.editionId ? { editionId: s.editionId } : {}),
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

/**
 * The site's spotOnPressing, the other half: a spot stamped on the OTHER
 * pressing is restated onto this one's clock by the ratio of the two
 * chapters' run lengths (every pressing reads the same text in the same
 * chapters — only the clock differs), so a resume on the pressing the reader
 * has since chosen lands on the same sentence. A spot with no edition stamp
 * (from before the deck stamped one) is trusted as it stands.
 */
const fitSpot = (
  spot: ListeningSpot | undefined,
  book: Recording,
  voice: string | null,
): { band: number; seconds: number } | null => {
  if (!fits(spot, book)) return null;
  const s = spot!;
  if (!s.editionId || !voice || s.editionId === voice) return { band: s.chapter, seconds: s.seconds };
  const from = chaptersOf(book, s.editionId)[s.chapter];
  const to = chaptersOf(book, voice)[s.chapter];
  if (!from || !to) return { band: s.chapter, seconds: s.seconds };
  const seconds =
    from.duration && from.duration !== to.duration
      ? Math.max(0, Math.min(to.duration, s.seconds * (to.duration / from.duration)))
      : Math.max(0, Math.min(to.duration, s.seconds));
  return { band: s.chapter, seconds };
};

/* ------------------------------------------------------------- the deck --- */

type Now = { slug: string; band: number; voice: string | null } | null;

/** The console's sentence for a locked room. The console appends the site's
 *  "Sign up to listen." link itself, so the link can route. */
export const LOCKED_SAY = "Listening needs an account.";
/** The site's refusal of a seek into a chapter still being read. */
export const STILL_READING_SAY =
  "This chapter is still being read. You can move about in it once it is saved.";

/** What the console prints under the groove. `lock` is the standing lock
 *  line (bad only once a refusal has been counted — see `n`); `note` is a
 *  sentence the deck said on its own account, bad or muted as it says, with
 *  `subscribe` when the door to offer is the website's subscription. */
export type DeckSay = {
  text: string;
  bad: boolean;
  n: number;
  kind: "lock" | "note";
  subscribe?: boolean;
};

export type DeckValue = {
  /** What is on the platter — null when nothing has been started. */
  now: Now;
  recording: Recording | null;
  chapter: Chapter | null;
  playing: boolean;
  /** The current chapter's length. Where the needle IS — the seconds into
   *  it — is on useDeckClock(), not here, so a room does not re-render on
   *  every tick of a chapter it is not even showing. */
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
  /** THE SITE'S playBand (app/components/audioStore.ts 662): the band on
   *  the platter tapped again, with no `at`, is play / pause; any other band
   *  is cued — in the pressing already in force for this book, else the
   *  reader's standing choice (voice/standing.ts voiceInForce), resuming at
   *  the ledger's seconds when the ledger rests in that band — and played.
   *  The seek waits for the chapter to load (a seek on a player that has not
   *  loaded its source is a seek the platform drops). */
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
  /** The site's refuseLocked: in a locked room, say so (the sentence goes
   *  brick) and answer true — `if (refuse()) return;` in front of anything
   *  that would put a record on. Every deck verb calls it itself; this is for
   *  a control that refuses without one (a locked live reader's label). */
  refuse: () => boolean;
  /** What the console prints under the groove, and whether it is a refusal
   *  (brick, 600) or a muted notice. `n` COUNTS the refusals, so a console
   *  mounted after some can tell a new one from the standing ink (it reads
   *  the rise since its mount). Null when there is nothing to say. */
  say: DeckSay | null;
  /** Is THIS voice off limits: a live reader is the subscription's; a
   *  pressed one is free to a signed-in reader; everything is shut to a guest. */
  voiceLocked: (voiceId: string) => boolean;
  /** The site's AudioState.streaming: "live" while the chapter on the
   *  platter is being read as it plays (no seeking), "saved" once its
   *  reading has been filed and the first seek will reload from the
   *  object, null for an ordinary chapter. */
  streaming: "live" | "saved" | null;
  /** The site's canSeek(): false only while a chapter is being read. */
  canSeek: boolean;
  /** Tell the deck the live registry changed under it (a pressing
   *  registered, a chapter dressed) so it re-reads the chapter list. */
  bumpLive: () => void;
  /** Moves when bumpLive() is called — for a memo keyed on the pressings. */
  liveTick: number;
  /** The read-along's clock — see useFastPosition. */
  subscribePosition: (cb: (seconds: number) => void) => () => void;
};

const DeckContext = createContext<DeckValue | null>(null);

/** The coarse clock on its own: where the needle is, at the player's 500ms,
 *  and the chapter's length beside it for a fraction. Its own context so
 *  that the tick reaches only the chrome that prints a time (the dock, the
 *  transport, the console, the contents drawer) and never a whole room. */
export type DeckClock = { position: number; duration: number };
const DeckClockContext = createContext<DeckClock>({ position: 0, duration: 0 });

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

/** How often the cue file of a chapter being read is asked for again —
 *  fast enough that the gilding is never far behind the voice, slow enough
 *  to be unnoticeable next to the audio beside it (the site's WATCH_EVERY_MS). */
const WATCH_EVERY_MS = 4000;
/** A reading that has not finished in this long has failed in a way the
 *  watch cannot see: twice the chapter ceiling, and nothing more is coming. */
const WATCH_LIMIT = Math.ceil((8 * 60_000) / WATCH_EVERY_MS);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState<Now>(null);
  const [wantPlay, setWantPlay] = useState(false);
  const [finished, setFinished] = useState<string | null>(null);
  // the live registry is mutated in place (liveRead.ts); this moves so the
  // chapter list is re-read after a pressing is registered or dressed
  const [liveTick, setLiveTick] = useState(0);
  const bumpLive = useCallback(() => setLiveTick((t) => t + 1), []);

  const recording = now ? (RECORDINGS[now.slug] ?? null) : null;
  const chapters = chaptersOf(recording, now?.voice ?? null);
  const chapter = chapters[now?.band ?? 0] ?? null;
  // THE GATE. A live chapter that has not been asked for has no source yet:
  // its plain href would 404 (or, worse, play nothing and look dead). The
  // effect below asks, dresses the chapter, and bumps — and only then does
  // the player get a uri. `liveTick` is read so the memo is honest.
  const live = !!now && isLivePressing(now.slug, now.voice);
  const opened = live && now ? liveOpenedFor(now.slug, now.voice!, now.band) : null;
  const gated = live && !opened?.made;
  const uri = chapter && !gated ? audioUrl(chapter.src) : null;
  void liveTick;

  /* --- the shop door --- */
  const { user, booting } = useSession();
  const { active: subscribed } = useSubscription();
  const locked = !user;
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  // COUNTED, not latched: a console mounted over a room already refused once
  // reads the rise since its mount, so a refusal from any control — the big
  // key, a contents row, a locked live reader — turns its line brick.
  const [refused, setRefused] = useState(0);
  // Refuse, visibly. Returns true when it refused, so a caller reads
  // `if (refuse()) return;` — the site's refuseLocked.
  const refuse = useCallback((): boolean => {
    if (!lockedRef.current) return false;
    setRefused((n) => n + 1);
    return true;
  }, []);
  // A sign-in unlocks the room and the refusal ink goes with it.
  useEffect(() => {
    if (!locked) setRefused(0);
  }, [locked]);

  // A sentence of the deck's own — a refused seek, a live chapter the site
  // would not read — printed by the console until the needle moves on.
  const [note, setNote] = useState<{ text: string; bad: boolean; subscribe?: boolean; n: number } | null>(null);
  const noted = useRef(0);
  const sayNote = useCallback((text: string, bad: boolean, subscribe = false) => {
    noted.current += 1;
    setNote(text ? { text, bad, subscribe, n: noted.current } : null);
  }, []);

  // THE READER'S STANDING NARRATOR — the site's audioVoice, kept by
  // voice/standing.ts under the portal state's key. Hydrated here for this
  // owner so playBand / playAt can ask voiceInForce() for the pressing to
  // drop, before the narrator sheet has ever been opened.
  const owner: Owner = booting ? "" : ownerOf(user?.id);
  useStanding(owner || NO_OWNER);

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
  // switch mutes is an audiobook that appears broken. doNotMix: the book
  // takes audio focus like any player (a call pauses it, and it comes back
  // after), and it is what the lock-screen controls below require.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" }).catch(
      (e: unknown) => {
        if (__DEV__) console.log("[deck] setAudioModeAsync threw", String(e));
      },
    );
  }, []);

  // What the lock screen prints for the chapter on the platter: the chapter
  // as the title, the book as the album, the author, the cover the shelf
  // carries. Read through a ref by the play effect so a re-render never
  // re-cues anything.
  const lockMeta = useRef<AudioMetadata>({});
  {
    const art = recording ? shelf.pressings.find((p) => p.slug === recording.slug)?.art : undefined;
    lockMeta.current = recording
      ? {
          title: chapter?.title ?? recording.title,
          artist: recording.author,
          albumTitle: recording.title,
          ...(art ? { artworkUrl: /^https?:\/\//.test(art) ? art : `${SITE_ORIGIN}${art}` } : {}),
        }
      : {};
  }

  // Start or stop whatever is on the platter. Keyed on the URI and the intent,
  // so a re-render never re-cues a chapter mid-sentence.
  //
  // NOT gated on `isLoaded`: play() before the source is ready is queued by
  // every platform's player, whereas waiting for a flag that may never arrive
  // gives you a transport that is drawn and dead.
  useEffect(() => {
    if (!uri) {
      // the needle is up: nothing to print on the lock screen
      try {
        player.clearLockScreenControls();
      } catch {
        /* a player with no source may have nothing to clear */
      }
      return;
    }
    try {
      if (wantPlay) {
        if (__DEV__) console.log("[deck] play() called", uri);
        // this player (a new one per chapter) takes the lock screen — the
        // notification, the ±15 s, and the leave to keep sounding in the
        // background
        player.setActiveForLockScreen(true, lockMeta.current, { showSeekForward: true, showSeekBackward: true });
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

  // WHOSE NEEDLE. The spots are stamped with their owner; a different owner
  // (a reader after a guest, a guest after a reader, reader B after A) starts
  // from nothing — the site drops the state a new owner would otherwise
  // inherit, and a "continue listening" shelf that shows the last reader's
  // books is the leak that rule exists to stop. Nobody signed in (the wall)
  // is not an owner: the stamp stands until the next one walks in.
  useEffect(() => {
    if (!owner) return;
    let alive = true;
    void (async () => {
      const was = await cache.get(SPOTS_OWNER_KEY);
      if (!alive) return;
      if (was && was !== owner) {
        await cache.set(SPOTS_KEY, "{}");
        if (!alive) return;
        spotsRef.current = {};
        setSpots({});
      }
      if (was !== owner) await cache.set(SPOTS_OWNER_KEY, owner);
    })();
    return () => {
      alive = false;
    };
  }, [owner]);

  // The pass handed back under a playing record: the site unloads the
  // platter outright at sign-out. Nothing a guest can hear stays audible.
  useEffect(() => {
    if (locked && now) {
      setWantPlay(false);
      setNow(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  /* --- the live gate: the site's gateLiveBand, at the one interception
         point — the needle landing on a live band the site has not yet
         agreed to read --- */
  // the resume the caller wanted, honoured only if the chapter turns out to
  // be in the bucket already; a chapter being read starts at the top
  const wantedSeek = useRef<number>(0);
  // the site is being asked — the transport shows its wait, not a dead band
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (!now || !gated || !recording) return;
    const { slug, voice, band } = now;
    if (!voice) return;
    let alive = true;
    setAsking(true);
    void ensureLiveChapter(slug, voice, band).then((o) => {
      if (!alive) return;
      setAsking(false);
      if (!o.made) {
        // The needle is on a band that will not play. Stopped rather than
        // left spinning on nothing, and the reader told why — on the
        // console, with the website's door when it is the subscription.
        setWantPlay(false);
        sayNote(o.why, true, !!o.subscribe);
        return;
      }
      dressLiveChapter(recording, voice, band, o);
      pendingSeek.current =
        !o.reading && wantedSeek.current > 0
          ? { slug, band, voice, seconds: wantedSeek.current }
          : null;
      wantedSeek.current = 0;
      bumpLive();
    });
    return () => {
      alive = false;
      setAsking(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now?.slug, now?.voice, now?.band, gated]);

  /* --- streaming: a pass on the href means the chapter is being read as it
         plays; "saved" once its cue file came back finished --- */
  const streamKey =
    live && now?.voice && chapter && isStreamingHref(chapter.src) ? liveKey(now.slug, now.voice, now.band) : "";
  const streaming: DeckValue["streaming"] = streamKey ? (opened?.saved ? "saved" : "live") : null;
  const canSeek = streaming !== "live";

  // The watch — the site's watchReading. Polling, and unapologetically:
  // a refresh of the cue file every four seconds for the couple of minutes
  // a reading takes, which stops by itself when the file says it is
  // finished or the reader turns to something else.
  useEffect(() => {
    if (streaming !== "live" || !now?.voice || !recording || !chapter) return;
    const { slug, voice, band } = now;
    const path = chapter.galley;
    let stopped = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (stopped) return;
      tries += 1;
      if (tries > WATCH_LIMIT) return;
      const answer = await refreshGalley(slug, voice, band, path);
      if (stopped) return;
      if (answer && !answer.partial) {
        // Finished: the object is in the bucket. The measured length
        // replaces the pressed estimate, and the needle becomes movable.
        if (answer.durationMs) noteLiveDuration(recording, voice, band, answer.durationMs);
        noteReadingSaved(slug, voice, band);
        // "once it is saved" — it is: a refused seek's sentence comes down
        setNote((n) => (n?.text === STILL_READING_SAY ? null : n));
        bumpLive();
        return;
      }
      timer = setTimeout(() => void tick(), WATCH_EVERY_MS);
    };
    timer = setTimeout(() => void tick(), WATCH_EVERY_MS);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming, streamKey]);

  // the deck's own sentence goes with the band it was said on
  useEffect(() => {
    setNote(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now?.slug, now?.voice, now?.band]);

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

  // THE PRESSING TO DROP — the site's loadBand: `opts.voice ?? (st.slug ===
  // slug ? st.voiceId : null) ?? narratorFor(slug)`. The one already on the
  // platter for this book, else the reader's standing choice (a narrator
  // chosen while browsing, or on another book), else the house's default.
  const voiceFor = useCallback(
    (slug: string, rec: Recording): string | null =>
      now?.slug === slug ? now.voice : voiceInForce(slug, pressedIds(rec), rec.voiceId ?? null),
    [now],
  );

  // wantPlay as the intent, so a play/pause on the platter's own band can
  // read it inside a callback keyed on `now` alone
  const wantRef = useRef(wantPlay);
  wantRef.current = wantPlay;
  const playingRef = useRef(false);

  const playBand = useCallback(
    (slug: string, band = 0, at?: number) => {
      const rec = RECORDINGS[slug];
      if (!rec) return;
      if (refuse()) return;
      // the band on the platter, tapped again: play / pause, not a re-cue
      // from the top (the site's `same && at == null`)
      if (now?.slug === slug && now.band === band && at == null) {
        const next = !(wantRef.current || playingRef.current);
        setWantPlay(next);
        try {
          if (next) {
            if (__DEV__) console.log("[deck] play() called", uri);
            player.play();
          } else player.pause();
        } catch (e) {
          if (__DEV__) console.log("[deck] play() threw", String(e));
        }
        return;
      }
      const voice = voiceFor(slug, rec);
      if (!chaptersOf(rec, voice)[band]) return;
      // loadBand's resume: `at ?? (fit.band === band ? fit.seconds : 0)` —
      // the ledger's seconds when it rests in this band, on this clock
      const fit = at == null ? fitSpot(spotsRef.current[slug], rec, voice) : null;
      const seconds = at ?? (fit && fit.band === band ? fit.seconds : 0);
      // A CHAPTER BEING READ FOR THE FIRST TIME STARTS AT THE BEGINNING,
      // whatever the ledger says: there is no audio behind the playhead of
      // a stream. The place is not lost — it is honoured the next time this
      // chapter is played, when it is an ordinary file. A live chapter not
      // yet asked for parks the wish with the gate, which honours it only
      // if the site answers "already made".
      const answer = voice && isLivePressing(slug, voice) ? liveOpenedFor(slug, voice, band) : null;
      const fresh = !!voice && isLivePressing(slug, voice) && (!answer || !!answer.reading);
      wantedSeek.current = !answer && fresh ? seconds : 0;
      pendingSeek.current = seconds > 0 && !fresh ? { slug, band, voice, seconds } : null;
      setFinished(null);
      setNow({ slug, band, voice });
      setWantPlay(true);
    },
    [now, player, uri, refuse, voiceFor],
  );

  const playAt = useCallback(
    (slug: string, band: number, seconds: number) => {
      const rec = RECORDINGS[slug];
      if (!rec) return;
      if (refuse()) return;
      // stay on the pressing already in force for this book
      const voiceId = voiceFor(slug, rec);
      const ch = chaptersOf(rec, voiceId)[band];
      if (!ch) return;
      const at = Math.max(0, Math.min(ch.duration, seconds));
      // same band, same file: the needle just moves. A setNow with identical
      // values would not change the uri, so the pending-seek effect would
      // never fire and the tap would look ignored.
      if (now?.slug === slug && now.band === band) {
        seekRef.current(at);
        return;
      }
      // a live chapter still being read starts at the top — see playBand
      const answer = voiceId && isLivePressing(slug, voiceId) ? liveOpenedFor(slug, voiceId, band) : null;
      const fresh = !!voiceId && isLivePressing(slug, voiceId) && (!answer || !!answer.reading);
      wantedSeek.current = !answer && fresh ? at : 0;
      pendingSeek.current = fresh ? null : { slug, band, voice: voiceId, seconds: at };
      setFinished(null);
      setNow({ slug, band, voice: voiceId });
    },
    [now, player, refuse, voiceFor],
  );

  /**
   * The turntable. Both pressings hold the same reviewed text in the same
   * chapters — only the clock differs — so the place in the CHAPTER is a
   * proportion, and that proportion is what survives the change of reader.
   */
  // the needle and the loaded flag through refs, NOT dependencies: see AND
  // NOTHING ELSE ON THE VALUE MAY TICK at the top
  const needleRef = useRef(0);
  needleRef.current = status.currentTime || 0;
  const loadedRef = useRef(false);
  loadedRef.current = !!status.isLoaded;
  const setNarrator = useCallback(
    (voiceId: string) => {
      if (!now || !recording || now.voice === voiceId) return;
      if (refuse()) return;
      const from = chaptersOf(recording, now.voice)[now.band];
      const to = chaptersOf(recording, voiceId)[now.band];
      if (!from || !to) return; // this book has no such pressing
      // A resume still parked (the player has not loaded) is the needle's
      // real place: scale THAT, not the unloaded player's 0 — or a switch
      // made before the chapter arrives throws the reader to the top.
      const parked = pendingSeek.current;
      const at =
        parked && parked.slug === now.slug && parked.band === now.band && !loadedRef.current
          ? parked.seconds
          : needleRef.current;
      const seconds =
        from.duration && from.duration !== to.duration
          ? Math.max(0, Math.min(to.duration, at * (to.duration / from.duration)))
          : Math.max(0, Math.min(to.duration, at));
      // onto a live reading still being made: the top, as everywhere else
      const answer = isLivePressing(now.slug, voiceId) ? liveOpenedFor(now.slug, voiceId, now.band) : null;
      const fresh = isLivePressing(now.slug, voiceId) && (!answer || !!answer.reading);
      wantedSeek.current = !answer && fresh ? seconds : 0;
      pendingSeek.current = fresh ? null : { slug: now.slug, band: now.band, voice: voiceId, seconds };
      setNow({ ...now, voice: voiceId });
    },
    [now, recording, refuse],
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
      // beginBook's `playBand(slug, fit.band)` — playBand restates the
      // seconds onto the pressing it drops
      playBand(slug, spot!.chapter);
      return true;
    },
    [now, wantPlay, toggle, playBand, refuse],
  );

  const seekTo = useCallback(
    (seconds: number) => {
      // A stream has nothing behind the playhead to seek to. Refused, and
      // said — a groove that swallows a drag reads as a broken control.
      if (streaming === "live") {
        sayNote(STILL_READING_SAY, true);
        return;
      }
      // Saved since this stream started: the finished object can be
      // seeked, so reload from it at the asked-for second. The pass comes
      // off the href, the uri changes, a new player is made, and the seek
      // is parked for it exactly as a resume is.
      if (streaming === "saved" && now?.voice && recording) {
        const end = chaptersOf(recording, now.voice)[now.band]?.duration || 0;
        const at = Math.max(0, end ? Math.min(seconds, end) : seconds);
        noteLiveSaved(recording, now.voice, now.band);
        pendingSeek.current = at > 0 ? { slug: now.slug, band: now.band, voice: now.voice, seconds: at } : null;
        bumpLive();
        return;
      }
      const end = status.duration || 0;
      player.seekTo(Math.max(0, end ? Math.min(seconds, end) : seconds));
    },
    [player, status.duration, streaming, now, recording, sayNote, bumpLive],
  );
  // playAt is built before seekTo and reads it through this
  const seekRef = useRef(seekTo);
  seekRef.current = seekTo;

  // the needle through needleRef (above), NOT a dependency
  const nudge = useCallback((seconds: number) => seekRef.current(needleRef.current + seconds), []);

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
  playingRef.current = playing;
  const position = status.currentTime ?? 0;
  const voiceRef = useRef(now?.voice ?? null);
  voiceRef.current = now?.voice ?? null;

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
          ...(voiceRef.current ? { editionId: voiceRef.current } : {}),
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
    () =>
      locked
        ? { text: LOCKED_SAY, bad: refused > 0, n: refused, kind: "lock" }
        : note
          ? { text: note.text, bad: note.bad, n: note.n, kind: "note", subscribe: note.subscribe }
          : null,
    [locked, refused, note],
  );

  /**
   * A live voice is the subscription's; a pressed one is free to a
   * signed-in reader; everything is shut to a guest. The entitlement is the
   * site's answer (subscription.tsx), null-is-locked until it has answered.
   * The line is PRESSED vs LIVE, not "featured": a live voice with a
   * portrait is still a live voice.
   */
  const voiceLocked = useCallback(
    (voiceId: string): boolean => locked || (!PRESSED_IDS.has(voiceId) && !subscribed),
    [locked, subscribed],
  );

  const duration = status.duration || (chapter?.duration ?? 0);
  // the tick, kept OFF the value below — see TWO CLOCKS at the top
  const clock = useMemo<DeckClock>(() => ({ position, duration }), [position, duration]);

  const value = useMemo<DeckValue>(
    () => ({
      now,
      recording,
      chapter,
      playing,
      duration,
      // the platform's wait, or the site's — a live band it would not read
      // is neither: the needle stands, with the reason under the groove
      loading: !!now && (asking || (!gated && !status.isLoaded)),
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
      refuse,
      say,
      voiceLocked,
      streaming,
      canSeek,
      bumpLive,
      liveTick,
      subscribePosition,
    }),
    [
      now,
      recording,
      chapter,
      playing,
      duration,
      status.isLoaded,
      asking,
      gated,
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
      refuse,
      say,
      voiceLocked,
      streaming,
      canSeek,
      bumpLive,
      liveTick,
      subscribePosition,
    ],
  );

  return (
    <DeckContext.Provider value={value}>
      <DeckClockContext.Provider value={clock}>{children}</DeckClockContext.Provider>
    </DeckContext.Provider>
  );
}

/** Where the needle is, at the player's 500ms — for the chrome that prints
 *  a time or draws a groove. The component that calls this re-renders on
 *  every tick, so call it in the leaf that shows the number, never in a
 *  room. Everything else about the deck is on useDeck(). */
export function useDeckClock(): DeckClock {
  return useContext(DeckClockContext);
}

export function useDeck(): DeckValue {
  const ctx = useContext(DeckContext);
  if (!ctx) throw new Error("useDeck must be used inside <AudioProvider>");
  return ctx;
}

/**
 * The read-along's clock: the needle, sampled ten times a second while the
 * deck is playing, and only the component that calls this re-renders on it.
 * The chrome that prints a time reads `useDeckClock().position` at the transport's rate.
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
