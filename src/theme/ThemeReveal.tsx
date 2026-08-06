// The lamp switch — the site's circular reveal, in the hand.
//
// THE WEB (ThemeToggle.tsx + globals.css `rr-theme-reveal`): the theme flips
// inside `document.startViewTransition`, and the default cross-fade is
// explicitly CANCELLED — `::view-transition-old/new(root){animation:none}`.
// The outgoing page is held perfectly still at full opacity while the incoming
// one is clipped in by a circle growing from the toggle, 500ms on
// cubic-bezier(.4,0,.2,1), its radius the distance to the farthest corner.
//
// The defining property is that NOTHING MOVES except the circle's edge. Not a
// fade, not a scale, not a growing blob of colour. Everything either side of
// that boundary is stationary.
//
// React Native has no snapshot of the outgoing screen, so the incoming FIELD is
// what grows — and it must grow the way the web's does. Hence the counter-
// offset below rather than the obvious `transform:[{scale}]`: scaling the disc
// would scale the starfield inside it, and the night sky would visibly swell
// as the wipe crossed the screen. Instead the disc's box grows while its field
// child is pushed back by exactly as much, so every star stays where it will
// be when the wipe is over.
//
// The token flip happens at FULL COVER, so the whole-tree re-render it causes
// (every useTheme consumer gets a new `colors` identity) is invisible. Then a
// short tail fades the disc off the finished screen.
//
// MOUNT IT TWICE. A React Native <Modal> is a separate native window, so an
// overlay in the root tree paints behind it — and the reader, which is a
// full-screen Modal, carries its own copy of the toggle. Both instances read
// the same SharedValues from the provider, so they are frame-locked with no
// coordination. Any future full-screen Modal needs the same one-line insertion.

import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { StyleSheet, View } from "react-native";

import { NightField } from "./NightField";
import { useThemeReveal } from "./ThemeProvider";

/**
 * The growing disc.
 *
 * `field` says what the disc must be indistinguishable FROM at this mount
 * point: the app's plain paper everywhere, the Listening Room's starred navy
 * inside the reader. A disc that lands on the wrong ground shows a seam at the
 * moment it stops.
 */
export function ThemeReveal({ field = "paper" }: { field?: "paper" | "room" }) {
  const { sweep, fade, origin, incoming, active } = useThemeReveal();

  // the disc's own box: it grows from nothing at the toggle to a circle that
  // clears the farthest corner
  const disc = useAnimatedStyle(() => {
    const r = sweep.value * origin.r;
    return {
      left: origin.x - r,
      top: origin.y - r,
      width: r * 2,
      height: r * 2,
      borderRadius: r,
      opacity: fade.value,
    };
  });

  // ...and the field inside it is pushed back by exactly the same amount, so it
  // sits at a fixed place on the SCREEN however big the disc currently is
  const still = useAnimatedStyle(() => {
    const r = sweep.value * origin.r;
    return { left: -(origin.x - r), top: -(origin.y - r) };
  });

  if (!active) return null;

  const night = incoming === "dark";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.disc, disc]}>
        <Animated.View style={[styles.field, { width: origin.w, height: origin.h }, still]}>
          {field === "room" && night ? (
            // the reader's own night field, the same drawing it lands on
            <NightField id="rr-stars-reveal" />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: night ? "#0d1322" : "#faf7ef" },
              ]}
            />
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { position: "absolute", overflow: "hidden" },
  field: { position: "absolute" },
});
