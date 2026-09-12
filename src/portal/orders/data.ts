// The ledger's data — app/data/portalShared.ts's PORTAL_ORDERS, as the
// generated slice (src/data/orders.json, written by `npm run mobile:shelf`
// from the site repo), plus everything OrdersEnhancer decides at paint time:
// which title a row is about, whether that title has a live recording, and
// the reader's OWN orders drawn above the specimen rows.
//
// SPECIMEN DATA, quoted in rupees on purpose (portalShared.ts): these three
// rows are the empty ledger's furniture, not a reader's record. Real orders
// arrive from the orders table carrying their own currency and are drawn
// ABOVE them — see `useLedger()` below.

import { useEffect, useState } from "react";

import library from "../../data/library.json";
import shelf from "../../data/listeningShelf.json";
import orders from "../../data/orders.json";
import { useSession } from "../../lib/session";
import { selectRows, supabaseReady } from "../../lib/supabase";

/* ------------------------------------------------------------- shape --- */

// Typed here rather than inferred from the JSON: TypeScript widens a
// generated array into a union of every literal shape it sees, and a row
// built from the orders table has to fit the same type as a specimen row.

export type OrderStep = { label: string; note: string };

export type OrderCover = {
  /** The title set on the cloth when there is no art. */
  title: string;
  /** `--bk` — the cloth spine colour; the default cloth when absent. */
  spine?: string;
  /** The -lib.webp tile, a site path. Art never carries our lettering:
   *  `.rr-od-cover.has-art b{display:none}` hides the title on every has-art
   *  cover, whatever OrdersEnhancer.coverHtml's `hide` flag decided. */
  art?: string;
};

export type OrderItem = {
  title: string;
  detail: string;
  cover: OrderCover;
  /** A real order's `book_slug` — what the site keys the pencil note by
   *  (`data-rr-od-audio="${slug}"`). Specimen rows carry only a title. */
  slug?: string;
};

export type Order = {
  id: string;
  placed: string;
  amount: string;
  /** Steps completed so far (index into steps; steps.length = all done). */
  done: number;
  statusLine: string;
  tracking?: string;
  /** `.rr-od-entered`'s payment clause — "paid online" unless set. */
  paid?: string;
  /** OrdersEnhancer prints a real order's status `is-live` whatever `done`
   *  says; the page's own rows go `is-soon` (muted) once every post is done. */
  live?: boolean;
  items: OrderItem[];
  steps: OrderStep[];
};

const SPECIMEN: Order[] = orders as Order[];

/* ----------------------------------------------------------- lookups --- */

/**
 * portalShared.ts's `titleSlug` — bookSlug for a bare title. Ledger items
 * carry titles, not catalogue objects, so both sides must agree on the id or
 * an order cannot find its book (or its recording).
 */
export const titleSlug = (title: string): string =>
  title
    .toLowerCase()
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * The slugs with a live pressing. On the web this is catalogLite's `au`
 * (OrdersEnhancer: `LITE_BY_SLUG.get(s)?.au`); the app's listening slice
 * keys `recordings` by exactly those slugs, so it is the same set without
 * a second copy of the catalogue.
 */
const PRESSED: ReadonlySet<string> = new Set(Object.keys(shelf.recordings));

/**
 * OrdersEnhancer's clerk's-note lookup: the FIRST title in the parcel with a
 * live recording, or undefined when the note stays hidden. A real order's
 * row carries its own `book_slug`; only a specimen title is slugged back,
 * because a snapshot title ("Gāyatrī, the Highest Meditation") need not
 * slug to its catalogue id.
 */
export function pressedSlugOf(order: Order): string | undefined {
  return order.items.map((i) => i.slug ?? titleSlug(i.title)).find((s) => PRESSED.has(s));
}

/** catalogLite's ten fields, as the library slice carries them. */
type LiteBook = { slug: string; title: string; spine: string; art?: string; baked?: boolean };
const LITE_BY_SLUG = new Map<string, LiteBook>(
  (library.books as LiteBook[]).map((b) => [b.slug, b]),
);

/** OrdersEnhancer.coverHtml — catalogue art, or the cloth spine with the title on it. */
function coverFor(slug: string, title: string): OrderCover {
  const book = LITE_BY_SLUG.get(slug);
  if (!book) return { title };
  // coverHtml's `hide` (art && baked) decides whether the <b> is emitted,
  // but `.rr-od-cover.has-art b{display:none}` hides it on every has-art
  // cover anyway — so the app draws the title over the cloth only.
  return { title: book.title, spine: book.spine, art: book.art };
}

/* ------------------------------------------------------------- money --- */

// pricing.ts's CURRENCY_STYLE / formatMoney — "Rs 1,200" / "$19.99" / "£16.99".

type CurrencyCode = "PKR" | "USD" | "GBP";

const CURRENCY_STYLE: Record<CurrencyCode, { prefix: string; decimals: 0 | 2 }> = {
  PKR: { prefix: "Rs ", decimals: 0 },
  USD: { prefix: "$", decimals: 2 },
  GBP: { prefix: "£", decimals: 2 },
};

function group(whole: number): string {
  const s = String(Math.abs(whole));
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ",";
    out += s[i];
  }
  return whole < 0 ? `-${out}` : out;
}

function formatMoney(minor: number, currency: CurrencyCode): string {
  const style = CURRENCY_STYLE[currency] ?? CURRENCY_STYLE.PKR;
  const m = Math.round(minor);
  if (style.decimals === 0) return `${style.prefix}${group(Math.round(m / 100))}`;
  const whole = Math.floor(Math.abs(m) / 100);
  const cents = String(Math.abs(m) % 100).padStart(2, "0");
  return `${m < 0 ? "-" : ""}${style.prefix}${group(whole)}.${cents}`;
}

/* ----------------------------------------------------- the real ledger --- */

// A row out of the `orders` table, as the reader's own JWT is allowed to read
// it (select-own-only). Ported from app/components/ordersClient.ts and
// portalShared.ts's ledgerToPortalOrder; reads only, exactly as the site.

type LedgerStatus = "placed" | "paid" | "press" | "bindery" | "shipped" | "failed" | "refunded";

type OrderRow = {
  id: string;
  status: LedgerStatus;
  currency: CurrencyCode;
  total_minor: number | string;
  created_at: string;
  order_items: { book_slug: string; title_snapshot: string; qty: number }[] | null;
};

/** The newest 25. A reader with more than that has a paging problem worth
 *  solving properly, not a limit worth raising here. */
const QUERY =
  "select=id,status,currency,total_minor,created_at,order_items(book_slug,title_snapshot,qty)" +
  "&order=created_at.desc&limit=25";

/** How far along the bench each state is. `placed` sits at ONE post, not two:
 *  the order exists and is not paid, and saying otherwise on a ledger a reader
 *  is watching would be a lie about their money. */
const LEDGER_DONE: Record<LedgerStatus, number> = {
  placed: 1,
  paid: 2,
  press: 3,
  bindery: 4,
  shipped: 5,
  failed: 1,
  refunded: 2,
};

const LEDGER_LINE: Record<LedgerStatus, string> = {
  placed: "Waiting on payment",
  paid: "Paid, going out today",
  press: "Being packed",
  bindery: "Ready to ship",
  shipped: "Shipped",
  failed: "Payment did not go through",
  refunded: "Refunded",
};

/** portalShared.ts's PURCHASE_STEPS — the same run every bookshop order takes, verbatim. */
const PURCHASE_STEPS: OrderStep[] = [
  { label: "Order placed", note: "Your order is recorded." },
  { label: "Paid", note: "Paid online. The receipt is in your inbox." },
  { label: "Packed", note: "Taken off the shelf and wrapped in board." },
  { label: "Shipped", note: "Handed to the courier, tracked." },
  { label: "Shipped", note: "Wrapped in board, shipped tracked." },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** `toLocaleDateString("en-GB", {day:"numeric", month:"long", year:"numeric"})`
 *  — "17 July 2026" — without leaning on the phone's Intl tables. */
function placedOn(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** A real order in the SAME shape the ledger draws (ledgerToPortalOrder). */
function rowToOrder(r: OrderRow): Order {
  const done = LEDGER_DONE[r.status] ?? 1;
  return {
    // RR-3F2A9C1B — the first block of the uuid, which is what a support
    // conversation can actually be had about.
    id: `RR-${r.id.slice(0, 8).toUpperCase()}`,
    placed: placedOn(Date.parse(r.created_at) || 0),
    amount: formatMoney(Number(r.total_minor), r.currency),
    done,
    statusLine: LEDGER_LINE[r.status] ?? LEDGER_LINE.placed,
    // OrdersEnhancer.orderHtml: paid online from the second post on.
    paid: done >= 2 ? "paid online" : "not yet paid",
    live: true,
    // OrdersEnhancer.orderHtml draws ONE cover and ONE title/detail pair per
    // real order — `const item = order.items[0]` — so a two-title order is
    // the same row height on the site and here.
    items: (r.order_items ?? []).slice(0, 1).map((i) => ({
      slug: i.book_slug,
      title: i.title_snapshot,
      detail: Number(i.qty) > 1 ? `${Number(i.qty)} copies · Hardcover` : "Hardcover",
      cover: coverFor(i.book_slug, i.title_snapshot),
    })),
    steps: PURCHASE_STEPS,
  };
}

/**
 * The reader's orders, newest first. [] for every ordinary "nothing to show"
 * case — no backend configured, not signed in, tables not migrated — because
 * the ledger must still paint its standing rows in all of them. selectRows
 * already answers [] for a missing token, a 404 and a dead network.
 */
export async function fetchLedgerOrders(): Promise<Order[]> {
  if (!supabaseReady) return [];
  try {
    const rows = await selectRows<OrderRow>("orders", QUERY);
    return rows.map(rowToOrder);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------- the hook --- */

/**
 * The rows to draw, newest first: the reader's real orders on top, the three
 * specimen rows underneath — OrdersEnhancer's paint order ("a reader in
 * London must see their own pounds first, not a specimen row in rupees").
 * A guest has no token, so the Ledger paints unchanged for them; the local
 * `purchases` source the enhancer also draws is the web working model's and
 * has no counterpart in the app.
 */
export function useLedger(): Order[] {
  const { user, guest } = useSession();
  const readerId = !guest && user ? user.id : "";
  const [mine, setMine] = useState<Order[]>([]);

  useEffect(() => {
    if (!readerId) {
      setMine([]);
      return;
    }
    let alive = true;
    void fetchLedgerOrders().then((rows) => {
      if (alive && rows.length) setMine(rows);
    });
    return () => {
      alive = false;
    };
  }, [readerId]);

  return mine.length ? [...mine, ...SPECIMEN] : SPECIMEN;
}

