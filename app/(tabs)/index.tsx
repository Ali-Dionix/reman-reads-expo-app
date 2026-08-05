// /account — the Reading Room.
//
// A transcription of app/data/accountPage.ts, in the order that file's mobile
// media queries put things on a phone:
//
//   header            .rr-pt-head
//   the reader slab   .rr-ov-slab — `order:-1` at ≤920px, so it comes FIRST
//   the room index    .rr-ov-index
//   side table        shelfRowHtml({fill:true}) — absent until it has content
//   the slip          .rr-ov-slipwrap
//   the marginalia    .rr-ov-marg
//
// Everything the web fills client-side (name, card no., the pulled shelf, the
// marginalia lines) arrives here as data. Nothing is invented: where the web
// shows an empty state, so does this.

import { router } from "expo-router";
import { Text, View } from "react-native";

import { useSession } from "../../src/lib/session";
import { Doors } from "../../src/portal/Doors";
import { LibrarianSlip, type Rec } from "../../src/portal/LibrarianSlip";
import { Marginalia } from "../../src/portal/Marginalia";
import { PortalPage } from "../../src/portal/PortalPage";
import { ReaderSlab } from "../../src/portal/ReaderSlab";
import { useTheme } from "../../src/theme/ThemeProvider";
import { FONTS } from "../../src/theme/type";

export default function ReadingRoom() {
  const { user } = useSession();
  const { colors } = useTheme();

  // Phase 2 fills these from the reader's own rows. Until then they are empty,
  // which renders the same empty states the web portal renders.
  const recs: Rec[] = [];

  return (
    <PortalPage
      kicker="Roman Reads · Your Account"
      title="The Reading Room."
      sub={
        <>
          Welcome back,{" "}
          <Text style={{ fontFamily: FONTS.sansBold, color: colors.ink }}>
            {user?.name || "reader"}
          </Text>
          . Five rooms, one record — everything your card opens, kept close.
        </>
      }
    >
      {/* .rr-ov-stage — one column on a phone, slab first */}
      <View style={{ paddingBottom: 20, gap: 22 }}>
        <ReaderSlab
          name={user?.name || ""}
          cardNo="000127"
          onEditParticulars={() => router.push("/profile")}
        />
        <Doors />
      </View>

      <LibrarianSlip
        recs={recs}
        onOpenShop={() => router.push("/library")}
      />

      <Marginalia
        lines={[
          {
            key: "listening",
            text: "the gramophone has not turned — three specimen recordings wait.",
          },
          { key: "shelf", text: "1 book on the shelf, 4 on the waitlist." },
          { key: "orders", text: "a quote awaits your word — RR-0003." },
          { key: "langs", text: "reading in English & Roman Urdu." },
        ]}
      />
    </PortalPage>
  );
}
