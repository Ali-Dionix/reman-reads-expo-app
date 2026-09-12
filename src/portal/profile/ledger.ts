// The Profile screen's statistics, computed the way ProfileEnhancer's
// paintFacts computes them (app/components/ProfileEnhancer.tsx) — from the
// reader's listening ledger, and from nothing else.
//
// WHAT IS GENUINELY KNOWN IS PER BOOK, NOT PER DAY. A ListeningSpot carries
// `listenedS` (total seconds heard), `at` (the last touch) and `marks` (the
// bookmarks), and nothing breaks any of it down by date. So the tally is one
// bar per recording opened and the supporting line counts books and
// bookmarks; a "this week" chart would have to be invented, and this page
// carries the reader's own name at the top of it.
//
// Phase 2 fills `listening` from the reader's own rows (portalClient's
// PortalState.listening). Until then the ledger is empty, which draws the
// honest empty state: "0m", "nothing heard yet", and the baseline alone.

/** portalShared.ts's ListeningSpot, the fields this screen reads. */
export type ListeningSpot = {
  listenedS?: number;
  at?: number;
  marks?: unknown[];
};

export type Ledger = Record<string, ListeningSpot>;

/** The ledger as it stands. Phase 2 replaces this with the reader's rows. */
export const EMPTY_LEDGER: Ledger = {};

/** Seconds actually heard, across every recording the reader has opened. */
export const secondsHeard = (listening: Ledger): number =>
  Object.values(listening).reduce((sum, s) => sum + (s.listenedS ?? 0), 0);

/**
 * Time heard, in the largest unit that does not round the figure away.
 * Minutes below the hour ("11m"), one decimal to ten hours, then whole hours —
 * a first session of eleven minutes must never read "0.2h".
 */
export function hoursHeard(listening: Ledger): string {
  const seconds = secondsHeard(listening);
  if (seconds < 60) return "0m";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = seconds / 3600;
  return hours < 10 ? `${hours.toFixed(1)}h` : `${Math.round(hours)}h`;
}

const slipCount = (listening: Ledger): number =>
  Object.values(listening).reduce((sum, s) => sum + (s.marks?.length ?? 0), 0);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

type Heard = { slug: string; seconds: number; at: number };

const heardBooks = (listening: Ledger): Heard[] =>
  Object.entries(listening)
    .map(([slug, spot]) => ({ slug, seconds: spot.listenedS ?? 0, at: spot.at ?? 0 }))
    .filter((b) => b.seconds > 0);

/** `[data-rr-pf-fact="heardnote"]` — "2 books, 3 bookmarks" / "nothing heard yet". */
export function heardNote(listening: Ledger): string {
  const heard = heardBooks(listening);
  const slips = slipCount(listening);
  return heard.length
    ? `${plural(heard.length, "book")}${slips ? `, ${plural(slips, "bookmark")}` : ""}`
    : "nothing heard yet";
}

/**
 * `[data-rr-pf-bars]` — the tally, oldest touch first so the row reads left
 * to right as a history and the brick bar at its end is the book the reader
 * is on now. Heights are percentages of the tallest, floored at 8.
 */
export function tallyBars(listening: Ledger): { slug: string; pct: number; minutes: number }[] {
  const recent = heardBooks(listening)
    .sort((a, b) => a.at - b.at)
    .slice(-7);
  const tallest = Math.max(...recent.map((b) => b.seconds), 1);
  return recent.map((b) => ({
    slug: b.slug,
    pct: Math.max(8, Math.round((b.seconds / tallest) * 100)),
    minutes: Math.max(1, Math.round(b.seconds / 60)),
  }));
}

/** "crime-and-punishment" -> "Crime and punishment", for a bar's label. */
export const fromSlug = (slug: string): string =>
  slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
