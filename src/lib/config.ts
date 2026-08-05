// Runtime config.
//
// The site reads NEXT_PUBLIC_* at build time; Expo's equivalent is the `extra`
// block in app.json, surfaced through expo-constants. Same discipline as the
// web: an ABSENT config is not an error, it is the documented "no backend
// configured" state, and the app stays on its local working model rather than
// crashing on a boot screen.
//
// For a real build these are filled by EAS (eas.json → `env`), not committed.
// The publishable key is safe to ship — it is the same key the website serves
// to every browser, and RLS is what actually guards the rows.

import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const read = (key: string, fallback = ""): string => (extra[key] ?? fallback).trim();

export const SUPABASE_URL = read("supabaseUrl").replace(/\/+$/, "");
export const SUPABASE_KEY = read("supabasePublishableKey");

/**
 * Where the site lives. The app calls its /api/* routes rather than
 * reimplementing them, and loads cover art from it rather than bundling ~22
 * webp files it would then have to keep in step with the catalog.
 *
 * NOTE THE `www.` — the apex 307-redirects to it. A browser pays that hop once
 * and caches it; a shelf of cover images would pay it per request, on a phone,
 * on mobile data. Point straight at the destination.
 */
export const SITE_ORIGIN = read("siteOrigin", "https://www.romanreads.com").replace(
  /\/+$/,
  "",
);

/** The R2 origin serving audio objects. Mirrors NEXT_PUBLIC_AUDIO_BASE. */
export const AUDIO_BASE = read("audioBase").replace(/\/+$/, "");

/** False when the env is absent — every server call is skipped, exactly as the
 *  web portal behaves with no Supabase vars set. */
export const supabaseReady = !!(SUPABASE_URL && SUPABASE_KEY);

/** Resolve a site API path to an absolute URL. */
export const apiUrl = (path: string): string =>
  `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
