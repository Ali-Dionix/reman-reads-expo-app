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

import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { SITE_ORIGIN } from "./config";

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
