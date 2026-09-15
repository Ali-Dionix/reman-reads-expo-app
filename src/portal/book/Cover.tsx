// The hero cover — `.rr-bk-cover` from app/data/bookPage.ts at the ≤760px
// branch (`.rr-bk-covwrap{max-width:250px}`): a 2:3 board, 12px radius, on
// the spine colour, in its three states exactly as the CSS branches:
//
//   cloth        no art. A 165° white-to-black wash over the spine, and the
//                house type set in cream, centred: brand (absolute, top 20),
//                title, a 34×2 rule, the author.
//   art          `.has-art`: the full board laid over white, and — unless
//                the art carries its own type — a cream shade falling from
//                the top edge to `--shade` (48% by default) with the type
//                set top-left in ink over it: brand, the title in caps, a
//                38×3 rule in the SPINE colour, the author.
//   baked        `.has-art.has-baked-type`: the board alone; every piece of
//                type is display:none.
//
// A THEME ISLAND (theme.ts ISLAND_ROOTS carries .rr-bk-cover): nothing here
// takes the mode. The cream, the ink, the white under the art and the two
// text-shadows are the builder's literals; the spine is the catalogue's own.
//
// The shadow is `0 22px 50px -22px rgba(11,10,8,.5)` — a spread of −22 pulls
// the blur in under the board so it reads as a lift, not a halo. RN's
// boxShadow takes the spread as CSS does.

import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, View, type TextStyle } from "react-native";

import { SITE_ORIGIN } from "../../lib/config";
import { OBJECT, lit } from "../../theme/tokens";
import { Txt } from "../../ui/Type";
import type { BookPage } from "./data";

/** `.rr-bk-covwrap{max-width:250px}` at the phone branch. */
export const HERO_MAX = 250;

/** `.rr-bk-ctitle` etc. — the cream the cloth's type is set in. */
const CREAM = "#F3E2BC";
/** `.has-art .rr-bk-ctitle` — the ink over the shade. */
const ART_INK = "#171411";
/** The shade's cream — rgba(239,222,190,…). */
const SHADE = "239,222,190";

/**
 * CSS `text-shadow: <x> <y> <blur> <color>`. Native RN 0.86 still takes the
 * three-prop form and nothing else; react-native-web 0.21 has deprecated
 * that trio for the CSS string and warns on every render that uses it. So
 * each platform gets the form it asks for — the web's is untyped in RN's
 * TextStyle, hence the cast.
 */
const textShadow = (x: number, y: number, blur: number, color: string): TextStyle =>
  Platform.OS === "web"
    ? ({ textShadow: `${x}px ${y}px ${blur}px ${color}` } as TextStyle)
    : { textShadowColor: color, textShadowOffset: { width: x, height: y }, textShadowRadius: blur };

/**
 * linear-gradient(165deg, …) on a 2:3 box. CSS runs the gradient line
 * through the centre at 165° clockwise from "to top", its length
 * w·|sin θ| + h·|cos θ|; the endpoints below are that line's ends in the
 * box's own unit coordinates (w = 2, h = 3), so the wash lands where the
 * browser puts it rather than corner to corner.
 */
const WASH_START = { x: 0.279, y: -0.05 };
const WASH_END = { x: 0.721, y: 1.05 };

export function HeroCover({
  page,
  title,
  author,
  spine,
  width,
}: {
  page: BookPage;
  title: string;
  author: string;
  /** The spine colour — the catalogue's own, never mapped. */
  spine: string;
  width: number;
}) {
  const height = width * 1.5;
  const hasArt = !!page.art;
  const shade = Number.parseFloat(page.shade ?? "48") / 100;

  return (
    <View
      accessible={false}
      style={[
        styles.board,
        { width, height, backgroundColor: hasArt ? lit("white") : spine || OBJECT.cover.cloth },
      ]}
    >
      {hasArt ? (
        <Image
          source={{ uri: `${SITE_ORIGIN}${page.art}` }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={0}
          priority="high"
        />
      ) : (
        <LinearGradient
          colors={["rgba(255,255,255,.1)", "rgba(0,0,0,.22)"]}
          start={WASH_START}
          end={WASH_END}
          style={StyleSheet.absoluteFill}
        />
      )}

      {hasArt && !page.baked ? (
        // ::after — inset:0 0 auto; height:var(--shade); the cream holds .82
        // to 70% of its own height and then lets the art through
        <LinearGradient
          colors={[`rgba(${SHADE},.97)`, `rgba(${SHADE},.82)`, `rgba(${SHADE},0)`]}
          locations={[0, 0.7, 1]}
          style={{ position: "absolute", left: 0, right: 0, top: 0, height: height * shade, pointerEvents: "none" }}
        />
      ) : null}

      {page.baked ? null : hasArt ? (
        // .has-art — the type sits top-left over the shade, in ink
        <View style={styles.typeArt}>
          <Txt weight={700} size={8} ls={0.24} upper style={[styles.artInk, { color: "rgba(23,20,17,.72)", marginBottom: 10 }]}>
            Roman Reads
          </Txt>
          <Txt
            family="Cormorant Garamond"
            weight={600}
            size={24}
            line={0.95}
            ls={-0.02}
            upper
            style={[styles.artInk, { color: ART_INK, maxWidth: "94%" }]}
          >
            {title}
          </Txt>
          <View style={{ width: 38, height: 3, marginTop: 11, marginBottom: 9, backgroundColor: spine }} />
          <Txt weight={700} size={8.5} ls={0.18} upper style={[styles.artInk, { color: "rgba(23,20,17,.76)" }]}>
            {author}
          </Txt>
        </View>
      ) : (
        // the cloth — the type centred in cream, the brand pinned to the top
        <View style={styles.typeCloth}>
          <Txt
            weight={700}
            size={8}
            ls={0.24}
            upper
            style={{ position: "absolute", top: 20, left: 0, right: 0, textAlign: "center", color: "rgba(243,226,188,.7)" }}
          >
            Roman Reads
          </Txt>
          <Txt
            family="Cormorant Garamond"
            weight={600}
            size={22}
            line={1.1}
            style={[styles.clothTitle, { color: CREAM }]}
          >
            {title}
          </Txt>
          <View style={{ width: 34, height: 2, marginVertical: 14, backgroundColor: "rgba(243,226,188,.5)" }} />
          <Txt weight={700} size={9} ls={0.24} upper style={{ paddingHorizontal: 6, textAlign: "center", color: "rgba(243,226,188,.78)" }}>
            {author}
          </Txt>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 22px 50px -22px rgba(11,10,8,.5)",
  },
  // .rr-bk-cover{padding:22px 16px; align-items:center; justify-content:center}
  typeCloth: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  // .rr-bk-ctitle{text-shadow:0 1px 2px rgba(0,0,0,.4); padding:0 6px}
  clothTitle: {
    paddingHorizontal: 6,
    textAlign: "center",
    ...textShadow(0, 1, 2, "rgba(0,0,0,.4)"),
  },
  // .has-art{padding:20px 18px; align-items:flex-start; justify-content:flex-start}
  typeArt: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: "flex-start",
  },
  // text-shadow:0 1px rgba(250,247,239,.72) — a one-pixel paper lift, no blur
  artInk: textShadow(0, 1, 0, "rgba(250,247,239,.72)"),
});
