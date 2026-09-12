// The disc — the site's one small round control, in its four cuts.
//
//   ring     a hairline ring, no fill: the theme toggle and the back disc
//            (.rr-ap-disc / .rr-pt-theme, 36px, 1.5px ink at .32, brown glyph),
//            a row's icon (.rr-ap-row-i, 34px, 1px brick at .32, gold glyph,
//            tilted −4°), a + sheet row's (.rr-ap-add-i, 46px, same), an action
//            cell's (.rr-ap-act i, 46px, 1.5px ink at .26, brown), the sheet's
//            close (.rr-pt-side-shut, 32px, 1px brick at .35, gold).
//   dashed   the same ring drawn dashed — .rr-ap-act.is-soon i. Cut in SVG,
//            because Android's dashed borders are not to be trusted.
//   ink      the site's ink CTA turned into a disc: ink fill, cream glyph, a
//            3px brass offset and an inner brass ring — the tab bar's centre
//            disc (.rr-ap-fab, 52px).
//
// The offset shadow is a second disc drawn behind, not a platform shadow:
// iOS's shadow* can do a hard 3px 3px 0, Android's elevation cannot, and the
// site's is a hard brass edge, not a glow.

import type { ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";

export function Disc({
  size,
  ring,
  ringWidth = 1,
  dashed = false,
  fill,
  tilt = 0,
  shadow,
  inner,
  children,
  onPress,
  onPressIn,
  disabled = false,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  hitSlop,
  style,
}: {
  size: number;
  /** The ring colour. Omit for no ring. */
  ring?: string;
  ringWidth?: number;
  dashed?: boolean;
  /** A filled disc — the ink CTA. */
  fill?: string;
  /** Degrees. Every disc in this portal sits a few degrees off true. */
  tilt?: number;
  /** A hard offset shadow, `{x, y, color}` — the brass 3px 3px 0. */
  shadow?: { x: number; y: number; color: string };
  /** An inner ring, inset 4px, 1px — the centre disc's brass line. */
  inner?: string;
  children?: ReactNode;
  onPress?: () => void;
  /** Fires on the press's first touch, before onPress — the theme toggle
   *  measures itself here so the reveal can start from where the disc is. */
  onPressIn?: () => void;
  /** A `disabled` button (the bookmark's step at its ends): .26, unpressable,
   *  and said so to assistive tech. */
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "switch";
  accessibilityState?: { checked?: boolean; expanded?: boolean; selected?: boolean; disabled?: boolean };
  hitSlop?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const r = size / 2;
  const bw = ring && !dashed ? ringWidth : 0;
  const face: ViewStyle = {
    width: size,
    height: size,
    borderRadius: r,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: fill,
    ...(ring && !dashed ? { borderWidth: ringWidth, borderColor: ring } : null),
  };
  const body = (
    <>
      {shadow ? (
        <View
          style={{
            pointerEvents: "none",
            position: "absolute",
            left: shadow.x,
            top: shadow.y,
            width: size,
            height: size,
            borderRadius: r,
            backgroundColor: shadow.color,
          }}
        />
      ) : null}
      <View style={[face, { transform: [{ rotate: `${tilt}deg` }] }]}>
        {ring && dashed ? (
          <Svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{ position: "absolute", left: 0, top: 0 }}
          >
            <Circle
              cx={r}
              cy={r}
              r={r - ringWidth / 2}
              fill="none"
              stroke={ring}
              strokeWidth={ringWidth}
              strokeDasharray="3 2"
            />
          </Svg>
        ) : null}
        {inner ? (
          <View
            // inset:4px is measured from the padding box, inside the ring —
            // Yoga positions an absolute child the same way, so 4 is 4.
            style={{
              pointerEvents: "none",
              position: "absolute",
              left: 4,
              top: 4,
              width: size - 8 - 2 * bw,
              height: size - 8 - 2 * bw,
              borderRadius: (size - 8 - 2 * bw) / 2,
              borderWidth: 1,
              borderColor: inner,
            }}
          />
        ) : null}
        {children}
      </View>
    </>
  );

  if (onPress) {
    const state = disabled ? { ...accessibilityState, disabled: true } : accessibilityState;
    return (
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        disabled={disabled}
        accessibilityRole={accessibilityRole ?? "button"}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={state}
        // react-native-web 0.21 ignores accessibilityState and honours only
        // the aria-* spelling, so both are set.
        aria-disabled={disabled || undefined}
        hitSlop={hitSlop}
        style={({ pressed }) => [
          { width: size, height: size, opacity: disabled ? 0.26 : pressed ? 0.7 : 1 },
          style,
        ]}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={[{ width: size, height: size }, style]}>{body}</View>;
}
