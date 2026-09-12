// The reader's OWN ledger, as Hermes reads it — portalClient.ts's `shelf`,
// `waitlist` and `purchases` fields, on a phone.
//
// The site passes these INTO askHermes (HermesAskOptions.shelf / .waitlist /
// .orders) rather than letting the engine import them, and for a reason it
// wrote down: Hermes once read PORTAL_ORDERS, the specimen ledger, and told a
// reader who had never ordered anything that they had three orders. The
// app's Orders room draws the same specimen rows as furniture; they are
// never the reader's, so they never reach here.
//
//   a guest          portalClient.defaultPortalState(): three on the shelf,
//                    two on the waitlist (the same five slugs
//                    src/portal/library/data.ts's guestMarks() marks), and
//                    no orders at all.
//   a signed-in      shelf_items (kind = shelf | waitlist) and the orders
//   reader           table, both under the reader's own token so RLS applies;
//                    [] for every "nothing to show" case, exactly as
//                    fetchLedgerOrders() answers.
//
// Listed under sharedRequests: library/data.ts should export its DEFAULT_SHELF
// and DEFAULT_WAITLIST so the two guest ledgers cannot drift apart.

import { useEffect, useState } from "react";

import { useSession } from "../../lib/session";
import { selectRows } from "../../lib/supabase";
import { fetchLedgerOrders, type Order } from "../orders/data";

/** defaultPortalState().shelf — the guest's three saved books. */
export const GUEST_SHELF = ["crime-and-punishment", "meditations", "the-little-prince"];
/** defaultPortalState().waitlist — the guest's two followed titles. */
export const GUEST_WAITLIST = ["the-brothers-karamazov", "1984"];

export type ReaderLedger = {
  /** Book slugs the reader saved. */
  shelf: string[];
  /** Book slugs the reader is following. */
  waitlist: string[];
  /** The reader's real orders, newest first. Never the specimen rows. */
  orders: Order[];
};

const GUEST_LEDGER: ReaderLedger = { shelf: GUEST_SHELF, waitlist: GUEST_WAITLIST, orders: [] };
const EMPTY_LEDGER: ReaderLedger = { shelf: [], waitlist: [], orders: [] };

type ShelfRow = { slug: string; kind: "shelf" | "waitlist" };

async function fetchShelf(readerId: string): Promise<{ shelf: string[]; waitlist: string[] }> {
  try {
    const rows = await selectRows<ShelfRow>("shelf_items", `select=slug,kind&reader_id=eq.${readerId}`);
    return {
      shelf: rows.filter((r) => r.kind === "shelf").map((r) => r.slug),
      waitlist: rows.filter((r) => r.kind === "waitlist").map((r) => r.slug),
    };
  } catch {
    return { shelf: [], waitlist: [] };
  }
}

/** The ledger Hermes answers from. A guest's is the sample one; a reader's is theirs. */
export function useReader(): ReaderLedger {
  const { user, guest } = useSession();
  const readerId = !guest && user ? user.id : "";
  const [ledger, setLedger] = useState<ReaderLedger>(readerId ? EMPTY_LEDGER : GUEST_LEDGER);

  useEffect(() => {
    if (!readerId) {
      setLedger(GUEST_LEDGER);
      return;
    }
    let alive = true;
    setLedger(EMPTY_LEDGER);
    void Promise.all([fetchShelf(readerId), fetchLedgerOrders()]).then(([marks, orders]) => {
      if (alive) setLedger({ ...marks, orders });
    });
    return () => {
      alive = false;
    };
  }, [readerId]);

  return ledger;
}
