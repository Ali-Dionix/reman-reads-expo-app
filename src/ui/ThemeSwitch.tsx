// The theme switch — one button, both faces, and the lamp switch behind it.
//
// The web shows the SUN in light and the MOON in dark: the icon names the
// mode you are in, not the one you would switch to. Two cuts of the same
// control wear it:
//
//   .rr-nav5-theme  the public bar's, 40px, 1.5px ink ring at .35, brown
//                   glyph at 19px, 2° off true (/login, src/portal/TornNav)
//   .rr-pt-theme    the portal bar's, 36px, 1.5px ink ring at .32, brown
//                   glyph at 18px, 2° off true (every room, PortalPage)
//
// Both flip the theme THROUGH THE REVEAL — ThemeProvider's toggleFrom, the
// site's circular wipe growing from the switch itself. The portal's disc
// used to call the plain toggle, so a room changed mode in one hard cut while
// the sign-in wall and the reader swept; now there is one switch and one
// behaviour. The button measures itself on press-IN (measureInWindow answers
// through a callback, and measuring on press would start the sweep a frame
// late); a keyboard or assistive activation that never pressed in gets the
// plain flip, as the web's (0,0) fallback does.

import { useRef } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";

import { useInk } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { Disc } from "./Disc";
import { fillProps, strokeProps } from "./svgPaint";

export function SunMoon({
  size = 40,
  glyph = 19,
  ringAlpha = 0.35,
  hitSlop = 8,
  ink: inkOverride,
  line,
}: {
  size?: number;
  glyph?: number;
  /** The ring's ink alpha — .35 on the public bar, .32 on the portal's. */
  ringAlpha?: number;
  hitSlop?: number;
  /** The glyph's ink, when a room lights it differently from the bar. */
  ink?: string;
  /** The ring, likewise. */
  line?: string;
}) {
  const { colors, mode, toggle, toggleFrom } = useTheme();
  const { ink } = useInk();
  const c = inkOverride ?? colors.brown;

  // The reveal grows from the switch itself, so the button has to say where
  // it is — in WINDOW coordinates, which is what the reveal draws in.
  const self = useRef<View>(null);
  const at = useRef<{ x: number; y: number } | null>(null);

  return (
    <View ref={self} collapsable={false}>
      <Disc
        size={size}
        ring={line ?? ink(ringAlpha, "border")}
        ringWidth={1.5}
        tilt={-2}
        onPressIn={() =>
          self.current?.measureInWindow((x, y, w, h) => {
            at.current = { x: x + w / 2, y: y + h / 2 };
          })
        }
        onPress={() => {
          if (at.current) toggleFrom(at.current.x, at.current.y);
          else toggle();
        }}
        accessibilityRole="switch"
        accessibilityState={{ checked: mode === "dark" }}
        accessibilityLabel={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        hitSlop={hitSlop}
      >
        <Svg viewBox="0 0 24 24" width={glyph} height={glyph}>
          {mode === "dark" ? (
            <Path d="M20.2 13.6A8.1 8.1 0 0 1 10.4 3.8a8.1 8.1 0 1 0 9.8 9.8Z" {...fillProps(c)} />
          ) : (
            <G>
              <Circle cx={12} cy={12} r={4.6} fill="none" {...strokeProps(c)} strokeWidth={1.6} />
              <Path
                d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7"
                {...strokeProps(c)}
                strokeWidth={1.6}
                strokeLinecap="round"
              />
            </G>
          )}
        </Svg>
      </Disc>
    </View>
  );
}
