// /account/orders — the ledger, kept simple.
//
// A transcription of app/data/accountOrdersPage.ts at its ≤680px branch:
// `.rr-od-line` goes align-items:flex-start with 15/16 padding, the title
// stops truncating (white-space:normal), and the open body loses its 82px
// indent for a flat 16px.
//
// One quiet paper sheet; every order is a hairline-ruled row that opens into
// read-only delivery status points. The <details>/<summary> disclosure becomes
// component state — same behaviour, and the caret still turns 180°.
//
// The covers are the page's only physical objects — theme islands, lit at
// night like every cover on the site, so their colours never flip.

import { Image } from "expo-image";
import { useState } from "react";
import Svg, { Path } from "react-native-svg";
import { Pressable, StyleSheet, Text, View } from "react-native";

import orders from "../../src/data/orders.json";
import { SITE_ORIGIN } from "../../src/lib/config";
import { PortalPage } from "../../src/portal/PortalPage";
import { useInk, em } from "../../src/theme/ink";
import { useTheme } from "../../src/theme/ThemeProvider";
import { FONTS } from "../../src/theme/type";

type Order = (typeof orders)[number];
type Item = Order["items"][number];

/** .rr-od-cover — art, or the cloth spine with the title set on it. */
function Cover({ item, index }: { item: Item; index: number }) {
  const art = item.cover.art;
  return (
    <View
      style={[
        styles.cover,
        { backgroundColor: art ? "#E8D7B9" : (item.cover.spine ?? "#4A3B27") },
        // .rr-od-cover+.rr-od-cover — fanned behind the first
        index > 0 && styles.coverFanned,
        index === 0 && { zIndex: 2 },
      ]}
    >
      {art ? (
        <Image
          source={{ uri: `${SITE_ORIGIN}${art}` }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={140}
        />
      ) : (
        <Text style={styles.coverB} numberOfLines={4}>
          {item.cover.title}
        </Text>
      )}
    </View>
  );
}

/** .rr-od-post — one delivery point on the dashed spine. */
function Step({
  label,
  note,
  state,
  last,
}: {
  label: string;
  note: string;
  state: "done" | "now" | "todo";
  last: boolean;
}) {
  const { ink } = useInk();
  const { colors } = useTheme();

  const dot =
    state === "done"
      ? { backgroundColor: colors.brass, borderColor: colors.brass }
      : state === "now"
        ? { borderColor: colors.brick, borderWidth: 4 }
        : { borderColor: "rgba(155,122,77,.6)" };

  const labelColor =
    state === "done" ? colors.ink2 : state === "now" ? colors.brick : ink(0.42);

  return (
    <View style={[styles.post, last && styles.postLast]}>
      {!last ? <View style={styles.postSpine} /> : null}
      <View style={[styles.dot, dot]} />
      <Text style={[styles.plabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.pnote, { color: ink(0.55) }]}>{note}</Text>
    </View>
  );
}

function Entry({ order, last }: { order: Order; last: boolean }) {
  const [open, setOpen] = useState(false);
  const { ink } = useInk();
  const { colors } = useTheme();

  const allDone = order.done >= order.steps.length;
  const books = order.items.length > 1 ? `${order.items.length} books · ` : "";

  return (
    <View style={[styles.entry, !last && { borderBottomColor: ink(0.1), borderBottomWidth: 1 }]}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [pressed && { backgroundColor: "rgba(155,122,77,.07)" }]}
      >
        <View style={styles.line}>
          <View style={styles.covers}>
            {order.items.map((item, i) => (
              <Cover key={`${order.id}-${i}`} item={item} index={i} />
            ))}
          </View>

          <View style={styles.mid}>
            {order.items.map((item, i) => (
              <View key={i} style={i > 0 ? styles.itemGap : undefined}>
                <Text style={[styles.title, { color: colors.ink2 }]}>{item.title}</Text>
                <Text style={[styles.detail, { color: ink(0.55) }]} numberOfLines={1}>
                  {item.detail}
                </Text>
              </View>
            ))}
            <Text
              style={[
                styles.status,
                { color: allDone ? ink(0.62) : colors.gold2 },
              ]}
            >
              {order.statusLine}
            </Text>
          </View>

          <Text style={[styles.amt, { color: colors.ink2 }]}>{order.amount}</Text>

          <View style={[styles.caret, open && styles.caretOpen]}>
            <Svg width={13} height={9} viewBox="0 0 12 8" fill="none">
              <Path
                d="M1 1l5 5 5-5"
                stroke={ink(0.4)}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </Svg>
          </View>
        </View>
      </Pressable>

      {open ? (
        <View style={[styles.body, { borderTopColor: ink(0.07) }]}>
          <Text style={[styles.entered, { color: ink(0.6) }]}>
            <Text style={[styles.enteredB, { color: colors.gold2 }]}>ORDER </Text>
            {order.id} · placed {order.placed} · {books}paid online
          </Text>

          <View style={styles.steps}>
            {order.steps.map((s, i) => (
              <Step
                key={i}
                label={s.label}
                note={s.note}
                state={i < order.done ? "done" : i === order.done ? "now" : "todo"}
                last={i === order.steps.length - 1}
              />
            ))}
          </View>

          {order.tracking ? (
            <Text style={[styles.track, { color: ink(0.6) }]}>
              <Text style={[styles.enteredB, { color: colors.gold2 }]}>TRACKED </Text>
              <Text style={[styles.code, { color: colors.ink2 }]}> {order.tracking} </Text>
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function Orders() {
  const { ink, vw, mode } = useInk();
  const { colors, paperGradient } = useTheme();

  return (
    <PortalPage
      kicker="Roman Reads · Your Account"
      title="Orders."
      sub="Everything on the ledger — the bench and the post. Seven days, counted honestly; if a week ever looks unlikely, you hear it on day six, not day eight."
    >
      {/* .rr-od-zone{padding:6px 0 64px} */}
      <View style={styles.zone}>
        {/* .rr-od-leaf — the sheet */}
        <View
          style={[
            styles.leaf,
            { backgroundColor: paperGradient[0], borderColor: ink(0.3) },
          ]}
        >
          {orders.map((o, i) => (
            <Entry key={o.id} order={o} last={i === orders.length - 1} />
          ))}
        </View>
      </View>

      {/* .rr-od-band — full-bleed press-room band */}
      <View
        style={[
          styles.band,
          {
            marginHorizontal: -vw(5),
            paddingHorizontal: vw(5),
            borderTopColor: ink(0.12),
            backgroundColor: mode === "dark" ? colors.cream1 : "#F6F1E6",
          },
        ]}
      >
        <Text style={[styles.bandH, { color: colors.ink }]}>Need another one printed?</Text>
        <Text style={[styles.bandP, { color: ink(0.65) }]}>
          Any book you can name, bound in seven days — or anything from the shelf, same
          bench.
        </Text>
        <View style={styles.bandRow}>
          <Pressable style={[styles.btn, { backgroundColor: colors.ink }]}>
            <Text style={[styles.btnText, { color: colors.paper }]}>Name a book</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnGhost, { borderColor: ink(0.3) }]}>
            <Text style={[styles.btnText, { color: colors.ink2 }]}>Browse the Library</Text>
          </Pressable>
        </View>
      </View>
    </PortalPage>
  );
}

const styles = StyleSheet.create({
  zone: { paddingTop: 6, paddingBottom: 64 },
  leaf: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#362A1C",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 4, height: 8 },
    elevation: 3,
  },
  entry: {},

  // ≤680px: align-items:flex-start; gap:14px; padding:15px 16px
  line: { flexDirection: "row", alignItems: "flex-start", gap: 14, padding: 15, paddingHorizontal: 16 },
  covers: { flexDirection: "row", alignItems: "center" },
  cover: {
    width: 46,
    aspectRatio: 2 / 3,
    borderRadius: 5,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 5,
  },
  coverFanned: { marginLeft: -28, transform: [{ rotate: "4.5deg" }, { translateY: 2 }] },
  coverB: {
    fontFamily: FONTS.serif,
    fontSize: 8,
    lineHeight: 9.6,
    letterSpacing: em(8, 0.03),
    textTransform: "uppercase",
    color: "#F3E2BC",
    textAlign: "center",
  },

  mid: { flex: 1, gap: 3, minWidth: 0 },
  itemGap: { marginTop: 5 },
  title: { fontFamily: FONTS.serif, fontSize: 19, lineHeight: 22.8 },
  detail: { fontFamily: FONTS.sans, fontSize: 12.5 },
  status: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    letterSpacing: em(10, 0.14),
    textTransform: "uppercase",
    marginTop: 4,
  },
  amt: { fontFamily: FONTS.sansBold, fontSize: 13.5, paddingTop: 2 },
  caret: { paddingTop: 6 },
  caretOpen: { transform: [{ rotate: "180deg" }] },

  // ≤680px: padding 2px 16px 18px 16px
  body: { paddingTop: 2, paddingHorizontal: 16, paddingBottom: 18, borderTopWidth: 1 },
  entered: { fontFamily: FONTS.sansSemi, fontSize: 12.5, marginTop: 12 },
  enteredB: { fontFamily: FONTS.sansBold, fontSize: 8.5, letterSpacing: em(8.5, 0.16) },

  steps: { marginTop: 16, paddingLeft: 4 },
  post: { position: "relative", paddingLeft: 28, paddingBottom: 15 },
  postLast: { paddingBottom: 2 },
  postSpine: {
    position: "absolute",
    left: 5,
    top: 17,
    bottom: 1,
    borderLeftWidth: 1,
    borderStyle: "dashed",
    borderLeftColor: "rgba(155,122,77,.5)",
  },
  dot: {
    position: "absolute",
    left: 0,
    top: 4,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 1.5,
  },
  plabel: { fontFamily: FONTS.sansBold, fontSize: 12.5, letterSpacing: em(12.5, 0.02) },
  pnote: { fontFamily: FONTS.sans, fontSize: 12.5, lineHeight: 20, marginTop: 3, maxWidth: 480 },

  track: { fontFamily: FONTS.sansSemi, fontSize: 12.5, marginTop: 14 },
  code: {
    fontFamily: FONTS.sansSemi,
    fontSize: 12.5,
    backgroundColor: "rgba(155,122,77,.12)",
  },

  band: { borderTopWidth: 1, paddingTop: 56, paddingBottom: 64, alignItems: "center" },
  // clamp(24px,3vw,34px) — a phone sits on the 24px floor
  bandH: { fontFamily: FONTS.serifRegular, fontSize: 24, lineHeight: 28, textAlign: "center" },
  bandP: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    lineHeight: 23.8,
    marginTop: 10,
    maxWidth: 420,
    textAlign: "center",
  },
  bandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    flexWrap: "wrap",
    marginTop: 22,
  },
  // .rr-pt-btn
  btn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "transparent",
  },
  btnGhost: { backgroundColor: "transparent" },
  btnText: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    letterSpacing: em(11, 0.08),
    textTransform: "uppercase",
  },
});
