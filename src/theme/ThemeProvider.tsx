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
//
// THE REVEAL IS NOT HERE. The lamp switch's circular wipe lives in
// ThemeStage.tsx, one stage per native window, because it works from
// pictures of the screen and a picture belongs to the window it was taken
// in. What this provider keeps for it is `look` — the mode the screen still
// LOOKS like while a stage holds the outgoing picture over the flip — so the
// system chrome (the status bar) changes with the wipe and not a beat before.

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform, useColorScheme } from "react-native";

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

type Pref = Mode | "system";

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
  /** The plain flip — one hard cut. The switch takes the stage's reveal
   *  instead whenever it can (src/ui/ThemeSwitch.tsx). */
  toggle: () => void;
  /** A stage's word that the outgoing mode is still what is on screen
   *  (`hold("light")`), and that it no longer is (`hold(null)`). */
  hold: (looksLike: Mode | null) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);
/** Its own context, so a stage's hold and release re-render the one thing
 *  that reads it (the status bar) and not every useTheme consumer twice. */
const LookContext = createContext<Mode>("light");

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

  // what a stage says is still on screen, while it holds the old picture
  const [held, setHeld] = useState<Mode | null>(null);
  const hold = useCallback((looksLike: Mode | null) => setHeld(looksLike), []);
  const look = held ?? mode;

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
      hold,
    }),
    [mode, pref, setPref, hold],
  );

  return (
    <ThemeContext.Provider value={value}>
      <LookContext.Provider value={look}>{children}</LookContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

/**
 * The mode the screen LOOKS like right now. Equal to `mode` except during a
 * reveal, when a stage holds the outgoing picture over a tree that has
 * already flipped. Paint SYSTEM chrome from this — the status bar — and
 * nothing else: the tree itself must flip on `mode`, so the picture taken
 * under the hold is of the finished screen.
 */
export function useThemeLook(): Mode {
  return useContext(LookContext);
}
