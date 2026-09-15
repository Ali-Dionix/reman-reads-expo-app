// The reader's saved marks — the wishlist — shared by every screen that
// shows or changes it: the book page's heart and the library's Wishlist
// shelf (and its count in the bar).
//
// On the web, LibraryRoomEnhancer's savedSet() reads the working model's
// `shelf` and `waitlist` lists (one list now; the old waitlist half is
// drained on the first write) and cuts them to the catalogue; persistSaved()
// writes the whole list back and portalClient's sync pushes the DIFF to
// shelf_items — an upsert of (reader_id, slug, kind) per addition, a delete
// per removal. The app has no working model, so this IS that diff, applied
// by hand at the moment of the tap: a heart on upserts one "shelf" row; a
// heart off deletes the slug's row, whichever kind it was. Same table, same
// kinds, same conflict key, and the website reads the result on its next
// hydrate.
//
// ONE STORE, MODULE-LEVEL, KEYED BY THE READER. The page and the room must
// agree without a round trip between them, and a second visit must not
// fetch again — so the set lives here and the screens subscribe. Optimistic:
// the heart flips at once, and flips back if the write is refused.
//
// TODO(Phase 2): the OWNED marks — ownedBySlug(), the "Yours" shelf — read
// the orders ledger the same way; they are not here yet, and data.ts's
// Marks.owned stays empty until they are.

import { useEffect, useSyncExternalStore } from "react";

import { useSession } from "../../lib/session";
import { deleteRows, selectRows, upsertRows } from "../../lib/supabase";
import { BY_SLUG } from "./data";

type ShelfRow = { slug: string; kind: "shelf" | "waitlist" };

export type Saved = {
  /** Catalogue slugs the reader saved, either kind. */
  saved: ReadonlySet<string>;
  /** False until the reader's rows have been read once. */
  ready: boolean;
};

const EMPTY: Saved = { saved: new Set(), ready: false };

let owner = "";
let snap: Saved = EMPTY;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: Saved) {
  snap = next;
  listeners.forEach((fn) => fn());
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** Read this reader's rows once; a change of reader starts over. */
function ensure(readerId: string) {
  if (owner === readerId && (snap.ready || loading)) return;
  owner = readerId;
  publish(EMPTY);
  const run = (async () => {
    const rows = await selectRows<ShelfRow>(
      "shelf_items",
      `select=slug,kind&reader_id=eq.${encodeURIComponent(readerId)}`,
    );
    if (owner !== readerId) return; // somebody else signed in meanwhile
    // savedSet(): both kinds, cut to the catalogue
    publish({ saved: new Set(rows.map((r) => r.slug).filter((s) => BY_SLUG.has(s))), ready: true });
  })().finally(() => {
    if (loading === run) loading = null;
  });
  loading = run;
}

function forget() {
  owner = "";
  loading = null;
  publish(EMPTY);
}

/**
 * Flip a slug's mark. Answers the NEW state — true when the book is now on
 * the wishlist — after the write, or the old one again if it was refused.
 */
export async function toggleSaved(slug: string): Promise<boolean> {
  const readerId = owner;
  if (!readerId) return false;
  const on = !snap.saved.has(slug);
  const next = new Set(snap.saved);
  if (on) next.add(slug);
  else next.delete(slug);
  publish({ ...snap, saved: next });
  try {
    if (on) {
      await upsertRows("shelf_items", [{ reader_id: readerId, slug, kind: "shelf" }], "reader_id,slug");
    } else {
      await deleteRows(
        "shelf_items",
        `reader_id=eq.${encodeURIComponent(readerId)}&slug=eq.${encodeURIComponent(slug)}`,
      );
    }
    return on;
  } catch {
    // the write did not happen: put the mark back as it was, unless the
    // store has moved on to another reader in the meantime
    if (owner === readerId) {
      const back = new Set(snap.saved);
      if (on) back.delete(slug);
      else back.add(slug);
      publish({ ...snap, saved: back });
    }
    return !on;
  }
}

/** The reader's wishlist, live: the set, whether it has been read, and the flip. */
export function useSaved(): Saved & { toggle: (slug: string) => Promise<boolean> } {
  const { user } = useSession();
  const readerId = user ? user.id : "";
  useEffect(() => {
    if (readerId) ensure(readerId);
    else forget();
  }, [readerId]);
  const s = useSyncExternalStore(subscribe, () => snap, () => snap);
  return { saved: s.saved, ready: s.ready, toggle: toggleSaved };
}
