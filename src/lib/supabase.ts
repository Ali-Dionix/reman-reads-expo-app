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
//   2. `redirectTo` cannot be window.location.origin. Letters land on the
//      site's /login, which is already an allow-listed redirect URL; a deep
//      link back into the app is a later step and needs romanreads://login
//      added to the Supabase allow-list first.
//   3. No consumeAuthRedirect() — there is no URL hash to read on a phone.
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
