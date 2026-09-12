// The sleeve — a book's cover as every shelf and grid on the site draws it
// (shelfCard.ts's `.rr-shf-cover`, `.rr-lr-ac` on the listening floor, the
// side table on Home): a 2:3 box on the spine colour, radius 3, the two ink
// drops, the catalogue art from the site laid over it. A THEME ISLAND
// (theme.ts ISLAND_ROOTS carries .rr-shf-cover): nothing here takes the
// mode, so the shadows are literal and the spine is the catalogue's own.
//
//   art     the site path (/covers/…); loaded from SITE_ORIGIN — the app does
//           not bundle ~22 webp files it would then keep in step. RN's own
//           Image, not expo-image: on the web it is a background-image at
//           cover, which is exactly how shelfCard.ts draws the art, so the
//           two resample alike (an <img> at object-fit:cover lands a pixel
//           off on the rig).
//   dim     `filter: saturate(.55) brightness(.92); opacity:.8` — a title still
//           in production has its jacket muted, not just faded. CSS filters
//           work in sRGB, so the SVG filter is pinned to sRGB too.
//   children  overlays (a gilt rule, the type on a cloth sleeve) — absolute
//           inside the box, drawn over the art.

import { useId, type ReactNode } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, FeColorMatrix, Filter, Image as SvgImage } from "react-native-svg";

import { SITE_ORIGIN } from "../lib/config";
import { OBJECT } from "../theme/tokens";

const BRIGHTNESS_92 = [0.92, 0, 0, 0, 0, 0, 0.92, 0, 0, 0, 0, 0, 0.92, 0, 0, 0, 0, 0, 1, 0];
const SRGB = { colorInterpolationFilters: "sRGB" } as Record<string, string>;

/** The art through `saturate(.55) brightness(.92)`. */
function DimArt({ uri, width, height }: { uri: string; width: number; height: number }) {
  // A document-unique id per cover: url(#…) resolves to the first match in the
  // page on web, and useId's colons are not url()-safe, so they are dropped.
  const id = "dim" + useId().replace(/[^A-Za-z0-9_-]/g, "");
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Filter id={id} x="0" y="0" width="100%" height="100%" {...SRGB}>
          <FeColorMatrix type="saturate" values="0.55" />
          <FeColorMatrix type="matrix" values={BRIGHTNESS_92} />
        </Filter>
      </Defs>
      <SvgImage
        href={{ uri }}
        x={0}
        y={0}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid slice"
        filter={`url(#${id})`}
      />
    </Svg>
  );
}

export function Cover({
  art,
  spine,
  width,
  dim = false,
  radius = 3,
  shadow = true,
  children,
  style,
}: {
  /** The site path of the art; a cloth sleeve passes none. */
  art?: string;
  /** The spine colour — the catalogue's own, never mapped. */
  spine?: string;
  width: number;
  dim?: boolean;
  radius?: number;
  /** The two ink drops. Off for a thumb that draws its own. */
  shadow?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const height = width * 1.5;
  const uri = art ? `${SITE_ORIGIN}${art}` : null;
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: spine ?? OBJECT.cover.cloth,
          overflow: "hidden",
          opacity: dim ? 0.8 : 1,
        },
        shadow ? { boxShadow: OBJECT.cover.sleeveShadow } : null,
        style,
      ]}
    >
      {uri && dim ? (
        <DimArt uri={uri} width={width} height={height} />
      ) : uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : null}
      {children}
    </View>
  );
}
