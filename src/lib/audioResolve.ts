// Where a pressing's files actually live — the ONE seam between the player
// and the shelf of bytes. Ported from app/data/audioResolve.ts.
//
// Two forms arrive from the generated manifest, exactly as they do on the web:
//
//   "audio/<slug>/en/<voice>/v1/ch-01.mp3"   bucket-relative — a pressed
//                                            edition, served from R2
//   "/audio/…-v1.mp3"                        site-absolute — a specimen
//                                            recording, served from /public
//
// Clients never hardcode either: they ask audioUrl() and play whatever comes
// back. When the entitlement flip lands (bucket private, /api/audio/sign
// returning presigned URLs) THIS module becomes an async resolver and nothing
// else changes — one route, one resolver, one bucket toggle. Presigned URLs
// still honour Range, so seeking survives.

import { AUDIO_BASE, SITE_ORIGIN } from "./config";

/** Resolve a manifest audio path to a playable URL. */
export function audioUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;

  // Site-absolute: a specimen recording out of the site's own /public.
  if (path.startsWith("/")) return `${SITE_ORIGIN}${path}`;

  // Bucket-relative: a pressed edition on R2. With no base configured this
  // would resolve against the site and 404 honestly, which is the same failure
  // the web takes — better than silently playing the wrong thing.
  const base = AUDIO_BASE || SITE_ORIGIN;

  // The voice segment carries a colon ("en-GB-Ollie:DragonHDLatestNeural").
  // R2 stores it literally, and a bare colon inside a path segment is legal in
  // a URL — but some HTTP stacks normalise it, so encode just that character
  // and leave the separators alone.
  return `${base}/${path.replace(/:/g, "%3A")}`;
}
