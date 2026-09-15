// /library/checkout?slug=<book> — order a printed book, and pay for it here.
//
// The site's checkout is a drawer (ShopDock's cart, delivery and pay steps);
// the app's is one screen on the Library stack behind the book's page, so
// the back disc returns to the book and the tab stays lit. It asks the same
// three things in the same order the site asks them — where the book goes,
// how it is paid for, the total — and then, since 14 Sep 2026, takes the
// card ITSELF in Stripe's Payment Sheet (src/lib/payments.ts) instead of
// handing the reader to the website.
//
// THE SITE STILL PRICES. The country the book is going to decides the shop
// and therefore the currency (regionForCountry on the site; CURRENCY_OF
// here), and the figure this screen prints is the ladder's price for that
// currency — the same figure the site's page shows — but the amount the
// sheet charges is the one /api/checkout wrote on the order. Three countries
// are a checkout (Pakistan, the United Kingdom, the United States: the ones
// the shop knows the postage and the time for); everywhere else is a quote,
// and the screen says so and offers the contact page rather than a price it
// cannot keep.
//
// CASH ON DELIVERY is Pakistan's, and only Pakistan's — a courier at a door
// in Karachi collects rupees, and Pakistan is the shop quoted in rupees. The
// site refuses it on a title printed to order (409 cod-unavailable), and the
// refusal is carried back in its own words.
//
// The address is kept on the device (rr-address) so the second order is a
// tap, as the site keeps it in localStorage.

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";

import { orderBook, sheetAvailable, type DeliveryAddress } from "../../../src/lib/payments";
import { useSession } from "../../../src/lib/session";
import { cache } from "../../../src/lib/storage";
import { openOnSite, openSignedIn } from "../../../src/lib/web";
import { bookPage, bookRow, leadTimeOf, priceLabel } from "../../../src/portal/book/data";
import { Press } from "../../../src/portal/book/parts";
import { EmptyRoom } from "../../../src/portal/library/Grid";
import { CURRENCY_OF, type CurrencyCode, type Region } from "../../../src/portal/library/region";
import { PortalPage, Wrap } from "../../../src/portal/PortalPage";
import { useInk } from "../../../src/theme/ink";
import { FONTS } from "../../../src/theme/type";
import { Rule } from "../../../src/ui/Rule";
import { Seg } from "../../../src/ui/Seg";
import { Txt } from "../../../src/ui/Type";

/* -------------------------------------------------------- the countries --- */

/** app/data/countries.ts SHIP_TO — the three the shop posts to on a schedule,
 *  and the region each one is (regionForCountry). */
const SHIP_TO: { code: string; name: string; region: Region }[] = [
  { code: "PK", name: "Pakistan", region: "PK" },
  { code: "GB", name: "United Kingdom", region: "UK" },
  { code: "US", name: "United States", region: "US" },
];
const regionOf = (country: string): Region => SHIP_TO.find((c) => c.code === country)?.region ?? "ROW";

/* ------------------------------------------------------------ the form --- */

type Address = Required<Pick<DeliveryAddress, "name" | "phone" | "line1" | "city" | "country">> & {
  line2: string;
  postcode: string;
};
const EMPTY: Address = { name: "", phone: "", line1: "", line2: "", city: "", postcode: "", country: "PK" };
const ADDRESS_KEY = "rr-address";

/** deliveryForm.ts RULES, and the phone's regex from orders.ts parseAddress. */
function validate(a: Address): Partial<Record<keyof Address, string>> {
  const e: Partial<Record<keyof Address, string>> = {};
  const within = (v: string, min: number, max: number) => v.trim().length >= min && v.trim().length <= max;
  if (!within(a.name, 2, 120)) e.name = "The name on the parcel.";
  if (!within(a.phone, 6, 32) || !/^[0-9+][0-9 ()+-]*$/.test(a.phone.trim())) e.phone = "A number the courier can call.";
  if (!within(a.line1, 4, 200)) e.line1 = "House and street.";
  if (a.line2.trim() && !within(a.line2, 1, 200)) e.line2 = "Too long.";
  if (!within(a.city, 2, 100)) e.city = "The city.";
  if (a.postcode.trim() && !within(a.postcode, 2, 20)) e.postcode = "Check the postal code.";
  return e;
}

/** A per-attempt key, as ShopDock mints one: the same book twice is two orders. */
const attemptKey = (): string =>
  `app-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

type Method = "card" | "cod";
type Outcome = { kind: "paid" | "placed"; orderId: string } | null;

export default function Checkout() {
  const { slug: raw, qty: rawQty } = useLocalSearchParams<{ slug: string; qty?: string }>();
  const slug = typeof raw === "string" ? raw : "";
  const router = useRouter();
  const { user } = useSession();
  const { ink, brown, brick, brass, vw } = useInk();

  const row = bookRow(slug);
  const page = bookPage(slug);

  const [address, setAddress] = useState<Address>(EMPTY);
  const [qty, setQty] = useState(() => Math.max(1, Math.min(9, Number(rawQty) || 1)));
  const [method, setMethod] = useState<Method>("card");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const [done, setDone] = useState<Outcome>(null);
  const [sheet, setSheet] = useState<boolean | null>(null);

  // the address kept from last time, and whether this build can open a sheet
  useEffect(() => {
    let live = true;
    void cache.get(ADDRESS_KEY).then((raw) => {
      if (!live || !raw) return;
      try {
        const kept = JSON.parse(raw) as Partial<Address>;
        setAddress((a) => ({ ...a, ...kept, country: SHIP_TO.some((c) => c.code === kept.country) ? kept.country! : a.country }));
      } catch {
        /* a bad blob is no address */
      }
    });
    void sheetAvailable().then((ok) => {
      if (live) setSheet(ok);
    });
    return () => {
      live = false;
    };
  }, []);

  const region = regionOf(address.country);
  const currency: CurrencyCode = CURRENCY_OF[region];
  const unit = row ? priceLabel(row.tier, currency) : "";
  const total = useMemo(() => times(unit, qty), [unit, qty]);
  const codOpen = region === "PK";
  useEffect(() => {
    if (!codOpen && method === "cod") setMethod("card");
  }, [codOpen, method]);

  const errors = validate(address);
  const set = (k: keyof Address) => (v: string) => setAddress((a) => ({ ...a, [k]: v }));
  const gutter = vw(5);

  const submit = async () => {
    if (busy || !row) return;
    setTouched(true);
    if (Object.keys(errors).length) {
      setNote({ text: "A few fields need finishing before the book can go.", bad: true });
      return;
    }
    setNote(null);
    setBusy(true);
    const clean: DeliveryAddress = {
      name: address.name.trim(),
      phone: address.phone.trim(),
      line1: address.line1.trim(),
      ...(address.line2.trim() ? { line2: address.line2.trim() } : {}),
      city: address.city.trim(),
      ...(address.postcode.trim() ? { postcode: address.postcode.trim() } : {}),
      country: address.country,
    };
    void cache.set(ADDRESS_KEY, JSON.stringify(address));
    try {
      const out = await orderBook({
        items: [{ slug, qty }],
        method,
        address: clean,
        idempotencyKey: attemptKey(),
        title: `Pay ${total || unit}`,
        email: user?.email ?? null,
      });
      if (out.kind === "paid" || out.kind === "placed") {
        setDone({ kind: out.kind, orderId: out.orderId });
      } else if (out.kind === "cancelled") {
        setNote({ text: "Nothing was charged. The order is here when you are ready.", bad: false });
      } else if (out.kind === "unavailable") {
        // no sheet on this build, or none switched on for this deployment:
        // the website's counter takes it from here, signed in
        setNote({ text: "Paying in the app is not switched on yet — the website takes it from here.", bad: false });
        void openSignedIn(`/books/${encodeURIComponent(slug)}`);
      } else {
        setNote({ text: out.why, bad: true });
      }
    } finally {
      setBusy(false);
    }
  };

  if (!row || !page) {
    return (
      <PortalPage title="Order" eyebrow="Library" back="/library">
        <Wrap>
          <EmptyRoom
            head="Not in the catalogue"
            sub="We do not list this book. Every title we do is on the shelf."
            cta="Browse all books"
            onCta={() => router.navigate("/library")}
          />
        </Wrap>
      </PortalPage>
    );
  }

  const back = `/library/${encodeURIComponent(slug)}`;
  const lead = leadTimeOf(page);

  if (done) {
    // the site's /checkout/confirming, said once: the order is in, and what
    // happens next — 1 to 2 days, since everything is in stock
    return (
      <PortalPage title="Order placed" eyebrow="Library" back={back}>
        <View style={{ paddingHorizontal: gutter, paddingTop: 26 }}>
          <Txt weight={700} size={10} ls={0.2} upper color="brass">
            {done.kind === "paid" ? "Paid" : "Cash on delivery"}
          </Txt>
          <Txt family="Cormorant Garamond" weight={500} size={34} line={1.03} ls={-0.01} style={{ marginTop: 10 }}>
            {row.title} is on its way.
          </Txt>
          <Txt size={15} line={1.6} tone={0.7} style={{ marginTop: 14 }}>
            {done.kind === "paid"
              ? `Paid ${total}. It is in stock, and it reaches you in 1 to 2 days. A receipt is on its way to your email.`
              : `${total} to the courier at the door. It is in stock, and it reaches you in 1 to 2 days.`}
          </Txt>
          <Txt size={12} line={1.6} tone={0.5} style={{ marginTop: 10 }}>
            Order {done.orderId.slice(0, 8)}
          </Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
            <Press label="See your orders" onPress={() => router.navigate("/orders")} />
            <Press label="Back to the book" ghost onPress={() => router.navigate(back)} />
          </View>
        </View>
      </PortalPage>
    );
  }

  return (
    <PortalPage title="Order" eyebrow="Library" back={back} keyboardShouldPersistTaps="handled">
      <View style={{ paddingHorizontal: gutter, paddingTop: 22, paddingBottom: 30 }}>
        {/* the line being ordered — title, binding, the unit price in the
            delivery country's money, and a quantity */}
        <Txt weight={700} size={10} ls={0.2} upper color="brass">
          Your order
        </Txt>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14, marginTop: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt family="Cormorant Garamond" weight={500} size={26} line={1.08} ls={-0.01}>
              {row.title}
            </Txt>
            <Txt size={13} tone={0.6} style={{ marginTop: 4 }}>
              {row.author} · {page.bind}
            </Txt>
            <Txt weight={800} size={18} color="ink2" style={{ marginTop: 8, fontVariant: ["tabular-nums"] }}>
              {unit}
              <Txt weight={600} size={12} tone={0.5}>
                {"  "}each
              </Txt>
            </Txt>
          </View>
          <Stepper value={qty} onChange={setQty} />
        </View>
        <Txt family="Caveat" weight={500} size={15} color="brown" style={{ marginTop: 10, transform: [{ rotate: "-0.6deg" }] }}>
          {lead.line ?? "it is in stock, and it reaches you in 1 to 2 days."}
        </Txt>

        {/* where it goes */}
        <Rule style={{ marginTop: 22 }} />
        <Txt weight={700} size={10} ls={0.2} upper color="brass" style={{ marginTop: 18 }}>
          Where it goes
        </Txt>
        <Seg
          segments={SHIP_TO.map((c) => ({ key: c.code, label: c.name }))}
          selected={address.country}
          onSelect={(k) => setAddress((a) => ({ ...a, country: k }))}
          size={17}
          gap={18}
          top={10}
          role="radio"
          accessibilityLabel="Country"
        />
        <Txt size={11.5} line={1.5} tone={0.55} style={{ marginTop: 10 }}>
          Delivered on a schedule to these three. Somewhere else?{" "}
          <Txt size={11.5} weight={700} color="brick" style={{ textDecorationLine: "underline" }} onPress={() => void openOnSite("/contact")}>
            Write to us
          </Txt>{" "}
          and we will quote the delivery.
        </Txt>

        <View style={{ gap: 17, marginTop: 18 }}>
          <Field label="Full name" value={address.name} onChange={set("name")} placeholder="As it should read on the parcel" autoComplete="name" error={touched ? errors.name : undefined} />
          <Field label="Phone" value={address.phone} onChange={set("phone")} placeholder="0300 1234567" keyboardType="phone-pad" autoComplete="tel" error={touched ? errors.phone : undefined} />
          <Field label="Address" value={address.line1} onChange={set("line1")} placeholder="House and street" autoComplete="street-address" error={touched ? errors.line1 : undefined} />
          <Field label="Area (optional)" value={address.line2} onChange={set("line2")} placeholder="Block, sector, landmark" error={touched ? errors.line2 : undefined} />
          <View style={{ flexDirection: "row", gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Field label="City" value={address.city} onChange={set("city")} placeholder={region === "PK" ? "Lahore" : region === "UK" ? "London" : "New York"} error={touched ? errors.city : undefined} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Postal code (optional)" value={address.postcode} onChange={set("postcode")} placeholder={region === "PK" ? "54000" : region === "UK" ? "SW1A 1AA" : "10001"} autoComplete="postal-code" error={touched ? errors.postcode : undefined} />
            </View>
          </View>
        </View>

        {/* how it is paid for — ShopDock's METHODS, card leading, cash quiet
            and only where a courier could collect */}
        <Rule style={{ marginTop: 24 }} />
        <Txt weight={700} size={10} ls={0.2} upper color="brass" style={{ marginTop: 18 }}>
          How you pay
        </Txt>
        <View style={{ gap: 10, marginTop: 12 }}>
          <MethodRow
            label="Card"
            note={sheet === false ? "on the website — paying in the app is not switched on yet" : "Visa, Mastercard, or a saved wallet"}
            on={method === "card"}
            onPress={() => setMethod("card")}
          />
          {codOpen ? (
            <MethodRow label="Cash on delivery" note="pay the courier at the door" on={method === "cod"} onPress={() => setMethod("cod")} />
          ) : null}
        </View>

        {/* the total, and the press */}
        <Rule style={{ marginTop: 24 }} />
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 16 }}>
          <Txt weight={700} size={10} ls={0.2} upper color="brass">
            Total
          </Txt>
          <Txt weight={800} size={22} color="ink2" style={{ fontVariant: ["tabular-nums"] }}>
            {total}
          </Txt>
        </View>
        <Txt size={11.5} line={1.5} tone={0.55} style={{ marginTop: 6 }}>
          Delivery included. The price is the shop’s in {currency}; the receipt shows the same figure.
        </Txt>

        {note ? (
          <View style={{ marginTop: 16, paddingLeft: 13, borderLeftWidth: 2, borderLeftColor: note.bad ? brick(0.8, "border") : brass(0.6, "border") }}>
            <Txt size={12} line={1.6} weight={note.bad ? 600 : 500} style={{ color: note.bad ? brick(1) : ink(0.7) }}>
              {note.text}
            </Txt>
          </View>
        ) : null}

        <View style={{ marginTop: 18 }}>
          <Press
            label={busy ? (method === "cod" ? "Placing your order…" : "Opening the card sheet…") : method === "cod" ? "Place the order" : `Pay ${total}`}
            onPress={() => void submit()}
            accessibilityLabel={method === "cod" ? `Place the order for ${row.title}` : `Pay ${total} for ${row.title}`}
            style={{ opacity: busy ? 0.6 : 1 }}
          />
        </View>
        <Txt size={11} line={1.6} tone={0.5} style={{ marginTop: 12 }}>
          {method === "cod"
            ? "Nothing is charged now. You pay the courier when the parcel arrives."
            : "The card is taken by Stripe, in its own sheet. It never passes through Roman Reads."}
        </Txt>
        <Txt size={11} line={1.6} tone={0.5} style={{ marginTop: 6, color: brown(0.8) }}>
          Signed in as {user?.email ?? "you"}. Orders are kept on your account, and every receipt goes to that address.
        </Txt>
      </View>
    </PortalPage>
  );
}

/* --------------------------------------------------------------- parts --- */

/** "Rs 2,400" × 3 → "Rs 7,200"; "$42.49" × 2 → "$84.98". The ladder's own
 *  spelling, so the figure reads as the site prints it. */
function times(label: string, qty: number): string {
  if (!label || qty === 1) return label;
  const m = /^([^\d]*)([\d,]+)(?:\.(\d{2}))?$/.exec(label.trim());
  if (!m) return label;
  const [, prefix, whole, cents] = m;
  const minor = Math.round((Number(whole.replace(/,/g, "")) + (cents ? Number(cents) / 100 : 0)) * 100) * qty;
  const int = Math.floor(minor / 100).toLocaleString("en-US");
  return cents ? `${prefix}${int}.${String(minor % 100).padStart(2, "0")}` : `${prefix}${int}`;
}

/** A round key of the stepper — its own component, so a re-render of the
 *  stepper does not remount the keys under a finger. */
function StepKey({ glyph, label, onPress }: { glyph: string; label: string; onPress: () => void }) {
  const { ink } = useInk();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: ink(0.3, "border"), alignItems: "center", justifyContent: "center" }}
    >
      <Txt weight={600} size={17} color="ink2">
        {glyph}
      </Txt>
    </Pressable>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const step = (to: number) => onChange(Math.max(1, Math.min(9, to)));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 4 }} accessibilityLabel={`Quantity ${value}`}>
      <StepKey glyph="–" label="One fewer" onPress={() => step(value - 1)} />
      <Txt weight={700} size={16} color="ink2" style={{ minWidth: 14, textAlign: "center", fontVariant: ["tabular-nums"] }}>
        {value}
      </Txt>
      <StepKey glyph="+" label="One more" onPress={() => step(value + 1)} />
    </View>
  );
}

/** A ruled field — the sign-in screen's Field, in the portal's inks. */
function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  keyboardType,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string;
  keyboardType?: TextInputProps["keyboardType"];
  autoComplete?: TextInputProps["autoComplete"];
}) {
  const { ink, brass, brick } = useInk();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 3 }}>
      <Txt weight={700} size={8.5} ls={0.24} upper color={error ? "brick" : "brass"}>
        {label}
      </Txt>
      <View>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={ink(0.38)}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          autoCorrect={false}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            minHeight: 41,
            paddingVertical: 9,
            paddingHorizontal: 2,
            borderBottomWidth: 1,
            borderBottomColor: error ? brick(0.8, "border") : focus ? brass(1, "border") : ink(0.46, "border"),
            color: ink(1),
            fontFamily: FONTS.sansMedium,
            fontSize: 15,
          }}
        />
        {focus ? <View style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 1, backgroundColor: error ? brick(0.8, "border") : brass(1, "border") }} /> : null}
      </View>
      {error ? (
        <Txt size={9.5} line={1.45} color="brick" style={{ marginTop: 4 }}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

/** ShopDock's method rung: the word, its note, and a ring when chosen. */
function MethodRow({ label, note, on, onPress }: { label: string; note: string; on: boolean; onPress: () => void }) {
  const { ink, brick } = useInk();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${label}, ${note}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderRadius: 3,
        borderColor: on ? brick(0.6, "border") : ink(0.22, "border"),
      }}
    >
      <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: on ? brick(1, "border") : ink(0.4, "border"), alignItems: "center", justifyContent: "center" }}>
        {on ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: brick(1, "border") }} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Txt weight={700} size={14} color="ink2">
          {label}
        </Txt>
        <Txt size={11.5} line={1.45} tone={0.55}>
          {note}
        </Txt>
      </View>
    </Pressable>
  );
}
