// The console's glyphs — accountListeningPage.ts's `icBack15`, `icFwd15`,
// `icPlay`, `icPause`, `icMinus`, `icPlus`, `icRamp`, transcribed path for path. Every
// one is `currentColor` on the site, so every one takes `color` here.

import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";

import { FONTS } from "../../../theme/type";

/** `icBack15` / `icFwd15` — 19px, a circular arrow with the figure inside. */
export function Jog15({ back, color }: { back?: boolean; color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Path
        d={
          back
            ? "M11.5 5.5V2L7 5.5l4.5 3.5V6.9a5.6 5.6 0 1 1-5.4 4.2"
            : "M12.5 5.5V2L17 5.5 12.5 9V6.9a5.6 5.6 0 1 0 5.4 4.2"
        }
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgText x={12} y={17} textAnchor="middle" fontFamily={FONTS.sansBold} fontSize={7} fontWeight="700" fill={color}>
        15
      </SvgText>
    </Svg>
  );
}

/** `icPlay(18)` — `.rr-lr-big svg{margin-left:1px}` is the caller's. */
export function Play({ size = 18, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Path d="M3 2.2v9.6l8-4.8-8-4.8Z" fill={color} />
    </Svg>
  );
}

/** `icPause(18)` — two bars, 16×18. */
export function Pause({ size = 18, color }: { size?: number; color: string }) {
  return (
    <Svg width={size - 2} height={size} viewBox="0 0 12 14" fill="none">
      <Rect x={1.5} y={1.5} width={3} height={11} rx={1} fill={color} />
      <Rect x={7.5} y={1.5} width={3} height={11} rx={1} fill={color} />
    </Svg>
  );
}

/** `icMinus` / `icPlus` — 17px on an 18 box, 1.7 stroke. */
export function Sign({ plus, color }: { plus?: boolean; color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 18 18" fill="none">
      <Path d={plus ? "M4 9h10M9 4v10" : "M4 9h10"} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

/** `icRamp` — the 12×9 double chevron the dial wears at its crown while the
 *  creep is armed (`.rr-lr-speed-ramp`, hidden otherwise). */
export function RampFlag({ color }: { color: string }) {
  return (
    <Svg width={12} height={9} viewBox="0 0 12 9" fill="none">
      <Path d="m2 7.6 4-3.8 4 3.8M2 4.4 6 .6l4 3.8" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
