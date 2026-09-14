// The way out to the website. ONE seam, for every link that leaves the app.
//
// docs/APP-FULL-PARITY.md §2 decided this: browsing moves into the app, buying
// does not. Anything that would take a reader's money — a book, the
// subscription — opens the WEBSITE, and the website calls its own checkout.
// The app never calls POST /api/checkout; that would make the binary the thing
// initiating the sale, which is the whole of what the rule is about.
//
// TWO DOORS, AND THE DIFFERENCE IS LOAD-BEARING.
//
//   openOnSite   the in-app browser tab (SFSafariViewController on iOS, Chrome
//                Custom Tabs on Android) via WebBrowser.openBrowserAsync. It
//                keeps the app's colours, returns with one tap, and still runs
//                in the OS's own browser with the reader's cookies. Right for
//                READING — terms, privacy, an author's page.
//
//   openToBuy    Linking.openURL, which hands the URL to Chrome or Safari
//                proper: a different app, the reader's real browser.
//
// There is no `openExternalBrowserAsync` in expo-web-browser — openBrowserAsync
// and openAuthSessionAsync are the only ways it opens anything, and both are
// the in-app tab. Leaving the app for real is Linking's job. That is why the
// two functions below use two different modules rather than one with a flag.
//
// Why buying must not use the in-app tab, even though it is nicer:
//
//   * A purchase completed inside a tab the app presents reads to App Review
//     as an in-app purchase flow. The reader-app position under guideline
//     3.1.3(a) rests on the sale happening somewhere the binary is not.
//   * The in-app tab does not carry the reader's saved cards, addresses and
//     passwords the way their real browser does. Asking someone to re-type a
//     card they already have stored is how a checkout gets abandoned.
//
// Do not collapse these into one function. Nothing here throws: a phone that
// will not open a URL is broken, but a legal link is not worth a red screen.
//
// A THIRD DOOR, openSignedIn, is openToBuy with the reader carried across:
// the site's /api/account/handoff mints the real browser a session of its
// own, so the subscription page (Settings on the site) opens signed in
// rather than on a second sign-in. Same real browser, same rules.

import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { SITE_ORIGIN, apiUrl } from "./config";
import { readerBearerToken } from "./supabase";

/** Absolute URL for a site path. `/terms` → https://www.romanreads.com/terms */
export const siteUrl = (path: string): string =>
  /^https?:\/\//.test(path) ? path : `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Open a site page for READING — terms, privacy, an author's page.
 * The in-app browser tab: one tap back, and the reader never loses the app.
 */
export async function openOnSite(path: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(siteUrl(path), {
      // a sheet, so the app is visibly still there behind it
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      enableBarCollapsing: true,
    });
  } catch {
    // nothing willing to open a URL — say nothing, do nothing
  }
}

/**
 * Open a site page where MONEY may change hands — a book, the cart, the
 * subscription. The reader's REAL browser, every time, for the two reasons in
 * this file's header.
 */
export async function openToBuy(path: string): Promise<void> {
  try {
    await Linking.openURL(siteUrl(path));
  } catch {
    /* see above */
  }
}

/**
 * The site's own sign-in with the page as `next` — where a reader lands
 * when the handoff below cannot be had. LoginEnhancer's landing() honours a
 * same-origin path and nothing else.
 */
export const loginHref = (next: string): string => `/login?next=${encodeURIComponent(next)}`;

/** Is this absolute URL on the site — its host, with or without the www? */
function onSite(url: string): boolean {
  try {
    const u = new URL(url);
    const site = new URL(SITE_ORIGIN);
    const bare = (h: string) => h.toLowerCase().replace(/^www\./, "");
    return u.protocol === site.protocol && bare(u.hostname) === bare(site.hostname);
  } catch {
    return false;
  }
}

/**
 * Open a site page where MONEY may change hands, ALREADY SIGNED IN.
 *
 * The subscription is bought and managed on the website, in the reader's
 * real browser — where no session lives. Sent to /login they would sign in
 * a second time, on a phone, mid-purchase, which is where readers abandon
 * (docs/APP-FULL-PARITY.md §2, item 5). So the app asks the site for a door:
 * POST /api/account/handoff with its bearer answers a short-lived signed
 * URL; opened in the browser, the site mints that browser a session of its
 * own and lands the reader on `path`, signed in. The app's own tokens never
 * leave the phone — two clients sharing one refresh token would sign each
 * other out.
 *
 * Every failure falls back to the plain sign-in door with `path` as `next`:
 * a reader is never left with nothing to tap.
 */
export async function openSignedIn(path: string): Promise<void> {
  const fallback = siteUrl(loginHref(path));
  let target = fallback;
  try {
    const token = await readerBearerToken();
    if (token) {
      const res = await fetch(apiUrl("/api/account/handoff"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ next: path }),
      });
      const body = (await res.json().catch(() => ({}))) as { url?: unknown };
      // only a door on the site itself is walked through — the apex and the
      // www are the same house (the apex 307s to www)
      if (res.ok && typeof body.url === "string" && onSite(body.url)) target = body.url;
    }
  } catch {
    /* the door could not be had — the sign-in page is still there */
  }
  try {
    await Linking.openURL(target);
  } catch {
    /* see openOnSite */
  }
}
