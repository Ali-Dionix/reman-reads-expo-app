// The wire to Supabase — auth (GoTrue) and rows (PostgREST), over plain fetch.
//
// Ported from app/components/supabaseClient.ts on the website. Same endpoints,
// same error phrasing, same token shape, same deliberate absence of
// @supabase/supabase-js. THREE things differ, all forced by the platform:
//
//   1. Token storage is async (the OS keychain, via src/lib/storage.ts) where
//      the web's localStorage is synchronous. So the token cache is hydrated
//      once at boot by initAuth(), and currentUser() stays synchronous after
//      that — the screens call it during render, exactly as the enhancers do.
//   2. THE LETTER CARRIES A CODE, and the code is the way in. The site's
//      letter is a link that lands the browser back on /login with tokens;
//      a phone cannot rely on that (Expo Go cannot claim a scheme at all,
//      a tap on a link in a mail app is a trip through the browser either
//      way — and a custom scheme like romanreads:// can be claimed by ANY
//      app on an Android phone, so tokens sent down one are not safe). So
//      the app asks GoTrue for the same one-time letter and the reader
//      types the digits from it into the sign-in screen — sendEmailCode()
//      then verifyEmailCode(), the /otp and /verify pair. The letter's link
//      stays pointed at the site (no redirect_to: GoTrue uses the Site URL),
//      where a tap on it signs the reader in on the website, harmlessly.
//   3. consumeAuthRedirect() becomes consumeAuthLink(url): the same hash and
//      token_hash reading, over the URL expo-linking hands the screen.
//
// Everything else is the web file with `await` in front of the token calls.

import { cache, secure } from "./storage";
import { SUPABASE_KEY, SUPABASE_URL, supabaseReady } from "./config";

export { supabaseReady };

const AUTH_KEY = "rr-auth";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

type Tokens = {
  access_token: string;
  refresh_token: string;
  /** ms epoch — GoTrue reports seconds, we store the same clock as Date.now(). */
  expires_at: number;
  user: AuthUser;
};

export type AuthResult = {
  user: AuthUser | null;
  /** Set when the call failed — already phrased for the reader. */
  error: string | null;
  /** True when the address was mailed and there is no session yet. */
  pending?: boolean;
};

/* ---------------------------------------------------------------- store --- */

// The synchronous mirror of the keychain. `undefined` means "not hydrated
// yet"; `null` means "hydrated, and there is no session".
let cached: Tokens | null | undefined;

/**
 * A DEVELOPMENT SEAM, the token-carrying twin of session.tsx's rr-test-user:
 * a GoTrue token pair a test rig planted under this key in the plain cache
 * — `{ access_token, refresh_token, expires_at, user }`, the shape the
 * keychain holds — walks in as if the keychain held it. Read only in a dev
 * bundle, only when the keychain is empty, never written by the app, and
 * swept with the keychain at sign-out. What it is for: the web build, where
 * expo-secure-store is a no-op and no session can be kept, so the rooms
 * behind the site's routes (the entitlement, a live reader's 402, the
 * handoff) could not be walked at all. Mint the pair the way
 * scripts/verify-rls.mjs does — the password grant on a throwaway reader.
 */
const TEST_AUTH_KEY = "rr-test-auth";

/** Hydrate the token cache. Call once, before the first screen renders. */
export async function initAuth(): Promise<AuthUser | null> {
  if (cached !== undefined) return cached?.user ?? null;
  const raw = await secure.get(AUTH_KEY);
  cached = parse(raw);
  if (!cached && __DEV__) cached = parse(await cache.get(TEST_AUTH_KEY));
  return cached?.user ?? null;
}

function parse(raw: string | null): Tokens | null {
  if (!raw) return null;
  try {
    const t = JSON.parse(raw) as Tokens;
    return t?.access_token && t?.refresh_token ? t : null;
  } catch {
    return null;
  }
}

async function writeTokens(t: Tokens | null): Promise<void> {
  cached = t;
  if (t) await secure.set(AUTH_KEY, JSON.stringify(t));
  else await secure.remove(AUTH_KEY);
}

/** The signed-in reader, synchronously — valid only after initAuth(). */
export function currentUser(): AuthUser | null {
  return cached?.user ?? null;
}

/* ----------------------------------------------------------------- http --- */

function authHeaders(bearer?: string): Record<string, string> {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${bearer || SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };
}

function errorText(body: unknown, status: number): string {
  const b = (body ?? {}) as Record<string, string>;
  return (
    b.error_description || b.msg || b.message || b.error || `Request failed (${status})`
  );
}

function userFrom(raw: Record<string, unknown> | undefined): AuthUser {
  const meta = (raw?.user_metadata ?? {}) as Record<string, string>;
  return {
    id: String(raw?.id ?? ""),
    email: String(raw?.email ?? ""),
    name: (meta.name ?? "").trim(),
  };
}

/** Store a GoTrue session payload. Returns null if it carried no session
 *  (signup with "Confirm email" on answers with a bare user). */
async function keepSession(body: Record<string, unknown>): Promise<AuthUser | null> {
  const access = body.access_token as string | undefined;
  const refresh = body.refresh_token as string | undefined;
  if (!access || !refresh) return null;
  const expiresIn = Number(body.expires_in ?? 3600);
  const user = userFrom(body.user as Record<string, unknown>);
  await writeTokens({
    access_token: access,
    refresh_token: refresh,
    expires_at: Date.now() + expiresIn * 1000,
    user,
  });
  return user;
}

async function post(
  path: string,
  body: unknown,
  bearer?: string,
): Promise<{ ok: boolean; body: Record<string, unknown>; status: number }> {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: "POST",
    headers: authHeaders(bearer),
    body: JSON.stringify(body ?? {}),
  });
  let parsed: Record<string, unknown> = {};
  try {
    parsed = (await res.json()) as Record<string, unknown>;
  } catch {
    /* 204s and empty bodies are fine */
  }
  return { ok: res.ok, body: parsed, status: res.status };
}

const NO_BACKEND: AuthResult = {
  user: null,
  error: "The Issue Desk is not connected yet.",
};

/* ------------------------------------------------------------------ in --- */

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!supabaseReady) return NO_BACKEND;
  const r = await post("/auth/v1/token?grant_type=password", { email, password });
  if (!r.ok) return { user: null, error: errorText(r.body, r.status) };
  return { user: await keepSession(r.body), error: null };
}

export async function signUpWithPassword(
  email: string,
  password: string,
  name: string,
): Promise<AuthResult> {
  if (!supabaseReady) return NO_BACKEND;
  const r = await post("/auth/v1/signup", { email, password, data: { name } });
  if (!r.ok) return { user: null, error: errorText(r.body, r.status) };
  const user = await keepSession(r.body);
  // No session back means the project requires email confirmation.
  return { user, error: null, pending: !user };
}

/* --------------------------------------------------------------- token --- */

/** A live access token, refreshing 60s before expiry. Null when signed out. */
export async function readerBearerToken(): Promise<string | null> {
  if (!supabaseReady) return null;
  if (cached === undefined) await initAuth();
  const tokens = cached;
  if (!tokens) return null;

  if (Date.now() < tokens.expires_at - 60_000) return tokens.access_token;

  const r = await post("/auth/v1/token?grant_type=refresh_token", {
    refresh_token: tokens.refresh_token,
  });
  if (!r.ok) {
    // A refresh token the server has retired is a signed-out reader, not an
    // error to surface: drop it and let the gate send them to the Issue Desk.
    await writeTokens(null);
    return null;
  }
  const user = await keepSession(r.body);
  return user ? (cached?.access_token ?? null) : null;
}

/* ----------------------------------------------------------------- out --- */

export async function signOut(): Promise<void> {
  const tokens = cached;
  await writeTokens(null);
  if (__DEV__) await cache.remove(TEST_AUTH_KEY);
  if (!supabaseReady || !tokens) return;
  try {
    await post("/auth/v1/logout", {}, tokens.access_token);
  } catch {
    // The local session is already gone; a failed server logout only means
    // the refresh token outlives it, and it expires on its own.
  }
}

/* ---------------------------------------------------------------- rows --- */

/** PostgREST, with the reader's own token so RLS applies. */
export async function selectRows<T>(table: string, query = "select=*"): Promise<T[]> {
  if (!supabaseReady) return [];
  const token = await readerBearerToken();
  if (!token) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: authHeaders(token),
    });
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

/**
 * PostgREST upsert, with the reader's own token so RLS applies — the site's
 * supabaseClient.upsertRows, verbatim in its headers: merge on `onConflict`,
 * no rows back. Unlike selectRows this THROWS on a refusal, because a write
 * that silently did not happen is worse than one the caller can undo (the
 * wishlist heart flips back).
 */
export async function upsertRows(
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
): Promise<void> {
  if (!rows.length) return;
  if (!supabaseReady) throw new Error(`${table}: no backend configured`);
  const token = await readerBearerToken();
  if (!token) throw new Error(`${table}: signed out`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: { ...authHeaders(token), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${table}: ${res.status}`);
}

/** PostgREST delete by filter, same token, same refusal. */
export async function deleteRows(table: string, filter: string): Promise<void> {
  if (!supabaseReady) throw new Error(`${table}: no backend configured`);
  const token = await readerBearerToken();
  if (!token) throw new Error(`${table}: signed out`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: { ...authHeaders(token), Prefer: "return=minimal" },
  });
  if (!res.ok) throw new Error(`${table}: ${res.status}`);
}

/* ---------------------------------------------------------------- code --- */

/**
 * How many digits the letter carries — the project's "Email OTP Length"
 * (Authentication → Sign In / Providers → Email). Read off the project on
 * 13 Sep 2026: 8. The screen sizes its field and phrases its guidance by
 * this; change the two together.
 */
export const OTP_LENGTH = 8;

/**
 * The one-time letter — GoTrue's OTP endpoint, the same call the site's
 * sendMagicLink() makes. What the letter contains is the TEMPLATE's business:
 * with `{{ .Token }}` in it (Magic Link for a reader who exists, Confirm
 * signup for one who does not) it carries the digits the screen asks for;
 * with `{{ .ConfirmationURL }}` it carries the link as well. Both are in
 * the house templates (app/server/email/authLetters.ts on the site).
 *
 * `create` is the Create-an-account door: with it off, an unknown address is
 * refused rather than quietly issued a card. No `redirect_to`: the code needs
 * none, and the letter's link then goes where the project's Site URL points,
 * the website's /login — see the header on why not the app's own scheme.
 *
 * GoTrue lets an address ask once a minute; the screen keeps that clock
 * itself and the refusal is phrased below for the reader who beat it.
 */
export async function sendEmailCode(
  email: string,
  name: string,
  create: boolean,
): Promise<AuthResult> {
  if (!supabaseReady) return NO_BACKEND;
  const r = await post("/auth/v1/otp", {
    email,
    create_user: create,
    data: { name },
  });
  if (!r.ok) return { user: null, error: codeError(r.body, r.status) };
  return { user: null, error: null, pending: true };
}

/**
 * The digits, back to GoTrue — `/auth/v1/verify` with type "email", which
 * accepts a sign-in code and a sign-up (confirmation) code alike, so one
 * call serves the sign-in door, the create-account door and a password
 * sign-up the project asked to confirm. A good code answers with a session;
 * a spent, stale or mistyped one is refused, and that refusal is the one
 * message a reader will actually meet here.
 */
export async function verifyEmailCode(email: string, token: string): Promise<AuthResult> {
  if (!supabaseReady) return NO_BACKEND;
  const r = await post("/auth/v1/verify", { type: "email", email, token: token.trim() });
  if (!r.ok) return { user: null, error: codeError(r.body, r.status) };
  const user = await keepSession(r.body);
  if (!user) return { user: null, error: "That code was accepted but no session came back. Try again." };
  return { user, error: null };
}

/**
 * GoTrue's refusals, in the desk's words. Every other message is passed
 * through as the site passes it — errorText() — because GoTrue's own
 * sentences are sound and a rate-limit one names its seconds.
 */
function codeError(body: unknown, status: number): string {
  const b = (body ?? {}) as Record<string, string>;
  const code = String(b.error_code ?? "");
  const msg = errorText(body, status);
  if (code === "otp_expired" || /expired or is invalid/i.test(msg)) {
    return "That code isn’t right, or it has expired. Ask for a new one below.";
  }
  if (code === "otp_disabled" || /signups not allowed/i.test(msg)) {
    return "We don’t have an account for that address. Choose Create an account.";
  }
  if (code === "user_already_exists" || /already registered/i.test(msg)) {
    return "There is already an account for that address. Choose Sign in.";
  }
  return msg;
}

/* ---------------------------------------------------------- the letter --- */

/**
 * The app's own sign-in address: its scheme (app.json `scheme`) at the
 * sign-in route. No letter is sent to it any more — the code is the app's
 * door, and a custom scheme is not a safe place to send tokens (the header).
 * Kept, with consumeAuthLink() below, for a link that arrives anyway: an
 * older letter, or a project whose allow-list still carries the scheme.
 */
export const APP_LOGIN_LINK = "romanreads://sign-in";

/**
 * A reader arriving from a letter carries tokens on the URL — the site's
 * consumeAuthRedirect(), over the URL expo-linking hands the screen instead
 * of window.location. Two shapes, both GoTrue's:
 *
 *   romanreads://sign-in#access_token=…&refresh_token=…&expires_in=…   implicit
 *   romanreads://sign-in?token_hash=…&type=magiclink                   template
 *
 * Returns null when the URL carries nothing of the kind (a plain open).
 */
export async function consumeAuthLink(url: string): Promise<AuthResult | null> {
  if (!supabaseReady || !url) return null;
  // The site's clean() — history.replaceState scrubs the hash the moment it is
  // read, so a reload cannot read it twice. expo-linking keeps the launch URL
  // until a new link arrives, so the scrub is a memory: a URL already spent
  // carries nothing on its second reading (a sign-out that lands back here
  // must not re-enter on a revoked token).
  if (consumed.has(url)) return null;
  const hashAt = url.indexOf("#");
  const hash = kv(hashAt >= 0 ? url.slice(hashAt + 1) : "");
  const queryAt = url.indexOf("?");
  const queryEnd = hashAt >= 0 && hashAt > queryAt ? hashAt : url.length;
  const query = kv(queryAt >= 0 ? url.slice(queryAt + 1, queryEnd) : "");

  const linkError = hash.get("error_description") ?? query.get("error_description");
  if (linkError) {
    consumed.add(url);
    return { user: null, error: linkError };
  }

  const access = hash.get("access_token");
  if (access) {
    consumed.add(url);
    const user = await keepSession({
      access_token: access,
      refresh_token: hash.get("refresh_token") ?? "",
      expires_in: Number(hash.get("expires_in") ?? 3600),
      // The hash carries no user object; /auth/v1/user fills it in below.
      user: {},
    });
    if (!user) return { user: null, error: "That sign-in link was incomplete." };
    // The hash names nobody: only /auth/v1/user can. A record with no id and
    // no email is a token the server refused (expired, or already used), and
    // a card for nobody is not a card — drop the tokens rather than keep them.
    let record: AuthUser | null;
    try {
      record = await refreshUserRecord();
    } catch {
      // The server never answered. The tokens are unproven — keeping them
      // would boot the next launch as nobody — so the letter is asked again.
      await writeTokens(null);
      return { user: null, error: "We couldn’t reach our server. Check your connection and try again." };
    }
    if (!record || (!record.id && !record.email)) {
      await writeTokens(null);
      return { user: null, error: "That sign-in link has expired." };
    }
    return { user: record, error: null };
  }

  const tokenHash = query.get("token_hash");
  if (tokenHash) {
    consumed.add(url);
    const r = await post("/auth/v1/verify", {
      type: query.get("type") ?? "magiclink",
      token_hash: tokenHash,
    });
    if (!r.ok) return { user: null, error: errorText(r.body, r.status) };
    return { user: await keepSession(r.body), error: null };
  }

  return null;
}

/** The letters already read, by URL — see consumeAuthLink(). */
const consumed = new Set<string>();

/**
 * `a=b&c=d` → Map, cutting each pair on its FIRST '='. React Native's
 * URLSearchParams polyfill splits on every '=' (Libraries/Blob/
 * URLSearchParams.js), so a value carrying one — GoTrue's URL-encoded
 * error_description prose, a padded token — would lose its tail. The
 * browser's parser on the site is spec-complete; this is the same reading.
 */
function kv(s: string): Map<string, string> {
  const dec = (v: string) => {
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };
  return new Map(
    s
      .split("&")
      .filter(Boolean)
      .map((p) => {
        const i = p.indexOf("=");
        const key = i < 0 ? p : p.slice(0, i);
        const val = i < 0 ? "" : p.slice(i + 1);
        return [dec(key), dec(val.replace(/\+/g, " "))] as const;
      }),
  );
}

/**
 * Fetch the authoritative user record (the hash flow hands over tokens only).
 * A refusal (the token expired, or already spent) answers null; a network
 * failure throws, so the caller can tell the two apart — the site hands back
 * its empty placeholder in both cases, and a phone must not enter on it.
 */
export async function refreshUserRecord(): Promise<AuthUser | null> {
  const tokens = cached;
  if (!tokens) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: authHeaders(tokens.access_token),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as Record<string, unknown>;
  const user = userFrom(body);
  await writeTokens({ ...tokens, user });
  return user;
}
