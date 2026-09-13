// `font-variant: small-caps` — the running heads, folios, kickers and facts
// of every leaf are set in it.
//
// SYNTHESISED, ON PURPOSE. The site loads Cormorant Garamond from Google
// Fonts, whose subsetted file carries no smcp table, so Chrome synthesises
// the variant: every LOWERCASE letter becomes a capital at 70% of the size
// (Blink's kSmallCapsFontSizeMultiplier); capitals, figures and punctuation
// keep the full size. That is what the golden shows, and it is what the site
// shows on a phone too. The app's bundled TTF DOES carry smcp, and
// `fontVariant: ['small-caps']` reaches it on every platform — but the
// face's own small capitals are a different drawing: measured on the
// frontispiece's running head, "Frontispiece" at 13px/.2em spans 88px on
// the golden, 86px synthesised, 97px in real smcp. So the rule is done by
// hand, as Chrome does it, and the face's table is an opt-in (`smcp`) for a
// day the site serves the full font.
//
// Letter-spacing is the element's, in px, on every run — CSS resolves the em
// against the parent's size once. Nested <Text> shares one baseline, so the
// mixed sizes sit on one line.

import { Text, type StyleProp, type TextStyle } from "react-native";

const SMALL = 0.7;

export function SmallCaps({
  text,
  size,
  family,
  color,
  ls = 0,
  line,
  style,
  numberOfLines,
  smcp = false,
}: {
  text: string;
  size: number;
  /** The loaded face name (FONTS.*). */
  family: string;
  color: string;
  /** letter-spacing in px — already resolved against `size`. */
  ls?: number;
  /** line-height in px; omit for the platform's normal. */
  line?: number;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /** Ask the face for its own small capitals instead of synthesising. */
  smcp?: boolean;
}) {
  if (smcp) {
    return (
      <Text
        numberOfLines={numberOfLines}
        style={[
          { fontFamily: family, fontSize: size, color, letterSpacing: ls, lineHeight: line, fontVariant: ["small-caps"] },
          style,
        ]}
      >
        {text}
      </Text>
    );
  }

  const small = Math.round(size * SMALL * 100) / 100;
  // runs of lowercase vs everything else
  const runs: { small: boolean; s: string }[] = [];
  for (const ch of text) {
    const lower = ch !== ch.toUpperCase() && ch === ch.toLowerCase();
    const last = runs[runs.length - 1];
    if (last && last.small === lower) last.s += ch;
    else runs.push({ small: lower, s: ch });
  }
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { fontFamily: family, fontSize: size, color, letterSpacing: ls, lineHeight: line },
        style,
      ]}
    >
      {runs.map((r, i) =>
        r.small ? (
          // the small run's own line box stays INSIDE the element's: a span
          // inheriting the 16px line-height at 9px of type sits its half-leading
          // differently on the shared baseline and grows the line by 2px
          <Text key={i} style={{ fontSize: small, lineHeight: small }}>
            {r.s.toUpperCase()}
          </Text>
        ) : (
          r.s
        ),
      )}
    </Text>
  );
}
