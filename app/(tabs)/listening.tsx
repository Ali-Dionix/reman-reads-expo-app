// /account/listening — the Listening Room floor.
//
// A transcription of the `shelfHtml` half of app/data/accountListeningPage.ts,
// in that file's own order:
//
//   header                  .rr-pt-head
//   the billboard           .rr-bill — "On the platter tonight"
//   where the needle rests  fill row — absent until a needle is down
//   played to the end       fill row — absent until something is finished
//   begin listening         baked from AUDIO_BOOKS
//   because you shelved …   fill row
//   short bands             baked, and only while every band runs under 12 min
//   in the recording room   baked from AUDIO_SOON
//   nothing here is final   .rr-lr-note
//
// The rows marked "fill" are enhancer-owned on the web: baked hidden, stood up
// by real state. They stay absent here for the same reason — absent, never
// empty — and fill in Phase 3, when audio state exists on the phone.
//
// The OPENED VOLUME (`readerHtml`) is transcribed — see reader/Reader.tsx: the
// cased codex, the groove transport, the turntable, the read-along. The SLIPS
// are deliberately not: the house dropped them, so the drawer carries the bands
// alone and the rail's right-hand button is gone with them.

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import shelf from "../../src/data/listeningShelf.json";
import { recordingFor, useDeck } from "../../src/lib/audioStore";
import { Reader } from "../../src/portal/reader/Reader";
import { Billboard } from "../../src/portal/Billboard";
import { PortalPage } from "../../src/portal/PortalPage";
import { ShelfRow, type ShelfCard } from "../../src/portal/ShelfRow";
import { Transport } from "../../src/portal/Transport";
import { useInk } from "../../src/theme/ink";
import { useTheme } from "../../src/theme/ThemeProvider";
import { FONTS } from "../../src/theme/type";

export default function Listening() {
  const { ink, vw, mode } = useInk();
  const { colors } = useTheme();
  const { playBand, now } = useDeck();
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  /**
   * `openAndBegin` — every play seal opens the room. A shelf card or the
   * billboard's seal opens the volume AND drops the needle, exactly as the
   * site does; the audio then continues room-wide through the deck singleton.
   */
  const open = (slug: string) => {
    if (!recordingFor(slug)) return;
    setOpenSlug(slug);
    playBand(slug, 0);
  };

  const opened = openSlug ? recordingFor(openSlug) : null;

  return (
    <PortalPage
      kicker="Roman Reads · Your Account"
      title="The Listening Room."
      sub="Every recording the subscription opens, shelved sleeve by sleeve — one already on the platter. Take a title down and it opens as a book; the needle holds your place across every visit."
    >
      {/* .rr-lr-zone{padding:6px 0 34px} */}
      <View style={styles.zone}>
        {shelf.billboard ? (
          <Billboard
            book={shelf.billboard}
            onOpen={() => open(shelf.billboard.slug)}
            onPlay={() => open(shelf.billboard.slug)}
          />
        ) : null}

        {/* The transport — the console for whatever is on the platter. It
            appears only once a needle is down, exactly as the web's rail does. */}
        {now ? <Transport /> : null}

        <ShelfRow
          title="Begin listening."
          sub="every recording the subscription opens."
          cards={shelf.pressings as ShelfCard[]}
          onOpen={(c) => open(c.slug)}
        />

        <ShelfRow
          title="Short bands for the commute."
          sub="nothing over twelve minutes — stop at any band's end."
          cards={shelf.short as ShelfCard[]}
          onOpen={(c) => open(c.slug)}
        />

        <ShelfRow
          title="In the recording room."
          sub={`${shelf.soon.length} titles being pressed — the subscription is the whole gate.`}
          cards={shelf.soon as ShelfCard[]}
        />
      </View>

      {/* .rr-lr-note — the foot band, honest about the specimen. Full-bleed:
          it breaks the 5vw gutter on the web, so it does here too. */}
      <View
        style={[
          styles.note,
          {
            marginHorizontal: -vw(5),
            paddingHorizontal: vw(5),
            borderTopColor: ink(0.12),
            // theme.ts maps x-f6f1e6 → #1C253B at night: the band sits a step
            // LIGHTER than the page, same as the billboard's surface
            backgroundColor: mode === "dark" ? "#1C253B" : "#F6F1E6",
          },
        ]}
      >
        <Text style={[styles.noteH, { color: colors.ink }]}>Nothing here is final.</Text>
        <Text style={[styles.noteP, { color: ink(0.65) }]}>
          The recordings on this floor are specimen pressings so the room works today.
          When the read narrations land they drop onto the same platter — same books,
          same bands, your place kept.
        </Text>
      </View>

      {/* The opened volume sits OVER the floor, as the web's dialog does —
          the shelf stays behind it and the needle never lifts. */}
      {opened ? <Reader recording={opened} onClose={() => setOpenSlug(null)} /> : null}
    </PortalPage>
  );
}

const styles = StyleSheet.create({
  zone: { paddingTop: 6, paddingBottom: 34 },
  note: {
    borderTopWidth: 1,
    paddingTop: 44,
    paddingBottom: 60,
    alignItems: "center",
  },
  // clamp(22px,2.6vw,30px) — a phone sits on the 22px floor
  noteH: { fontFamily: FONTS.serifRegular, fontSize: 22, lineHeight: 26, textAlign: "center" },
  noteP: {
    fontFamily: FONTS.sans,
    fontSize: 13.5,
    lineHeight: 22.95,
    marginTop: 10,
    maxWidth: 470,
    textAlign: "center",
  },
});
