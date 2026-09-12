// The dial's sheet — `[data-rr-lr-speed-menu]`, `.rr-lr-menu.rr-lr-sheet`
// with `.rr-lr-sheet-grab`, `.rr-lr-sheet-in`, `.rr-lr-sp`, `.rr-lr-sp-main`
// (`.rr-lr-sp-word`, `.rr-lr-sp-sub`, `.rr-lr-sp-dial` / `.rr-lr-sp-step` /
// `.rr-lr-sp-val`, `.rr-lr-sp-chips` / `.rr-lr-sp-chip`), the travel stood
// on end `.rr-lr-sp-slider` (`.rr-lr-sp-ticks`, `.rr-lr-sp-fill`), and the
// creep's switch `.rr-lr-sw` (`.rr-lr-sw-txt`, `.rr-lr-sw-tog`).
//
// Site: app/data/accountListeningPage.ts (markup and rules at the ≤620px
// branch); behaviour in app/components/ListeningEnhancer.tsx — setSpeedUI,
// useSpeed, the -speed-nudge / -speed-set / -speed-slider / -speed-ramp
// handlers — and app/components/audioStore.ts's SPEED_MIN / SPEED_MAX /
// SPEED_STEP / quantSpeed.
//
// EVERY ARRIVAL AT A NEW SPEED goes through `use()` — chip, stepper, slider —
// so the sheet can never print a figure the deck did not take (quantSpeed
// clamps and snaps to the twentieth: 0.05 is not 0.05 in binary, and without
// it `1.05` prints as 1.0500000000000003).
//
// The ramp ("Speed up as you go" — adds 0.05× every five minutes, stops at
// 2×) is a switch the deck does not yet run; the switch keeps its state here
// and the deck's creep is a TODO.

import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Path } from "react-native-svg";

import { mmss, useDeck, type Recording } from "../../lib/audioStore";
import { useInk, em } from "../../theme/ink";
import { FONTS } from "../../theme/type";
import { Switch } from "../../ui/Switch";

export const SPEED_MIN = 0.5;
export const SPEED_MAX = 3;
export const SPEED_STEP = 0.05;

/** Snap to the twentieth and hold the range. */
export const quantSpeed = (v: number): number =>
  Math.min(SPEED_MAX, Math.max(SPEED_MIN, Math.round(v * 20) / 20));

/** The dial in words. Four registers, and 1× is named for what it IS — the
 *  pace the book was read at — not "normal", which would imply the others
 *  are not. */
const speedWord = (speed: number): string =>
  speed < 1 ? "Slow" : speed === 1 ? "As recorded" : speed <= 1.5 ? "Brisk" : "Fast";

/** The chip prints the figure as short as it is honest; the big figure always
 *  prints two places, so it does not jump a character wide past a round number. */
const speedShort = (speed: number): string => `${speed}×`;
const speedLong = (speed: number): string => `${speed.toFixed(2)}×`;

const CHIPS = [0.8, 1, 1.5, 2];

function Sign({ plus, color }: { plus?: boolean; color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
      <Path d={plus ? "M8 3v10M3 8h10" : "M3 8h10"} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function SpeedSheet({
  open,
  onClose,
  recording,
  night,
  bottom,
  maxHeight,
}: {
  open: boolean;
  onClose: () => void;
  recording: Recording;
  night: boolean;
  bottom: number;
  maxHeight: number;
}) {
  const { ink } = useInk();
  const { now, duration, rate, setRate } = useDeck();
  const [ramp, setRamp] = useState(false);
  const [travel, setTravel] = useState(0);

  if (!open) return null;

  const speed = quantSpeed(rate);
  const use = (v: number) => {
    if (!Number.isFinite(v)) return;
    setRate(quantSpeed(v));
  };

  // the open chapter's run at this pace — off the build-time band lengths
  // when nothing is sounding, so the line never waits on metadata
  const here = now?.slug === recording.slug;
  const raw = (here && duration) || recording.chapters[here ? (now?.band ?? 0) : 0]?.duration || 0;
  const sub = raw ? `this chapter runs ${mmss(raw / speed)}` : " ";

  const ratio = (speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN);
  const inkHead = night ? "#F4EBD6" : "#0B0A08";
  const inkBody = night ? "#F4EBD6" : "#171411";
  const inkMuted = night ? "rgba(240,229,207,.62)" : "rgba(11,10,8,.6)";
  const brass = night ? "#D2AF69" : "#7E2D1F";

  const slideTo = (y: number) => {
    if (!travel) return;
    // bottom-up: the top of the travel is the fastest
    use(SPEED_MIN + (1 - Math.max(0, Math.min(1, y / travel))) * (SPEED_MAX - SPEED_MIN));
  };

  return (
    <>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View
        style={[styles.sheet, night ? styles.sheetNight : styles.sheetDay, { bottom, maxHeight }]}
        accessibilityLabel="Playback speed"
      >
        <Pressable onPress={onClose} style={styles.grab} accessibilityRole="button" accessibilityLabel="Close">
          <View style={[styles.grabBar, { backgroundColor: ink(0.28) }]} />
        </Pressable>

        <View style={styles.sp}>
          <View style={styles.main}>
            {/* .rr-lr-sp-word / .rr-lr-sp-sub */}
            <Text style={[styles.word, { color: inkHead }]}>{speedWord(speed)}</Text>
            <Text style={[styles.sub, { color: inkMuted }]}>{sub}</Text>

            {/* .rr-lr-sp-dial — the twentieth steppers around the figure */}
            <View style={styles.dial}>
              <Pressable
                onPress={() => use(speed - SPEED_STEP)}
                disabled={speed <= SPEED_MIN}
                aria-disabled={speed <= SPEED_MIN || undefined}
                accessibilityRole="button"
                accessibilityLabel="Slower"
                style={[styles.step, { borderColor: ink(0.26), opacity: speed <= SPEED_MIN ? 0.35 : 1 }]}
              >
                <Sign color={inkBody} />
              </Pressable>
              <Text style={[styles.val, { color: inkHead }]}>{speedLong(speed)}</Text>
              <Pressable
                onPress={() => use(speed + SPEED_STEP)}
                disabled={speed >= SPEED_MAX}
                aria-disabled={speed >= SPEED_MAX || undefined}
                accessibilityRole="button"
                accessibilityLabel="Faster"
                style={[styles.step, { borderColor: ink(0.26), opacity: speed >= SPEED_MAX ? 0.35 : 1 }]}
              >
                <Sign plus color={inkBody} />
              </Pressable>
            </View>

            {/* .rr-lr-sp-chips — the presets live ON the sheet, beside the
                figure they set */}
            <View style={styles.chips}>
              {CHIPS.map((v) => {
                const on = v === speed;
                return (
                  <Pressable
                    key={v}
                    onPress={() => use(v)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[
                      styles.chip,
                      { borderColor: on ? brass : ink(0.26), backgroundColor: on ? brass : "transparent" },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: on ? (night ? "#0B0A08" : "#FFFEFC") : inkBody }]}>
                      {speedShort(v)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* .rr-lr-sp-slider — the travel stood on end, bottom-up */}
          <Pressable
            onLayout={(e: LayoutChangeEvent) => setTravel(e.nativeEvent.layout.height)}
            onPress={(e) => slideTo(e.nativeEvent.locationY)}
            accessibilityRole="adjustable"
            accessibilityLabel="Playback speed"
            accessibilityValue={{ min: SPEED_MIN, max: SPEED_MAX, now: speed, text: `${speedShort(speed)}, ${speedWord(speed)}` }}
            style={[styles.slider, { backgroundColor: ink(0.12) }]}
          >
            {/* .rr-lr-sp-ticks — one per half-step of the travel */}
            {[0.25, 0.5, 0.75].map((t) => (
              <View key={t} style={[styles.tick, { top: `${t * 100}%`, backgroundColor: ink(0.3) }]} />
            ))}
            <View style={[styles.fill, { height: `${ratio * 100}%`, backgroundColor: brass }]} />
          </Pressable>
        </View>

        {/* .rr-lr-sw — the creep's switch */}
        <View style={[styles.sw, { borderTopColor: ink(0.12) }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.swB, { color: inkBody }]}>Speed up as you go</Text>
            <Text style={[styles.swEm, { color: inkMuted }]}>
              adds 0.05× every five minutes you listen, and stops at 2×
            </Text>
          </View>
          <Switch on={ramp} onChange={setRamp} label="Speed up as you go" />
        </View>
        <View style={{ height: 18 }} />
      </View>
    </>
  );
}

/* -------------------------------------------------------------- styles --- */

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(11,10,8,.28)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingHorizontal: 20,
    shadowColor: "#362A1C",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
    elevation: 8,
  },
  sheetDay: { backgroundColor: "#FFFEFC" },
  sheetNight: { backgroundColor: "#1D2537" },
  grab: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  grabBar: { width: 36, height: 4, borderRadius: 2 },
  // .rr-lr-sp{display:grid;grid-template-columns:1fr auto;gap:18px}
  sp: { flexDirection: "row", gap: 18, paddingTop: 8 },
  main: { flex: 1, alignItems: "center", gap: 6 },
  // .rr-lr-sp-word — Cormorant 600 26px
  word: { fontFamily: FONTS.serif, fontSize: 26, lineHeight: 30 },
  sub: { fontFamily: FONTS.sans, fontSize: 12, lineHeight: 17.390625 },
  dial: { flexDirection: "row", alignItems: "center", gap: 16, paddingTop: 10 },
  step: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  // .rr-lr-sp-val — the figure, two places, tabular
  val: { fontFamily: FONTS.serifMedium, fontSize: 36, fontVariant: ["tabular-nums"], minWidth: 96, textAlign: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, paddingTop: 12 },
  chip: { minHeight: 32, paddingHorizontal: 14, borderWidth: 1, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  chipText: { fontFamily: FONTS.sansBold, fontSize: 11, letterSpacing: em(11, 0.04) },
  // .rr-lr-sp-slider — 22px wide, the travel's height
  slider: { width: 22, alignSelf: "stretch", minHeight: 180, borderRadius: 11, overflow: "hidden", justifyContent: "flex-end" },
  tick: { position: "absolute", left: 6, right: 6, height: 1 },
  fill: { width: "100%", borderRadius: 11 },
  // .rr-lr-sw — ruled above, the switch at the right
  sw: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 18, paddingTop: 14, borderTopWidth: 1 },
  swB: { fontFamily: FONTS.sansSemi, fontSize: 13.5 },
  swEm: { fontFamily: FONTS.sans, fontSize: 11.5, lineHeight: 16.5, marginTop: 2 },
});
