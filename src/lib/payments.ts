// Paying inside the app — Stripe's Payment Sheet, for a book and for the plan.
//
// Since 14 Sep 2026 (owner: "integrate Stripe directly in the app") a book
// order and the subscription are paid HERE, in Stripe's own sheet presented
// by the app, and not on the website. web.ts's rule that money changes hands
// on the site is therefore over for the two things this file handles; the
// site is still where the subscription is MANAGED (Stripe's billing portal),
// because cancelling and card changes are a page the site already has.
//
// THE SITE STILL PRICES AND STILL SETTLES. Nothing here decides an amount:
// the app posts the same body the website's checkout posts — the titles, the
// method, the delivery address — with `pay: "sheet"`, and the site's
// /api/checkout writes the priced order, opens the PaymentIntent and hands
// back the sheet's ticket (the client secret, the reader's Stripe customer
// and an ephemeral key for it, and the publishable key). The sheet takes the
// card, Stripe tells the site's webhook, and the order is marked paid by the
// same settlePayment the website's orders go through. /api/subscription does
// the same for the plan with an incomplete subscription. The card goes from
// the phone to Stripe and never through the site or this app's own code.
//
// THE PUBLISHABLE KEY IS SERVED, NOT BAKED — /api/payments/config — so a key
// rotation is an env change on the site and not a store release. Until the
// site has one to serve (`ready: false`) there is no sheet, and every press
// that would have opened one opens the website instead, exactly as the app
// did before there was a sheet at all.
//
// NATIVE ONLY. @stripe/stripe-react-native has no web build, so it is
// reached through ./stripeSdk — resolved by platform, null on web — and the
// web rig (localhost:8082) gets `sheetAvailable() === false` and the
// website door.

import { apiUrl } from "./config";
import { stripeSdk, type StripeSdk } from "./stripeSdk";
import { readerBearerToken } from "./supabase";

/** What the sheet is handed — SheetTicket in app/server/payments/stripe.ts. */
type Ticket = {
  clientSecret: string;
  customerId: string;
  ephemeralKey: string;
  publishableKey: string;
};

/** The answer to a press: paid, the reader backed out, or the desk's refusal. */
export type PayResult =
  | { kind: "paid" }
  | { kind: "cancelled" }
  | { kind: "refused"; why: string; code?: string }
  /** No sheet on this build or this deployment — open the website instead. */
  | { kind: "unavailable" };

const sdk = (): StripeSdk | null => stripeSdk;

/** The scheme the sheet returns to after a bank's own page (3-D Secure). */
const RETURN_URL = "romanreads://stripe-redirect";
const MERCHANT = "Roman Reads";

let configured: { publishableKey: string } | null = null;
let configuring: Promise<boolean> | null = null;

/**
 * Is there a sheet to open? The SDK on this platform, and a publishable key
 * from the site. Asked once per launch and remembered; a site that answers
 * `ready: false` is asked again next time, since the key may have landed.
 */
export async function sheetAvailable(): Promise<boolean> {
  if (!sdk()) return false;
  if (configured) return true;
  if (configuring) return configuring;
  configuring = (async () => {
    try {
      const res = await fetch(apiUrl("/api/payments/config"), { headers: { Accept: "application/json" } });
      const body = (await res.json()) as { ready?: boolean; publishableKey?: string };
      if (!res.ok || !body.ready || !body.publishableKey) return false;
      await sdk()!.initStripe({ publishableKey: body.publishableKey, urlScheme: "romanreads" });
      configured = { publishableKey: body.publishableKey };
      return true;
    } catch {
      return false;
    } finally {
      configuring = null;
    }
  })();
  return configuring;
}

/**
 * Open the sheet on a ticket and wait for the reader. `title` is what the
 * sheet's own header calls the thing being paid for.
 */
async function present(ticket: Ticket, o: { title: string; email?: string | null; name?: string | null }): Promise<PayResult> {
  const s = sdk();
  if (!s) return { kind: "unavailable" };
  // the ticket's key wins over the config's: it is the one the secret was
  // minted under
  if (ticket.publishableKey && ticket.publishableKey !== configured?.publishableKey) {
    await s.initStripe({ publishableKey: ticket.publishableKey, urlScheme: "romanreads" });
    configured = { publishableKey: ticket.publishableKey };
  }
  const init = await s.initPaymentSheet({
    merchantDisplayName: MERCHANT,
    paymentIntentClientSecret: ticket.clientSecret,
    customerId: ticket.customerId,
    customerEphemeralKeySecret: ticket.ephemeralKey,
    returnURL: RETURN_URL,
    allowsDelayedPaymentMethods: false,
    defaultBillingDetails: {
      ...(o.name ? { name: o.name } : {}),
      ...(o.email ? { email: o.email } : {}),
    },
    // the sheet's primary press names the thing, as the site's does
    primaryButtonLabel: o.title,
  });
  if (init.error) return { kind: "refused", why: init.error.message, code: init.error.code };
  const shown = await s.presentPaymentSheet();
  if (shown.error) {
    if (shown.error.code === "Canceled") return { kind: "cancelled" };
    return { kind: "refused", why: shown.error.message, code: shown.error.code };
  }
  return { kind: "paid" };
}

/* ---------------------------------------------------------- a book --- */

export type DeliveryAddress = {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  postcode?: string;
  /** ISO 3166-1 alpha-2, upper case. */
  country: string;
};

/** The site's checkout refusals, in its own words — /api/checkout's contract. */
const CHECKOUT_SAY: Record<string, string> = {
  "invalid-address": "Something in the address did not read. Check it and try again.",
  "quote-required": "We post there, but the delivery is quoted first. Write to us and we will price it.",
  "cod-unavailable": "Cash on delivery is not open for this order. Pay by card instead.",
  "order-closed": "That order already finished. Start again from the book.",
  "too many attempts": "Too many attempts for now. Try again in a few minutes.",
};

export type OrderOutcome =
  | { kind: "paid"; orderId: string }
  | { kind: "placed"; orderId: string }
  | { kind: "cancelled"; orderId: string | null }
  | { kind: "refused"; why: string }
  | { kind: "unavailable" };

/**
 * Order a book: the site writes and prices the order, and the sheet takes
 * the card — or, for cash on delivery, the order is placed and nothing is
 * taken. `idempotencyKey` is minted by the caller per attempt, as the site's
 * ShopDock mints one, so buying the same book twice is two orders.
 */
export async function orderBook(o: {
  items: { slug: string; qty: number }[];
  method: "card" | "cod";
  address: DeliveryAddress;
  idempotencyKey: string;
  title: string;
  email?: string | null;
}): Promise<OrderOutcome> {
  const token = await readerBearerToken();
  if (!token) return { kind: "refused", why: "Sign in to place an order." };
  if (o.method === "card" && !(await sheetAvailable())) return { kind: "unavailable" };

  let res: Response;
  try {
    res = await fetch(apiUrl("/api/checkout"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: o.items,
        method: o.method,
        address: o.address,
        idempotencyKey: o.idempotencyKey,
        ...(o.method === "card" ? { pay: "sheet" } : {}),
      }),
    });
  } catch {
    return { kind: "refused", why: "We couldn’t reach our server. Check your connection and try again." };
  }
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    fallback?: boolean;
    cod?: boolean;
    orderId?: string;
    sheet?: Ticket;
  };
  if (!res.ok) {
    if (res.status === 503 && body.fallback) return { kind: "unavailable" };
    const why = body.error ?? "";
    return { kind: "refused", why: CHECKOUT_SAY[why] ?? (why || "The order could not be placed. Try again.") };
  }
  if (body.cod && body.orderId) return { kind: "placed", orderId: body.orderId };
  if (!body.sheet || !body.orderId) return { kind: "unavailable" };

  const paid = await present(body.sheet, { title: o.title, email: o.email, name: o.address.name });
  if (paid.kind === "paid") return { kind: "paid", orderId: body.orderId };
  if (paid.kind === "cancelled") return { kind: "cancelled", orderId: body.orderId };
  if (paid.kind === "unavailable") return { kind: "unavailable" };
  return { kind: "refused", why: paid.why };
}

/* ------------------------------------------------------- the plan --- */

export type SubscribeOutcome =
  | { kind: "paid" }
  | { kind: "already" }
  | { kind: "cancelled" }
  | { kind: "refused"; why: string }
  | { kind: "unavailable" };

/**
 * Subscribe: the site starts the plan incomplete on the reader's customer,
 * the sheet confirms its first invoice, and Stripe's webhook turns the row
 * active a moment later — the caller refreshes the entitlement until it
 * sees that (subscription.tsx), since the sheet closing is not the row
 * changing.
 */
export async function subscribeInApp(o: { email?: string | null; name?: string | null } = {}): Promise<SubscribeOutcome> {
  const token = await readerBearerToken();
  if (!token) return { kind: "refused", why: "Sign in first." };
  if (!(await sheetAvailable())) return { kind: "unavailable" };

  let res: Response;
  try {
    res = await fetch(apiUrl("/api/subscription"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ pay: "sheet" }),
    });
  } catch {
    return { kind: "refused", why: "We couldn’t reach our server. Check your connection and try again." };
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string; sheet?: Ticket; retryAfter?: number };
  if (res.status === 409) return { kind: "already" };
  if (!res.ok) {
    if (res.status === 503) return { kind: "unavailable" };
    if (res.status === 429) return { kind: "refused", why: "Too many attempts for now. Try again in a few minutes." };
    return { kind: "refused", why: body.error || "Could not start the subscription. Try again." };
  }
  if (!body.sheet) return { kind: "unavailable" };

  const paid = await present(body.sheet, { title: "Subscribe", email: o.email, name: o.name });
  if (paid.kind === "paid") return { kind: "paid" };
  if (paid.kind === "cancelled") return { kind: "cancelled" };
  if (paid.kind === "unavailable") return { kind: "unavailable" };
  return { kind: "refused", why: paid.why };
}

/**
 * After a paid sheet: ask the desk again until the row says active, or give
 * up after a while. Stripe's webhook is usually a second behind the sheet
 * and occasionally a few; the padlocks should not wait for a foreground.
 */
export async function waitForSubscription(
  refresh: () => Promise<{ active: boolean } | null>,
  o: { tries?: number; everyMs?: number } = {},
): Promise<boolean> {
  const tries = o.tries ?? 10;
  const every = o.everyMs ?? 1500;
  for (let i = 0; i < tries; i++) {
    const s = await refresh();
    if (s?.active) return true;
    await new Promise((r) => setTimeout(r, every));
  }
  return false;
}
