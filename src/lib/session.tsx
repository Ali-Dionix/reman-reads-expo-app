// Who is signed in, for the whole app.
//
// The web portal answers this synchronously from localStorage inside a click
// handler. The keychain is async, so the equivalent here is: hydrate once at
// boot, hold the answer in context, and let every screen read it without
// awaiting. `booting` is what the gate waits on — rendering the Issue Desk for
// a split second to an already-signed-in reader is the bug this prevents.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { initAuth, signOut as authSignOut, type AuthUser } from "./supabase";

type SessionValue = {
  user: AuthUser | null;
  /** True until the keychain has been read. Gate on this, not on `user`. */
  booting: boolean;
  /** A guest pass — the rooms, on sample data, with no account behind them. */
  guest: boolean;
  setUser: (user: AuthUser | null) => void;
  /** portalClient.startGuestSession()'s equivalent: walk in without a card.
   *  Nothing is sent anywhere, and the next real sign-in replaces it. */
  startGuest: () => void;
  signOut: () => Promise<void>;
};

/** The guest's stand-in record. `id` stays empty so nothing can be written
 *  against it by accident. */
const GUEST: AuthUser = { id: "", email: "", name: "Guest" };

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let alive = true;
    initAuth()
      .then((u) => {
        if (alive) setUser(u);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setBooting(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const [guest, setGuest] = useState(false);

  const startGuest = useCallback(() => {
    setGuest(true);
    setUser(GUEST);
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setGuest(false);
    setUser(null);
  }, []);

  const setUserAndClearGuest = useCallback((u: AuthUser | null) => {
    setGuest(false);
    setUser(u);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ user, booting, guest, setUser: setUserAndClearGuest, startGuest, signOut }),
    [user, booting, guest, setUserAndClearGuest, startGuest, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
