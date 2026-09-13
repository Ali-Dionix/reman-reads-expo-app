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
 * The guest pass lives where the site keeps it — portalShared.ts's
 * PORTAL_SESSION_KEY, "rr-account", the same shape portalClient.ts writes:
 * `{ name, email, joined, guest: true }`. So a guest who closes the app comes
 * back to the rooms, as on the web, rather than to the sign-in wall.
 */
const GUEST_KEY = "rr-account";
const GUEST_EMAIL = "guest@roman.reads";
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
  /** The readers row, once it has landed; null for a guest, before the fetch,
   *  or when the row cannot be read (no backend, a lapsed token). */
  reader: ReaderRow | null;
  /** A guest pass — the rooms, on sample data, with no account behind them. */
  guest: boolean;
  setUser: (user: AuthUser | null) => void;
  /** portalClient.startGuestSession()'s equivalent: walk in without a card.
   *  Nothing is sent anywhere, and the next real sign-in replaces it. */
  startGuest: () => void;
  signOut: () => Promise<void>;
  /** Rename the reader in memory AND on the pass — a guest's name lives on
   *  the pass alone (setUser would end guest mode). */
  rename: (name: string) => void;
};

/** The guest's stand-in record. `id` stays empty so nothing can be written
 *  against it by accident. */
const GUEST: AuthUser = { id: "", email: GUEST_EMAIL, name: "Guest reader" };

/** The stored record, if any — a guest pass, or the preview's working model. */
async function readStored(): Promise<{ guest?: boolean; name?: string } | null> {
  try {
    const raw = await cache.get(GUEST_KEY);
    return raw ? (JSON.parse(raw) as { guest?: boolean; name?: string }) : null;
  } catch {
    return null;
  }
}

async function readGuestPass(): Promise<boolean> {
  return !!(await readStored())?.guest;
}

/** Remove the stored record only when it IS a guest pass: the preview's
 *  working-model record lives under the same key, and is written a tick
 *  before a real adoption clears the pass. */
async function dropGuestPass(): Promise<void> {
  if ((await readStored())?.guest === true) await cache.remove(GUEST_KEY);
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);

  const [guest, setGuest] = useState(false);

  // hydrate(): the readers row, once per signed-in reader.
  const [reader, setReader] = useState<ReaderRow | null>(null);
  const uid = !guest && user?.id ? user.id : "";
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
    initAuth()
      .then(async (u) => {
        // A real token wins; failing that, a persisted guest pass walks in —
        // under the name the guest gave it, if any (the pass is the guest's
        // only record).
        if (!u) {
          const test = await readTestUser();
          if (test) {
            if (alive) setUser(test);
            return;
          }
          const stored = await readStored();
          if (stored?.guest) {
            if (alive) {
              setGuest(true);
              setUser({ ...GUEST, name: (stored.name ?? "").trim() || GUEST.name });
            }
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

  const startGuest = useCallback(() => {
    setGuest(true);
    setUser(GUEST);
    void cache.set(
      GUEST_KEY,
      JSON.stringify({
        name: GUEST.name,
        email: GUEST_EMAIL,
        joined: String(new Date().getUTCFullYear()),
        guest: true,
      }),
    );
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    await cache.remove(GUEST_KEY);
    if (__DEV__) await cache.remove(TEST_USER_KEY);
    // A guest's memory leaves with the guest; a reader's stays for the next
    // sign-in on this device, keyed to them (the site's clearSession keeps a
    // reader's rr-account-state too, and adoptSession drops it on a new owner).
    if (guest) await cache.remove(STATE_KEY);
    setGuest(false);
    setUser(null);
  }, [guest]);

  const setUserAndClearGuest = useCallback(
    (u: AuthUser | null) => {
      setGuest(false);
      // A different reader than the last: the last reader's state goes, as
      // adoptSession does when rr-account-owner changes.
      if (u && user && !guest && user.id && u.id !== user.id) void cache.remove(STATE_KEY);
      setUser(u);
      // The next real sign-in replaces the pass, as portalClient.ts's adoptSession does.
      if (u) void dropGuestPass();
    },
    [user, guest],
  );

  const rename = useCallback(
    (name: string) => {
      const next = name.trim();
      if (!next) return;
      setUser((u) => (u ? { ...u, name: next } : u));
      if (guest) {
        void readStored().then((s) => {
          if (s?.guest) void cache.set(GUEST_KEY, JSON.stringify({ ...s, name: next }));
        });
      }
    },
    [guest],
  );

  const value = useMemo<SessionValue>(
    () => ({ user, booting, guest, reader, setUser: setUserAndClearGuest, startGuest, signOut, rename }),
    [user, booting, guest, reader, setUserAndClearGuest, startGuest, signOut, rename],
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
/** portalClient.startGuestSession — a guest's number reads as unissued. */
const GUEST_NO = "000000";

/**
 * The member number — accountPage.ts bakes `<span data-rr-pt-card-no>&ndash;
 * </span>` and hydrate() paints the readers row's card_no over it. The
 * placeholder while the row is in flight, the number once it lands, the dash
 * left standing if the row cannot be read, exactly as the web leaves it; a
 * guest's is "000000" and never a fetch.
 */
export function useCardNo(): string {
  const { guest, reader } = useSession();
  if (guest) return GUEST_NO;
  const card = reader?.card_no;
  return typeof card === "string" && card.trim() ? card.trim() : PENDING;
}
