// The reader's working model — portalClient.ts's `rr-account-state`, the one
// key every room reads and writes its slice of.
//
// ONE KEY, MANY OWNERS OF SLICES. The site keeps the whole PortalState
// (shelf, listening, purchases, settings, the Ask AI log, bookmarks…) as one
// JSON under PORTAL_STATE_KEY; the app's cache store is the same thing on a
// phone (src/lib/storage.ts), so the settings screen and the Ask AI room
// both keep their slices here, with the site's field names. Every write is
// a MERGE over what is stored, so a room that owns one slice never clobbers
// another's rows; every read hands back the whole object and the caller
// takes its keys.
//
// WHOSE IT IS. portalClient.ts keeps a second key, `rr-account-owner`, and
// throws the state away when the reader who signs in is not the reader who
// wrote it (and drops a guest's at sign-out — session.tsx does both). The
// stamp travels INSIDE the stored object here too: every write records the
// owner, and a read for a different owner starts from nothing, so reader A's
// conversation never surfaces for reader B on the same phone. A guest is
// "guest", as on the site; a real reader is their id.
//
// TODO(phase 2): portalClient.writeState also diff-pushes to /api/account for
// a signed-in reader; that seam lands here, once.

import { cache } from "./storage";

/** portalClient.ts's PORTAL_STATE_KEY. */
export const STATE_KEY = "rr-account-state";

export type Owner = string;
export const GUEST_OWNER: Owner = "guest";
export const ownerOf = (readerId: string | null | undefined): Owner => readerId || GUEST_OWNER;

export type PortalState = { owner?: Owner } & Record<string, unknown>;

/** The stored state, whole — `{}` when nothing is stored, or when what is
 *  stored belongs to another owner. Pass no owner to read regardless (the
 *  dossier export, which is the reader's own request for their record). */
export async function readState(owner?: Owner): Promise<PortalState> {
  try {
    const raw = await cache.get(STATE_KEY);
    const parsed = raw ? (JSON.parse(raw) as PortalState) : {};
    if (!parsed || typeof parsed !== "object") return {};
    if (owner !== undefined && typeof parsed.owner === "string" && parsed.owner !== owner) return {};
    return parsed;
  } catch {
    return {};
  }
}

/** Merge a patch over the stored state, stamped with its owner; returns the
 *  new whole. */
export async function writeState(owner: Owner, patch: Record<string, unknown>): Promise<PortalState> {
  const cur = await readState(owner);
  const next: PortalState = { ...cur, ...patch, owner };
  try {
    await cache.set(STATE_KEY, JSON.stringify(next));
  } catch {}
  return next;
}
