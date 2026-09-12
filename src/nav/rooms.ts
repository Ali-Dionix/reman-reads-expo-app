// The six rooms — PORTAL_NAV, ported verbatim from app/data/portalNav.ts.
//
// COPIED, NOT REINVENTED. If the portal gains a room it lands on the web first
// and is transcribed here; the two clients must never disagree about what the
// account contains. Labels, numerals and blurbs are the site's own, and the
// tab bar's five slots (SLOTS) and the + sheet's two foot rows (SHEET_KEYS)
// are appShell.ts's own lists — so a room added to PORTAL_NAV without a tab or
// a sheet row fails here at import, the way it fails the site's build.
//
// `route` is the expo-router path; `web` is the page it corresponds to, kept
// here so the mapping is checkable at a glance. Icons are appShell.ts's ICON
// keys, drawn by src/ui/Icon.tsx.

import type { IconName } from "../ui/icons";

export type RoomKey =
  | "overview"
  | "orders"
  | "library"
  | "listening"
  | "hermes"
  | "profile";

export type Room = {
  key: RoomKey;
  /** PORTAL_NAV.label — the tab bar, the top bar's title, the home rows. */
  label: string;
  /** PORTAL_NAV.numeral — the room's I–V mark ("" for the hub). */
  numeral: string;
  /** PORTAL_NAV.blurb — the room's one-line essence. */
  blurb: string;
  /** PORTAL_NAV.ready — a tab pointing at an unbuilt route is impossible. */
  ready: boolean;
  route: string;
  web: string;
  icon: IconName;
};

/** PORTAL_NAV, in order. */
export const ROOMS: Room[] = [
  { key: "overview", label: "Home", numeral: "", blurb: "What you are reading, and what to read next", ready: true, route: "/", web: "/account", icon: "home" },
  { key: "orders", label: "Orders", numeral: "I.", blurb: "Where your books are, and your receipts", ready: true, route: "/orders", web: "/account/orders", icon: "orders" },
  { key: "library", label: "Library", numeral: "II.", blurb: "The books you own", ready: true, route: "/library", web: "/account/library", icon: "library" },
  { key: "listening", label: "Audiobooks", numeral: "III.", blurb: "Listen, and pick up where you stopped", ready: true, route: "/listening", web: "/account/listening", icon: "listening" },
  { key: "hermes", label: "Ask AI", numeral: "IV.", blurb: "Ask about a book or an order", ready: true, route: "/hermes", web: "/account/hermes", icon: "hermes" },
  { key: "profile", label: "Profile", numeral: "V.", blurb: "Your details, settings and help", ready: true, route: "/profile", web: "/account/profile", icon: "profile" },
];

/** PORTAL_ROOMS — the five that render as rows on the home screen. */
export const PORTAL_ROOMS: Room[] = ROOMS.filter((r) => r.numeral !== "");

export const roomByKey = (key: RoomKey): Room => {
  const room = ROOMS.find((r) => r.key === key);
  if (!room) throw new Error(`rooms: no PORTAL_NAV room "${key}"`);
  return room;
};

/**
 * The tab bar — appShell.ts's SLOTS. Five, not six: Home, Library, the centre
 * disc, Audiobooks, Profile. `short` is the label the bar shows.
 */
export type Slot = { key: RoomKey; short: string } | { action: true };

export const SLOTS: Slot[] = [
  { key: "overview", short: "Home" },
  { key: "library", short: "Library" },
  { action: true },
  { key: "listening", short: "Audiobooks" },
  { key: "profile", short: "Profile" },
];

/** The rooms the tab bar carries, in tab order. */
export const TAB_KEYS: RoomKey[] = SLOTS.flatMap((s) => ("key" in s ? [s.key] : []));

/** The two rooms with no tab, at the foot of the + sheet — appShell.ts's SHEET_KEYS. */
export const SHEET_KEYS: RoomKey[] = ["orders", "hermes"];

/** Route file name inside app/(tabs) → room key. `index` is the hub. */
export const roomKeyForRoute = (routeName: string): RoomKey | null => {
  const key = routeName === "index" ? "overview" : routeName;
  return ROOMS.some((r) => r.key === key) ? (key as RoomKey) : null;
};

/* --- coverage, as the site asserts it: every ready room is a tab or a sheet
   row. The two-nav shell this replaced shipped Orders and Hermes unreachable
   on a 360px screen for months. --- */
{
  const reachable = new Set<RoomKey>([...TAB_KEYS, ...SHEET_KEYS]);
  const orphans = ROOMS.filter((r) => r.ready && !reachable.has(r.key)).map((r) => r.key);
  if (orphans.length) {
    throw new Error(`rooms: PORTAL_NAV rooms with no tab and no sheet row: ${orphans.join(", ")}`);
  }
}
