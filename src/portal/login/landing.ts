// Where to send a reader once they are in — LoginEnhancer.tsx's landing().
//
// THE AUDIOBOOKS ARE THE DEFAULT, not the account overview. Signing in is the
// thing that stands between a reader and hearing anything at all — a guest
// pass walks the whole listening room and cannot put a record on — so the
// overwhelmingly common reason to have just signed in is to listen. Landing on
// a summary page and making them find the shelf is a step that answers nobody.
//
// `?next=` still wins over that: somebody interrupted mid-order wants their
// order, not a shelf of audiobooks. Only a same-origin PATH is honoured (a
// value starting "//" or carrying a scheme is somebody else's site), and only
// one that names a room this app has — the site's /account/* paths are
// translated to the app's routes, and anything else falls back to the shelf.

import type { Href } from "expo-router";

/** The site's LANDING, "/account/listening", as this app spells it. */
export const LANDING = "/listening" as const;

/** The site's portal paths → the app's routes, where a room exists here. */
const ROOMS: Record<string, Href> = {
  "/account": "/",
  "/account/orders": "/orders",
  "/account/library": "/library",
  "/account/listening": "/listening",
  "/account/hermes": "/hermes",
  "/account/profile": "/profile",
  "/account/profile/settings": "/profile/settings",
};

/** The route to replace to after entering. `next` is the raw search param. */
export function landing(next?: string | string[]): Href {
  const raw = Array.isArray(next) ? next[0] : next;
  const path = (raw ?? "").trim();
  // LoginEnhancer's own test, then the app's own table.
  if (/^\/(?!\/)[\w\-./?&=%#]*$/.test(path)) {
    const bare = path.replace(/[?#].*$/, "").replace(/\/+$/, "") || "/";
    const room = ROOMS[bare];
    if (room) return room;
  }
  return LANDING;
}
