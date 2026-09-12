// Text, pre-voiced.
//
// Every Text in the app goes through one of these so a colour or a face is
// never picked at a call site. Two ways in:
//
//   <Txt>   the transcriber's Text. Takes a CSS `font:` shorthand's parts —
//           family, weight, size, an em letter-spacing — and resolves the
//           face, the px tracking and Chrome's `normal` line-height itself.
//           `font: 700 9px 'Manrope'; letter-spacing:.24em; color:#8C6A3F`
//           is <Txt family="Manrope" weight={700} size={9} ls={0.24} color="gold2" upper>.
//   voices  the shell's own presets (TEXT in src/theme/type.ts), each named
//           for the site class it is: <Kicker> is .rr-ap-title i, <Tab> is
//           .rr-ap-tab b, and so on.
//
// Colours are palette roles, text-scoped, never hex literals. Pass `tone` for
// an rgba(ink, α) — the site's muted lines are all ink at some alpha.

import type { ReactNode } from "react";
import { Text, type StyleProp, type TextProps, type TextStyle } from "react-native";

import { useTheme } from "../theme/ThemeProvider";
import { useInk } from "../theme/ink";
import { TEXT, face, lh, snap, track, type Family } from "../theme/type";
import { colorsFor, type ColorName } from "../theme/tokens";

type VoiceProps = TextProps & {
  children?: ReactNode;
  /** A palette role — never a hex literal. */
  color?: ColorName;
  /** rgba(ink, α) instead of a role — the site's muted lines. */
  tone?: number;
  style?: StyleProp<TextStyle>;
};

function voice(base: TextStyle, fallback: ColorName) {
  return function Voiced({ children, color, tone, style, ...rest }: VoiceProps) {
    const { mode } = useTheme();
    const { ink } = useInk();
    const c = tone !== undefined ? ink(tone) : resolveText(color ?? fallback, mode);
    return (
      <Text {...rest} style={[base, { color: c }, style]}>
        {children}
      </Text>
    );
  };
}

// Text-scoped lookup, via the theme's own colours map (all roles the voices
// name are text-scoped; the scoped resolver is for the odd surface case).
const resolveText = (name: ColorName, mode: "light" | "dark") => colorsFor(mode)[name];

/**
 * The transcriber's Text. `size` in px; `ls` in em (converted); `line` in px
 * or a unitless multiple — omit it for Chrome's `normal`.
 */
export function Txt({
  family = "Manrope",
  weight = 400,
  italic = false,
  size,
  ls,
  line,
  upper = false,
  color = "ink",
  tone,
  children,
  style,
  ...rest
}: TextProps & {
  family?: Family;
  weight?: number;
  italic?: boolean;
  size: number;
  /** letter-spacing in em, as the CSS writes it. */
  ls?: number;
  /** line-height: px if ≥ 4, else a unitless multiple (snapped to Chrome's 1/64px). Omit for `normal`. */
  line?: number;
  upper?: boolean;
  color?: ColorName;
  tone?: number;
  children?: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const { mode } = useTheme();
  const { ink } = useInk();
  // A unitless `line` is the CSS factor: Chrome floors its line box to 1/64px
  // (type.ts, "A THIRD"); a px value is handed over as given.
  const lineHeight = line === undefined ? lh(family, size) : line < 4 ? snap(line * size) : line;
  const c = tone !== undefined ? ink(tone) : resolveText(color, mode);
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: face(family, weight, italic),
          fontSize: size,
          lineHeight,
          letterSpacing: ls === undefined ? undefined : track(size, ls),
          textTransform: upper ? "uppercase" : undefined,
          color: c,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** `.rr-pt-h1` — the room's serif heading at phone size. */
export const Title = voice(TEXT.title, "ink");
/** `.rr-ap-band-h h2` — a band's serif line. */
export const Head = voice(TEXT.head, "ink");
/** `.rr-ap-row-l b` — a row's label. */
export const Row = voice(TEXT.row, "ink2");
/** `.rr-pt-sub` — running prose under a heading. Site: ink at .62. */
export const Body = voice(TEXT.body, "ink");
/** `.rr-ap-band-h p` — a band's supporting line. Site: ink at .58. */
export const Lede = voice(TEXT.lede, "ink");
/** `.rr-ap-group-h b` — the brass ledger label. Site colour: gold2 #8C6A3F. */
export const Micro = voice(TEXT.micro, "gold2");
/** `.rr-ap-title i` — the top bar's eyebrow. */
export const Kicker = voice(TEXT.kicker, "brass");
/** `.rr-ap-tab b` — a tab's label. */
export const Tab = voice(TEXT.tab, "ink");
/** `.rr-ap-row-l em` — a row's supporting line. Site: ink at .55. */
export const Sub = voice(TEXT.sub, "ink");
/** `.rr-ap-row-v` — a row's reported value. Site: ink at .55. */
export const Value = voice(TEXT.value, "ink");
/** `.rr-ap-seg button i` — the brass superscript count. */
export const Numeral = voice(TEXT.numeral, "brass");
/** `.rr-ap-row-note` — a hand-written note. */
export const Hand = voice(TEXT.hand, "brown");
/** Kept for older pages; the shell has no folio. Same cut as <Value>. */
export const Folio = voice(TEXT.value, "brass");
