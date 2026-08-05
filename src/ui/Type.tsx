// Text, pre-voiced.
//
// Every Text in the app goes through one of these so a colour or a face is
// never picked at a call site. If a screen needs a voice that isn't here, add
// it to TEXT in src/theme/type.ts and expose it — do not inline a fontFamily.

import { Text, type StyleProp, type TextProps, type TextStyle } from "react-native";
import type { ReactNode } from "react";

import { useTheme } from "../theme/ThemeProvider";
import { TEXT } from "../theme/type";
import type { ColorName } from "../theme/tokens";

type VoiceProps = TextProps & {
  children: ReactNode;
  /** A palette role — never a hex literal. */
  color?: ColorName;
  style?: StyleProp<TextStyle>;
};

function voice(base: TextStyle, fallback: ColorName) {
  return function Voiced({ children, color, style, ...rest }: VoiceProps) {
    const { colors } = useTheme();
    return (
      <Text {...rest} style={[base, { color: colors[color ?? fallback] }, style]}>
        {children}
      </Text>
    );
  };
}

/** Room titles. */
export const Title = voice(TEXT.title, "ink");
/** Section heads inside a room. */
export const Head = voice(TEXT.head, "ink");
/** List rows, nav labels. */
export const Row = voice(TEXT.row, "ink");
/** Running prose. */
export const Body = voice(TEXT.body, "inkwarm");
/** The italic line under a room title. */
export const Lede = voice(TEXT.lede, "brown");
/** Engraved uppercase micro-label — the site's most characteristic mark. */
export const Micro = voice(TEXT.micro, "brass");
/** The wordmark kicker. */
export const Kicker = voice(TEXT.kicker, "brass");
/** Folio marks, page numbers. */
export const Folio = voice(TEXT.folio, "brass");
/** Marginalia, in the hand. */
export const Hand = voice(TEXT.hand, "brown");
