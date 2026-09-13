// `.rr-lr-nar-disc` / `.rr-lr-vc-face` — a reader's record label.
//
// The label is the reader's hue with their initial in cream (Cormorant 400,
// #F1E4C4), and the PORTRAIT is a layer laid OVER it (the site's `::before`
// with `--face` at cover), so a file that never arrives leaves the letter
// standing and no broken-image glyph is possible. A theme island: nothing
// here takes the mode.
//
// States are the site's, by opacity on the disc itself: .6 at rest, 1 with a
// brass outline when checked, .34 through `grayscale(.75)` when the reader
// cannot be chosen. The badge is a CHILD of the disc on the site and dims
// with it — so it is passed in as children here and sits inside the same
// opacity. The disc does not clip (the badge hangs 1px past its rim); the
// portrait clips itself.
//
// SILENT TO A SCREEN READER. The site's disc span is aria-hidden and its
// portrait a background layer, so a reader is announced by the button's
// label alone — "Ambrose Reed sign up to listen" — not "A, image, image,
// Ambrose Reed…". The whole label is hidden from assistive tech, badge and
// all: the state the badge draws is in the label's text.

import { useId, type ReactNode } from "react";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, FeColorMatrix, Filter, Image as SvgImage } from "react-native-svg";

import { FONTS } from "../../../theme/type";

/** `filter: grayscale(.75)` as a colour matrix (the CSS Filter Effects
 *  interpolation between identity and the luminance matrix, at .75). */
const GRAYSCALE_75 = [
  0.40945, 0.5364, 0.05415, 0, 0,
  0.15945, 0.7864, 0.05415, 0, 0,
  0.15945, 0.5364, 0.30415, 0, 0,
  0, 0, 0, 1, 0,
];
const SRGB = { colorInterpolationFilters: "sRGB" } as Record<string, string>;

/** The label's own letter — by codepoint, because a live reader may be named
 *  in a script whose first letter is a surrogate pair (narratorInitial). */
export const initialOf = (name: string): string => [...name.trim()][0]?.toUpperCase() || "R";

function GreyPortrait({ uri, size }: { uri: string; size: number }) {
  const id = "vcg" + useId().replace(/[^A-Za-z0-9_-]/g, "");
  return (
    <Svg width={size} height={size} style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      <Defs>
        <Filter id={id} x="0" y="0" width="100%" height="100%" {...SRGB}>
          <FeColorMatrix type="matrix" values={GRAYSCALE_75} />
        </Filter>
      </Defs>
      <SvgImage
        href={{ uri }}
        x={0}
        y={0}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid slice"
        filter={`url(#${id})`}
      />
    </Svg>
  );
}

export function Face({
  size,
  hue,
  portrait,
  name,
  initialSize,
  opacity = 1,
  grey = false,
  ring = true,
  cast = false,
  outline,
  scale = 1,
  children,
  style,
}: {
  size: number;
  /** `--nar` — the label's hue. */
  hue: string;
  /** `--face` — the portrait URL, absolute. */
  portrait?: string;
  name: string;
  /** The initial's font size (33 on the desk's disc, 28 on a phone's, 19/16 on a row's). */
  initialSize: number;
  opacity?: number;
  /** `filter: grayscale(.75)` — the shut state. */
  grey?: boolean;
  /** `inset 0 0 0 1px rgba(11,10,8,.28)` — every label wears it. */
  ring?: boolean;
  /** `0 2px 7px rgba(43,30,16,.26)` — the grid's discs cast; a row's do not. */
  cast?: boolean;
  /** `outline: 2px solid` at offset 5 — the checked label. */
  outline?: string;
  /** `transform: scale(1.04)` — the checked label. */
  scale?: number;
  children?: ReactNode;
  style?: object;
}) {
  const shadows: string[] = [];
  if (ring) shadows.push("inset 0 0 0 1px rgba(11,10,8,.28)");
  if (cast) shadows.push("0 2px 7px rgba(43,30,16,.26)");
  return (
    <View
      accessible={false}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: hue,
          alignItems: "center",
          justifyContent: "center",
          opacity,
          transform: scale !== 1 ? [{ scale }] : undefined,
          boxShadow: shadows.length ? shadows.join(",") : undefined,
        },
        style,
      ]}
    >
      {outline ? (
        <View
          style={{
            pointerEvents: "none",
            position: "absolute",
            left: -7,
            top: -7,
            right: -7,
            bottom: -7,
            borderRadius: size / 2 + 7,
            borderWidth: 2,
            borderColor: outline,
          }}
        />
      ) : null}
      <Text
        style={{
          fontFamily: FONTS.serifRegular,
          fontSize: initialSize,
          lineHeight: initialSize,
          color: "#F1E4C4",
        }}
      >
        {initialOf(name)}
      </Text>
      {portrait ? (
        <View
          style={[StyleSheet.absoluteFill, { pointerEvents: "none", borderRadius: size / 2, overflow: "hidden" }]}
        >
          {grey ? (
            <GreyPortrait uri={portrait} size={size} />
          ) : (
            <Image source={{ uri: portrait }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} alt="" />
          )}
        </View>
      ) : null}
      {children}
    </View>
  );
}
