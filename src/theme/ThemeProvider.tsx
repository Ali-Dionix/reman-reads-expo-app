// Theme state for the app.
//
// Two differences from the web, both deliberate:
//
//   1. The OS gets a vote. The site defaults to light and remembers a toggle;
//      a phone has a system-wide appearance setting and users expect apps to
//      follow it. So the default here is "system", and an explicit toggle
//      pins a mode until it is cleared.
//   2. The stored key is the site's `rr-theme`, on purpose. If the portal ever
//      renders inside a WebView (the Hermes specimen viewer is the likely
//      first case), it reads the same preference and does not flash.

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
import { useColorScheme } from "react-native";

import { colorsFor, LINE, PAPER_GRADIENT, type Colors, type Mode } from "./tokens";

const THEME_STORAGE_KEY = "rr-theme";

type Pref = Mode | "system";

type ThemeValue = {
  mode: Mode;
  pref: Pref;
  colors: Colors;
  /** Hairline colours already resolved for the active mode. */
  line: { dashed: string; dotted: string; numeral: string };
  paperGradient: readonly [string, string];
  setPref: (next: Pref) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<Pref>("system");

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

  const value = useMemo<ThemeValue>(
    () => ({
      mode,
      pref,
      colors: colorsFor(mode),
      line: {
        dashed: LINE.dashed[mode],
        dotted: LINE.dotted[mode],
        numeral: LINE.numeral[mode],
      },
      paperGradient: PAPER_GRADIENT[mode],
      setPref,
      toggle: () => setPref(mode === "dark" ? "light" : "dark"),
    }),
    [mode, pref, setPref],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
