// /account/profile — the five blocks of app/data/accountProfilePage.ts, at the
// phone branch (mobile is the unqualified state; the ≥901px rule is discarded).
//
//   1  Identity   .rr-pf-id        the mark in a ring, the name, the plan, the cog
//      (GuestNote .rr-pf-guestnote is the kit's — src/ui/GuestNote.tsx)
//   2  Slab       .rr-pf-slab      the one filled surface: the plan being built
//   3  Stats      .rr-pf-stats     the figure, the tally, ruled top and bottom
//   4  Support    .rr-pf-support   three discs on the kit's action grid
//   5  Questions  .rr-pf-faq       three bare rows to standing shop documents
//
// Every ::before is a real <View> here (the slab's brass hairline); every
// dashed hairline is a <Rule>; every round control is a <Disc>. Colours come
// from useTheme()/useInk() in the scope the CSS uses them — except inside the
// slab, which is a theme ISLAND on the web (theme.ts ISLAND_ROOTS): a
// permanently dark object whose cream type must not flip to navy at night, so
// its colours are the kit's ISLAND set (tokens.ts) — the LIGHT values, taken
// from the token table rather than re-typed.

import { useRouter } from "expo-router";
import { Image, Linking, Pressable, View } from "react-native";

import { openOnSite } from "../../lib/web";
import { useInk } from "../../theme/ink";
import { useTheme } from "../../theme/ThemeProvider";
import { ISLAND } from "../../theme/tokens";
import { Acts, type Act } from "../../ui/Acts";
import { Disc } from "../../ui/Disc";
import { Chevron, Icon } from "../../ui/Icon";
import { Rule } from "../../ui/Rule";
import { Group, Row } from "../../ui/Rows";
import { Txt } from "../../ui/Type";
import { fromSlug, heardNote, hoursHeard, tallyBars, type Ledger } from "./ledger";

/** `.rr-pf-id-mark` — /favicon/favicon-96x96.png, masked and filled with ink. */
const MARK = require("../../../assets/mark.png");

/* --- 1 · the identity block ---------------------------------------------- */

/**
 * `.rr-pf-id`: flex, centred, gap 14, padding 4 0 2. The face is a 64px ring
 * (1.5px ink .3) with the 34px mark in ink and a 26px camera badge hung off
 * its lower right; the name is the hand at 29px, .6° off true; the plan line
 * under it says what the account is; the cog is the shell's own 36px disc.
 */
export function Identity({ name, guest }: { name: string; guest: boolean }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { ink } = useInk();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingTop: 4, paddingBottom: 2 }}>
      {/* .rr-pf-id-face */}
      <View style={{ width: 64, height: 64 }}>
        <Disc size={64} ring={ink(0.3, "border")} ringWidth={1.5}>
          <Image source={MARK} style={{ width: 34, height: 34 }} tintColor={colors.ink} resizeMode="contain" />
        </Disc>
        {/* .rr-pf-id-badge — "Setting a picture is coming soon" */}
        <Disc
          size={26}
          ring={ink(0.3, "border")}
          ringWidth={1.5}
          fill={colors.white}
          // right/bottom:-2px is measured from the face's PADDING box, inside its
          // 1.5px ring — half a pixel past the border box, which Chrome snaps
          // to a whole one (measured: badge 123..149 under a face 84..148).
          style={{ position: "absolute", right: -1, bottom: -1 }}
        >
          <Icon name="camera" size={14} color={colors.gold2} />
        </Disc>
      </View>
      {/* .rr-pf-id-copy */}
      <View style={{ flex: 1, minWidth: 0 }}>
        {/* .rr-pf-id-name — 500 29px/1 Caveat, ink2, rotate(-.6deg), one line */}
        <Txt
          family="Caveat"
          weight={500}
          size={29}
          line={1}
          color="ink2"
          numberOfLines={1}
          accessibilityRole="header"
          style={{ transform: [{ rotate: "-0.6deg" }] }}
        >
          {name}
        </Txt>
        {/* .rr-pf-id-plan — 500 12px Manrope, ink .55, 6px under */}
        <Txt weight={500} size={12} tone={0.55} style={{ marginTop: 6 }}>
          {guest ? "Guest" : "Free account"}
        </Txt>
      </View>
      {/* .rr-ap-disc.rr-pf-cog → /account/profile/settings */}
      <Disc
        size={36}
        ring={ink(0.32, "border")}
        ringWidth={1.5}
        onPress={() => router.push("/profile/settings")}
        accessibilityLabel="Settings"
        hitSlop={6}
      >
        <Icon name="gear" size={18} color={colors.brown} />
      </Disc>
    </View>
  );
}

/* --- 2 · the slab --------------------------------------------------------- */

/** rgba(250,247,239,α) — the cream glyph colour, for the slab's muted lines. */
const cream = (alpha: number): string => {
  const n = parseInt(ISLAND.cream.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

/**
 * `.rr-pf-slab` — the CTA press grown to the width of the page: ink ground,
 * cream type, a brass hairline set 4px in from the edge (the ::before), and
 * the chevron at the right end. The whole card is the tap, to /app. The
 * paper grain (NOISE) is not drawn — see KIT.md.
 *
 * A THEME ISLAND: every colour here is the day value, on purpose.
 */
export function Slab() {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Every audiobook in one plan. Coming soon"
      onPress={() => void openOnSite("/app")}
      style={({ pressed }) => ({
        marginTop: 20,
        paddingTop: 16,
        paddingHorizontal: 18,
        paddingBottom: 17,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        overflow: "hidden",
        backgroundColor: ISLAND.ink,
        borderRadius: 3,
        boxShadow: ISLAND.shadow,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      {/* ::before — inset 4px, 1px rgba(201,166,98,.3), radius 2 */}
      <View
        style={{
          pointerEvents: "none",
          position: "absolute",
          left: 4,
          top: 4,
          right: 4,
          bottom: 4,
          borderWidth: 1,
          borderColor: ISLAND.ring,
          borderRadius: 2,
        }}
      />
      {/* .rr-pf-slab-copy */}
      <View style={{ flexShrink: 1, minWidth: 0 }}>
        <Txt weight={700} size={8} ls={0.24} upper style={{ color: ISLAND.brass }}>
          Coming soon
        </Txt>
        <Txt
          family="Cormorant Garamond"
          weight={600}
          size={21}
          line={1.06}
          ls={-0.01}
          style={{ marginTop: 6, maxWidth: 17 * 16, color: ISLAND.cream }}
        >
          Every audiobook in one plan
        </Txt>
        <Txt size={11.5} line={1.45} style={{ marginTop: 5, maxWidth: 22 * 16, color: cream(0.6) }}>
          One subscription, every audiobook we have, in a voice you pick.
        </Txt>
      </View>
      {/* .rr-pf-slab-go — 17px, cream .55 */}
      <Chevron size={17} color={cream(0.55)} />
    </Pressable>
  );
}

/* --- 3 · statistics ------------------------------------------------------- */

/**
 * `.rr-pf-stats` — the kit's note, ruled top and bottom, as one link into the
 * Listening room. Two decks: the label and the chevron share the top line;
 * under it the figure stands at the left with the tally at the right.
 */
export function Stats({ listening }: { listening: Ledger }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { ink, clamp } = useInk();
  const bars = tallyBars(listening);
  const figure = hoursHeard(listening);
  const note = heardNote(listening);

  return (
    <View style={{ marginTop: 24 }}>
      <Rule />
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Statistics. ${figure} heard, ${note}`}
        onPress={() => router.navigate("/listening")}
        style={({ pressed }) => ({
          paddingTop: 14,
          paddingBottom: 15,
          paddingHorizontal: 2,
          backgroundColor: pressed ? "rgba(11,10,8,.03)" : undefined,
        })}
      >
        {/* .rr-pf-stats-h — gap 7, gold2; chevron at the far end, ink .4 */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Icon name="chart" size={15} color={colors.gold2} />
          <Txt weight={700} size={9} ls={0.24} upper color="gold2">
            Statistics
          </Txt>
          <View style={{ flex: 1 }} />
          {/* .rr-pf-stats-go says 16px, but `.rr-pf-stats-h svg{width:15px}` is
              the more specific rule and wins: the chevron is 15, and the head
              line is 15 tall. */}
          <View style={{ width: 15, height: 15 }}>
            <Chevron size={15} color={ink(0.4)} />
          </View>
        </View>
        {/* .rr-pf-stats-body — align flex-end, space-between, gap 16, 9px under */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            marginTop: 9,
          }}
        >
          <View style={{ minWidth: 0, flexShrink: 1 }}>
            {/* .rr-pf-stats-n — 600 clamp(30px,9vw,40px)/.94 Cormorant, -.02em */}
            <Txt family="Cormorant Garamond" weight={600} size={clamp(30, 9, 40)} line={0.94} ls={-0.02}>
              {figure}
            </Txt>
            {/* .rr-pf-stats-s — 500 12px Manrope, ink .55, 5px under */}
            <Txt weight={500} size={12} tone={0.55} style={{ marginTop: 5 }}>
              {note}
            </Txt>
          </View>
          {/* .rr-pf-bars — one bar per recording begun, on a ruled baseline;
              :empty keeps a 56px baseline so the empty state is honest */}
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 5,
              height: 54,
              paddingBottom: 5,
              borderBottomWidth: 1.5,
              borderBottomColor: ink(0.28, "border"),
              width: bars.length ? undefined : 56,
            }}
          >
            {bars.map((b, i) => (
              <View
                key={b.slug}
                accessibilityLabel={`${fromSlug(b.slug)}, ${b.minutes} min`}
                style={{
                  width: 9,
                  minHeight: 3,
                  height: `${b.pct}%`,
                  borderRadius: 1,
                  backgroundColor: i === bars.length - 1 ? colors.brick : colors.ink,
                }}
              />
            ))}
          </View>
        </View>
      </Pressable>
      <Rule />
    </View>
  );
}

/* --- 4 · support ---------------------------------------------------------- */

/**
 * The number is the shop's (contactConfig.ORDER_WHATSAPP) and is unset, so no
 * WhatsApp disc is drawn — the same condition checkout applies to the same
 * number. CONTACT_EMAIL mirrors contactConfig.ts; keep the two in step.
 */
export const CONTACT_EMAIL = "info@romanreads.com";
export const ORDER_WHATSAPP = "";


/**
 * `.rr-ap-group.rr-pf-support` — the kit's Group without the rows' rule (no
 * rows, so no rule; the head's 9px and the grid's 16px collapse to 16), then
 * the kit's action grid cut to the number of channels that exist
 * (`repeat(var(--rr-chan),1fr)`), gap 16 6, discs at 52px rather than 46.
 */
export function Support() {
  const router = useRouter();

  const channels: Act[] = [
    { label: "Ask AI", icon: "hermes", onPress: () => router.navigate("/hermes") },
    { label: "Email us", icon: "mail", onPress: () => void Linking.openURL(`mailto:${CONTACT_EMAIL}`).catch(() => {}) },
    { label: "Write to us", icon: "pencil", onPress: () => void openOnSite("/contact") },
  ];
  if (ORDER_WHATSAPP) {
    channels.push({
      label: "WhatsApp",
      icon: "whatsapp",
      onPress: () => void Linking.openURL(`https://wa.me/${ORDER_WHATSAPP}`).catch(() => {}),
    });
  }

  return (
    <Group label="Support" rule={false}>
      <Acts acts={channels} columns={channels.length} disc={52} rowGap={16} />
    </Group>
  );
}

/* --- 5 · questions -------------------------------------------------------- */

/**
 * `.rr-ap-rows.rr-pf-faq` — no header of its own; the kit's bare rows with
 * the kit's own dashed top, 20px under the support block. The portal draws
 * no footer, so these are the only route to /shipping, /refunds and /privacy
 * from anywhere inside the account.
 */
export function Questions() {
  const rows: { label: string; to: string }[] = [
    { label: "How long delivery takes", to: "/shipping" },
    { label: "Refunds and returns", to: "/refunds" },
    { label: "What we keep, and what the AI sees", to: "/privacy" },
  ];
  return (
    <View style={{ marginTop: 20 }}>
      <Rule />
      {rows.map((r) => (
        <Row key={r.to} label={r.label} onPress={() => void openOnSite(r.to)} />
      ))}
    </View>
  );
}

