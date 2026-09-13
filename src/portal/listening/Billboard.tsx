// `.rr-bill` — "Featured today", accountListeningPage.ts's one bespoke band,
// at its ≤640px branch:
//
//   .rr-bill        flex row, align center; gap 18; margin 4px 0 34px;
//                   padding 18px 16px 20px; NOISE over #FFFFFF (`white`);
//                   1px dashed rgba(110,86,58,.42) top and bottom, brassed
//                   to rgba(201,166,98,.3) after dark
//   ::after         the ink wash — linear-gradient(105deg, ink .018, 0 38%, ink .024)
//   .rr-bill-slv    96px; the platter peeking out behind the sleeve
//   .rr-bill-disc   right:-16%; top:9%; width 72%; a black record (#15120F —
//                   a deliberate non-token literal so the token pass leaves
//                   it black at night); ::before the label in --lab; ::after
//                   the spindle hole
//   .rr-bill-plate  aspect 2/3; radius 2; the cover art; ::before a gloss
//   .rr-bill-kicker Cormorant small-caps 13px .24em gold2
//   .rr-bill-t      Cormorant 500 26px/1.06 -.01em ink (clamp floor at 390)
//   .rr-bill-by     Cormorant italic 16.5px ink .66
//   .rr-bill-line   Manrope 400 12.5px/1.6 ink .65
//   .rr-bill-btn    the brass pill: `white`, brick, 700 11px .08em uppercase
//
// Not drawn: the paper grain (NOISE — feTurbulence is unimplemented natively,
// see KIT.md) and the platter's repeating-radial grooves are drawn as rings.

import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { SITE_ORIGIN } from "../../lib/config";
import { useInk } from "../../theme/ink";
import { useTheme } from "../../theme/ThemeProvider";
import { Rule } from "../../ui/Rule";
import { Txt } from "../../ui/Type";
import { fillProps, strokeProps } from "../../ui/svgPaint";

export type BillboardBook = {
  slug: string;
  title: string;
  author: string;
  blurb: string;
  labelHue: string;
  art?: string;
  spine: string;
};

/** `.rr-bill-slv{width:96px}` at ≤640px. */
const SLEEVE_W = 96;
const PLATE_H = SLEEVE_W * 1.5;

/**
 * Shadows and object literals the token pass never maps (box-shadow is on the
 * web's skip list; the record is a lit object). Stated once, here.
 */
const OBJ = {
  /** .rr-bill-disc — "a black record at night rather than flipping it cream". */
  record: "#15120F",
  /** .rr-bill-plate.has-art{background-color:#FFFFFF} — the plate is a theme
   *  ISLAND (theme.ts ISLAND_ROOTS): a lit sleeve that stays white at night,
   *  seen under the art while it loads and whenever it does not. */
  plate: "#FFFFFF",
  recordGroove: "rgba(0,0,0,.5)",
  recordBed: "rgba(0,0,0,.18)",
  recordShadow: "4px 6px 14px rgba(54,42,28,.3)",
  labelRing: "rgba(0,0,0,.35)",
  spindle: "#FBF5E4",
  spindleRing: "rgba(0,0,0,.4)",
  plateShadow:
    "0 0 0 1px rgba(43,30,16,.32), 2px 4px 4px -1px rgba(54,42,28,.26), 14px 20px 34px -10px rgba(54,42,28,.34)",
  /** .rr-bill-btn — brass rings and a drop, never mapped. */
  btnShadow: "0 0 0 1px rgba(155,122,77,.9), 0 0 0 4px rgba(155,122,77,.14), 0 3px 8px rgba(43,30,16,.2)",
  /** .rr-bill-btn:hover{background:#7E2D1F;color:#F1E4C4} — the seal turns to
   *  the cloth itself. Neither is a theme token (brick is text/border-scoped,
   *  and #F1E4C4 is nowhere in theme.ts), so the same pair day and night. */
  btnActive: "#7E2D1F",
  btnActiveInk: "#F1E4C4",
  /** .rr-bill::after — the ink wash. Ink is text/border-scoped, so as a
   *  background it stays ink at night, exactly like CHROME.tearWash. */
  wash: ["rgba(11,10,8,.018)", "rgba(11,10,8,0)", "rgba(11,10,8,.024)"] as const,
  /** .rr-bill-plate::before — the gloss. */
  gloss: ["rgba(255,255,255,.16)", "rgba(255,255,255,0)", "rgba(0,0,0,.18)"] as const,
} as const;

/**
 * `.rr-bill-disc`'s repeating-radial-gradient: rgba(0,0,0,.5) for 1px, then
 * .18 for 2px, from the centre out — concentric 1px rings on a 3px period.
 */
function Grooves({ size }: { size: number }) {
  const r = size / 2;
  const rings: number[] = [];
  for (let rr = 0.5; rr < r; rr += 3) rings.push(rr);
  return (
    <Svg width={size} height={size} style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      {rings.map((rr) => (
        <Circle key={rr} cx={r} cy={r} r={rr} fill="none" {...strokeProps(OBJ.recordGroove)} strokeWidth={1} />
      ))}
    </Svg>
  );
}

function Platter({ hue }: { hue: string }) {
  const size = SLEEVE_W * 0.72;
  const inset = size * 0.295;
  return (
    <View
      style={{
        pointerEvents: "none",
        position: "absolute",
        right: -SLEEVE_W * 0.16,
        top: PLATE_H * 0.09,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: OBJ.record,
        boxShadow: OBJ.recordShadow,
      }}
    >
      <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: OBJ.recordBed }]} />
      <Grooves size={size} />
      {/* ::before — the paper label, inset 29.5%, in the book's own hue */}
      <View
        style={{
          position: "absolute",
          top: inset,
          left: inset,
          right: inset,
          bottom: inset,
          borderRadius: size / 2,
          backgroundColor: hue,
          borderWidth: 1,
          borderColor: OBJ.labelRing,
        }}
      />
      {/* ::after — the spindle hole: 6px, ringed 1.5px */}
      <View
        style={{
          position: "absolute",
          top: size / 2 - 3,
          left: size / 2 - 3,
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: OBJ.spindle,
          boxShadow: `0 0 0 1.5px ${OBJ.spindleRing}`,
        }}
      />
    </View>
  );
}

/** icPlay(14) — the seal's glyph. */
function PlayGlyph({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Path d="M3 2.2v9.6l8-4.8-8-4.8Z" {...fillProps(color)} />
    </Svg>
  );
}

export function Billboard({
  book,
  onOpen,
  onPlay,
}: {
  book: BillboardBook;
  /** The title line — opens the volume (the site's ?book= flow). */
  onOpen?: () => void;
  /** The seal — resumes through the deck. */
  onPlay?: () => void;
}) {
  const { colors, mode, bg } = useTheme();
  const { brown, brass } = useInk();
  // html[data-rr-theme="dark"] .rr-bill{border-color:rgba(201,166,98,.3)}
  const rule = mode === "dark" ? brass(0.3, "border") : brown(0.42, "border");

  return (
    <View
      accessibilityLabel="Featured audiobook"
      style={{ marginTop: 4, marginBottom: 34, backgroundColor: bg("white"), overflow: "hidden" }}
    >
      <Rule color={rule} />
      {/* ::after — the ink wash, pulled across the band */}
      <LinearGradient
        colors={OBJ.wash}
        locations={[0, 0.38, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.27 }}
        style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
      />
      <View style={styles.bill}>
        <View style={styles.slv}>
          <Platter hue={book.labelHue} />
          <View style={[styles.plate, { backgroundColor: book.art ? OBJ.plate : book.spine }]}>
            {book.art ? (
              <Image
                source={{ uri: `${SITE_ORIGIN}${book.art}` }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={0}
              />
            ) : null}
            {/* .rr-bill-plate::before — the gloss */}
            <LinearGradient
              colors={OBJ.gloss}
              locations={[0, 0.36, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.53, y: 0.85 }}
              style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
            />
          </View>
        </View>

        <View style={styles.txt}>
          {/* .rr-bill-kicker — font-variant: small-caps. The site's Cormorant
              arrives from the Google CSS API with its smcp table stripped, so
              Chrome SYNTHESISES the small caps: capitals at 0.7× the size
              (Blink's kSmallCapsFontSizeMultiplier). The bundled TTF carries
              real smcp, which draws wider and taller — and Android ignores
              fontVariant anyway. So the synthesis is written out: the
              capital at 13px, the rest as capitals at 9.1px, one tracking. */}
          <Txt family="Cormorant Garamond" weight={400} size={13} ls={0.24} color="gold2">
            F
            <Txt family="Cormorant Garamond" weight={400} size={13 * 0.7} ls={0.24 * (1 / 0.7)} color="gold2" upper>
              eatured today
            </Txt>
          </Txt>

          {/* 26px/1.06 is 27.56; it is written as 27.5 because Chrome lays the
              site out in 1/64px units and floors — two lines of 27.56 land
              0.06px above where the app's would, which is enough to snap the
              author line's baseline (and every row under it) one pixel down.
              Invisible at DPR 3; measured at DPR 1. */}
          <Pressable onPress={onOpen} accessibilityRole="link" hitSlop={4} style={{ marginTop: 5 }}>
            <Txt family="Cormorant Garamond" weight={500} size={26} line={27.5} ls={-0.01}>
              {book.title}
            </Txt>
          </Pressable>

          <Txt family="Cormorant Garamond" weight={400} italic size={16.5} tone={0.66} style={{ marginTop: 6 }}>
            {book.author}
          </Txt>
          <Txt size={12.5} line={1.6} tone={0.65} style={{ marginTop: 9, maxWidth: 34 * 12.5 }}>
            {book.blurb}
          </Txt>

          <Pressable
            onPress={onPlay}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.btn,
              // :hover — see OBJ.btnActive
              { backgroundColor: pressed ? OBJ.btnActive : bg("white"), boxShadow: OBJ.btnShadow },
            ]}
          >
            {({ pressed }) => {
              const sealInk = pressed ? OBJ.btnActiveInk : colors.brick;
              return (
                <>
                  <PlayGlyph color={sealInk} />
                  <Txt weight={700} size={11} ls={0.08} upper style={{ color: sealInk }}>
                    Begin listening
                  </Txt>
                </>
              );
            }}
          </Pressable>
        </View>
      </View>
      <Rule color={rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  bill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  slv: { width: SLEEVE_W },
  plate: {
    width: SLEEVE_W,
    height: PLATE_H,
    borderRadius: 2,
    overflow: "hidden",
    boxShadow: OBJ.plateShadow,
  },
  txt: { flex: 1, alignItems: "flex-start", minWidth: 0 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 19,
    paddingVertical: 10,
    borderRadius: 999,
  },
});
