// /account/listening — Audiobooks.
//
// A transcription of the `shelfHtml` half of app/data/accountListeningPage.ts,
// in that file's own order, at the phone branch:
//
//   .rr-pt-head          "Your audiobooks." and its one sentence
//   .rr-lr-zone          padding 6px 0 34px
//     .rr-bill           "Featured today" — the first AUDIO_BOOK, never rotated
//     continue / again / shelved   enhancer-owned fill rows: baked hidden on the
//                        web, stood up by real state — absent, never empty.
//                        They stay absent here for the same reason, until the
//                        needle's history lives on the phone (Phase 3).
//     .rr-lr-fin         the mark-it-finished scrawl — same: absent until then
//     .rr-lr-all         "All audiobooks." — pills, the grid, the genre rails
//   .rr-lr-note          "Which books are fully recorded." — full bleed
//
// NOT transcribed here: the OPENED VOLUME (`readerHtml`) — the codex reader is
// a modal over this floor and is not in this room's golden. It is the existing
// src/portal/reader/Reader, opened from every play seal exactly as before.
//
// The catalogue is baked from the site's own modules by
// src/portal/listening/gen-catalogue.mjs; rerun it after a pressing lands.

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import catalogue from "../../src/portal/listening/catalogue.json";
import { recordingFor, useDeck } from "../../src/lib/audioStore";
import { Billboard } from "../../src/portal/listening/Billboard";
import { Catalogue, type AudioEntry, type AudioFilter } from "../../src/portal/listening/Catalogue";
import { Head as RoomHead, PortalPage, Wrap } from "../../src/portal/PortalPage";
import { Reader } from "../../src/portal/reader/Reader";
import { useInk } from "../../src/theme/ink";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Txt } from "../../src/ui/Type";

/**
 * PLAYABLE MEANS A RECORDING IS BEHIND IT. catalogue.json (the site's AUDIO_BOOKS)
 * and listeningShelf.json (what this build can actually play) are baked by two
 * generators; gen-catalogue.mjs refuses to bake them apart, and this settles
 * it again at load so a cover can never look pressable and answer a tap with
 * nothing. A drifted title is shown as still in production — and SAID SO,
 * loudly: the pill counts under it are the site's own copy ("3 you can play
 * today"), so a demotion is a copy drift the generator must be rerun to mend,
 * not something to paper over by recounting. The numbers stay the site's.
 */
const DEMOTED = (catalogue.entries as AudioEntry[]).filter((e) => e.state === "now" && !recordingFor(e.slug));
if (DEMOTED.length) {
  console.warn(
    `[listening] catalogue.json says these play now but listeningShelf.json has no recording for them — ` +
      `shown as "In production"; the pill counts are now one pressing stale. Rerun gen-catalogue.mjs: ` +
      DEMOTED.map((e) => e.slug).join(", "),
  );
}
const ENTRIES = (catalogue.entries as AudioEntry[]).map((e) =>
  DEMOTED.includes(e) ? { ...e, state: "soon" as const, meta: "In production" } : e,
);
const FILTERS = catalogue.filters as AudioFilter[];
const CATEGORIES = catalogue.categories as string[];

export default function Listening() {
  const { ink, vw } = useInk();
  const { bg } = useTheme();
  const { begin } = useDeck();
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  // `/account/listening?book=<slug>` — the site's deep link (the orders
  // ledger's clerk's note): the volume opens to browse, the needle stays
  // where it is. Spent on arrival, so the next visit is the floor.
  const router = useRouter();
  const { book } = useLocalSearchParams<{ book?: string }>();
  useEffect(() => {
    if (!book) return;
    if (recordingFor(book)) setOpenSlug(book);
    router.setParams({ book: undefined });
  }, [book, router]);

  /**
   * ONE TAP INTO THE ROOM, NEEDLE DOWN. The billboard's seal and a grid cell
   * both open the volume AND start it, as the site's `openAndBegin` does —
   * and `begin` is the site's `beginBook`: where this book was left, or the
   * top if it was played through. The audio then continues room-wide through
   * the deck singleton. A title this build cannot play (no recording pressed)
   * declines the tap rather than swallowing it.
   */
  const play = (slug: string) => {
    if (!begin(slug)) return;
    setOpenSlug(slug);
  };

  /**
   * A LINK IS NOT A PLAY. The billboard's title is [data-rr-lr-open] on the
   * site: it opens the volume to browse, and the needle stays where it is.
   * Only the seal [data-rr-bill-play] drops it.
   */
  const open = (slug: string) => {
    if (!recordingFor(slug)) return;
    setOpenSlug(slug);
  };

  const opened = openSlug ? recordingFor(openSlug) : null;
  const billboard = catalogue.billboard;

  return (
    // lcd={false}: the site's own type on this page is greyscale (PortalPage's header)
    <PortalPage title="Audiobooks" lcd={false}>
      <Wrap>
        <RoomHead
          title="Your audiobooks."
          sub="Every audiobook we have, in one place. Open one and it reads out loud while the words light up on screen, in the voice you pick. It remembers where you stopped."
        />
        {/* .rr-lr-zone{padding:6px 0 34px} */}
        <View style={{ paddingTop: 6, paddingBottom: 34 }}>
          {billboard ? (
            <Billboard
              book={billboard}
              onOpen={() => open(billboard.slug)}
              onPlay={() => play(billboard.slug)}
            />
          ) : null}
          <Catalogue entries={ENTRIES} filters={FILTERS} categories={CATEGORIES} onPlay={play} />
        </View>
      </Wrap>

      {/* .rr-lr-note — outside .rr-pt-wrap: full bleed, 1px solid ink .12 on
          top, `white`, padding 44px 5vw 60px, centred. */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: ink(0.12, "border"),
          backgroundColor: bg("white"),
          paddingTop: 44,
          paddingBottom: 60,
          paddingHorizontal: vw(5),
          alignItems: "center",
        }}
      >
        {/* h2 — Cormorant 500 clamp(22px,2.6vw,30px): 22 on a phone */}
        <Txt family="Cormorant Garamond" weight={500} size={22} style={{ textAlign: "center" }}>
          Which books are fully recorded.
        </Txt>
        <Txt size={14} line={1.7} tone={0.65} style={{ marginTop: 10, maxWidth: 470, textAlign: "center" }}>
          If a book has been recorded all the way through, that is what you hear. The rest play a
          sample until the full recording is done. Same book, same chapters, and it still remembers
          where you stopped. The subscription that opens all of them is $14.99 a month.
        </Txt>
      </View>

      {/* The opened volume sits OVER the floor, as the web's dialog does —
          the shelf stays behind it and the needle never lifts. */}
      {opened ? <Reader recording={opened} onClose={() => setOpenSlug(null)} /> : null}
    </PortalPage>
  );
}
