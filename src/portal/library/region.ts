// Which shop the reader is standing in — the app's half of app/data/region.ts.
//
// A region decides which currency a price is quoted in and nothing else here.
// The site resolves it server-side (the rr-region cookie, then the edge's
// country header, then ROW) and the browser asks GET /api/region once; the
// phone asks the same route once, keeps the answer in the cache store, and
// reads ROW -> USD when it cannot tell — exactly the site's own default, so
// the first paint is never a currency the site would not have shown.
//
// CURRENCY_OF is region.ts's own table, restated as plain data (four rows;
// the module it lives in is client-safe but pulls next-side types the phone
// bundle does not carry).
//
// TODO(kit): lift into src/lib once a second screen prices anything.

import { useEffect, useState } from "react";

import { apiUrl } from "../../lib/config";
import { cache } from "../../lib/storage";

export type Region = "PK" | "US" | "UK" | "ROW";
export type CurrencyCode = "PKR" | "USD" | "GBP";

/** DEFAULT_REGION — region.ts. */
export const DEFAULT_REGION: Region = "ROW";

/** CURRENCY_OF — region.ts, verbatim. */
export const CURRENCY_OF: Record<Region, CurrencyCode> = {
  PK: "PKR",
  US: "USD",
  UK: "GBP",
  ROW: "USD",
};

const REGIONS: readonly Region[] = ["PK", "US", "UK", "ROW"];
const isRegion = (v: unknown): v is Region => typeof v === "string" && (REGIONS as readonly string[]).includes(v);

/** The same key the site's cookie carries, so a reader's choice reads alike. */
const KEY = "rr-region";

let known: Region | null = null;
let pending: Promise<Region> | null = null;

/** The region, resolved once per launch: the stored answer, else the site's. */
export function resolveRegion(): Promise<Region> {
  if (known) return Promise.resolve(known);
  if (pending) return pending;
  pending = (async () => {
    const stored = await cache.get(KEY);
    if (isRegion(stored)) {
      known = stored;
      return stored;
    }
    try {
      const res = await fetch(apiUrl("/api/region"), { headers: { Accept: "application/json" } });
      const body = (await res.json()) as { region?: unknown };
      if (isRegion(body.region)) {
        known = body.region;
        void cache.set(KEY, body.region);
        return body.region;
      }
    } catch {
      /* offline, or the site is unreachable: an unknown reader is a ROW reader */
    }
    known = DEFAULT_REGION;
    return DEFAULT_REGION;
  })();
  return pending;
}

/** The currency the reader's shop quotes in — USD until the region is known. */
export function useCurrency(): CurrencyCode {
  const [region, setRegion] = useState<Region>(known ?? DEFAULT_REGION);
  useEffect(() => {
    let live = true;
    void resolveRegion().then((r) => {
      if (live) setRegion(r);
    });
    return () => {
      live = false;
    };
  }, []);
  return CURRENCY_OF[region];
}
