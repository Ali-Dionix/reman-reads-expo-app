// The settings ledger — the slice of portalClient.ts's PortalState that
// /account/profile/settings reads and writes, kept under the site's own key.
//
// THE KEY IS THE SITE'S. portalClient.ts keeps the reader's working model in
// localStorage under `rr-account-state`; the app's cache store is the same
// thing on a phone (src/lib/storage.ts), so the settings live under the same
// key, with the same field names and the same defaults. A reader who signs in
// on the web and then on the phone finds the same switches, and the Phase 2
// diff-push to Postgres (portalClient's writeState) has one shape to sync.
//
// ONLY THE SETTINGS FIELDS ARE TYPED HERE. The rest of the ledger (shelf,
// listening, purchases, the Ask AI log…) is passed through untouched: the
// store is src/lib/portalState.ts, whose writes are merges over what is
// there and whose reads are keyed to the reader who wrote it.
//
// The stops and the defaults are transcribed from portalShared.ts and
// portalClient.ts (defaultPortalState). Keep them in step — a value outside
// its list is snapped to the default, as toStop() does on the web.

import { readState, writeState, type Owner } from "../../lib/portalState";
import { countryName } from "./countries";

export { STATE_KEY } from "../../lib/portalState";

export type Stop<T> = { value: T; label: string; note?: string };

/** audioStore.ts's SPEEDS — the dial's stops. */
export const SPEEDS = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];

/** portalShared.ts — step back this many seconds on resume. */
export const AUDIO_REWIND: Stop<number>[] = [
  { value: 0, label: "Off", note: "pick up exactly where you stopped" },
  { value: 5, label: "5s" },
  { value: 10, label: "10s" },
  { value: 15, label: "15s" },
  { value: 30, label: "30s" },
];

/** portalShared.ts — what the ± buttons move by. */
export const AUDIO_SKIP: Stop<number>[] = [
  { value: 10, label: "10s" },
  { value: 15, label: "15s" },
  { value: 30, label: "30s" },
];

/** portalShared.ts — the lamp. 0 off, -1 end of chapter, else minutes. */
export const AUDIO_SLEEP: Stop<number>[] = [
  { value: 0, label: "Off" },
  { value: -1, label: "End of chapter" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
];

/** portalShared.ts's BINDINGS, as the settings page's chips see them. */
export const BINDINGS: Stop<string>[] = [
  { value: "hardcover", label: "Hardcover", note: "matte cloth boards, sewn spine, head and tail bands" },
  {
    value: "clothbound",
    label: "Clothbound, premium binding",
    note: "dyed cloth over board, foil-stamped spine, ribbon marker",
  },
];

export type ReaderAddress = {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  country: string;
};

export type SettingsState = {
  cardNo: string;
  address: ReaderAddress;
  binding: string;
  shipNote: string;
  giftNoPrices: boolean;
  bookplate: boolean;
  weekly: boolean;
  lettersPressed: boolean;
  lettersDigest: boolean;
  audioSpeed: number;
  audioAutoplay: boolean;
  audioRewind: number;
  audioSkip: number;
  audioSleep: number;
  readAlong: boolean;
};

export const EMPTY_ADDRESS: ReaderAddress = {
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  postcode: "",
  country: "",
};

/** portalClient.ts's defaultPortalState(), the settings slice. */
export const DEFAULTS: SettingsState = {
  cardNo: "",
  address: EMPTY_ADDRESS,
  binding: "hardcover",
  shipNote: "",
  giftNoPrices: false,
  bookplate: false,
  weekly: true,
  lettersPressed: true,
  lettersDigest: false,
  audioSpeed: 1,
  audioAutoplay: true,
  audioRewind: 10,
  audioSkip: 15,
  audioSleep: 0,
  readAlong: true,
};

/** A guest's ledger is the defaults with a stand-in card number — what
 *  portalClient.startGuestSession() writes. */
export const GUEST_CARD_NO = "000000";

/** portalShared.ts's toStop: a stored value snapped to its own list. */
export const toStop = <T,>(stops: Stop<T>[], value: unknown, fallback: T): T =>
  stops.some((s) => s.value === value) ? (value as T) : fallback;

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);
const str = (v: unknown, fallback: string): string => (typeof v === "string" ? v : fallback);

function normalise(raw: Record<string, unknown> | null, guest: boolean): SettingsState {
  const base = guest ? { ...DEFAULTS, cardNo: GUEST_CARD_NO } : DEFAULTS;
  if (!raw) return base;
  const a = (raw.address ?? {}) as Partial<ReaderAddress>;
  return {
    cardNo: str(raw.cardNo, base.cardNo),
    address: {
      name: str(a.name, ""),
      phone: str(a.phone, ""),
      line1: str(a.line1, ""),
      line2: str(a.line2, ""),
      city: str(a.city, ""),
      postcode: str(a.postcode, ""),
      country: str(a.country, ""),
    },
    binding: toStop(BINDINGS, raw.binding, base.binding),
    shipNote: str(raw.shipNote, base.shipNote),
    giftNoPrices: bool(raw.giftNoPrices, base.giftNoPrices),
    bookplate: bool(raw.bookplate, base.bookplate),
    weekly: bool(raw.weekly, base.weekly),
    lettersPressed: bool(raw.lettersPressed, base.lettersPressed),
    lettersDigest: bool(raw.lettersDigest, base.lettersDigest),
    audioSpeed: SPEEDS.includes(raw.audioSpeed as number) ? (raw.audioSpeed as number) : base.audioSpeed,
    audioAutoplay: bool(raw.audioAutoplay, base.audioAutoplay),
    audioRewind: toStop(AUDIO_REWIND, raw.audioRewind, base.audioRewind),
    audioSkip: toStop(AUDIO_SKIP, raw.audioSkip, base.audioSkip),
    audioSleep: toStop(AUDIO_SLEEP, raw.audioSleep, base.audioSleep),
    readAlong: bool(raw.readAlong, base.readAlong),
  };
}

/** The whole stored ledger, untyped — the dossier (dossier.ts) reads the
 *  slices this file does not type. Null when nothing is stored. */
export async function readLedger(): Promise<Record<string, unknown> | null> {
  const s = await readState();
  return Object.keys(s).length ? s : null;
}

/** The ledger's settings slice for this reader, defaults filled in. */
export async function readSettings(owner: Owner, guest: boolean): Promise<SettingsState> {
  return normalise(await readState(owner), guest);
}

/** Write a patch over the reader's stored ledger and return the new slice. */
export async function writeSettings(owner: Owner, patch: Partial<SettingsState>, guest: boolean): Promise<SettingsState> {
  return normalise(await writeState(owner, patch), guest);
}

/* --- the ink hooks: what a row says it is set to (ProfileEnhancer.inkCard) --- */

/** `[data-rr-pf-ink="deck"]` — "1× · back 10s · rolls on". */
export function deckLine(s: SettingsState): string {
  const sleep = AUDIO_SLEEP.find((x) => x.value === s.audioSleep);
  return [
    `${s.audioSpeed}×`,
    s.audioRewind ? `back ${s.audioRewind}s` : "no rewind",
    s.audioAutoplay ? "rolls on" : "stops each chapter",
    sleep && sleep.value !== 0 ? `lamp ${sleep.label.toLowerCase()}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** `[data-rr-pf-ink="letters"]` — "weekly · audiobooks", or null for the
 *  dimmed "orders only". Order mail is not listed: it is not a standing order
 *  the reader placed. */
export function lettersLine(s: SettingsState): string | null {
  const letters = [
    s.weekly ? "weekly" : "",
    s.lettersPressed ? "audiobooks" : "",
    s.lettersDigest ? "digest" : "",
  ].filter(Boolean);
  return letters.length ? letters.join(" · ") : null;
}

/**
 * ProfileEnhancer's addressLines, as the settings row's note shows it: the
 * `<br>`s become ", " there (`.rr-ap-row-l em[data-rr-pf-ink] br::after`).
 * Null for the baked "no address on file". The country prints by name
 * (countries.ts's countryName), as the site's does.
 */
export function addressLine(a: ReaderAddress): string | null {
  const parts = [
    a.name,
    a.line1,
    a.line2,
    [a.city, a.postcode].filter(Boolean).join(" "),
    a.country ? countryName(a.country) : "",
  ].filter((p) => p && p.trim());
  return parts.length ? parts.join(", ") : null;
}

/** portalShared.ts's hasPostableAddress. */
export const hasPostableAddress = (a: ReaderAddress): boolean =>
  a.name.trim().length >= 2 &&
  a.phone.trim().length >= 6 &&
  a.line1.trim().length >= 4 &&
  a.city.trim().length >= 2 &&
  /^[A-Z]{2}$/.test(a.country);
