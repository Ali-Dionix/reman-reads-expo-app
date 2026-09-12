// The desk's PREVIEW mode — and where it is allowed to exist.
//
// The site runs two modes, decided by whether Supabase is configured (see
// LoginEnhancer.tsx): LIVE, real accounts; PREVIEW, the original working model
// where any address is accepted, the "letter" arrives instantly and the session
// is localStorage only. The preview is kept so a fresh clone still demos end to
// end — a DESK convenience, not a product feature.
//
// On a phone that distinction has teeth: a shipped build with no desk configured
// would otherwise mint a card for any address typed into it. So the preview is
// confined to development. A release build always speaks as a live desk, and
// with no desk behind it every submit is refused with supabase.ts's own
// "The Issue Desk is not connected yet." — a true sentence, not a fake card.
//
// While it does run, the preview persists the reader the site's way: the same
// `rr-account` record portalClient.writeSession() writes (`{ name, email,
// joined, guest:false }`), so nothing here ever removes the guest pass without
// writing something in its place, and a relaunch can find the reader again.

import { supabaseReady } from "../../lib/supabase";
import { cache } from "../../lib/storage";

/** True only on a desk with no backend configured, and never in a release. */
export const PREVIEW = __DEV__ && !supabaseReady;

/** portalShared.ts's PORTAL_SESSION_KEY — the key session.tsx reads at boot. */
const SESSION_KEY = "rr-account";

export type PreviewSession = { name: string; email: string; joined: string; guest: false };

/** portalClient.nameFromEmail(), verbatim: the local part, word by word. */
export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const words = local
    .split(/[._\-+]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return words.join(" ") || "Reader";
}

/** The working model's record for an address and a name. */
export function previewRecord(email: string, name: string): PreviewSession {
  return {
    name: name.trim() || nameFromEmail(email.trim()),
    email: email.trim(),
    joined: "2026",
    guest: false,
  };
}

/** writeSession() — the working model's record, in place of the guest pass. */
export async function writePreviewSession(email: string, name: string): Promise<PreviewSession> {
  const record = previewRecord(email, name);
  await cache.set(SESSION_KEY, JSON.stringify(record));
  return record;
}

/**
 * Adopt a preview reader: hand the card to the session, then write the
 * working model's record. session.tsx's setUser removes `rr-account` only
 * when what is stored there IS a guest pass, so the record — written after
 * the adoption — stays written, and a relaunch finds the reader again.
 */
export async function adoptPreviewSession(
  adopt: (user: { id: string; email: string; name: string }) => void,
  email: string,
  name: string,
): Promise<PreviewSession> {
  const record = previewRecord(email, name);
  adopt({ id: "", email: record.email, name: record.name });
  await writePreviewSession(email, name);
  return record;
}

/** readSession() for the preview: a non-guest record, or null. */
export async function readPreviewSession(): Promise<PreviewSession | null> {
  if (!PREVIEW) return null;
  try {
    const raw = await cache.get(SESSION_KEY);
    const s = raw ? (JSON.parse(raw) as Partial<PreviewSession>) : null;
    if (!s || s.guest || !s.email) return null;
    return { name: s.name ?? "", email: s.email, joined: s.joined ?? "2026", guest: false };
  } catch {
    return null;
  }
}
