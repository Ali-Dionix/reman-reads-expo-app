// Runtime config.
//
// The site reads NEXT_PUBLIC_* at build time; Expo's equivalent is the `extra`
// block in app.json, surfaced through expo-constants. Same discipline as the
// web: an ABSENT config is not an error, it is the documented "no backend
// configured" state, and the app stays on its local working model rather than
// crashing on a boot screen.
//
// For a real build these are filled without a commit: app.json's `extra` is
// the committed default (empty — "no backend"), and EXPO_PUBLIC_* environment
// variables fill the same slots — from a .env.local on a desk, or from EAS
// environment variables in a build. Metro inlines EXPO_PUBLIC_* at bundle
// time (babel-preset-expo), so nothing here reads process.env at runtime.
// The publishable key is safe to ship — it is the same key the website serves
// to every browser, and RLS is what actually guards the rows.

import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

/** The env's answer for each `extra` slot. Literal member expressions on
 *  purpose — babel only inlines `process.env.EXPO_PUBLIC_<NAME>` spelled out. */
const env: Record<string, string | undefined> = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  siteOrigin: process.env.EXPO_PUBLIC_SITE_ORIGIN,
  audioBase: process.env.EXPO_PUBLIC_AUDIO_BASE,
};

/** A filled `extra` wins; an empty one gives way to the env; then the fallback. */
const read = (key: string, fallback = ""): string =>
  ((extra[key] ?? "").trim() || (env[key] ?? "").trim() || fallback).trim();

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
