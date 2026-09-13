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

import { cache } from "./storage";
import { initAuth, selectRows, signOut as authSignOut, type AuthUser } from "./supabase";

/**
 * NO GUEST PASS. The site lets a visitor walk the rooms without a card
 * ("Continue as a guest →", portalClient.startGuestSession); the app does not
 * — product owner's call, 13 Sep 2026: an account is mandatory on the phone.
 * portalShared.ts's PORTAL_SESSION_KEY, "rr-account", is still the key an
 * earlier build persisted its pass under, so boot sweeps a stale one rather
 * than leaving a guest record on a device that can no longer honour it.
 */
const SESSION_KEY = "rr-account";
/** portalShared.ts's PORTAL_STATE_KEY — the reader's working state (settings,
 *  the Ask AI log, bookmarks). A guest's leaves with the guest, and a change
 *  of reader drops the last reader's, as portalClient.ts's clearSession /
 *  adoptSession do with rr-account-owner. */
const STATE_KEY = "rr-account-state";
/** A DEVELOPMENT SEAM, and nothing else: a signed-in reader seeded by a test
 *  rig (the parity walk) under this key — `{ id, email, name }` — walks in
 *  as if the keychain held their token. Read only in a dev bundle, never
 *  written by the app, and swept at sign-out. Nothing behind it can reach
 *  Supabase (no token), which is the point: the rooms, the deck and the
 *  console for a reader, without a live account on the desk. */
const TEST_USER_KEY = "rr-test-user";

async function readTestUser(): Promise<AuthUser | null> {
  if (!__DEV__) return null;
  try {
    const raw = await cache.get(TEST_USER_KEY);
    const u = raw ? (JSON.parse(raw) as Partial<AuthUser>) : null;
    if (!u || typeof u.id !== "string" || !u.id || typeof u.email !== "string") return null;
    return { id: u.id, email: u.email, name: typeof u.name === "string" ? u.name : "" };
  } catch {
    return null;
  }
}

/**
 * The reader's own row — what portalClient.hydrate() brings down
 * (`selectRows("readers", "select=*&id=eq.<uid>")`) within a second of the
 * portal opening: the card number, the name on the card, the languages, the
 * audio settings. Fetched once per signed-in reader here, so Home, Profile
 * and Settings read one row rather than each asking for it.
 */
export type ReaderRow = {
  id: string;
  card_no: string | null;
  name?: string | null;
  langs?: string[] | null;
  audio_voice?: string | null;
  audio_speed?: number | null;
} & Record<string, unknown>;

type SessionValue = {
  user: AuthUser | null;
  /** True until the keychain has been read. Gate on this, not on `user`. */
  booting: boolean;
  /** The readers row, once it has landed; null before the fetch, or when the
   *  row cannot be read (no backend, a lapsed token). */
  reader: ReaderRow | null;
  setUser: (user: AuthUser | null) => void;
  signOut: () => Promise<void>;
  /** Rename the reader in memory. */
  rename: (name: string) => void;
};

/** A pass an earlier build left under the site's session key. Swept at boot. */
async function sweepStaleGuestPass(): Promise<void> {
  try {
    const raw = await cache.get(SESSION_KEY);
    const s = raw ? (JSON.parse(raw) as { guest?: boolean }) : null;
    if (s?.guest === true) await cache.remove(SESSION_KEY);
  } catch {
    /* an unreadable record is not worth a crash at boot */
  }
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);

  // hydrate(): the readers row, once per signed-in reader.
  const [reader, setReader] = useState<ReaderRow | null>(null);
  const uid = user?.id ?? "";
  useEffect(() => {
    setReader(null);
    if (!uid) return;
    let alive = true;
    void selectRows<ReaderRow>("readers", `select=*&id=eq.${encodeURIComponent(uid)}`).then((rows) => {
      if (alive && rows[0]) setReader(rows[0]);
    });
    return () => {
      alive = false;
    };
  }, [uid]);

  useEffect(() => {
    let alive = true;
    void sweepStaleGuestPass();
    initAuth()
      .then(async (u) => {
        // A real token wins; failing that, only the dev seam can walk in.
        if (!u) {
          const test = await readTestUser();
          if (test) {
            if (alive) setUser(test);
            return;
          }
        }
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

  const signOut = useCallback(async () => {
    await authSignOut();
    // The preview's working-model record (src/portal/login/preview.ts) lives
    // under the site's session key; a sign-out hands that back too.
    await cache.remove(SESSION_KEY);
    if (__DEV__) await cache.remove(TEST_USER_KEY);
    // A reader's memory stays for their next sign-in on this device, keyed
    // to them (the site's clearSession keeps rr-account-state too, and
    // adoptSession drops it on a new owner).
    setUser(null);
  }, []);

  const adopt = useCallback(
    (u: AuthUser | null) => {
      // A different reader than the last: the last reader's state goes, as
      // adoptSession does when rr-account-owner changes.
      if (u && user && user.id && u.id !== user.id) void cache.remove(STATE_KEY);
      setUser(u);
    },
    [user],
  );

  const rename = useCallback((name: string) => {
    const next = name.trim();
    if (!next) return;
    setUser((u) => (u ? { ...u, name: next } : u));
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ user, booting, reader, setUser: adopt, signOut, rename }),
    [user, booting, reader, adopt, signOut, rename],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

/** The web's baked placeholder for the member number. */
const PENDING = "–";

/**
 * The member number — accountPage.ts bakes `<span data-rr-pt-card-no>&ndash;
 * </span>` and hydrate() paints the readers row's card_no over it. The
 * placeholder while the row is in flight, the number once it lands, the dash
 * left standing if the row cannot be read, exactly as the web leaves it.
 */
export function useCardNo(): string {
  const { reader } = useSession();
  const card = reader?.card_no;
  return typeof card === "string" && card.trim() ? card.trim() : PENDING;
}
