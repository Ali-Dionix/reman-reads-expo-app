// `font-variant: small-caps`, written out.
//
// The site's Cormorant arrives from the Google CSS API with its smcp table
// stripped, so Chrome SYNTHESISES the small caps: capitals stay, every other
// letter is drawn as a capital at 0.7× the size (Blink's
// kSmallCapsFontSizeMultiplier), and the element's letter-spacing — a px
// value resolved from the FULL size — applies to every glyph alike. The
// bundled TTF carries real smcp, which draws wider and taller, and Android
// ignores fontVariant anyway; so the synthesis is transcribed (as
// Billboard.tsx does for its kicker): the lowercase runs become nested Text
// at 0.7× the size, uppercased, on the same px tracking.
//
// The small run carries its own line-height (0.7× the line too): two inline
// boxes of different sizes on ONE line-height sit at different baselines, and
// aligning them grows the line box ~2px — the site has one inline box.

import { Text, type StyleProp, type TextStyle } from "react-native";

const SMALL = 0.7;

export function SmallCaps({
  children,
  size,
  ls = 0,
  color,
  fontFamily,
  lineHeight,
  style,
  numberOfLines,
}: {
  children: string;
  size: number;
  /** letter-spacing in em, as the CSS writes it. */
  ls?: number;
  color: string;
  fontFamily: string;
  lineHeight?: number;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const tracking = Math.round(size * ls * 1000) / 1000;
  const runs = children.match(/[a-z\u00DF-\u00FF]+|[^a-z\u00DF-\u00FF]+/g) ?? [children];
  return (
    <Text
      numberOfLines={numberOfLines}
      // the synthesis UPPERCASES the small runs, and a name read off the
      // runs would shout ("CHAPTERS"); CSS small-caps leave the name as
      // written, so it is set here and the nested runs contribute nothing
      accessibilityLabel={children}
      style={[{ fontFamily, fontSize: size, letterSpacing: tracking, color, lineHeight }, style]}
    >
      {runs.map((run, i) =>
        /^[a-z\u00DF-\u00FF]/.test(run) ? (
          <Text
            key={i}
            style={{
              fontFamily,
              fontSize: size * SMALL,
              letterSpacing: tracking,
              color,
              lineHeight: lineHeight === undefined ? undefined : lineHeight * SMALL,
            }}
          >
            {run.toUpperCase()}
          </Text>
        ) : (
          run
        ),
      )}
    </Text>
  );
}
