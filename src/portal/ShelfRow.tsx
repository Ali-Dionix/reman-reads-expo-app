// The shelf row — `.rr-shf` / `.rr-shf-card` from app/data/shelfCard.ts.
//
// One card, one row, drawn in one place: the same rule the site set for itself
// when the Acquisitions Desk drifted between builder and enhancer. Every
// listening shelf on the phone renders through this, from the same generated
// records the web bakes (see scripts/gen-mobile-shelf.mjs).
//
// Three cover states, exactly as the CSS branches:
//   art + baked   the artwork already carries its type — print nothing
//   art           type over a bottom gradient, fading in at --shade
//   cloth         type inside a ruled box on the spine colour
//
// The web's hover-revealed paddle buttons have no phone equivalent and are not
// transcribed: the native horizontal scroll IS the gesture, and a floating
// arrow over a thumb-scrollable row is furniture for a mouse.

import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { SITE_ORIGIN } from "../lib/config";
import { useInk, em } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { FONTS } from "../theme/type";

export type ShelfCard = {
  slug: string;
  title: string;
  author?: string;
  art?: string;
  spine?: string;
  /** Per-art fade height, e.g. "48%". */
  shade?: string;
  /** The artwork carries its own type — print no overlay. */
  baked?: boolean;
  meta?: string;
  /** 0..1 — the gilt rule flush with the sleeve's bottom edge. */
  progress?: number;
  /** The recording room's not-yet state. */
  dim?: boolean;
};

// ≤640px: .rr-shf-card{flex-basis:calc((100vw - 64px)/2.4)} — two sleeves and
// a peek of the third. The desktop's fixed 158px only applies above 640px.
const cardWidthFor = (window: number): number =>
  window <= 640 ? (window - 64) / 2.4 : 158;

function Card({
  card,
  width,
  onPress,
}: {
  card: ShelfCard;
  width: number;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const hasArt = !!card.art;
  const shade = Number.parseFloat(card.shade ?? "48") / 100;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={card.title}
      style={({ pressed }) => [
        styles.card,
        { width },
        // .rr-shf-go:hover .rr-shf-cover{transform:translateY(-4px)} — a press
        // on a phone, and it lifts the whole card rather than only the sleeve.
        pressed && { transform: [{ translateY: -4 }] },
      ]}
    >
      {/* .is-dim fades the COVER only — the meta line stays full-strength */}
      <View
        style={[
          styles.cover,
          { backgroundColor: card.spine ?? "#efe2cc" },
          card.dim && styles.dim,
        ]}
      >
        {hasArt ? (
          <Image
            source={{ uri: `${SITE_ORIGIN}${card.art}` }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={160}
          />
        ) : null}

        {/* has-baked-type → the art is the type; print nothing over it */}
        {card.baked ? null : hasArt ? (
          // linear-gradient(transparent, rgba(11,10,8,.6) var(--shade,48%)) —
          // full dark at the --shade stop, held solid to the bottom edge.
          <LinearGradient
            colors={["transparent", "rgba(11,10,8,.6)"]}
            locations={[0, Math.min(1, shade)]}
            style={styles.typeArt}
          >
            <Text style={styles.typeB} numberOfLines={3}>
              {card.title}
            </Text>
            {card.author ? (
              <Text style={styles.typeEm} numberOfLines={1}>
                {card.author}
              </Text>
            ) : null}
          </LinearGradient>
        ) : (
          <View style={styles.typeCloth}>
            <Text style={[styles.typeB, styles.typeBCloth]} numberOfLines={3}>
              {card.title}
            </Text>
            {card.author ? (
              <Text style={[styles.typeEm, styles.typeEmCloth]} numberOfLines={1}>
                {card.author}
              </Text>
            ) : null}
          </View>
        )}

        {/* .rr-shf-rule — the gilt progress rule */}
        {card.progress != null ? (
          <View style={styles.rule}>
            <LinearGradient
              colors={["#9b7a4d", "#b98f55"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ width: `${Math.round(Math.min(1, Math.max(0, card.progress)) * 100)}%`, height: 3 }}
            />
          </View>
        ) : null}
      </View>

      {card.meta ? (
        <Text style={[styles.meta, { color: colors.brown }]} numberOfLines={2}>
          {card.meta}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function ShelfRow({
  title,
  sub,
  cards,
  onOpen,
}: {
  title: string;
  sub?: string;
  cards: ShelfCard[];
  onOpen?: (card: ShelfCard) => void;
}) {
  const { colors } = useTheme();
  const { width: windowW } = useWindowDimensions();
  const cardW = cardWidthFor(windowW);

  // fill rows are "absent, never empty" — the web bakes them hidden and the
  // enhancer stands them up. Same contract here.
  if (!cards.length) return null;

  return (
    <View style={styles.shf}>
      <View style={styles.head}>
        <Text style={[styles.h3, { color: colors.ink2 }]}>{title}</Text>
        {sub ? <Text style={[styles.sub, { color: colors.brown }]}>{sub}</Text> : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        decelerationRate="fast"
        snapToInterval={cardW + 14}
        snapToAlignment="start"
      >
        {cards.map((c) => (
          <Card key={c.slug} card={c} width={cardW} onPress={() => onOpen?.(c)} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shf: { marginTop: 26 },
  head: { flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 10 },
  h3: { fontFamily: FONTS.serif, fontSize: 16.8, letterSpacing: em(16.8, 0.02) },
  sub: { fontFamily: FONTS.sans, fontSize: 12.5, flexShrink: 1 },

  row: { gap: 14, paddingTop: 2, paddingHorizontal: 2, paddingBottom: 10 },
  card: {},
  // .is-dim also desaturates on the web (filter:saturate(.55)); RN has no
  // filters, so the opacity carries the whole not-yet state.
  dim: { opacity: 0.8 },

  cover: {
    aspectRatio: 2 / 3,
    borderRadius: 3,
    overflow: "hidden",
    shadowColor: "#0b0a08",
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  // .rr-shf-type — inset:auto 0 0; padding:34% 9px 9px
  typeArt: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: "34%",
    paddingHorizontal: 9,
    paddingBottom: 9,
    gap: 2,
  },
  // :not(.has-art) — inset:0; a ruled box on the cloth. The web's flex column
  // has no justify-content, so the type sits at the TOP of the box.
  typeCloth: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 2,
    borderWidth: 1,
    borderColor: "rgba(155,122,77,.38)",
    borderRadius: 3,
  },
  typeB: { fontFamily: FONTS.serif, fontSize: 13.1, lineHeight: 16.4, color: "#faf7ef" },
  typeBCloth: { color: "#171411" },
  typeEm: { fontFamily: FONTS.sans, fontSize: 10.9, color: "#faf7ef", opacity: 0.82 },
  typeEmCloth: { color: "#171411" },

  rule: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: "rgba(155,122,77,.22)",
  },
  meta: { marginTop: 7, fontFamily: FONTS.sans, fontSize: 11.5, lineHeight: 15.5 },
});
