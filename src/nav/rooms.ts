// The six rooms — PORTAL_NAV, ported verbatim from app/data/portalShared.ts.
//
// COPIED, NOT REINVENTED. If the portal gains a room it lands on the web first
// and is transcribed here; the two clients must never disagree about what the
// account contains. Labels, numerals, blurbs and the line icons are all the
// site's own — the icons below are the exact `d` attributes from ROOM_ICON, so
// the bottom bar draws the same glyphs the web bottom bar does.
//
// `route` is the expo-router path; `web` is the page it corresponds to, kept
// here so the mapping is checkable at a glance.

export type RoomKey =
  | "overview"
  | "orders"
  | "library"
  | "listening"
  | "hermes"
  | "profile";

export type IconPart =
  | { kind: "path"; d: string; width?: number }
  | { kind: "circle"; cx: number; cy: number; r: number; width?: number }
  | { kind: "rect"; x: number; y: number; w: number; h: number; rx: number; width?: number };

export type Room = {
  key: RoomKey;
  /** Full label — sidebar, headers, the Issue Desk. */
  label: string;
  /** The bottom bar's short form. A tab label has ~64px to live in. */
  short: string;
  numeral: string;
  blurb: string;
  route: string;
  web: string;
  icon: IconPart[];
};

/** All icons are drawn on a 24×24 grid, stroked in currentColor, never filled. */
export const ICON_VIEWBOX = 24;

export const ROOMS: Room[] = [
  {
    key: "overview",
    label: "Reading Room",
    short: "Room",
    numeral: "§",
    blurb: "everything the card opens, in one place",
    route: "/",
    web: "/account",
    icon: [{ kind: "path", d: "M4 11.5 12 5l8 6.5M6 10.2V19h12v-8.8" }],
  },
  {
    key: "orders",
    label: "Orders",
    short: "Orders",
    numeral: "I",
    blurb: "the bench, day by day — tracked honestly",
    route: "/orders",
    web: "/account/orders",
    icon: [
      { kind: "path", d: "M6 3.5h8l4 4V20.5H6zM14 3.5v4h4M9 12h6M9 15.5h6" },
    ],
  },
  {
    key: "library",
    label: "Your Library",
    short: "Library",
    numeral: "II",
    blurb: "every copy you own, and the whole catalogue behind it",
    route: "/library",
    web: "/account/library",
    icon: [
      {
        kind: "path",
        d: "M5 4.8h3.1v14.4H5zM10 4.8h3.1v14.4H10zM15.4 5.4l3 .5-2.4 13.6-3-.5z",
        width: 1.5,
      },
    ],
  },
  {
    key: "listening",
    label: "The Listening Room",
    short: "Listen",
    numeral: "III",
    blurb: "whole books read aloud by the house — the needle holds your place",
    route: "/listening",
    web: "/account/listening",
    icon: [
      { kind: "circle", cx: 12, cy: 12, r: 8 },
      { kind: "circle", cx: 12, cy: 12, r: 1.7 },
    ],
  },
  {
    key: "hermes",
    label: "Hermes Desk",
    short: "Hermes",
    numeral: "IV",
    blurb: "any page, explained in your language",
    route: "/hermes",
    web: "/account/hermes",
    icon: [
      { kind: "rect", x: 3.5, y: 5.5, w: 17, h: 13, rx: 1.5 },
      { kind: "path", d: "m4.6 7 7.4 5.4L19.4 7" },
    ],
  },
  {
    key: "profile",
    label: "Profile",
    short: "Profile",
    numeral: "V",
    blurb: "name, parcels, letters — the dull drawer, kept tidy",
    route: "/profile",
    web: "/account/profile",
    icon: [
      { kind: "circle", cx: 12, cy: 8, r: 3.4 },
      { kind: "path", d: "M5.5 19.6c.4-3.7 3.1-5.7 6.5-5.7s6.1 2 6.5 5.7" },
    ],
  },
];

export const roomByKey = (key: RoomKey): Room =>
  ROOMS.find((r) => r.key === key) ?? ROOMS[0];
