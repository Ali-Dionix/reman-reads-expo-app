// `.rr-ov-promo` — the slab: the site's one filled surface, the ink CTA press
// grown to the width of the page. accountPage.ts, at the phone branch
// (≤479px / @container ≤402px — the same three properties either way):
//
//   .rr-ov-promo        flex, align center, gap 12; margin 18px 0 0;
//                       padding 13px 15px 14px; overflow hidden; #0B0A08 under
//                       NOISE; radius 3; two ink drops
//   ::before            inset 4px; 1px rgba(201,166,98,.3); radius 2   → a View
//   .rr-ov-promo-copy   flex 1; min-width min(100%,12.5rem)
//     b                 700 8px Manrope .24em uppercase brass
//     h2                600 18px/1.06 Cormorant -.01em cream; margin-top 5; max-width 12.5rem
//     p                 400 11px/1.4 Manrope cream .6; margin-top 4; max-width 15rem
//     .rr-ov-promo-btn  inline-flex; margin-top 10; padding 9px 17px; cream ground,
//                       1px cream border, pill; ink 700 9.5px .1em uppercase;
//                       3px 3px 0 brass .5
//   .rr-ov-promo-art    flex 0 1 auto; min-width 0; align center; margin-right -30
//     i                 78px × 2/3; radius 2; cover art over the spine colour;
//                       cream ring + two drops; rotate(var(--r))
//     i+i               margin-left -33
//     phone             i:nth-child(-n+2) hidden; the new back loses its overlap
//   .rr-ov-shut         absolute 8px 8px; 25px; ink .62 ground, cream .34 ring,
//                       cream .72 glyph (close, 13px)
//
// THE JACKETS, BACK OF THE FAN FIRST — the order is a display decision, not
// a ranking (accountPage.ts PROMO_SLUGS). The last two are the two a phone
// keeps: The Little Prince and The 48 Laws of Power. Art and spine are the
// lite catalogue's, resolved at build time there; here they are written down
// once, next to the slugs.
//
// NOT DRAWN: the paper grain (NOISE, feTurbulence — see KIT.md).

import { Image, Pressable, View } from "react-native";

import { siteUrl } from "../../lib/web";
import { Disc } from "../../ui/Disc";
import { Icon } from "../../ui/Icon";
import { Txt } from "../../ui/Type";
import { ISLAND, SHADOW } from "./island";

type Jacket = { slug: string; art: string; spine: string };

/** PROMO_SLUGS, back of the fan first, with each one's tilt by position. */
const PROMO: Jacket[] = [
  { slug: "meditations", art: "/assets/covers/marcus-aurelius/meditations-with-type-lib.webp", spine: "#6B5218" },
  { slug: "crime-and-punishment", art: "/assets/covers/dostoevsky/crime-and-punishment-with-type-lib.webp", spine: "#5E2A1E" },
  { slug: "the-little-prince", art: "/assets/covers/antoine-de-saint-exupery/the-little-prince-with-type-lib.webp", spine: "#34506B" },
  { slug: "the-48-laws-of-power", art: "/assets/covers/_google/the-48-laws-of-power.webp", spine: "#3E3760" },
];
const TILT = [-9, -6, -3, 0];

/** The phone branch: two jackets, not four. */
const PHONE_KEEPS = 2;

const JACKET_W = 78;
const JACKET_H = JACKET_W * 1.5;
const OVERLAP = -33;

export function Promo({ onTry, onShut }: { onTry: () => void; onShut: () => void }) {
  const jackets = PROMO.slice(PROMO.length - PHONE_KEEPS);
  const first = PROMO.length - PHONE_KEEPS;
  const artWidth = JACKET_W * jackets.length + OVERLAP * (jackets.length - 1);

  return (
    <View
      accessibilityLabel="The audiobook library"
      style={{
        position: "relative",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 18,
        paddingTop: 13,
        paddingHorizontal: 15,
        paddingBottom: 14,
        overflow: "hidden",
        backgroundColor: ISLAND.ink,
        borderRadius: 3,
        boxShadow: SHADOW.slab,
      }}
    >
      {/* ::before — the inset brass ring */}
      <View
        style={{
          pointerEvents: "none",
          position: "absolute",
          left: 4,
          top: 4,
          right: 4,
          bottom: 4,
          zIndex: 2,
          borderWidth: 1,
          borderColor: ISLAND.ring,
          borderRadius: 2,
        }}
      />

      {/* .rr-ov-promo-copy */}
      <View style={{ flex: 1, minWidth: 200, zIndex: 1 }}>
        <Txt weight={700} size={8} ls={0.24} upper style={{ color: ISLAND.brass }}>
          Roman Reads
        </Txt>
        <Txt
          family="Cormorant Garamond"
          weight={600}
          size={18}
          line={1.06}
          ls={-0.01}
          style={{ marginTop: 5, maxWidth: 200, color: ISLAND.cream }}
        >
          Unlock 100K+ books, ready to listen.
        </Txt>
        <Txt size={11} line={1.4} style={{ marginTop: 4, maxWidth: 240, color: ISLAND.cream60 }}>
          Three are free to play today. We are still recording the rest.
        </Txt>
        <Pressable
          onPress={onTry}
          accessibilityRole="link"
          style={({ pressed }) => ({
            alignSelf: "flex-start",
            marginTop: 10,
            paddingVertical: 9,
            paddingHorizontal: 17,
            backgroundColor: ISLAND.cream,
            borderWidth: 1,
            borderColor: ISLAND.cream,
            borderRadius: 999,
            boxShadow: SHADOW.press,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Txt weight={700} size={9.5} ls={0.1} upper style={{ color: ISLAND.ink }}>
            Try it now
          </Txt>
        </Pressable>
      </View>

      {/* .rr-ov-promo-art — the fan, bleeding off the right edge */}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          pointerEvents: "none",
          flexDirection: "row",
          alignItems: "center",
          width: artWidth,
          height: JACKET_H,
          marginRight: -30,
          zIndex: 1,
        }}
      >
        {jackets.map((j, i) => (
          <View
            key={j.slug}
            style={{
              width: JACKET_W,
              height: JACKET_H,
              marginLeft: i === 0 ? 0 : OVERLAP,
              borderRadius: 2,
              backgroundColor: j.spine,
              overflow: "hidden",
              boxShadow: SHADOW.jacket,
              transform: [{ rotate: `${TILT[first + i] ?? 0}deg` }],
            }}
          >
            {/* RN's own Image, not expo-image: on the web it is a background-image
                at cover, which is exactly how shelfCard.ts draws the art, so the
                two resample alike. */}
            <Image source={{ uri: siteUrl(j.art) }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          </View>
        ))}
      </View>

      {/* .rr-ov-shut */}
      <View style={{ position: "absolute", top: 8, right: 8, zIndex: 3 }}>
        <Disc
          size={25}
          ring={ISLAND.shutRing}
          fill={ISLAND.shutGround}
          onPress={onShut}
          accessibilityLabel="Hide this notice"
          hitSlop={6}
        >
          <Icon name="close" size={13} color={ISLAND.shutInk} />
        </Disc>
      </View>
    </View>
  );
}
