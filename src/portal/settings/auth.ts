// The account itself — the four calls ProfileEnhancer's settings half makes
// against GoTrue and the readers row, ported from the site's
// supabaseClient.ts (`updateUser`, `requestEmailChange`, `setPassword`,
// `setAuthName`, `authRecord`, `signOutEverywhere`) and portalClient.ts's
// `pushName`. Same endpoints, same error phrasing, plain fetch.
//
// WHY THIS LIVES HERE AND NOT IN src/lib/supabase.ts: that file is the kit's,
// and this fan-out does not touch it. Everything below needs only what it
// already exports (readerBearerToken, config's URL and key). Listed in the
// report's sharedRequests to be lifted into it — with one thing this file
// CANNOT do from outside: refresh the keychain's cached AuthUser after a PUT
// (the site's updateUser does; `writeTokens` is private). The session
// context is updated by the screen instead, and the keychain copy catches up
// on the next token refresh, whose response carries the user.

import { SUPABASE_KEY, SUPABASE_URL, supabaseReady } from "../../lib/config";
import { readerBearerToken, refreshUserRecord } from "../../lib/supabase";

export type AuthResult = {
  /** Set when the call failed — already phrased for the reader. */
  error: string | null;
  /** True when GoTrue mailed a link and the change waits on it. */
  pending?: boolean;
};

/** supabaseClient.ts's AuthRecord. */
export type AuthRecord = {
  email: string;
  /** An address change requested but not yet confirmed by the link. */
  pendingEmail: string;
  /** ms epoch the account was created — "card issued". 0 when unknown. */
  createdAt: number;
};

const NOT_SIGNED_IN = "You are not signed in.";
const WENT_WRONG = "Something went wrong on our end. Try again.";

const headers = (bearer: string): Record<string, string> => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${bearer}`,
  "Content-Type": "application/json",
});

function errorText(body: unknown, status: number): string {
  const b = (body ?? {}) as Record<string, string>;
  return b.error_description || b.msg || b.message || b.error || `Request failed (${status})`;
}

/** PUT /auth/v1/user with the reader's own token. The one endpoint that edits
 *  the account itself rather than a row belonging to it. */
async function updateUser(patch: Record<string, unknown>): Promise<AuthResult> {
  if (!supabaseReady) return { error: NOT_SIGNED_IN };
  const token = await readerBearerToken();
  if (!token) return { error: NOT_SIGNED_IN };
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: "PUT",
      headers: headers(token),
      body: JSON.stringify(patch),
    });
  } catch {
    return { error: WENT_WRONG };
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return { error: errorText(body, res.status) };
  // The cached AuthUser is re-read, as the site's updateUser does, so the
  // next boot and the next screen see the record GoTrue now holds.
  await refreshUserRecord().catch(() => null);
  return { error: null };
}

/**
 * Ask for the address on the card to be changed. This does NOT change it:
 * GoTrue mails a confirmation link to both addresses and the account only
 * moves when the link is followed — so the caller reports "check both
 * inboxes", never "done". `current` is the address on the session.
 */
export async function requestEmailChange(email: string, current: string): Promise<AuthResult> {
  const next = email.trim().toLowerCase();
  if (!next) return { error: "An address is needed." };
  if (next === current.trim().toLowerCase()) {
    return { error: "That is already the address on your account." };
  }
  const r = await updateUser({ email: next });
  return r.error ? r : { ...r, pending: true };
}

/** Set (or replace) the account's password. Works whether or not one existed. */
export async function setPassword(password: string): Promise<AuthResult> {
  if (password.length < 8) return { error: "Eight characters at least." };
  return updateUser({ password });
}

/** The reader's display name on the auth record — order mail reads THAT. */
export async function setAuthName(name: string): Promise<AuthResult> {
  return updateUser({ data: { name: name.trim() } });
}

/** portalClient.ts's pushName: the readers row's own copy of the name. */
export async function pushName(id: string, name: string): Promise<void> {
  if (!supabaseReady || !id) return;
  const token = await readerBearerToken();
  if (!token) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/readers?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...headers(token), Prefer: "return=minimal" },
      body: JSON.stringify({ name }),
    });
  } catch {
    /* the session already shows it; the next save will retry */
  }
}

const ms = (v: unknown): number => {
  if (typeof v !== "string" || !v) return 0;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : 0;
};

/**
 * The authoritative account record, fetched fresh. Null when signed out or
 * unreachable — the screen renders without it rather than waiting on it.
 */
export async function authRecord(): Promise<AuthRecord | null> {
  if (!supabaseReady) return null;
  const token = await readerBearerToken();
  if (!token) return null;
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: headers(token) });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return null;
  return {
    email: String(body.email ?? ""),
    pendingEmail: String(body.new_email ?? ""),
    createdAt: ms(body.created_at),
  };
}

/**
 * GoTrue's global logout — every refresh token on the account is retired, and
 * other devices stop working when their access tokens lapse (within the
 * hour). The local session is the caller's to drop afterwards.
 */
export async function signOutEverywhere(): Promise<boolean> {
  if (!supabaseReady) return false;
  const token = await readerBearerToken();
  if (!token) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=global`, {
      method: "POST",
      headers: headers(token),
      body: "{}",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** paintAccount's date: en-GB, day / long month / year — "12 September 2026". */
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export function issuedOn(epochMs: number): string {
  if (!epochMs) return "";
  const d = new Date(epochMs);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
