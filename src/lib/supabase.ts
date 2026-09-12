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
//   2. `redirectTo` cannot be window.location.origin. Letters carry
//      APP_LOGIN_LINK (romanreads://sign-in, the app's own scheme and its
//      sign-in route) so the phone opens the app, not the site. The scheme
//      must be on the project's Redirect URLs allow-list; until it is, GoTrue
//      falls back to the Site URL and the letter opens www.romanreads.com/login.
//   3. consumeAuthRedirect() becomes consumeAuthLink(url): the same hash and
//      token_hash reading, over the URL expo-linking hands the screen.
//
// Everything else is the web file with `await` in front of the token calls.

import { secure } from "./storage";
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

/** Hydrate the token cache. Call once, before the first screen renders. */
export async function initAuth(): Promise<AuthUser | null> {
  if (cached !== undefined) return cached?.user ?? null;
  const raw = await secure.get(AUTH_KEY);
  cached = parse(raw);
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

/* -------------------------------------------------------------- letter --- */

/**
 * The one-time sign-in letter — GoTrue's OTP endpoint, exactly as the site's
 * sendMagicLink() calls it. `create` is the Create-an-account door: with it
 * off, an unknown address is refused rather than quietly issued a card.
 *
 * `redirect_to` is APP_LOGIN_LINK — the phone opens the app on its sign-in
 * screen, which reads the tokens off the URL (consumeAuthLink) and walks the
 * reader in. That is what the sent panel's "you will land back here" promises.
 */
export async function sendMagicLink(
  email: string,
  name: string,
  create: boolean,
): Promise<AuthResult> {
  if (!supabaseReady) return NO_BACKEND;
  const redirect = encodeURIComponent(APP_LOGIN_LINK);
  const r = await post(`/auth/v1/otp?redirect_to=${redirect}`, {
    email,
    create_user: create,
    data: { name },
  });
  if (!r.ok) return { user: null, error: errorText(r.body, r.status) };
  return { user: null, error: null, pending: true };
}

/* ---------------------------------------------------------- the letter --- */

/**
 * Where a sign-in letter sends the phone: the app's own scheme (app.json
 * `scheme`) at the sign-in route. Fixed rather than Linking.createURL(),
 * which in Expo Go would mint an exp:// address no allow-list could hold.
 *
 * THIS MUST BE ON THE PROJECT'S REDIRECT URLS (Supabase dashboard →
 * Authentication → URL Configuration). A redirect_to the project does not
 * know is dropped for the Site URL, and the letter opens the website instead.
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
