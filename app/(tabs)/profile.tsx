// /account/profile — the particulars.
//
// A transcription of app/data/accountProfilePage.ts at its ≤900px / ≤560px
// branches: `.rr-pf-stage` collapses to one column and `.rr-pf-keep` takes
// `order:-1`, so the card comes FIRST and the file follows under it.
//
// The page's own rule is kept: NOTHING HERE HAS A SAVE BUTTON. Every control
// writes the moment it changes. The stops on every dial come from
// src/data/profileStops.json, generated from portalShared.ts — the source file
// is explicit that a stop must never be restated at the page, and that holds
// across the wire too.
//
// Phase 2 wires these through portalClient; today they hold local state and
// ink the card, which is exactly what the reader sees happen either way.

import { useState } from "react";
import { View } from "react-native";

import stops from "../../src/data/profileStops.json";
import { useSession } from "../../src/lib/session";
import { PortalPage } from "../../src/portal/PortalPage";
import {
  Act,
  ChipRow,
  Danger,
  Field,
  Hint,
  Leaf,
  LeafLabel,
  Mini,
  SwitchRow,
} from "../../src/portal/ProfileParts";
import { ReaderCard } from "../../src/portal/ReaderCard";

export default function Profile() {
  const { user, signOut } = useSession();

  const [back, setBack] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [addr, setAddr] = useState({
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    postcode: "",
  });
  const [shipNote, setShipNote] = useState("");
  const [binding, setBinding] = useState<string | number>(stops.bindings[0]?.value ?? "");
  const [speed, setSpeed] = useState<string | number>(1);
  const [rewind, setRewind] = useState<string | number>(10);
  const [skip, setSkip] = useState<string | number>(15);
  const [sleep, setSleep] = useState<string | number>(0);
  const [hermesLang, setHermesLang] = useState<string | number>("english");
  const [langs, setLangs] = useState<string[]>(["english"]);
  const [flags, setFlags] = useState<Record<string, boolean>>({
    bookplate: false,
    giftNoPrices: false,
    weekly: true,
    lettersPressed: true,
    lettersDigest: false,
    audioAutoplay: true,
    readAlong: true,
    spoilerGuard: false,
  });

  const toggle = (k: string) => setFlags((f) => ({ ...f, [k]: !f[k] }));
  const turnTo = (fn: () => void) => {
    // "touching anything on the reverse turns the card over so you watch it
    // happen" — the reverse's fields do the same here.
    fn();
    if (!back) setBack(true);
  };

  const lettersLine =
    [
      flags.weekly && "weekly",
      flags.lettersPressed && "pressings",
      flags.lettersDigest && "digest",
    ]
      .filter(Boolean)
      .join(", ") || "orders only";

  const addressLine =
    [addr.line1, addr.line2, addr.city, addr.postcode].filter(Boolean).join(", ") || "";

  const langLabels = stops.hermesLangs
    .filter((l) => langs.includes(String(l.value)))
    .map((l) => l.label);

  return (
    <PortalPage
      kicker="Roman Reads · Your Account"
      title="The particulars."
      sub="Everything on your card, and everything the shop acts on. Change a field and watch it ink onto the card — there is nothing to submit."
    >
      {/* .rr-pf-stage — one column here; .rr-pf-keep takes order:-1 */}
      <View style={{ paddingTop: 6, paddingBottom: 20, gap: 22 }}>
        <ReaderCard
          name={name}
          cardNo="—"
          issued="MMXXVI"
          address={addressLine}
          langs={langLabels}
          letters={lettersLine}
          deck={`${speed}× · ${rewind}s back`}
          facts={{ shelf: "0", waitlist: "0", heard: "0h", slips: "0" }}
          back={back}
          onTurn={() => setBack((v) => !v)}
        />

        <View style={{ paddingBottom: 72 }}>
          {/* I. The card */}
          <Leaf
            numeral="I."
            title="The card"
            hint="the name here is the name on the parcel, on the bookplate, and on every letter the shop sends."
          >
            <Field
              label="Name on the card"
              value={name}
              onChangeText={setName}
              placeholder="as it should appear"
              autoComplete="name"
              maxLength={120}
            />
            <Field
              label="Email"
              value={user?.email ?? ""}
              readOnly
            />
            <Act>
              <Mini>Change the address</Mini>
              <Mini>Set a new password</Mini>
            </Act>
          </Leaf>

          {/* II. Where parcels land */}
          <Leaf
            numeral="II."
            title="Where parcels land"
            hint="the Counter opens on this address, so you type your street once. Changing it here never changes where a parcel already sent was sent — each order keeps its own copy."
          >
            <Field
              label="Name for the parcel"
              value={addr.name}
              onChangeText={(v) => turnTo(() => setAddr((a) => ({ ...a, name: v })))}
              placeholder="as it should read on the label"
              autoComplete="name"
              maxLength={120}
            />
            <Field
              label="Phone"
              value={addr.phone}
              onChangeText={(v) => turnTo(() => setAddr((a) => ({ ...a, phone: v })))}
              placeholder="0300 1234567"
              keyboardType="phone-pad"
              autoComplete="tel"
              maxLength={32}
            />
            <Field
              label="Address"
              value={addr.line1}
              onChangeText={(v) => turnTo(() => setAddr((a) => ({ ...a, line1: v })))}
              placeholder="house, street"
              maxLength={200}
            />
            <Field
              label="Address, line two"
              value={addr.line2}
              onChangeText={(v) => turnTo(() => setAddr((a) => ({ ...a, line2: v })))}
              placeholder="area, landmark — optional"
              maxLength={200}
            />
            <Field
              label="City"
              value={addr.city}
              onChangeText={(v) => turnTo(() => setAddr((a) => ({ ...a, city: v })))}
              placeholder="city"
              maxLength={100}
            />
            <Field
              label="Postal code"
              value={addr.postcode}
              onChangeText={(v) => turnTo(() => setAddr((a) => ({ ...a, postcode: v })))}
              placeholder="optional"
              maxLength={20}
            />
            <Field
              label="A line for the courier"
              value={shipNote}
              onChangeText={setShipNote}
              placeholder="leave it with the guard — optional"
              maxLength={200}
            />

            <LeafLabel style={{ marginTop: 22 }}>How it should be built</LeafLabel>
            <ChipRow
              stops={stops.bindings}
              value={binding}
              onPick={setBinding}
              label="Default binding"
            />
            <Hint style={{ marginTop: 10 }}>
              what the Counter starts on. the heirloom still costs what it costs — this
              only decides which one is already chosen.
            </Hint>

            <View style={{ marginTop: 14 }}>
              <SwitchRow
                first
                on={flags.bookplate}
                onToggle={() => toggle("bookplate")}
                title="An ex-libris plate"
                note="pasted inside the front board and inked with the name on your card. Physical books only — there is no board in a digital edition."
              />
              <SwitchRow
                on={flags.giftNoPrices}
                onToggle={() => toggle("giftNoPrices")}
                title="No prices on the packing slip"
                note="the slip lists the books and not a single figure. For parcels going somewhere other than your own shelf."
              />
            </View>
          </Leaf>

          {/* III. Letters */}
          <Leaf
            numeral="III."
            title="Letters"
            hint="three you can switch off, one you cannot. Nothing is sold, forwarded or handed to anyone."
          >
            <View style={{ marginTop: 14 }}>
              <SwitchRow
                first
                on={flags.weekly}
                onToggle={() => turnTo(() => toggle("weekly"))}
                title="New books, weekly"
                note="one letter when the shelf grows. No noise, no “we miss you.”"
              />
              <SwitchRow
                on={flags.lettersPressed}
                onToggle={() => turnTo(() => toggle("lettersPressed"))}
                title="A waitlisted book has been pressed"
                note="you followed it before it existed as a recording. This is the letter that says it does now."
              />
              <SwitchRow
                on={flags.lettersDigest}
                onToggle={() => turnTo(() => toggle("lettersDigest"))}
                title="The monthly listening digest"
                note="what you heard, what you marked, where the needle is sitting. Sent on the first of the month, or not at all if you heard nothing."
              />
              <SwitchRow
                locked="Always on"
                title="Anything about an order"
                note="receipts, unlocks, and the parcel’s progress. They are your orders and your money; there is no version of this you should have to opt into."
              />
            </View>
            <Act>
              <Mini>Send me a test letter</Mini>
            </Act>
            <Hint style={{ marginTop: 12 }}>
              it goes to the address on your card and proves the whole path works —
              useful before you trust it with a receipt.
            </Hint>
          </Leaf>

          {/* IV. The deck */}
          <Leaf
            numeral="IV."
            title="The deck"
            hint="what a recording STARTS at. The dial on the deck still turns per book, and turning it there never changes anything here."
          >
            <LeafLabel style={{ marginTop: 18 }}>Speed</LeafLabel>
            <ChipRow
              stops={stops.speeds}
              value={speed}
              onPick={(v) => turnTo(() => setSpeed(v))}
              label="Default playback speed"
            />

            <LeafLabel style={{ marginTop: 20 }}>Step back on resume</LeafLabel>
            <ChipRow
              stops={stops.audioRewind}
              value={rewind}
              onPick={(v) => turnTo(() => setRewind(v))}
              label="Rewind on resume"
            />
            <Hint style={{ marginTop: 10 }}>
              picking a book up again, the needle drops this far before where you left
              it — long enough to find the sentence again.
            </Hint>

            <LeafLabel style={{ marginTop: 20 }}>The ± buttons move by</LeafLabel>
            <ChipRow
              stops={stops.audioSkip}
              value={skip}
              onPick={setSkip}
              label="Skip interval"
            />

            <LeafLabel style={{ marginTop: 20 }}>The lamp goes out after</LeafLabel>
            <ChipRow
              stops={stops.audioSleep}
              value={sleep}
              onPick={setSleep}
              label="Default sleep timer"
            />

            <View style={{ marginTop: 18 }}>
              <SwitchRow
                first
                on={flags.audioAutoplay}
                onToggle={() => toggle("audioAutoplay")}
                title="Roll into the next chapter"
                note="off, and the recording stops at the end of the one that is playing."
              />
              <SwitchRow
                on={flags.readAlong}
                onToggle={() => toggle("readAlong")}
                title="Light the words as they are read"
                note="the read-along galley follows the narrator. Only where a book has been set for it."
              />
              <SwitchRow
                locked="House narrator"
                title="Read by the house"
                note="one voice for now. Others are being auditioned, and a book already started will keep its own when they land."
              />
            </View>
          </Leaf>

          {/* V. Reading */}
          <Leaf
            numeral="V."
            title="Reading"
            hint="margins, letters and the desk’s answers arrive in these. Pick as many as you read in."
          >
            <ChipRow
              stops={stops.hermesLangs}
              value={null}
              onPick={(v) =>
                turnTo(() =>
                  setLangs((ls) =>
                    ls.includes(String(v))
                      ? ls.filter((l) => l !== String(v))
                      : [...ls, String(v)],
                  ),
                )
              }
              label="Reading languages"
            />

            <LeafLabel style={{ marginTop: 22 }}>The desk explains in</LeafLabel>
            <ChipRow
              stops={stops.hermesLangs}
              value={hermesLang}
              onPick={setHermesLang}
              label="Hermes Desk default language"
            />
            <Hint style={{ marginTop: 10 }}>
              its first answer comes in this. You can still ask it for any of the others,
              word by word.
            </Hint>

            <View style={{ marginTop: 18 }}>
              <SwitchRow
                first
                on={flags.spoilerGuard}
                onToggle={() => toggle("spoilerGuard")}
                title="Keep ahead of me to yourself"
                note="chapter lists, blurbs and the desk stop at the chapter you are on. It is a book you have not finished; nothing here should finish it for you."
              />
            </View>
          </Leaf>

          {/* VI. The record */}
          <Leaf
            numeral="VI."
            title="The record"
            hint="what the shop holds about you, and the two ways to leave."
            danger
          >
            <Act>
              <Mini>Download my record</Mini>
            </Act>
            <Hint style={{ marginTop: 10 }}>
              one file: your particulars, shelf, waitlist, orders, every needle position
              and pressed slip, and your correspondence with the desk. Readable in any
              text editor.
            </Hint>

            <Danger title="Hand back the card">
              <Hint>
                signs you out here and clears this device’s copy. Your shelf, orders and
                correspondence stay on your record — exactly as a library keeps yours
                when you hand the card back.
              </Hint>
              <Act>
                <Mini danger onPress={signOut}>
                  Hand back the card
                </Mini>
              </Act>
            </Danger>

            <Danger title="Sign out everywhere">
              <Hint>
                ends every session on the account, not just this one — for a card left
                signed in on a borrowed machine. Other devices stop working within the
                hour.
              </Hint>
              <Act>
                <Mini danger>Sign out everywhere</Mini>
              </Act>
            </Danger>

            <Danger title="Close the account">
              <Hint>
                deletes the account and everything on it — shelf, waitlist, listening
                positions, slips, correspondence, particulars. Your orders are kept,
                without you attached to them, because a shop has to be able to account
                for what it sold. This cannot be undone. Download your record first.
              </Hint>
              <Act>
                <Mini danger disabled>
                  Close the account
                </Mini>
              </Act>
            </Danger>
          </Leaf>
        </View>
      </View>
    </PortalPage>
  );
}
