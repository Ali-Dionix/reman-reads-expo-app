// The subscription, from the phone's point of view.
//
// Ported from app/components/subscriptionClient.ts on the website, and it
// keeps that file's one rule: WHAT THE UI IS ALLOWED TO BELIEVE, and no more.
// Nothing here decides anything that matters. Every gate that serves bytes
// is enforced on the site's server (app/server/subscriptions.ts — 402 on
// /api/voice/read and the six import routes); what this module does is tell
// the app whether to draw a padlock, so a subscriber is not shown a paywall
// and a non-subscriber is not shown a control that will refuse them.
//
// THE SUBSCRIPTION IS BOUGHT IN THE APP since 14 Sep 2026 — Stripe's
// Payment Sheet, presented by the app (src/lib/payments.ts; useSubscribe()
// at the foot of this file) — and MANAGED on the website, in Stripe's billing
// portal. A build with no sheet (the web rig, or a deployment with no
// publishable key yet) still opens the site in the reader's real browser,
// signed in through the handoff, and the reader comes back afterwards. That
// "comes back" is why this is a provider and not a memoised promise: the
// site asks once per page life because a page is short; an app is open for
// weeks. So the answer is asked
//
//   once per signed-in reader   — the padlocks are drawn from it
//   again on every foreground   — the reader returning from the Stripe page
//                                 in their browser must not have to restart
//                                 the app to see the voices open (the brief's
//                                 item 6)
//   again on demand             — refresh(), after a 402 said no when the
//                                 app thought yes, or the other way round
//
// IT FAILS CLOSED. `state` is null until the desk has answered for THIS
// reader, and null means locked: a subscriber sees a padlock for the moment
// the answer takes, which is better than everybody else seeing the feature
// open for one paint before it is snatched away (the site's argument, and
// it holds on a phone). A network failure keeps the last answer rather than
// forgetting it — a subscriber on a train keeps their padlocks off, and the
// server is what actually refuses.
//
// NOT CACHED ON THE DEVICE, on purpose, for the site's reason: a
// subscription can end while somebody is reading, and a stale "yes" in the
// keychain would be a padlock that never comes back.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

import { apiUrl } from "./config";
import { subscribeInApp, sheetAvailable, waitForSubscription } from "./payments";
import { useSession } from "./session";
import { readerBearerToken, supabaseReady } from "./supabase";
import { openSignedIn } from "./web";

/** app/data/subscription.ts — quoted here as the site's surfaces quote it. */
export const PRICE_LABEL = "$14.99";
export const PRICE_PER_MONTH = "$14.99 a month";
/** app/data/subscription.ts COVERS — what the plan opens, in the order the
 *  site sells it. */
export const COVERS = [
  "Every audiobook, read in whichever narrator's voice you pick.",
  "Any book you bring in yourself — a PDF, a paper, a manuscript — read aloud the same way.",
  "The read-along, lighting each line as it is spoken.",
  "Your place kept across every device you sign in on.",
] as const;

/** Where the subscription is bought, managed and cancelled on the site: the
 *  Subscription group of Settings (accountSettingsPage.ts), the one page
 *  with the Subscribe press and the billing-portal press. */
export const SUBSCRIPTION_PATH = "/account/profile/settings";

/** The desk's own sentence for a signed-in reader without the plan — the
 *  402 body of app/server/subscriptions.ts refuseWithoutSubscription. Said
 *  by the app without a round trip when it already knows the answer. */
export const SUBSCRIPTION_SAY = "This needs the subscription.";

/** subscriptionClient.ts SubscriptionState, field for field. */
export type SubscriptionState = {
  /** The only field most callers want. */
  active: boolean;
  /** Stripe's own word. "none" when there has never been a subscription. */
  status: string;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** Whether the SITE can sell one at all — no provider, no offer. */
  ready: boolean;
  /** No account behind the token. The app has no guest, so this is a lapsed
   *  token or the dev seam (session.tsx's rr-test-user, which holds none). */
  guest: boolean;
  plan: { priceMinor: number; currency: string; interval: string; label: string } | null;
};

const SHUT: SubscriptionState = {
  active: false,
  status: "none",
  periodEnd: null,
  cancelAtPeriodEnd: false,
  ready: false,
  guest: true,
  plan: null,
};

/**
 * Ask the desk. The site's subscription(), minus the memo — the provider
 * owns when to ask. Null on a network failure, so the caller can keep what
 * it had; a 401 is an ANSWER (guest), and the route puts `ready` in that
 * body deliberately so a reader with no row can still be told the plan is
 * on sale.
 */
export async function fetchSubscription(): Promise<SubscriptionState | null> {
  if (!supabaseReady) return SHUT;
  try {
    const token = await readerBearerToken();
    const res = await fetch(apiUrl("/api/subscription"), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const body = (await res.json().catch(() => ({}))) as {
      subscription?: Omit<SubscriptionState, "ready" | "guest" | "plan">;
      plan?: SubscriptionState["plan"];
      ready?: boolean;
    };
    if (!res.ok && res.status !== 401) return null;
    return {
      active: !!body.subscription?.active,
      status: body.subscription?.status ?? "none",
      periodEnd: body.subscription?.periodEnd ?? null,
      cancelAtPeriodEnd: !!body.subscription?.cancelAtPeriodEnd,
      ready: !!body.ready,
      guest: res.status === 401,
      plan: body.plan ?? null,
    };
  } catch {
    return null;
  }
}

type SubscriptionValue = {
  /** Null until the desk has answered for this reader — and null is LOCKED. */
  state: SubscriptionState | null;
  /** The padlock: true only on a known, open subscription. */
  active: boolean;
  /** Ask again. Resolves to the new answer, or the kept one on a failure. */
  refresh: () => Promise<SubscriptionState | null>;
};

const SubscriptionContext = createContext<SubscriptionValue | null>(null);

/** Two foregrounds inside this are one: Android fires the change twice on
 *  some returns from the browser. */
const FOREGROUND_DEBOUNCE_MS = 1500;

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, booting } = useSession();
  const uid = booting ? "" : (user?.id ?? "");
  const [state, setState] = useState<SubscriptionState | null>(null);
  // Whose answer `state` is: a different reader's is dropped before the ask,
  // never shown for the moment the ask takes.
  const owner = useRef("");
  const inflight = useRef<Promise<SubscriptionState | null> | null>(null);

  const ask = useCallback(
    (who: string): Promise<SubscriptionState | null> => {
      if (!who) {
        owner.current = "";
        setState(null);
        return Promise.resolve(null);
      }
      if (inflight.current) return inflight.current;
      const job = (async () => {
        const answer = await fetchSubscription();
        // the reader changed while the desk was answering: not theirs
        if (owner.current !== who) return null;
        if (answer) setState(answer);
        return answer;
      })();
      inflight.current = job;
      void job.finally(() => {
        inflight.current = null;
      });
      return job;
    },
    [],
  );

  // once per signed-in reader; a sign-out forgets the answer at once
  useEffect(() => {
    if (owner.current !== uid) {
      owner.current = uid;
      setState(null);
    }
    void ask(uid);
  }, [uid, ask]);

  // and again on every return to the foreground — the reader is back from
  // the website, where the answer may just have changed
  const lastForeground = useRef(0);
  useEffect(() => {
    if (!uid) return;
    const onChange = (next: AppStateStatus) => {
      if (next !== "active") return;
      const t = Date.now();
      if (t - lastForeground.current < FOREGROUND_DEBOUNCE_MS) return;
      lastForeground.current = t;
      void ask(uid);
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [uid, ask]);

  const refresh = useCallback(() => ask(owner.current), [ask]);

  const value = useMemo<SubscriptionValue>(
    () => ({ state, active: !!state?.active, refresh }),
    [state, refresh],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used inside <SubscriptionProvider>");
  return ctx;
}

/**
 * ProfileEnhancer's paintSubscription, as words: the state cell and the
 * note under the title, for the Settings group and anywhere else the plan
 * is described. `state` null is the baked "checking…" the site ships in.
 */
export function describeSubscription(s: SubscriptionState | null): {
  state: string;
  note: string;
  /** The press to offer: subscribe, manage, or neither. */
  press: "subscribe" | "manage" | null;
  /** Whether the billing portal is worth offering beside a Subscribe press —
   *  a reader who once subscribed still has invoices and a card on file. */
  portal: boolean;
} {
  if (!s) return { state: "", note: "checking…", press: null, portal: false };
  if (!s.ready) return { state: "", note: "Not available on this site.", press: null, portal: false };
  if (s.guest) return { state: "", note: "Sign in to subscribe.", press: null, portal: false };
  if (s.active) {
    const ends = onDay(s.periodEnd);
    return {
      state: s.cancelAtPeriodEnd ? "Ending" : "Active",
      note: s.cancelAtPeriodEnd
        ? ends
          ? `Cancelled. It runs until ${ends}.`
          : "Cancelled. It runs to the end of the period."
        : s.status === "past_due"
          ? "Your last payment did not go through. Stripe will try again; update your card to be safe."
          : ends
            ? `Renews ${ends}.`
            : "Active.",
      press: "manage",
      portal: true,
    };
  }
  return {
    state: "None",
    note: s.status === "canceled" ? "Your subscription has ended." : "You are not subscribed.",
    press: "subscribe",
    portal: s.status !== "none",
  };
}

/** ProfileEnhancer's onDay — "12 October 2026", in the device's locale. */
function onDay(iso: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  try {
    return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return new Date(t).toDateString();
  }
}

/* ---------------------------------------------------- the Subscribe press --- */

/** What a Subscribe press came to, phrased for the reader. */
export type SubscribeSaid = {
  kind: "paid" | "pending" | "already" | "cancelled" | "website" | "refused";
  text: string;
};

/**
 * One press for every Subscribe in the app — the gate panel, Settings, the
 * voice sheet's and the console's doors. The sheet when there is one; the
 * website when there is not (`websitePath`, the site's Settings by default,
 * or the site's own gate panel for a source the reader reached for).
 *
 * AFTER A PAID SHEET THE ROW IS STILL A MOMENT BEHIND: the sheet closing is
 * the card being taken, and the entitlement is written by Stripe's webhook a
 * second or so later. So the desk is asked again until it says active, and
 * only then is "You are subscribed" said — the padlocks come off on the
 * provider's state, never on the sheet's word alone. If the webhook is slow
 * the press says so and the provider's foreground refresh finishes the job.
 *
 * `inApp` says which door the press will take, so a label can read
 * "Subscribe" or "Subscribe on the website" honestly before the tap.
 */
export function useSubscribe(): {
  subscribe: (o?: { websitePath?: string }) => Promise<SubscribeSaid>;
  busy: boolean;
  /** Null until known; false on the web rig and on a site with no key yet. */
  inApp: boolean | null;
} {
  const { user } = useSession();
  const { refresh } = useSubscription();
  const [busy, setBusy] = useState(false);
  const [inApp, setInApp] = useState<boolean | null>(null);

  useEffect(() => {
    let live = true;
    void sheetAvailable().then((ok) => {
      if (live) setInApp(ok);
    });
    return () => {
      live = false;
    };
  }, []);

  const subscribe = useCallback(
    async (o: { websitePath?: string } = {}): Promise<SubscribeSaid> => {
      if (busy) return { kind: "pending", text: "" };
      setBusy(true);
      try {
        const out = await subscribeInApp({ email: user?.email ?? null, name: user?.name ?? null });
        if (out.kind === "paid") {
          const active = await waitForSubscription(refresh);
          return active
            ? { kind: "paid", text: "You are subscribed. Every reader and every way to bring a book in is open." }
            : { kind: "pending", text: "Paid. The subscription is being confirmed and opens in a moment." };
        }
        if (out.kind === "already") {
          void refresh();
          return { kind: "already", text: "You are already subscribed." };
        }
        if (out.kind === "cancelled") return { kind: "cancelled", text: "Nothing was charged." };
        if (out.kind === "unavailable") {
          // the website, signed in — and asked again once the reader is back
          void openSignedIn(o.websitePath ?? SUBSCRIPTION_PATH);
          setTimeout(() => void refresh(), 1500);
          return { kind: "website", text: "opening the website…" };
        }
        return { kind: "refused", text: out.why };
      } finally {
        setBusy(false);
      }
    },
    [busy, user?.email, user?.name, refresh],
  );

  return { subscribe, busy, inApp };
}
