// "Reading since" — the year on the card, as portalClient.hydrate() derives
// it: `readers.created_at` for a signed-in reader, the guest pass's own
// `joined` for a guest, and this year only when neither has answered yet.
// Never a literal year: the site's guest pass writes the current year at
// sign-in, and a reader who joined in 2025 reads 2025.
//
// The GoTrue record the app holds (src/lib/supabase.ts's AuthUser) carries
// no created_at, so the row is asked for directly — one PostgREST select on
// the reader's own id, under RLS. Listed in the report's sharedRequests: an
// AuthUser.createdAt would make this one line.

import { selectRows } from "../../lib/supabase";


export const thisYear = (): string => String(new Date().getUTCFullYear());

const yearOf = (iso: unknown): string | null => {
  if (typeof iso !== "string" || !iso) return null;
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? null : String(t.getUTCFullYear());
};

/**
 * The year for the row. `id` is the signed-in reader's GoTrue id. Resolves
 * to this year when nothing better is known, exactly as inkCard's
 * `readSession()?.joined ?? String(new Date().getUTCFullYear())`.
 */
export async function readJoined(id: string): Promise<string> {
  if (!id) return thisYear();
  const rows = await selectRows<{ created_at?: string }>("readers", `select=created_at&id=eq.${id}`);
  return yearOf(rows[0]?.created_at) ?? thisYear();
}
