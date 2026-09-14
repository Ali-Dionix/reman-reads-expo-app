// Theme state for the app.
//
// Two differences from the web, both deliberate:
//
//   1. The OS gets a vote. The site defaults to light and remembers a toggle;
//      a phone has a system-wide appearance setting and users expect apps to
//      follow it. So the default here is "system", and an explicit toggle
//      pins a mode until it is cleared.
//   2. The stored key is the site's `rr-theme` (theme.ts's THEME_STORAGE_KEY),
//      with the site's own values, "light" | "dark". If the portal ever
//      renders inside a WebView it reads the same preference and does not
//      flash — and on web, AsyncStorage IS localStorage under that key, which
//      is how the parity rig pins a scheme before the app loads.
//
// `colors` is the unscoped map every existing caller reads. `bg()`, `text()`
// and `border()` are the scoped lookups — they refuse a role used outside its
// scope (tokens.ts's resolve), which is the whole point of carrying scopes.

import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { Dimensions, Platform, useColorScheme } from "react-native";
import {
  Easing,
  runOnJS,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import {
  CHROME,
  LINE,
  PAPER_GRADIENT,
  colorsFor,
  resolve,
  type ColorName,
  type Colors,
  type Mode,
} from "./tokens";

const THEME_STORAGE_KEY = "rr-theme";

// `::view-transition-group(root){animation-duration:.5s;
//  animation-timing-function:cubic-bezier(.4,0,.2,1)}` — matched exactly, and
// it is the part that must not be touched.
//
// The TAIL is ours, and it is the one place this cannot be the web. The browser
// has a snapshot, so behind its wipe edge the FINISHED PAGE is already painted.
// We have only the finished FIELD, so the ink and the book arrive as the disc
// leaves. That tail is therefore kept SHORT and front-loaded — out-quad puts
// most of the opacity away in the first forty milliseconds, so the book is back
// almost as the wipe lands rather than sitting under a wash.
//
// AND IT WAITS FOR THE PAINT. The flip re-renders every useTheme consumer in
// the app, and on a phone that render can outlast a 140ms tail; a tail that
// starts the instant the sweep lands then fades the disc off the OLD theme,
// which snaps to the new one a beat later — the very blink the sweep exists
// to hide. So the tail is not started by the sweep's callback but by an
// effect that runs once the tree has committed in the incoming mode, one
// frame on, when the native side has drawn it.
const SWEEP_MS = 500;
const TAIL_MS = 140;

type Pref = Mode | "system";

/** Where the wipe starts, and how far it has to reach. */
type Origin = { x: number; y: number; r: number; w: number; h: number };

type RevealValue = {
  active: boolean;
  /** The mode being wiped IN — not the one in force until the sweep lands. */
  incoming: Mode;
  origin: Origin;
  /** 0 → 1 across the sweep. */
  sweep: SharedValue<number>;
  /** 1 → 0 across the tail. */
  fade: SharedValue<number>;
};

type ThemeValue = {
  mode: Mode;
  pref: Pref;
  /** Unscoped: every role at its value for the mode. */
  colors: Colors;
  /** Scoped lookups — throw in __DEV__ on a role outside the scope. */
  bg: (name: ColorName) => string;
  text: (name: ColorName) => string;
  border: (name: ColorName) => string;
  /** Hairline colours already resolved for the active mode. */
  line: { dashed: string; dotted: string; numeral: string };
  /** The shell's night-rule constants, resolved. */
  chrome: {
    tearLine: string;
    tearHaze: string;
    sheetHaze: string;
    scrim: string;
    fabShadow: string;
    fabRing: string;
    tearWash: string;
  };
  paperGradient: readonly [string, string];
  setPref: (next: Pref) => void;
  toggle: () => void;
  /**
   * Flip the theme with the site's circular reveal, growing from a point in
   * SCREEN coordinates — the toggle's own centre. Falls back to an instant
   * flip under reduced motion, exactly as ThemeToggle.tsx does: the theme
   * change itself must never be blocked by the animation.
   */
  toggleFrom: (cx: number, cy: number) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);
const RevealContext = createContext<RevealValue | null>(null);

/** On web the store is localStorage and can be read before first paint;
 *  everywhere else the pinned mode arrives with the async read below. */
function readPinnedSync(): Pref {
  if (Platform.OS !== "web") return "system";
  try {
    const saved = (globalThis as { localStorage?: Storage }).localStorage?.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<Pref>(readPinnedSync);

  // Restore the pinned preference. A miss is not an error — it means "system".
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (alive && (saved === "light" || saved === "dark")) setPrefState(saved);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const setPref = useCallback((next: Pref) => {
    setPrefState(next);
    const write =
      next === "system"
        ? AsyncStorage.removeItem(THEME_STORAGE_KEY)
        : AsyncStorage.setItem(THEME_STORAGE_KEY, next);
    write.catch(() => {});
  }, []);

  const mode: Mode = pref === "system" ? (system === "dark" ? "dark" : "light") : pref;

  /* ------------------------------------------------ the lamp switch --- */

  const reduced = useReducedMotion();
  const sweep = useSharedValue(0);
  const fade = useSharedValue(1);
  const [reveal, setReveal] = useState<{ origin: Origin; to: Mode } | null>(null);
  // the disc has reached full cover and the tokens have been flipped; the
  // tail may start as soon as the flipped tree is on screen
  const [landed, setLanded] = useState(false);
  // the sweep's callbacks fire on the UI thread and must not close over stale
  // render state
  const pending = useRef<Mode | null>(null);

  const end = useCallback(() => {
    setReveal(null);
    setLanded(false);
  }, []);

  const land = useCallback(() => {
    const to = pending.current;
    pending.current = null;
    // the flip, under full cover — and nothing else: the tail is the
    // effect's, once this has rendered
    if (to) setPref(to);
    setLanded(true);
  }, [setPref]);

  // The tail. `mode` is read from the same render as `landed`, so this runs
  // only once the tree has committed in the incoming mode; the frame's wait
  // is for the native side to have painted that commit.
  useEffect(() => {
    if (!reveal || !landed || mode !== reveal.to) return;
    const id = requestAnimationFrame(() => {
      fade.value = withTiming(
        0,
        { duration: TAIL_MS, easing: Easing.out(Easing.quad) },
        (done) => {
          if (done) runOnJS(end)();
        },
      );
    });
    return () => cancelAnimationFrame(id);
  }, [reveal, landed, mode, fade, end]);

  const toggleFrom = useCallback(
    (cx: number, cy: number) => {
      const to: Mode = mode === "dark" ? "light" : "dark";
      if (reduced) {
        setPref(to);
        return;
      }
      // SCREEN, not window: the reader's Modal is statusBarTranslucent and
      // paints full-bleed, so a window-sized radius leaves a strip uncovered
      // under the status bar.
      const { width: w, height: h } = Dimensions.get("screen");
      // setRevealOrigin() — the distance to the farthest corner, so the circle
      // always finishes off-screen
      const r = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
      pending.current = to;
      sweep.value = 0;
      fade.value = 1;
      setLanded(false);
      setReveal({ origin: { x: cx, y: cy, r, w, h }, to });
    },
    [mode, reduced, setPref, sweep, fade],
  );

  // Start the sweep once the overlay is mounted, so its first frame is drawn
  // at r=0 rather than jumping in a few pixels wide.
  useEffect(() => {
    if (!reveal) return;
    sweep.value = withTiming(
      1,
      { duration: SWEEP_MS, easing: Easing.bezier(0.4, 0, 0.2, 1) },
      (done) => {
        if (done) runOnJS(land)();
      },
    );
  }, [reveal, sweep, land]);

  const value = useMemo<ThemeValue>(
    () => ({
      mode,
      pref,
      colors: colorsFor(mode),
      bg: (name) => resolve(name, "bg", mode),
      text: (name) => resolve(name, "text", mode),
      border: (name) => resolve(name, "border", mode),
      line: {
        dashed: LINE.dashed[mode],
        dotted: LINE.dotted[mode],
        numeral: LINE.numeral[mode],
      },
      chrome: {
        tearLine: CHROME.tearLine[mode],
        tearHaze: CHROME.tearHaze[mode],
        sheetHaze: CHROME.sheetHaze[mode],
        scrim: CHROME.scrim,
        fabShadow: CHROME.fabShadow,
        fabRing: CHROME.fabRing,
        tearWash: CHROME.tearWash,
      },
      paperGradient: PAPER_GRADIENT[mode],
      setPref,
      toggle: () => setPref(mode === "dark" ? "light" : "dark"),
      toggleFrom,
    }),
    [mode, pref, setPref, toggleFrom],
  );

  const revealValue = useMemo<RevealValue>(
    () => ({
      active: !!reveal,
      incoming: reveal?.to ?? mode,
      origin: reveal?.origin ?? { x: 0, y: 0, r: 0, w: 0, h: 0 },
      sweep,
      fade,
    }),
    [reveal, mode, sweep, fade],
  );

  return (
    <ThemeContext.Provider value={value}>
      <RevealContext.Provider value={revealValue}>{children}</RevealContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useThemeReveal(): RevealValue {
  const ctx = useContext(RevealContext);
  if (!ctx) throw new Error("useThemeReveal must be used inside <ThemeProvider>");
  return ctx;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
