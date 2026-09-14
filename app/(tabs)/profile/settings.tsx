// /profile/settings — `/account/profile/settings`, accountSettingsPage.ts:
// every switch in the portal, and nothing else.
//
// THE ORDER IS THE BUILDER'S bodyHtml, top to bottom: the guest note (guests
// only), then Account, Audiobook player, Delivery, Emails, Roman Reads, Your
// data, and the sign-out row alone at the foot. Every row reads
// `Label ………… what it is set to ›`, and what it is set to comes out of the
// ledger the same way ProfileEnhancer's inkCard writes the [data-rr-pf-ink]
// hooks (src/portal/settings/state.ts: deckLine, lettersLine, addressLine).
//
// THE DEEP SETTINGS ARE FOLDS. A row with more behind it opens a well under
// itself (the site's native <details>); the controls in the well write the
// ledger the instant they change — there is no save button anywhere on this
// page, on the web or here. A guest sees the note at the top and finds the
// controls that need an account dimmed and inert (`.rr-pf-needs-card`).
//
// The shell is told this is a SUB-SCREEN of Profile: eyebrow "Profile", the
// bar reads Settings, the back disc returns to /profile, the Profile tab stays
// lit (the Profile stack, app/(tabs)/profile/_layout.tsx).

import { useRouter } from "expo-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";

import { SITE_ORIGIN } from "../../../src/lib/config";
import { useCardNo, useSession } from "../../../src/lib/session";
import { cache } from "../../../src/lib/storage";
import {
  COVERS,
  PRICE_PER_MONTH,
  SUBSCRIPTION_PATH,
  describeSubscription,
  useSubscription,
} from "../../../src/lib/subscription";
import { readerBearerToken } from "../../../src/lib/supabase";
import { openOnSite, openSignedIn } from "../../../src/lib/web";
import { PortalPage, Wrap } from "../../../src/portal/PortalPage";
import {
  authRecord,
  issuedOn,
  pushName,
  requestEmailChange,
  setAuthName,
  setPassword as setAccountPassword,
  signOutEverywhere,
  type AuthRecord,
} from "../../../src/portal/settings/auth";
import { buildDossier, shareDossier } from "../../../src/portal/settings/dossier";
import {
  Act,
  Chips,
  ControlLabel,
  CountryField,
  Drawer,
  Field,
  FieldPair,
  Hint,
  Locked,
  MiniButton,
  Quiet,
  RowList,
  Say,
  SideNote,
  Well,
  useTwoTap,
} from "../../../src/portal/settings/parts";
import { deliveryNote } from "../../../src/portal/settings/countries";
import { readJoined, thisYear } from "../../../src/portal/settings/joined";
import {
  AUDIO_REWIND,
  AUDIO_SKIP,
  AUDIO_SLEEP,
  BINDINGS,
  DEFAULTS,
  SPEEDS,
  STATE_KEY,
  addressLine,
  deckLine,
  hasPostableAddress,
  lettersLine,
  readSettings,
  writeSettings,
  type ReaderAddress,
  type SettingsState,
} from "../../../src/portal/settings/state";
import { ownerOf } from "../../../src/lib/portalState";
import { Fold, Group, Row } from "../../../src/ui/Rows";
import { Rule } from "../../../src/ui/Rule";
import { Switch } from "../../../src/ui/Switch";
import { Txt } from "../../../src/ui/Type";

/** The speed chips, drawn from audioStore's SPEEDS as the enhancer draws them. */
const SPEED_STOPS = SPEEDS.map((v) => ({ value: v, label: `${v}×` }));

/** `.rr-pf-needs-card` — the site dims these to .45 for a guest; every
 *  reader here holds a card, so the wrapper is the plain box. */
function NeedsCard({ children }: { children: ReactNode }) {
  return <View>{children}</View>;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut, rename } = useSession();

  // The member number is what portalClient.hydrate() brings down from the
  // readers row — the ledger's own cardNo is only ever a copy of it. A reader
  // reads the dash until the row lands.
  const cardNo = useCardNo();

  // --- the ledger, keyed to the reader who wrote it
  const owner = ownerOf(user?.id);
  const [state, setState] = useState<SettingsState>(DEFAULTS);
  useEffect(() => {
    let alive = true;
    readSettings(owner).then((s) => {
      if (alive) setState(s);
    });
    return () => {
      alive = false;
    };
  }, [owner]);

  /** commit — write a patch and re-ink. */
  const commit = useCallback(
    (patch: Partial<SettingsState>) => {
      setState((s) => ({ ...s, ...patch }));
      void writeSettings(owner, patch).then((s) => setState(s));
    },
    [owner],
  );
  const cardNoKnown = cardNo !== "–";
  useEffect(() => {
    if (cardNoKnown && cardNo !== state.cardNo) commit({ cardNo });
  }, [cardNo, cardNoKnown, state.cardNo, commit]);

  // --- what each press said (`[data-rr-pf-said]`)
  const [said, setSaid] = useState<Record<string, { text: string; bad: boolean }>>({});
  const say = useCallback((key: string, text: string, bad = false) => {
    setSaid((m) => ({ ...m, [key]: { text, bad } }));
  }, []);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  // One armed press for the whole page (ProfileEnhancer's twoTap).
  const twoTap = useTwoTap();

  // "Reading since" — readers.created_at.
  const [joined, setJoined] = useState(thisYear);
  useEffect(() => {
    let alive = true;
    readJoined(user?.id ?? "").then((y) => {
      if (alive) setJoined(y);
    });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  // paintAccount's two lines, from GoTrue rather than the ledger: null while
  // the record is in flight, or when it cannot be read.
  const [record, setRecord] = useState<AuthRecord | null>(null);
  const loadRecord = useCallback(() => {
    if (!user?.id) {
      setRecord(null);
      return;
    }
    void authRecord().then(setRecord);
  }, [user?.id]);
  useEffect(loadRecord, [loadRecord]);
  const issued = issuedOn(record?.createdAt ?? 0);

  // --- the account fields that are typed, then asked for by their own press
  const [name, setName] = useState((user?.name ?? "").trim());

  /**
   * commitName, on blur: the trimmed field, or the existing name when it was
   * emptied. Nothing when unchanged. A reader's name goes three places, as
   * writeSession + setAuthName send it — the session (so Profile shows it),
   * the readers row, and the auth record, which order mail reads with no
   * session to consult.
   */
  const commitName = useCallback(() => {
    if (!user) return;
    const next = name.trim() || user.name;
    if (next !== name) setName(next);
    if (next === user.name) return;
    rename(next);
    void pushName(user.id, next);
    void setAuthName(next);
  }, [name, rename, user]);

  const [drawer, setDrawer] = useState<"email" | "password" | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [confirm, setConfirm] = useState("");

  // "Create a free account" — the site sends a guest to /login. The pass is
  // dropped first so the gate lets the wall show.
  const createAccount = useCallback(() => {
    void signOut().finally(() => router.replace("/sign-in"));
  }, [router, signOut]);

  /* ------------------------------------------------------- the actions --- */

  /** doExport: the dossier, assembled from what is already here, out through
   *  the share sheet (a phone has no download). The site's own two answers. */
  const doExport = useCallback(async () => {
    try {
      const dossier = await buildDossier(
        state,
        user ? { name: user.name, email: user.email, issued: joined } : null,
      );
      if (await shareDossier(dossier)) say("export", "downloaded.");
    } catch {
      say("export", "the browser refused the download.", true);
    }
  }, [joined, say, state, user]);

  /**
   * portalClient.clearAllPortalData(): the session (tokens and the guest
   * pass, which signOut drops) AND the ledger under rr-account-state — the
   * address, the phone, the courier note, every switch. "Clear this device"
   * promises exactly that; the plain Sign out row keeps the saved copy.
   */
  const clearDevice = useCallback(async () => {
    try {
      await cache.remove(STATE_KEY);
    } finally {
      await signOut();
    }
  }, [signOut]);

  const doHandback = useCallback(() => {
    void clearDevice().finally(() => router.replace("/sign-in"));
  }, [clearDevice, router]);

  const doGlobalSignOut = useCallback(async () => {
    say("global", "ending every session…");
    // GoTrue's global scope first, then the local clear — the site clears
    // all portal data here too.
    await signOutEverywhere();
    void clearDevice().finally(() => router.replace("/sign-in"));
  }, [clearDevice, router, say]);

  /** The Sign out row: session only, the saved copy stays. */
  const doSignOut = useCallback(() => {
    void signOut().finally(() => router.replace("/sign-in"));
  }, [router, signOut]);

  const doTestLetter = useCallback(async () => {
    setBusy((b) => ({ ...b, test: true }));
    say("test", "posting…");
    try {
      const token = await readerBearerToken();
      if (!token) {
        say("test", "sign in first.", true);
        return;
      }
      const res = await fetch(`${SITE_ORIGIN}/api/account/test-letter`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) say("test", "sent. It should be with you in a moment.");
      else if (res.status === 503) say("test", "no mail provider is configured yet.", true);
      else if (res.status === 429) say("test", "one at a time, try again shortly.", true);
      else say("test", "it did not go. The desk has been told.", true);
    } catch {
      say("test", "no answer from the desk. Check the connection.", true);
    } finally {
      setBusy((b) => ({ ...b, test: false }));
    }
  }, [say]);

  const doClose = useCallback(async () => {
    setBusy((b) => ({ ...b, close: true }));
    say("close", "closing the account…");
    try {
      const token = await readerBearerToken();
      if (!token) {
        say("close", "sign in first.", true);
        return;
      }
      const res = await fetch(`${SITE_ORIGIN}/api/account/close`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        say("close", "the account could not be closed. Write to the desk.", true);
        return;
      }
      // The account is gone and the tokens are dead: clear locally and leave.
      void clearDevice().finally(() => router.replace("/sign-in"));
    } catch {
      say("close", "no answer from the desk. Nothing was changed.", true);
    } finally {
      setBusy((b) => ({ ...b, close: false }));
    }
  }, [clearDevice, router, say]);

  const doEmailChange = useCallback(async () => {
    const next = newEmail.trim();
    if (!next) {
      say("email", "an address is needed.", true);
      return;
    }
    setBusy((b) => ({ ...b, email: true }));
    say("email", "writing…");
    const r = await requestEmailChange(next, user?.email ?? "");
    setBusy((b) => ({ ...b, email: false }));
    if (r.error) {
      say("email", r.error.toLowerCase(), true);
      return;
    }
    setNewEmail("");
    say("email", "check both inboxes, the address changes when you follow the link.");
    loadRecord();
  }, [loadRecord, newEmail, say, user?.email]);

  const doPassword = useCallback(async () => {
    if (password !== password2) {
      say("password", "those two do not match.", true);
      return;
    }
    setBusy((b) => ({ ...b, password: true }));
    say("password", "setting…");
    const r = await setAccountPassword(password);
    setBusy((b) => ({ ...b, password: false }));
    if (r.error) {
      say("password", r.error.toLowerCase(), true);
      return;
    }
    setPassword("");
    setPassword2("");
    say("password", "done. It works from the next sign-in.");
  }, [password, password2, say]);

  const setAddress = (patch: Partial<ReaderAddress>) => commit({ address: { ...state.address, ...patch } });
  const addressStarted =
    Object.values(state.address).some((v) => v.trim()) && !hasPostableAddress(state.address);

  const letters = lettersLine(state);
  const address = addressLine(state.address);
  const delivery = deliveryNote(state.address.country);

  return (
    <PortalPage title="Settings" eyebrow="Profile" back="/profile">
      <Wrap>
        {/* ------------------------------------------------------ Account */}
        <Group label="Account">
          <Fold label="Name" note="on the parcel and every email" value="Edit">
            {/* .rr-pf-well>*:first-child{margin-top:0} */}
            <Field
              label="Name on the account"
              value={name}
              onChangeText={setName}
              onBlur={commitName}
              placeholder="as it should appear"
              maxLength={120}
              autoComplete="name"
              style={{ marginTop: 0 }}
            />
            {/* <p class="rr-pf-hint" data-rr-pf-ink="since"> — "Card issued 12 September 2026."; its
                8px margin is laid out even while the record is in flight. */}
            {issued ? <Hint>Card issued {issued}.</Hint> : <View style={{ marginTop: 8 }} />}
          </Fold>

          <Fold label="Email" note="where receipts and sign-in links go" value="Edit">
            {/* its third child is <p class="rr-pf-note" data-rr-pf-pending hidden> — not laid out until a
                change is in flight, so bad={false}; shown, it is the .rr-pf-f's 6px gap under the box
                plus its own 14px margin. */}
            <Field label="The email on your account" value={user?.email ?? ""} readOnly bad={false} style={{ marginTop: 0 }} />
            {record?.pendingEmail ? (
              <SideNote style={{ marginTop: 20 }}>
                A change to {record.pendingEmail} is waiting on the link in your email. Until you follow it, the address
                above is still the one on your account.
              </SideNote>
            ) : null}
            <NeedsCard>
              <Act>
                <MiniButton label="Change the email" onPress={() => setDrawer((d) => (d === "email" ? null : "email"))} />
                <MiniButton label="Set a new password" onPress={() => setDrawer((d) => (d === "password" ? null : "password"))} />
              </Act>
            </NeedsCard>
            <Drawer open={drawer === "email"}>
              <Hint>
                We email <Txt size={12.5} line={1.6} weight={700} tone={0.55}>both</Txt> addresses, the old one and the
                new one. The account only moves when you follow the link in that email, so a mistyped address cannot
                lock you out.
              </Hint>
              <Field
                label="New email address"
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="you@example.com"
                maxLength={254}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <Act>
                <MiniButton label="Send confirmation email" onPress={() => void doEmailChange()} disabled={!!busy.email} />
                <Say text={said.email?.text ?? ""} bad={said.email?.bad} />
              </Act>
            </Drawer>
            <Drawer open={drawer === "password"}>
              <Hint>
                Eight characters at least. If you only ever signed in by emailed link, this is where your account gets
                a password for the first time.
              </Hint>
              <Field
                label="New password"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                maxLength={72}
                secureTextEntry
                autoComplete="new-password"
              />
              <Field
                label="Once more"
                value={password2}
                onChangeText={setPassword2}
                placeholder="••••••••"
                maxLength={72}
                secureTextEntry
                autoComplete="new-password"
              />
              <Act>
                <MiniButton label="Set the password" onPress={() => void doPassword()} disabled={!!busy.password} />
                <Say text={said.password?.text ?? ""} bad={said.password?.bad} />
              </Act>
            </Drawer>
          </Fold>

          {/* accountSettingsPage.ts's subscriptionGroup, painted by
              ProfileEnhancer.paintSubscription from /api/subscription — here
              from the same answer (src/lib/subscription.tsx). Baked in the
              UNKNOWN state ("checking…"), never "not subscribed": a subscriber
              must not be shown a Subscribe press for one paint. The two
              presses are the site's two — subscribe, and Stripe's billing
              portal — and BOTH LEAVE FOR THE WEBSITE, signed in through the
              handoff: the subscription is bought and cancelled there, never
              in the app (src/lib/web.ts). */}
          <SubscriptionFold />
          {/* Read-only, and deliberately last: the only two rows that cannot be changed. */}
            <Row label="Member no." note="on the card and on every order" value={cardNo} />
          {/* min-height 56 is border-box on the web: 55 + the rule. */}
          <Row label="Reading since" value={joined} />
        </Group>

        {/* ------------------------------------------------ Audiobook player */}
        <Group label="Audiobook player">
          <Fold label="Playback" note="what every audiobook starts at" value={deckLine(state)}>
            <ControlLabel style={{ marginTop: 6 }}>Playback speed</ControlLabel>
            <Chips
              stops={SPEED_STOPS}
              value={state.audioSpeed}
              onSelect={(v) => commit({ audioSpeed: v })}
              label="Default playback speed"
            />
            <ControlLabel>Step back on resume</ControlLabel>
            <Chips
              stops={AUDIO_REWIND}
              value={state.audioRewind}
              onSelect={(v) => commit({ audioRewind: v })}
              label="Rewind on resume"
            />
            <Hint>
              Picking a book up again, playback starts this far before where you left off, which is long enough to
              find the sentence again.
            </Hint>
            <ControlLabel>The ± buttons move by</ControlLabel>
            <Chips stops={AUDIO_SKIP} value={state.audioSkip} onSelect={(v) => commit({ audioSkip: v })} label="Skip interval" />
            <ControlLabel>Sleep timer, playback stops after</ControlLabel>
            <Chips
              stops={AUDIO_SLEEP}
              value={state.audioSleep}
              onSelect={(v) => commit({ audioSleep: v })}
              label="Default sleep timer"
            />
            <RowList style={{ marginTop: 20 }}>
              <Row
                label="Play the next chapter automatically"
                note="off, and the recording stops at the end of the one playing"
                control={
                  <Switch
                    on={state.audioAutoplay}
                    onChange={(v) => commit({ audioAutoplay: v })}
                    label="Play the next chapter automatically"
                  />
                }
              />
              <Row
                label="Highlight the words as they are read"
                note="the text view follows the narration, where a book supports it"
                control={
                  <Switch
                    on={state.readAlong}
                    onChange={(v) => commit({ readAlong: v })}
                    label="Highlight the words as they are read"
                  />
                }
              />
              <Row
                label="Default narrator"
                note="where two narrators recorded a book you pick the voice in the player, and a book keeps the voice you started it in"
                control={<Locked>In the player</Locked>}
              />
            </RowList>
          </Fold>
        </Group>

        {/* ------------------------------------------------------- Delivery */}
        <Group label="Delivery">
          <Fold label="Delivery address" note={address ?? "no address on file"} noteTone={address ? 0.55 : 0.42} value="Edit">
            <Hint style={{ marginTop: 0 }}>
              Checkout starts from this address, so you type your street once. Changing it here never changes where an
              order that has already gone was sent. Each order keeps its own copy.
            </Hint>
            <Field
              label="Name for the parcel"
              value={state.address.name}
              onChangeText={(t) => setAddress({ name: t })}
              placeholder="as it should read on the label"
              maxLength={120}
              autoComplete="name"
            />
            <Field
              label="Phone"
              value={state.address.phone}
              onChangeText={(t) => setAddress({ phone: t })}
              placeholder="0300 1234567"
              maxLength={32}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <Field
              label="Address"
              value={state.address.line1}
              onChangeText={(t) => setAddress({ line1: t })}
              placeholder="house, street"
              maxLength={200}
              autoComplete="street-address"
            />
            <Field
              label="Address, line two"
              value={state.address.line2}
              onChangeText={(t) => setAddress({ line2: t })}
              placeholder="area, landmark, optional"
              maxLength={200}
            />
            <FieldPair>
              <Field
                label="City"
                value={state.address.city}
                onChangeText={(t) => setAddress({ city: t })}
                placeholder="city"
                maxLength={100}
                style={{ flex: 1 }}
              />
              <Field
                label="Postal code"
                value={state.address.postcode}
                onChangeText={(t) => setAddress({ postcode: t })}
                placeholder="optional"
                maxLength={20}
                autoComplete="postal-code"
                style={{ flex: 1 }}
              />
            </FieldPair>
            <CountryField
              label="Country"
              value={state.address.country}
              onSelect={(code) => setAddress({ country: code })}
              bad={addressStarted ? "Name, phone, address, city and country are what a courier needs." : undefined}
            />
            {/* [data-rr-pf-ink="delivery"] — paintDelivery's posting note, hidden until a country is chosen. */}
            {delivery ? (
              <SideNote>
                {delivery.before}
                {delivery.bold ? (
                  <Txt size={12.5} line={1.6} weight={700} tone={0.62}>
                    {delivery.bold}
                  </Txt>
                ) : null}
                {delivery.after ?? ""}
              </SideNote>
            ) : null}
            <Field
              label="A note for the courier"
              value={state.shipNote}
              onChangeText={(t) => commit({ shipNote: t })}
              placeholder="leave it with the guard, optional"
              maxLength={200}
            />
          </Fold>

          <Fold label="Binding" note="what checkout starts on" value="Edit">
            <Chips
              stops={BINDINGS}
              value={state.binding}
              onSelect={(v) => commit({ binding: v })}
              label="Default binding"
              style={{ marginTop: 0 }}
            />
            <Hint>Clothbound still costs extra. This only decides which one is selected for you to begin with.</Hint>
            <RowList style={{ marginTop: 20 }}>
              <Row
                label="A bookplate (ex libris)"
                note="pasted inside the front cover, printed with your name. Physical books only"
                control={<Switch on={state.bookplate} onChange={(v) => commit({ bookplate: v })} label="A bookplate (ex libris)" />}
              />
              <Row
                label="No prices on the packing slip"
                note="the slip lists the books and not a single price, for parcels sent as gifts"
                control={
                  <Switch
                    on={state.giftNoPrices}
                    onChange={(v) => commit({ giftNoPrices: v })}
                    label="No prices on the packing slip"
                  />
                }
              />
            </RowList>
          </Fold>
        </Group>

        {/* --------------------------------------------------------- Emails */}
        <Group label="Emails">
          <Fold
            label="What we send"
            note="three you can switch off, one you cannot"
            value={letters ?? "orders only"}
            valueTone={letters ? 0.55 : 0.42}
          >
            <RowList top={false}>
              <Row
                label="New books, weekly"
                note="one email when new titles arrive"
                control={<Switch on={state.weekly} onChange={(v) => commit({ weekly: v })} label="New books, weekly" />}
              />
              <Row
                label="A waitlisted audiobook is ready"
                note="you followed it before the recording existed; this says it exists now"
                control={
                  <Switch
                    on={state.lettersPressed}
                    onChange={(v) => commit({ lettersPressed: v })}
                    label="A waitlisted audiobook is ready"
                  />
                }
              />
              <Row
                label="The monthly listening digest"
                note="what you heard, what you marked, where you stopped"
                control={
                  <Switch
                    on={state.lettersDigest}
                    onChange={(v) => commit({ lettersDigest: v })}
                    label="The monthly listening digest"
                  />
                }
              />
              <Row
                label="Anything about an order"
                note="receipts, unlocks and the parcel’s progress. They are your orders and your money"
                control={<Locked>Always on</Locked>}
              />
            </RowList>
            <Hint>Your address is never sold, forwarded or handed to anyone.</Hint>
            <NeedsCard>
              <Act>
                <MiniButton label="Send me a test email" onPress={() => void doTestLetter()} disabled={!!busy.test} />
                <Say text={said.test?.text ?? ""} bad={said.test?.bad} />
              </Act>
            </NeedsCard>
          </Fold>
        </Group>

        {/* ---------------------------------------------------- Roman Reads */}
        <Group label="Roman Reads">
            <Row
              label="Request a feature"
              note="tell us what is missing"
              icon="mail"
              onPress={() => void openOnSite("/contact")}
            />
          {/* aria-disabled: the whole row, rule included, at .45 */}
            <View style={{ opacity: 0.45 }}>
              <Row label="Share Roman Reads" note="send the app to someone" value="Coming soon" icon="share" />
            </View>
            <View style={{ opacity: 0.45 }}>
              <Row label="Rate the app" note="the app is not on either store yet" value="Coming soon" icon="star" />
            </View>
        </Group>

        {/* ------------------------------------------------------ Your data */}
        <Group label="Your data">
          <DoRow
            label="Download my data"
            note="one file: profile, wishlist, waitlist, orders, every listening position and bookmark, and your conversations with the AI"
            cta="Download my data"
            onPress={() => void doExport()}
            said={said.export}
          />
          <DoRow
            label="Sign out and clear this device"
            note="deletes this browser’s saved copy. Your wishlist, orders and conversations stay on your account"
            cta="Clear this device"
            onPress={doHandback}
            twoTap={twoTap("handback")}
            said={said.handback}
          />
          <DoRow
            label="Sign out everywhere"
            note="ends every session on the account, not just this one. Other devices stop working within the hour"
            cta="Sign out everywhere"
            onPress={() => void doGlobalSignOut()}
            twoTap={twoTap("global")}
            said={said.global}
          />
          <Fold label="Close the account" note="this cannot be undone" value="Delete">
            <NeedsCard>
              <Hint style={{ marginTop: 0 }}>
                Deletes the account and everything on it: wishlist, waitlist, listening positions, bookmarks, AI
                conversations, and profile details. Your orders are kept, without you attached to them, because a shop
                has to be able to account for what it sold.{" "}
                <Txt size={12.5} line={1.6} weight={700} tone={0.55}>
                  This cannot be undone.
                </Txt>{" "}
                Download your data first.
              </Hint>
              <Field
                label="Type your account number to confirm"
                value={confirm}
                onChangeText={setConfirm}
                placeholder="000000"
                maxLength={12}
                keyboardType="number-pad"
                autoComplete="off"
                // a bare div.rr-pf-f with <b> + <input> and no .rr-pf-bad: one gap.
                bad={false}
                style={{ maxWidth: 260 }}
              />
              <Act>
                <MiniButton
                  label="Close the account"
                  onPress={() => void doClose()}
                  // armClose: nothing to type until a number is issued.
                  disabled={!!busy.close || !cardNoKnown || confirm.trim() !== cardNo}
                />
                <Say text={said.close?.text ?? ""} bad={said.close?.bad} />
              </Act>
            </NeedsCard>
          </Fold>
        </Group>

        {/* ------------------------------------------------------- Sign out */}
        {/* `.rr-ap-rows.rr-pf-leave` — alone and unheaded, 28px under the last group. */}
        <View style={{ marginTop: 28 }}>
          <Rule />
            <Row
              label="Sign out"
              note="on this device, keeping the saved copy"
              control={<Quiet label="Sign out" onPress={doSignOut} />}
            />
        </View>
      </Wrap>
    </PortalPage>
  );
}

/**
 * The Subscription fold. ProfileEnhancer's paintSubscription, state for
 * state: "checking…" until the desk answers; "Not available on this site."
 * with nothing to press when the site cannot sell one; Active / Ending with
 * the renewal or the end date and a "Manage or cancel" press; None with the
 * plan's four covers and the Subscribe press. A reader who once subscribed
 * still has invoices and a card on file, so the portal press stays beside
 * Subscribe for them.
 */
function SubscriptionFold() {
  const { state, refresh } = useSubscription();
  const d = describeSubscription(state);
  const [said, setSaid] = useState("");
  const go = useCallback(async () => {
    setSaid("opening the website…");
    await openSignedIn(SUBSCRIPTION_PATH);
    // the answer may have changed by the time the reader is back — the
    // provider asks again on foreground; this covers the web build too
    setTimeout(() => {
      void refresh();
      setSaid("");
    }, 1500);
  }, [refresh]);
  return (
    <Fold label="Subscription" note={d.note} value={d.state || " "}>
      {d.press === "subscribe" ? <Hint>{COVERS.join(" ")}</Hint> : null}
      {d.press === "manage" ? (
        <Hint>Cancelling, your card and your invoices are on the website, in Stripe's billing portal.</Hint>
      ) : null}
      {d.press ? (
        <Act>
          {d.press === "subscribe" ? (
            <MiniButton label={`Subscribe — ${PRICE_PER_MONTH}`} onPress={() => void go()} />
          ) : null}
          {d.portal ? <MiniButton label="Manage or cancel" onPress={() => void go()} /> : null}
          <Say text={said} />
        </Act>
      ) : null}
    </Fold>
  );
}

/**
 * The builder's doRow — a row whose control is a press, not a setting: the
 * bare row on its rule, then a well (padding-top 0) holding the act
 * (margin-top 2) with the ink press and its answer.
 */
function DoRow({
  label,
  note,
  cta,
  onPress,
  twoTap,
  needsCard = false,
  said,
}: {
  label: string;
  note: string;
  cta: string;
  onPress: () => void;
  /** From the screen's useTwoTap(key) — the press asks to be tapped twice. */
  twoTap?: { armed: boolean; arm: () => void; fire: () => void };
  needsCard?: boolean;
  said?: { text: string; bad: boolean };
}) {
  return (
    <View>
        <View style={{ opacity: needsCard ? 0.45 : 1 }}>
          <Row label={label} note={note} />
        </View>
      <Well style={{ paddingTop: 0 }}>
        <Act style={{ marginTop: 2 }}>
          <MiniButton label={cta} onPress={onPress} twoTap={twoTap} />
          <Say text={said?.text ?? ""} bad={said?.bad} />
        </Act>
      </Well>
    </View>
  );
}
