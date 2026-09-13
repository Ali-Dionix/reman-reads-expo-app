// /account/orders — the sheet (app/data/accountOrdersPage.ts, `.rr-od-*`),
// at its ≤680px branch.
//
// One quiet paper sheet; every order is a hairline-ruled row: the covers of
// the books in the parcel, the order details, and a status line. Each row
// opens into read-only delivery status points (placed → paid → packed →
// shipped → delivered) plus the order facts and tracking. The <details>/
// <summary> disclosure becomes component state; the caret still turns 180°.
//
// THE PHONE BRANCH, line by line (`@media (max-width:680px)`):
//   .rr-od-line   align-items:flex-start; gap:14px; padding:15px 16px
//   .rr-od-title  white-space:normal  (the title wraps instead of clipping)
//   .rr-od-amt    margin-left:auto; padding-top:2px
//   .rr-od-caret  padding-top:6px
//   .rr-od-body   padding:2px 16px 18px 16px  (the 82px indent goes)
//
// The covers are the page's only physical objects — theme islands
// (`.rr-od-cover` in theme.ts ISLAND_ROOTS), lit at night like every cover on
// the site, so their colours are constants here and never take the mode.
// The sheet's own two-layer box-shadow is brown in both modes as well: the
// web's tokeniser skips box-shadow, so the night sheet keeps a warm shadow.
//
// The fractal paper grain (`NOISE`, paperMarks.ts) has no native
// feTurbulence, so it is BAKED: grain.png is the 200×200 tile as Chrome
// draws it (alpha ≤ .05), laid over the white role with resizeMode "repeat"
// — background-size:200px 200px, tiled from the leaf's corner on the phone.
// Not drawn: the hover wash, which a phone has no hover for (the pressed
// state wears the same 7% brass instead).

import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image as Tile, Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { SITE_ORIGIN } from "../../lib/config";
import { useInk } from "../../theme/ink";
import { useTheme } from "../../theme/ThemeProvider";
import { OBJECT } from "../../theme/tokens";
import { snap } from "../../theme/type";
import { Rule } from "../../ui/Rule";
import { Txt } from "../../ui/Type";
import { pressedSlugOf, useLedger, type Order, type OrderItem, type OrderStep } from "./data";
import { strokeProps } from "../../ui/svgPaint";

/** paperMarks.ts's NOISE, baked (see the header). */
const GRAIN = require("./grain.png");

/**
 * `linear-gradient(165deg, …)` on the 46×69 cover, as start/end points in
 * the box's own unit square. CSS runs the gradient line through the centre
 * at the angle, long enough for the corners to sit at 0% and 100%
 * (L = w·|sin θ| + h·|cos θ|); expo-linear-gradient takes the two ends.
 */
const CLOTH_LIGHT = (() => {
  const w = 46, h = 69, t = (165 * Math.PI) / 180;
  const sin = Math.sin(t), cos = Math.cos(t);
  const half = (w * Math.abs(sin) + h * Math.abs(cos)) / 2;
  return {
    start: { x: 0.5 - (half * sin) / w, y: 0.5 + (half * cos) / h },
    end: { x: 0.5 + (half * sin) / w, y: 0.5 - (half * cos) / h },
  };
})();

/** The cover island's constants — never mapped on the web, never here. */
const COVER = OBJECT.cover;

/** Chrome floors a computed line-height to a 1/64px LayoutUnit — type.ts's snap. */
const lu = snap;

/** `.rr-od-leaf`'s box-shadow — skipped by the tokeniser, so brown at night too. */
const LEAF_SHADOW = "1px 2px 1px rgba(54,42,28,.14), 8px 12px 22px rgba(54,42,28,.12)";

/**
 * `.rr-od-post.is-now .rr-od-dot{box-shadow:inset 0 0 0 2.5px #7E2D1F}` —
 * box-shadow is on the tokeniser's skip list, so the inner ring stays
 * #7E2D1F at night while the 1.5px border around it takes the night brick.
 * Two colours after dark, one by day; the 3px hole in the middle is what
 * makes it read as a ring and not a disc.
 */
const NOW_RING = "#7E2D1F";

/** `.rr-od-cover` — one cover thumb: catalogue art, or the cloth spine with the title set on it. */
function Cover({ item, index }: { item: OrderItem; index: number }) {
  const art = item.cover.art;
  return (
    <View
      style={[
        styles.cover,
        { backgroundColor: art ? COVER.artPaper : (item.cover.spine ?? COVER.cloth) },
        // .rr-od-covers .rr-od-cover+.rr-od-cover — fanned behind the first
        index > 0 && styles.coverFanned,
        index === 0 && { zIndex: 2 },
      ]}
    >
      {art ? (
        <Image
          source={{ uri: `${SITE_ORIGIN}${art}` }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={0}
        />
      ) : (
        // background:linear-gradient(165deg,rgba(255,255,255,.12),rgba(0,0,0,.22)),var(--bk)
        // — the cloth is lit from the top-left corner, not a flat swatch.
        <LinearGradient
          colors={["rgba(255,255,255,.12)", "rgba(0,0,0,.22)"]}
          start={CLOTH_LIGHT.start}
          end={CLOTH_LIGHT.end}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      {/* `.rr-od-cover.has-art b{display:none}` — art never carries our lettering */}
      {!art ? (
        <Txt
          family="Cormorant Garamond"
          weight={600}
          size={8}
          line={1.2}
          ls={0.03}
          upper
          numberOfLines={4}
          style={{ color: COVER.clothInk, textAlign: "center" }}
        >
          {item.cover.title}
        </Txt>
      ) : null}
      {/* inset 0 0 0 1px — the ring sits ON the art, so it is a layer above it */}
      <View style={[StyleSheet.absoluteFill, styles.coverRing]} />
    </View>
  );
}

/**
 * `.rr-od-caret` — the 13×9 chevron, ink at .4, turned 180° when the row is
 * open. AT THIS SIZE IT IS TINY ON PURPOSE: the ≤680px branch gives the svg
 * `padding-top:6px`, and with the page's `*{box-sizing:border-box}` that
 * padding comes OUT of the 9px height, so the 12×8 viewBox is fitted into a
 * 13×3 window (xMidYMid meet) — a 4.5×3 chevron on the site, and so here.
 */
function Caret({ open }: { open: boolean }) {
  const { ink } = useInk();
  return (
    <View style={[styles.caret, open && styles.caretOpen]}>
      <Svg width={13} height={3} viewBox="0 0 12 8" preserveAspectRatio="xMidYMid meet" fill="none">
        <Path d="M1 1l5 5 5-5" {...strokeProps(ink(0.4))} strokeWidth={1.5} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

/**
 * `.rr-od-post::before` — the dashed spine between two status points:
 * `border-left:1px dashed rgba(155,122,77,.5)` from 17px down to 1px up —
 * the kit's Rule stood on end, with Chrome's dash fit run down its length.
 */
function Spine() {
  const { brass } = useInk();
  return <Rule axis="vertical" color={brass(0.5, "border")} style={styles.spine} />;
}

/** `.rr-od-post` — one delivery point on the dashed spine. */
function Post({ step, state, last }: { step: OrderStep; state: "done" | "now" | "todo"; last: boolean }) {
  const { brass } = useInk();
  const { colors } = useTheme();

  // .rr-od-dot: 11px, 1.5px brass ring at .6. Done: brass fill. Now: the
  // 1.5px border (mapped: brick) with the 2.5px inset shadow (NOT mapped:
  // #7E2D1F) inside it, and a 3px hole — drawn as two strokes, as the site
  // composes it, because one 4px ring is a filled disc in the wrong colour.
  const dot =
    state === "done"
      ? { backgroundColor: colors.brass, borderColor: colors.brass, borderWidth: 1.5 }
      : { borderColor: brass(0.6, "border"), borderWidth: 1.5 };

  return (
    <View style={[styles.post, last && styles.postLast]}>
      {!last ? <Spine /> : null}
      {state === "now" ? (
        <Svg width={11} height={11} style={styles.dot} pointerEvents="none">
          {/* border:1.5px solid — the outer rim, r 5.5 → 4 */}
          <Circle cx={5.5} cy={5.5} r={4.75} {...strokeProps(colors.brick)} strokeWidth={1.5} fill="none" />
          {/* inset 0 0 0 2.5px — the inner ring. Nominally r 4 → 1.5, but
              Chrome rounds the spread on the 4px-radius padding box to a 2px
              ring with a 4px hole (site pixels: hole cols 45–47 clear, 44 and
              48 half-covered), and the pixels are what parity measures. */}
          <Circle cx={5.5} cy={5.5} r={3} {...strokeProps(NOW_RING)} strokeWidth={2} fill="none" />
        </Svg>
      ) : (
        <View style={[styles.dot, dot]} />
      )}
      {/* .rr-od-plabel is an inline span: its line box is the <li>'s own 16px
          strut (22px), and the 12.5px label sits on that baseline 4px down. */}
      <Txt
        weight={700}
        size={12.5}
        ls={0.02}
        color={state === "done" ? "ink2" : state === "now" ? "brick" : undefined}
        tone={state === "todo" ? 0.42 : undefined}
        style={styles.plabel}
      >
        {step.label}
      </Txt>
      <Txt size={12.5} line={1.6} tone={0.55} style={styles.pnote}>
        {step.note}
      </Txt>
    </View>
  );
}

/**
 * `.rr-od-entered b` / `.rr-od-track b` — the brass eyebrow inside a fact
 * line. Inline on the site, so it nests inside the fact's own Text; the
 * `margin-right:6px` (which a nested Text cannot carry on the phone) is a
 * space at the fact's own size — 2.5px in Manrope 12.5 — tracked out to 6.
 */
function FactLabel({ children }: { children: string }) {
  return (
    <>
      <Txt weight={700} size={8.5} ls={0.24} upper color="gold2">
        {children}
      </Txt>
      <Txt weight={500} size={12.5} tone={0.6} style={styles.factGap}>
        {" "}
      </Txt>
    </>
  );
}

/** `.rr-od-body` — the open row: facts, the status points, tracking. */
function Body({ order }: { order: Order }) {
  const { ink, brass } = useInk();
  const books = order.items.length > 1 ? `${order.items.length} books · ` : "";
  return (
    <View>
      <Rule kind="solid" color={ink(0.07, "border")} />
      <View style={styles.body}>
        {/* .rr-od-entered — one <p>: <b>Order</b>RR-0003 · placed 17 July 2026 · 2 books · paid online.
            One Text, so when it wraps (the two-book row does, at 390px) the
            second line returns to the leaf's edge, not to under the facts. */}
        <Txt weight={500} size={12.5} tone={0.6} style={styles.fact}>
          <FactLabel>Order</FactLabel>
          {`${order.id} · placed ${order.placed} · ${books}${order.paid ?? "paid online"}`}
        </Txt>

        {/* .rr-od-steps — list-style none; margin 16px 0 0; padding-left 4px */}
        <View style={styles.steps}>
          {order.steps.map((s, i) => (
            <Post
              key={i}
              step={s}
              state={i < order.done ? "done" : i === order.done ? "now" : "todo"}
              last={i === order.steps.length - 1}
            />
          ))}
        </View>

        {order.tracking ? (
          <View style={[styles.fact, styles.factRow, { marginTop: 14 }]}>
            <FactLabel>Tracked</FactLabel>
            {/* .rr-od-track code — 600 12.5 ink2 on brass .12, 6px radius, 3px 8px */}
            <View style={[styles.code, { backgroundColor: brass(0.12, "bg") }]}>
              <Txt weight={600} size={12.5} color="ink2">
                {order.tracking}
              </Txt>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * `.rr-od-note` — the clerk's pencil note: OrdersEnhancer fills it on lines
 * whose book has a live recording, linking to the Listening Room with that
 * book. Static copy only, verbatim from the enhancer.
 *
 * The site links `/account/listening?book=<slug>`, which opens that title;
 * the Audiobooks screen reads the `book` param and does the same.
 */
function AudioNote({ slug }: { slug: string }) {
  const router = useRouter();
  return (
    <View style={styles.note}>
      <Pressable
        accessibilityRole="link"
        hitSlop={4}
        onPress={() => router.navigate({ pathname: "/listening", params: { book: slug } } as never)}
      >
        <Txt family="Caveat" weight={500} size={14.5} color="brown" style={styles.noteText}>
          the audiobook is ready. listen while your book is printed
        </Txt>
      </Pressable>
    </View>
  );
}

/** `.rr-od-entry` — one order: the summary line, and the body once opened. */
function Entry({ order, last }: { order: Order; last: boolean }) {
  const [open, setOpen] = useState(false);
  const { ink, brass } = useInk();

  // .rr-od-status.is-soon once every post is done — unless OrdersEnhancer
  // drew the row, which prints every real order is-live.
  const allDone = order.done >= order.steps.length && !order.live;
  const pressed = pressedSlugOf(order);

  return (
    <View>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed: down }) => [down && { backgroundColor: brass(0.07, "bg") }]}
      >
        <View style={styles.line}>
          {/* .rr-od-covers — one per book in the parcel, fanned when there are several */}
          <View style={styles.covers}>
            {order.items.map((item, i) => (
              <Cover key={`${order.id}-${i}`} item={item} index={i} />
            ))}
          </View>

          {/* .rr-od-mid — one line pair per book, then the status, then the note */}
          <View style={styles.mid}>
            {order.items.map((item, i) => (
              <View key={item.title} style={[styles.item, i > 0 && styles.itemGap]}>
                <Txt family="Cormorant Garamond" weight={600} size={19} line={lu(19 * 1.2)} color="ink2">
                  {item.title}
                </Txt>
                <Txt size={12.5} tone={0.55} numberOfLines={1} ellipsizeMode="tail">
                  {item.detail}
                </Txt>
              </View>
            ))}
            <Txt
              weight={700}
              size={10}
              ls={0.2}
              upper
              color={allDone ? undefined : "gold2"}
              tone={allDone ? 0.62 : undefined}
              style={styles.status}
            >
              {order.statusLine}
            </Txt>
            {pressed ? <AudioNote slug={pressed} /> : null}
          </View>

          {/* .rr-od-amt — 700 13.5 tabular ink2, 2px down at this size */}
          <Txt weight={700} size={13.5} color="ink2" style={styles.amt}>
            {order.amount}
          </Txt>

          <Caret open={open} />
        </View>
      </Pressable>

      {open ? <Body order={order} /> : null}

      {/* .rr-od-entry{border-bottom:1px solid rgba(11,10,8,.1)}; :last-of-type none */}
      {!last ? <Rule kind="solid" color={ink(0.1, "border")} /> : null}
    </View>
  );
}

/** `.rr-od-zone` > `.rr-od-leaf` — the ledger sheet with every order on it. */
export function Ledger() {
  const { bg } = useTheme();
  const { ink } = useInk();
  const orders = useLedger();
  return (
    <View style={styles.zone}>
      <View style={[styles.leaf, { backgroundColor: bg("white"), borderColor: ink(0.3, "border") }]}>
        {/* background:NOISE,#FFFFFF — the grain tiles over the white role, under the rows */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* width/height 100% as well: a static asset otherwise keeps its own 200×200 */}
          <Tile source={GRAIN} resizeMode="repeat" style={styles.grain} />
        </View>
        {orders.map((o, i) => (
          <Entry key={o.id} order={o} last={i === orders.length - 1} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* .rr-od-zone{padding:6px 0 64px} */
  zone: { paddingTop: 6, paddingBottom: 64 },
  /* .rr-od-leaf — 1px ink .3 ring, 14px radius, overflow clip, the two-layer shadow */
  leaf: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: LEAF_SHADOW,
  },
  grain: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },

  /* ≤680: align-items:flex-start; gap:14px; padding:15px 16px */
  line: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingVertical: 15, paddingHorizontal: 16 },
  covers: { flexDirection: "row", alignItems: "center" },
  /* .rr-od-cover — 46px, 2/3, 5px radius, padding 5px 4px, the title centred */
  cover: {
    width: 46,
    aspectRatio: 2 / 3,
    borderRadius: 5,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 5,
    boxShadow: COVER.thumbShadow,
  },
  coverRing: { borderWidth: 1, borderColor: COVER.ring, borderRadius: 5, pointerEvents: "none" },
  /* .rr-od-cover+.rr-od-cover{margin-left:-28px;transform:rotate(4.5deg) translateY(2px)} */
  coverFanned: { marginLeft: -28, transform: [{ rotate: "4.5deg" }, { translateY: 2 }] },

  /* .rr-od-mid{display:flex;flex-direction:column;gap:3px;min-width:0} */
  mid: { flex: 1, minWidth: 0, gap: 3 },
  /* .rr-od-item{gap:2px}; .rr-od-item+.rr-od-item{margin-top:5px} */
  item: { gap: 2, minWidth: 0 },
  itemGap: { marginTop: 5 },
  /* .rr-od-status{margin-top:4px} */
  status: { marginTop: 4 },
  /* .rr-od-note{margin-top:3px;transform:rotate(-.4deg)} */
  note: { marginTop: 3, transform: [{ rotate: "-0.4deg" }], alignSelf: "flex-start" },
  /* a{text-decoration:underline;text-underline-offset:3px} — RN has no offset */
  noteText: { textDecorationLine: "underline" },

  /* ≤680: .rr-od-amt{margin-left:auto;padding-top:2px} */
  amt: { marginLeft: "auto", paddingTop: 2, fontVariant: ["tabular-nums"] },
  /* ≤680: .rr-od-caret{padding-top:6px} — inside the 13×9 border box */
  caret: { width: 13, height: 9, paddingTop: 6 },
  caretOpen: { transform: [{ rotate: "180deg" }] },

  /* ≤680: .rr-od-body{padding:2px 16px 18px 16px} */
  body: { paddingTop: 2, paddingHorizontal: 16, paddingBottom: 18 },
  /* .rr-od-entered{margin:12px 0 0} — the brass label then the facts, one paragraph */
  fact: { marginTop: 12 },
  /* .rr-od-track — the label and its code chip, which never wraps */
  factRow: { flexDirection: "row", alignItems: "baseline" },
  /* b{margin-right:6px} — a 2.5px space tracked out by 3.5 */
  factGap: { letterSpacing: 3.5 },
  /* .rr-od-track code{border-radius:6px;padding:3px 8px} — inline, so the
     padding overhangs the 17px line box 3px each way and adds no height */
  code: { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8, marginVertical: -3 },

  /* .rr-od-steps{margin:16px 0 0;padding:0 0 0 4px} */
  steps: { marginTop: 16, paddingLeft: 4 },
  /* .rr-od-post{position:relative;padding:0 0 15px 28px} */
  post: { position: "relative", paddingLeft: 28, paddingBottom: 15 },
  postLast: { paddingBottom: 2 },
  /* .rr-od-post::before{left:5px;top:17px;bottom:1px} */
  spine: { position: "absolute", left: 5, top: 17, bottom: 1, width: 1, pointerEvents: "none" },
  /* .rr-od-dot{left:0;top:4px;width:11px;height:11px;border-radius:50%} */
  dot: { position: "absolute", left: 0, top: 4, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "transparent" },
  /* the label's 17px on the li's 22px strut: 4 above, 1 below */
  plabel: { marginTop: 4, marginBottom: 1 },
  /* .rr-od-pnote{margin:3px 0 0;max-width:480px} */
  pnote: { marginTop: 3, maxWidth: 480 },
});
