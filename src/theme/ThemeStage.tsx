// The lamp switch — the site's circular reveal, in the hand, with the screen
// held still on BOTH sides of the edge.
//
// THE WEB (ThemeToggle.tsx + globals.css `rr-theme-reveal`): the theme flips
// inside `document.startViewTransition`, and the default cross-fade is
// explicitly CANCELLED — `::view-transition-old/new(root){animation:none}`.
// The outgoing page is held perfectly still at full opacity while the incoming
// one is clipped in by a circle growing from the toggle, 500ms on
// cubic-bezier(.4,0,.2,1), its radius the distance to the farthest corner.
//
// The defining property is that NOTHING MOVES except the circle's edge, and
// both sides of it are THE FINISHED PAGE. The browser has that for free: a
// view transition snapshots the old page, runs the flip, snapshots the new
// one, and animates between two pictures. React Native has no snapshot of
// anything, and the first cut of this reveal grew a disc of the incoming
// FIELD — plain paper, or the reader's starred navy — and flipped the tokens
// under it at full cover. The owner saw exactly what that is: the room wiped
// out by a blank circle, then the new room arriving under a fade.
//
// So the stage takes the two pictures itself (react-native-view-shot):
//
//   1. the outgoing screen is drawn into an image and laid over the live
//      tree, pixel for pixel — nothing has visibly changed
//   2. under that held picture the tokens flip, and the whole tree re-renders
//      in the incoming mode, unseen
//   3. once that render is on screen it is drawn into a second image
//   4. the second image grows from the switch inside a circle, over the
//      first — the web's wipe: the edge moves, nothing else does
//   5. at full cover the held picture is dropped, and the disc fades off the
//      live tree it is now indistinguishable from
//
// The disc's box grows while the picture inside it is pushed back by exactly
// as much (the counter-offset below, not a `scale`), so every pixel of the
// incoming screen sits where it will be when the wipe is over.
//
// ONE STAGE PER NATIVE WINDOW. A React Native <Modal> is a separate window:
// an overlay in the root tree paints behind it, and a picture of the root
// tree does not contain it. The root layout wraps the stack in a stage; the
// reader, a full-screen Modal, wraps its own content in another. The switch
// reaches the NEAREST stage through context, so the one that takes the
// pictures is the one whose screen is showing. A future full-screen Modal
// that carries the switch needs the same wrap.
//
// WHATEVER GOES WRONG IS ANSWERED WITH THE PLAIN FLIP. No snapshot module
// (the web build), reduced motion, a capture that throws, a picture that
// never says it displayed: the theme still changes, at once, because the
// change must never be hostage to its animation — ThemeToggle.tsx's rule.

import { Image } from "expo-image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "./ThemeProvider";
import type { Mode } from "./tokens";
import { viewShot } from "./viewShot";

/** `::view-transition-group(root){animation-duration:.5s;
 *  animation-timing-function:cubic-bezier(.4,0,.2,1)}` — matched exactly. */
const SWEEP_MS = 500;
/** The tail: the disc off the live tree it now matches. Short and
 *  front-loaded — the picture already IS the page, so this only has to
 *  cover the picture's own compression against the real drawing. */
const TAIL_MS = 140;
/** A picture that never says it displayed, a mode that never commits: every
 *  wait is bounded, and the reveal goes on without the answer. */
const WAIT_MS = 800;

/** JPEG, not PNG. A full-screen PNG costs a mid-range Android phone a third
 *  of a second to encode, and it is taken twice; a JPEG at this quality is a
 *  fraction of that and, under the tail's cross-fade, reads as the page. */
const SHOT = { format: "jpg", quality: 0.95, result: "tmpfile" } as const;

/** Where the wipe starts, in the stage's own coordinates, and how far it
 *  has to reach. */
type Origin = { x: number; y: number; r: number };

type StageValue = {
  /** Flip the theme with the reveal growing from a point in WINDOW
   *  coordinates — the switch's own centre. */
  reveal: (cx: number, cy: number) => void;
};

const StageContext = createContext<StageValue | null>(null);

/** The nearest stage — null outside one, where the switch flips plainly. */
export function useThemeStage(): StageValue | null {
  return useContext(StageContext);
}

const frames = (n: number): Promise<void> =>
  new Promise((resolve) => {
    const tick = (left: number) =>
      left <= 0 ? resolve() : requestAnimationFrame(() => tick(left - 1));
    tick(n);
  });

const bounded = (p: Promise<void>, ms: number): Promise<void> =>
  Promise.race([p, new Promise<void>((resolve) => setTimeout(resolve, ms))]);

export function ThemeStage({ children }: { children: ReactNode }) {
  const { mode, setPref, hold } = useTheme();
  const reduced = useReducedMotion();

  const content = useRef<View>(null);
  const box = useRef({ w: 0, h: 0 });
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    box.current = { w: width, h: height };
  }, []);

  // the two pictures, their size, and where the disc grows from
  const [held, setHeld] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [origin, setOrigin] = useState<Origin>({ x: 0, y: 0, r: 0 });
  /** 0 → 1 across the sweep. */
  const sweep = useSharedValue(0);
  /** 1 → 0 across the tail. */
  const fade = useSharedValue(1);

  // Each picture says when it is on screen, and the tree says when it has
  // committed in the incoming mode — answered through refs, because the
  // reveal is one async function and not a chain of effects.
  const heldShown = useRef<(() => void) | null>(null);
  const freshShown = useRef<(() => void) | null>(null);
  const committed = useRef<{ to: Mode; resolve: () => void } | null>(null);
  useEffect(() => {
    const w = committed.current;
    if (w && mode === w.to) {
      committed.current = null;
      w.resolve();
    }
  }, [mode]);

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const busy = useRef(false);

  const reveal = useCallback(
    (cx: number, cy: number) => {
      // a second tap while the pictures are on screen is nothing: a plain
      // flip under the held picture would put the tree back a mode
      if (busy.current) return;
      const from = modeRef.current;
      const to: Mode = from === "dark" ? "light" : "dark";
      const shot = viewShot;
      const { w, h } = box.current;
      if (reduced || !shot || !content.current || !w || !h) {
        setPref(to);
        return;
      }
      busy.current = true;
      let oldUri: string | null = null;
      let newUri: string | null = null;
      let flipped = false;
      void (async () => {
        try {
          // 1. the outgoing screen, held — a frame on, so the switch's own
          // press (Disc dims to .7 while held down) has let go in the picture
          await frames(1);
          oldUri = await shot.captureRef(content, SHOT);
          const at = await new Promise<{ x: number; y: number }>((resolve) => {
            if (content.current) content.current.measureInWindow((x, y) => resolve({ x, y }));
            else resolve({ x: 0, y: 0 });
          });
          const ox = cx - at.x;
          const oy = cy - at.y;
          // setRevealOrigin() — the distance to the farthest corner, so the
          // circle always finishes off-screen
          const r = Math.hypot(Math.max(ox, w - ox), Math.max(oy, h - oy));
          sweep.value = 0;
          fade.value = 1;
          setSize({ w, h });
          setOrigin({ x: ox, y: oy, r });
          await bounded(
            new Promise<void>((resolve) => {
              heldShown.current = resolve;
              setHeld(oldUri);
            }),
            WAIT_MS,
          );

          // 2. the flip, under the held picture — and the system chrome
          // keeps the outgoing look until the sweep lands (`hold`)
          hold(from);
          const committedIn = new Promise<void>((resolve) => {
            committed.current = { to, resolve };
          });
          flipped = true;
          setPref(to);
          await bounded(committedIn, WAIT_MS);
          // a frame for the native side to draw that commit, and one more so
          // the picture is of the drawing and never of the frame before it
          await frames(2);

          // 3. the incoming screen, drawn — and on screen inside the disc
          // (still r=0) before the edge starts to move
          newUri = await shot.captureRef(content, SHOT);
          await bounded(
            new Promise<void>((resolve) => {
              freshShown.current = resolve;
              setFresh(newUri);
            }),
            WAIT_MS,
          );

          // 4. the sweep — the web's edge, on the web's curve
          await new Promise<void>((resolve) => {
            sweep.value = withTiming(
              1,
              { duration: SWEEP_MS, easing: Easing.bezier(0.4, 0, 0.2, 1) },
              () => {
                runOnJS(resolve)();
              },
            );
          });

          // 5. full cover: the held picture goes, the look is the new one's,
          // and the disc fades off the live tree it now matches
          setHeld(null);
          hold(null);
          await new Promise<void>((resolve) => {
            fade.value = withTiming(0, { duration: TAIL_MS, easing: Easing.out(Easing.quad) }, () => {
              runOnJS(resolve)();
            });
          });
        } catch {
          // the pictures could not be had — the theme still changes
          if (!flipped) setPref(to);
        } finally {
          hold(null);
          setHeld(null);
          setFresh(null);
          committed.current = null;
          heldShown.current = null;
          freshShown.current = null;
          if (oldUri) shot.releaseCapture(oldUri);
          if (newUri) shot.releaseCapture(newUri);
          busy.current = false;
        }
      })();
    },
    [reduced, setPref, hold, sweep, fade],
  );

  // the disc's own box: it grows from nothing at the switch to a circle that
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
  }, [origin]);

  // ...and the picture inside it is pushed back by exactly the same amount,
  // so it sits at a fixed place on the SCREEN however big the disc is
  const still = useAnimatedStyle(() => {
    const r = sweep.value * origin.r;
    return { left: -(origin.x - r), top: -(origin.y - r) };
  }, [origin]);

  const value = useMemo<StageValue>(() => ({ reveal }), [reveal]);
  const picture = { width: size.w, height: size.h };

  return (
    <StageContext.Provider value={value}>
      <View style={styles.stage} onLayout={onLayout}>
        <View ref={content} collapsable={false} style={styles.stage}>
          {children}
        </View>

        {held ? (
          // the outgoing screen, held over the live tree. It takes every
          // touch: what is under it is no longer what it looks like.
          <View style={styles.held}>
            <Image
              source={{ uri: held }}
              style={picture}
              contentFit="fill"
              cachePolicy="none"
              transition={0}
              onDisplay={() => {
                heldShown.current?.();
                heldShown.current = null;
              }}
            />
          </View>
        ) : null}

        {fresh ? (
          <View style={styles.through}>
            <Animated.View style={[styles.disc, disc]}>
              <Animated.View style={[styles.field, picture, still]}>
                <Image
                  source={{ uri: fresh }}
                  style={picture}
                  contentFit="fill"
                  cachePolicy="none"
                  transition={0}
                  onDisplay={() => {
                    freshShown.current?.();
                    freshShown.current = null;
                  }}
                />
              </Animated.View>
            </Animated.View>
          </View>
        ) : null}
      </View>
    </StageContext.Provider>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1 },
  // pointerEvents in the STYLE: the prop is deprecated on web, and the style
  // form reaches every platform
  held: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, pointerEvents: "auto" },
  through: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, pointerEvents: "none" },
  disc: { position: "absolute", overflow: "hidden" },
  field: { position: "absolute" },
});
