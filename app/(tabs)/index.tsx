// /account — Home. A transcription of app/data/accountPage.ts at its phone
// branch, in the builder's own order:
//
//   .rr-ov-hello                 the greeting, and the member number
//   .rr-ov-promo                 the slab — the subscription, closable
//   [data-rr-shf="side-table"]   Continue listening.
//   .rr-ov-add                   Add your own book. — the five-cell grid
//   .rr-ov-files                 Your files. — HIDDEN for a reader with nothing,
//                                and the app has no imports yet, so absent
//   importSheetHtml()            the import dialog — its LOCKED panel is built
//                                (GateSheet); the sources themselves are not
//
// FOUR BANDS, IN THE ORDER A READER USES THEM: what the library is, what you
// are part-way through, how to put something into it, and what you brought
// in. Nothing above the first band except one line of greeting.
//
// What the web fills client-side (AccountEnhancer, ImportsEnhancer) arrives
// here as data or state: the name from the session, the number from the
// readers row, the shelf from the needle positions the reader has left behind
// (persisted, as the web's state.listening is) and the recordings that play
// today, the slab's shut state from storage under the site's own key. Nothing
// is invented: where the web shows an empty state, so does this.

import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import shelf from "../../src/data/listeningShelf.json";
import { heardSeconds, recordingFor, resumable, useDeck, type Spots } from "../../src/lib/audioStore";
import { useCardNo, useSession } from "../../src/lib/session";
import { cache } from "../../src/lib/storage";
import { useSubscription } from "../../src/lib/subscription";
import { openSignedIn } from "../../src/lib/web";
import { AddBand, type AddKey } from "../../src/portal/home/AddBand";
import { ContinueShelf, type ShelfCard } from "../../src/portal/home/ContinueShelf";
import { fmtDur } from "../../src/portal/home/fmt";
import { GateSheet, gateNext } from "../../src/portal/GateSheet";
import { Hello } from "../../src/portal/home/Hello";
import { Promo } from "../../src/portal/home/Promo";
import { PortalPage, Wrap } from "../../src/portal/PortalPage";
import { useTheme } from "../../src/theme/ThemeProvider";

/** AccountEnhancer's DISMISS_KEY — the cards the reader has shut, as a list. */
const DISMISS_KEY = "rr-ov-hidden";

async function readDismissed(): Promise<string[]> {
  try {
    const raw = await cache.get(DISMISS_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

/** ImportsEnhancer's SOURCES — the keys a ?add= may name; anything else is
 *  somebody typing in the address bar and opens the default. */
const ADD_KEYS: AddKey[] = ["files", "scan", "text", "link", "voice"];
const asAddKey = (k: string): AddKey => (ADD_KEYS as string[]).includes(k) ? (k as AddKey) : "files";

/**
 * The shelf when nothing is resting: the recordings that play today, at their
 * full runtime, in the order the site's AUDIO_BOOKS keeps them
 * (AccountEnhancer's `startable`).
 */
const startable: ShelfCard[] = shelf.pressings.map((p) => ({
  slug: p.slug,
  title: p.title,
  art: p.art,
  spine: p.spine,
  meta: fmtDur(recordingFor(p.slug)?.seconds ?? 0),
}));

export default function Home() {
  const { user } = useSession();
  const router = useRouter();
  const { now, position, begin, spots } = useDeck();
  const { add } = useLocalSearchParams<{ add?: string }>();
  const { colors } = useTheme();

  // The slab is BAKED VISIBLE, as the web bakes it: the common reader (who
  // has not shut it) sees a stable screen from the first frame, and the one
  // who did shut it sees the same one-frame pull-away the web gives them
  // when AccountEnhancer reads DISMISS_KEY on hydrate.
  const [hidden, setHidden] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    readDismissed().then((list) => {
      if (alive && list.length) setHidden(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  const shut = (key: string) => {
    const next = [...hidden, key];
    setHidden(next);
    void cache.set(DISMISS_KEY, JSON.stringify(next));
  };

  /**
   * THE GATE. Every cell is behind the subscription — the site's answer
   * (src/lib/subscription.tsx), null-is-locked until it has answered — so a
   * tap without one opens the locked panel IN PLACE, importUpgradeHtml as
   * the web does, rather than leaving the app. The panel's Continue is the
   * one thing that goes out: to the site, signed in through the handoff,
   * with the intent kept (`/account?add=<key>` is what the site's own gate
   * carries as `next`). A SUBSCRIBER's tap goes straight there — the import
   * sheet itself is the site's (importSheet.ts) and is TODO(imports) here,
   * so the source opens on the website, signed in, rather than a padlock
   * being drawn over something the reader has paid for.
   */
  const { active: subscribed } = useSubscription();
  const [gate, setGate] = useState<AddKey | null>(null);
  const openImport = useCallback(
    (key: AddKey | string) => {
      const k = asAddKey(String(key));
      if (subscribed) void openSignedIn(`/account?add=${k}`);
      else setGate(k);
    },
    [subscribed],
  );

  // A row on the + sheet routes here carrying ?add=<key>, as every other
  // room's link does on the web; the enhancer opens the panel on arrival.
  // Clearing the param is the only re-entry guard: the effect is keyed on
  // `add`, so a spent param cannot re-fire it, and the next tap on the sheet
  // (which sets it again) is answered like the first.
  useEffect(() => {
    if (!add) return;
    openImport(add);
    router.setParams({ add: undefined });
  }, [add, router, openImport]);

  /** A card's tap is audioStore.beginBook — the deck's `begin`: playback
   *  starts IN PLACE (the reader stays here and the dock rises from the tab
   *  bar), a recording already on the platter resumes where it rests, one
   *  that is not is re-cued at its saved band and second. */
  const open = (slug: string) => {
    begin(slug);
  };

  const name = (user?.name ?? "").trim() || "Reader";
  const cardNo = useCardNo();

  // AccountEnhancer's `resumable` over the persisted spots, with the one on
  // the platter overlaid by the live needle (the recorder writes it every
  // few seconds, but the card should not wait for the tick). A recording
  // counts as resting only once something has actually been heard — whole
  // bands before the needle plus the seconds into this one — never a cover
  // tapped and left at 0/0.
  const live: Spots = { ...spots };
  if (now && recordingFor(now.slug)) {
    const prev = live[now.slug];
    live[now.slug] = {
      chapter: now.band,
      seconds: Math.max(0, position),
      speed: prev?.speed ?? 1,
      at: Date.now(),
      ...(prev?.listenedS != null ? { listenedS: prev.listenedS } : {}),
    };
  }
  const sideTable: ShelfCard[] = resumable(live)
    .slice(0, 6)
    .map(({ slug, spot, book }) => {
      const total = book.seconds;
      const heard = Math.min(heardSeconds(book, spot), total);
      const p = shelf.pressings.find((x) => x.slug === slug);
      return {
        slug,
        title: p?.title ?? book.title,
        art: p?.art ?? "",
        spine: p?.spine ?? colors.desk,
        meta: `${fmtDur(Math.max(0, total - heard))} left`,
        progress: total > 0 ? heard / total : 0,
      };
    });
  const resuming = sideTable.length > 0;
  const cards = resuming ? sideTable : startable;
  const sub = resuming
    ? "each one resumes where you stopped."
    : `${startable.length} recording${startable.length === 1 ? "" : "s"}, free to play.`;

  return (
    <PortalPage title="Home">
      <Wrap>
        <Hello name={name} cardNo={cardNo} />
        {!hidden.includes("promo") ? (
          <Promo onTry={() => router.navigate("/listening")} onShut={() => shut("promo")} />
        ) : null}
        <ContinueShelf cards={cards} sub={sub} onOpen={open} />
        <AddBand onOpen={openImport} locked={!subscribed} />
        {/* .rr-ov-files — the reader's own uploads; ships hidden and stays
            hidden for a reader with nothing. Nothing has been brought in on
            this side yet (TODO(imports): GET /api/imports with the reader's
            token, then appBandHeadHtml's copy and the .rr-ov-fl-sheet cards),
            so the band is not drawn — correct for guests and new readers. */}
      </Wrap>

      {/* importSheetHtml()'s locked panel — .rr-im.is-upgrade */}
      <GateSheet
        open={gate !== null}
        onClose={() => setGate(null)}
        onContinue={() => {
          const key = gate ?? "files";
          setGate(null);
          // Money may change hands on the far side: the reader's REAL
          // browser, never the in-app tab (src/lib/web.ts's header) — and
          // signed in, so the site's gate opens on its Stripe press rather
          // than on a second sign-in
          void openSignedIn(gateNext(key));
        }}
      />
    </PortalPage>
  );
}
