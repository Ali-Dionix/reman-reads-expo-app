// The dial's sheet — `[data-rr-lr-speed-menu]`, `.rr-lr-menu.rr-lr-sheet`
// with `.rr-lr-sheet-grab`, `.rr-lr-sheet-in`, `.rr-lr-sp`, `.rr-lr-sp-main`
// (`.rr-lr-sp-word`, `.rr-lr-sp-sub`, `.rr-lr-sp-dial` / `.rr-lr-sp-step` /
// `.rr-lr-sp-val`, `.rr-lr-sp-chips` / `.rr-lr-sp-chip`), the travel stood
// on end `.rr-lr-sp-slider` (`.rr-lr-sp-ticks`, `.rr-lr-sp-fill`), and the
// creep's switch `.rr-lr-sw` (`.rr-lr-sw-txt`, `.rr-lr-sw-tog`).
//
// Site: app/data/accountListeningPage.ts (markup; rules at the ≤900px and
// ≤520px branches — `.rr-lr-sp{grid-template-columns:minmax(0,1fr) 38px;
// gap:0 12px}`, `.rr-lr-sp-val{min-width:104px;font-size:34px}`,
// `.rr-lr-sp-chip{padding:7px 12px}`); behaviour in
// app/components/ListeningEnhancer.tsx — setSpeedUI, useSpeed, the
// -speed-nudge / -speed-set / -speed-slider / -speed-ramp handlers — and
// app/components/audioStore.ts's SPEED_MIN / SPEED_MAX / SPEED_STEP /
// quantSpeed.
//
// THE GRID: the pace in words, what the chapter then runs to, the figure
// between a minus and a plus, four presets, and the switch under them — one
// column; the travel slider stands up the right-hand margin spanning both
// rows. The slider's ratio runs BOTTOM-UP and, unlike the groove, it commits
// on every move: the reader hears the change.
//
// EVERY ARRIVAL AT A NEW SPEED goes through `use()` — chip, stepper, slider —
// so the sheet can never print a figure the deck did not take (quantSpeed
// clamps and snaps to the twentieth: 0.05 is not 0.05 in binary, and without
// it `1.05` prints as 1.0500000000000003).
//
// The figure, the quantiser and the ramp are console/speed.ts's — the dial
// is PER BOOK there (speedShownFor / setSpeed(slug)), and the creep ("Speed
// up as you go" — adds 0.05× every five minutes heard, stops at 2×) is
// armed here and run by the console off the deck's clock.

import { useMemo, useRef, useState } from "react";
import { AccessibilityInfo, PanResponder, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";

import { chaptersOf, mmss, useDeck, type Recording } from "../../lib/audioStore";
import { ownerOf } from "../../lib/portalState";
import { useSession } from "../../lib/session";
import { FONTS, lh, lineOf } from "../../theme/type";
import { Disc } from "../../ui/Disc";
import { hairline } from "../../ui/DashedBox";
import { Sign } from "./console/glyphs";
import { deckInk } from "./console/ink";
import { Sheet } from "./console/Sheet";
import { SPEED_MAX, SPEED_MIN, SPEED_STEP, quantSpeed, speedShort, useBookSpeed } from "./console/speed";
import { useStanding, voiceInForce } from "./voice/standing";

export { SPEED_MAX, SPEED_MIN, SPEED_STEP, quantSpeed } from "./console/speed";

/** The dial in words. Four registers, and 1× is named for what it IS — the
 *  pace the book was read at — not "normal", which would imply the others
 *  are not. */
const speedWord = (speed: number): string =>
  speed < 1 ? "Slow" : speed === 1 ? "As recorded" : speed <= 1.5 ? "Brisk" : "Fast";

/** The chip prints the figure as short as it is honest (speedShort); the big
 *  figure always prints two places, so it does not jump a character wide past
 *  a round number. */
const speedLong = (speed: number): string => `${speed.toFixed(2)}×`;

const CHIPS = [0.8, 1, 1.5, 2];

/** `.rr-lr-sp-ticks` — a rule every 14px inside a 12px / 11px inset. */
const TICK_EVERY = 14;

/** The travel's VoiceOver / TalkBack actions. */
const SLIDER_ACTIONS = [{ name: "increment" }, { name: "decrement" }];

/** `[data-rr-lr-speed-slider]` carries aria-orientation="vertical"; RN's View
 *  types do not name the prop, but RN 0.86 and react-native-web both pass it
 *  through (web-only in effect — VoiceOver has no equivalent). */
const VERTICAL = { "aria-orientation": "vertical" } as Record<string, unknown>;

/* -------------------------------------------------------- the switch --- */

/** `.rr-lr-sw-tog` — 50×29, a 1.5px ring; a 21px knob 2 in, travelling to 24;
 *  on, the slab is filled and the knob goes paper. (The kit's `Switch` is
 *  `.rr-ap-sw`, 46×26 — a different control on the site, too.) */
function RampSwitch({ on, onChange, night }: { on: boolean; onChange: (next: boolean) => void; night: boolean }) {
  const { tog } = deckInk(night);
  const bw = hairline(1.5);
  return (
    <Pressable
      onPress={() => onChange(!on)}
      accessibilityRole="switch"
      accessibilityLabel="Speed up as you go"
      accessibilityState={{ checked: on }}
      // react-native-web 0.21 writes aria-checked only from the aria prop
      aria-checked={on}
      style={[
        styles.tog,
        { borderWidth: bw, borderColor: on ? tog.onFill : tog.ring, backgroundColor: on ? tog.onFill : "transparent" },
      ]}
    >
      <View
        style={[
          styles.togKnob,
          // margin-left 2 / 24, inside the ring (Chrome lays a 1.5px border
          // out at the device pixel it paints — the same figure hairline() gives)
          { marginLeft: on ? 24 : 2, backgroundColor: on ? tog.onKnob : tog.knob },
        ]}
      />
    </Pressable>
  );
}

/* --------------------------------------------------------- the sheet --- */

export function SpeedSheet({
  open,
  onClose,
  recording,
  night,
  bottom,
}: {
  open: boolean;
  onClose: () => void;
  recording: Recording;
  night: boolean;
  bottom: number;
  /** The frame's cap; the sheet keeps the site's own (`min(58vh,470px)`). */
  maxHeight?: number;
}) {
  const ink = deckInk(night);
  const { now, duration, voice } = useDeck();
  const { user } = useSession();
  const standing = useStanding(ownerOf(user?.id));
  // this book's own dial, and the creep's switch
  const { speed, set, ramp, setRamp } = useBookSpeed(recording.slug);
  const [travel, setTravel] = useState({ w: 0, h: 0 });

  const use = (v: number, tell = true) => {
    // a slider hands over a ratio measured off a rect, and a rect can be
    // ZERO — which walks 0/0 into quantSpeed and prints NaN× across the sheet
    if (!Number.isFinite(v)) return;
    const q = quantSpeed(v);
    set(q);
    // the site announces every arrival — "Playback speed 1.05×." — except
    // the travel's moves, which it announces once on release
    if (tell) AccessibilityInfo.announceForAccessibility(`Playback speed ${speedShort(q)}.`);
  };
  const arm = (on: boolean) => {
    setRamp(on);
    AccessibilityInfo.announceForAccessibility(
      on ? "Speeding up as you go: 0.05× every five minutes, stopping at 2×." : "The speed stays where you set it.",
    );
  };

  // the open chapter's run at this pace — off the build-time band lengths
  // when nothing is sounding, so the line never waits on metadata. The
  // lengths are THE PRESSING IN FORCE's (the site's bandDuration goes through
  // bookFor → narratorFor): the deck's voice while this book sounds, else the
  // reader's ledger, else the book's default — the same figure the console's
  // idle clock prints.
  const here = now?.slug === recording.slug;
  const voiceIds = useMemo(() => (recording.voices ?? []).map((v) => v.id), [recording.voices]);
  const voiceId = here ? voice : voiceInForce(recording.slug, voiceIds, recording.voiceId ?? null, standing);
  const raw = (here && duration) || chaptersOf(recording, voiceId)[here ? (now?.band ?? 0) : 0]?.duration || 0;
  const sub = raw ? `this chapter runs ${mmss(raw / speed)}` : " ";

  const ratio = (speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN);

  // the travel: bottom-up, committing on every move (dialSpeedAt)
  const liveH = useRef(0);
  liveH.current = travel.h;
  const commit = useRef(use);
  commit.current = use;
  const at = (y: number, tell = false) => {
    const h = liveH.current || 1;
    const r = Math.max(0, Math.min(1, (h - y) / h));
    commit.current(SPEED_MIN + r * (SPEED_MAX - SPEED_MIN), tell);
  };
  const y0 = useRef(0);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          y0.current = e.nativeEvent.locationY;
          at(y0.current);
        },
        onPanResponderMove: (_e, g) => at(y0.current + g.dy),
        onPanResponderRelease: (_e, g) => at(y0.current + g.dy, true),
        // the travel stands inside the sheet's scroller: a vertical drag on
        // it is the slider's until the finger lifts, never the scroller's —
        // and should the platform take it anyway, the last ratio stands
        onPanResponderTerminate: (_e, g) => at(y0.current + g.dy, true),
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // the ticks: from 12px in, one every 14, stopping 12px short of the foot
  const tickH = Math.max(0, travel.h - 24);
  const ticks = travel.h ? Math.floor(tickH / TICK_EVERY) + 1 : 0;

  const stepRing = hairline(1.5);

  return (
    <Sheet open={open} onClose={onClose} night={night} bottom={bottom} label="Playback speed">
      {/* .rr-lr-sp — the main column and the travel, 12 apart */}
      <View style={styles.sp}>
        <View style={styles.col}>
          <View style={styles.main}>
            {/* .rr-lr-sp-word / .rr-lr-sp-sub */}
            <Text style={[styles.word, { color: ink.head }]}>{speedWord(speed)}</Text>
            <Text style={[styles.sub, { color: ink.muted }]}>{sub}</Text>

            {/* .rr-lr-sp-dial — the twentieth steppers around the figure;
                dead at the ends of the travel */}
            <View style={styles.dial}>
              <View style={{ opacity: speed <= SPEED_MIN ? 0.3 : 1 }}>
                <Disc
                  size={42}
                  ring={ink.jog.ring}
                  ringWidth={stepRing}
                  fill={ink.jog.fill}
                  onPress={() => use(speed - SPEED_STEP)}
                  disabled={speed <= SPEED_MIN}
                  accessibilityLabel="Slower"
                  style={{ opacity: 1 }}
                >
                  <Sign color={ink.jog.glyph} />
                </Disc>
              </View>
              <Text style={[styles.val, { color: ink.head }]}>{speedLong(speed)}</Text>
              <View style={{ opacity: speed >= SPEED_MAX ? 0.3 : 1 }}>
                <Disc
                  size={42}
                  ring={ink.jog.ring}
                  ringWidth={stepRing}
                  fill={ink.jog.fill}
                  onPress={() => use(speed + SPEED_STEP)}
                  disabled={speed >= SPEED_MAX}
                  accessibilityLabel="Faster"
                  style={{ opacity: 1 }}
                >
                  <Sign plus color={ink.jog.glyph} />
                </Disc>
              </View>
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
                    accessibilityLabel={speedShort(v)}
                    accessibilityState={{ selected: on }}
                    aria-selected={on}
                    style={[
                      styles.chip,
                      { borderColor: on ? ink.chip.onFill : ink.chip.ring, backgroundColor: on ? ink.chip.onFill : "transparent" },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: on ? ink.chip.onInk : ink.chip.ink }]}>{speedShort(v)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* .rr-lr-sw — the creep's switch, ruled above */}
          <View style={[styles.sw, { borderTopColor: ink.rowRule }]}>
            <View style={styles.swTxt}>
              <Text style={[styles.swB, { color: ink.swLabel }]}>Speed up as you go</Text>
              <Text style={[styles.swEm, { color: ink.muted }]}>
                adds 0.05× every five minutes you listen, and stops at 2×
              </Text>
            </View>
            <RampSwitch on={ramp} onChange={arm} night={night} />
          </View>
        </View>

        {/* .rr-lr-sp-slider — the travel stood on end, both rows tall */}
        <View
          {...pan.panHandlers}
          {...VERTICAL}
          onLayout={(e: LayoutChangeEvent) => setTravel({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
          accessibilityRole="adjustable"
          accessibilityLabel="Playback speed"
          accessibilityValue={{ min: SPEED_MIN, max: SPEED_MAX, now: speed, text: `${speedShort(speed)}, ${speedWord(speed)}` }}
          // react-native-web 0.21 maps only the aria props; RN 0.86 takes them too
          aria-valuemin={SPEED_MIN}
          aria-valuemax={SPEED_MAX}
          aria-valuenow={speed}
          aria-valuetext={`${speedShort(speed)}, ${speedWord(speed)}`}
          // VoiceOver / TalkBack swipe: the site's arrow keys, a twentieth
          accessibilityActions={SLIDER_ACTIONS}
          onAccessibilityAction={(e) => {
            const name = e.nativeEvent.actionName;
            if (name === "increment") use(speed + SPEED_STEP);
            else if (name === "decrement") use(speed - SPEED_STEP);
          }}
          style={[styles.slider, { backgroundColor: ink.travel.well }]}
        >
          {/* .rr-lr-sp-ticks — the stock's own rules */}
          <View style={styles.ticks} pointerEvents="none">
            {Array.from({ length: ticks }, (_, i) => (
              <View key={i} style={[styles.tick, { top: i * TICK_EVERY, backgroundColor: ink.travel.tick }]} />
            ))}
          </View>
          {/* the inset ring rides OVER the fill, as a box-shadow does */}
          <View pointerEvents="none" style={[styles.sliderRing, { borderColor: ink.travel.ring }]} />
          {/* .rr-lr-sp-fill — the ink, a paper lip along its top */}
          <View
            pointerEvents="none"
            style={[
              styles.fill,
              { height: `${ratio * 100}%`, backgroundColor: ink.travel.fill, boxShadow: `inset 0 2px 0 ${ink.travel.lip}, 0 -1px 3px ${ink.travel.shadow}` },
            ]}
          />
        </View>
      </View>
    </Sheet>
  );
}

/* -------------------------------------------------------------- styles --- */

const styles = StyleSheet.create({
  // ≤520px: .rr-lr-sp{grid-template-columns:minmax(0,1fr) 38px;gap:0 12px;padding:8px 0 2px}
  sp: { flexDirection: "row", gap: 12, paddingTop: 8, paddingBottom: 2 },
  col: { flex: 1, minWidth: 0 },
  // .rr-lr-sp-main{text-align:center}
  main: { alignItems: "center" },
  // .rr-lr-sp-word — Cormorant 600 23px/1.1
  word: { fontFamily: FONTS.serif, fontSize: 23, lineHeight: lineOf(23, 1.1), textAlign: "center" },
  // .rr-lr-sp-sub{margin:3px 0 0;font:500 11.5px 'Manrope';tabular}
  sub: { marginTop: 3, fontFamily: FONTS.sansMedium, fontSize: 11.5, lineHeight: lh("Manrope", 11.5), fontVariant: ["tabular-nums"], textAlign: "center" },
  // .rr-lr-sp-dial{gap:clamp(10px,4vw,26px);padding:16px 0 4px} — 15.6 at 390
  dial: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 15.6, paddingTop: 16, paddingBottom: 4 },
  // ≤520px: .rr-lr-sp-val{min-width:104px;font-size:34px} — Cormorant 600, line-height 1
  val: { fontFamily: FONTS.serif, fontSize: 34, lineHeight: 34, minWidth: 104, textAlign: "center", fontVariant: ["tabular-nums"] },
  // .rr-lr-sp-chips{gap:7px;padding:14px 0 4px}
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 7, paddingTop: 14, paddingBottom: 4 },
  // ≤520px: .rr-lr-sp-chip{min-height:34px;padding:7px 12px;border:1px;font:700 11.5px}
  chip: { minHeight: 34, paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  chipText: { fontFamily: FONTS.sansBold, fontSize: 11.5, lineHeight: lh("Manrope", 11.5), fontVariant: ["tabular-nums"] },

  // .rr-lr-sp-slider{min-height:190px;border-radius:10px;box-shadow:inset 0 0 0 1px;overflow:hidden}
  slider: { width: 38, alignSelf: "stretch", minHeight: 190, borderRadius: 10, overflow: "hidden" },
  sliderRing: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, borderRadius: 10, borderWidth: 1, zIndex: 1 },
  // .rr-lr-sp-ticks{left:11px;right:11px;top:12px;bottom:12px}
  ticks: { position: "absolute", left: 11, right: 11, top: 12, bottom: 12 },
  tick: { position: "absolute", left: 0, right: 0, height: 1 },
  // .rr-lr-sp-fill{left:0;right:0;bottom:0;box-shadow:inset 0 2px 0 <lip>,0 -1px 3px}
  fill: { position: "absolute", left: 0, right: 0, bottom: 0 },

  // .rr-lr-sw{gap:14px;margin-top:14px;padding:14px 2px 4px;border-top:1px}
  sw: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 14, paddingTop: 14, paddingHorizontal: 2, paddingBottom: 4, borderTopWidth: 1 },
  // .rr-lr-sw-txt{gap:2px;text-align:left}
  swTxt: { flex: 1, minWidth: 0, gap: 2 },
  // .rr-lr-sw-txt b — Cormorant 600 17px/1.15
  swB: { fontFamily: FONTS.serif, fontSize: 17, lineHeight: lineOf(17, 1.15) },
  // .rr-lr-sw-txt em — 400 11px/1.45 Manrope
  swEm: { fontFamily: FONTS.sans, fontSize: 11, lineHeight: lineOf(11, 1.45) },
  // .rr-lr-sw-tog{width:50px;height:29px;border-radius:999px;display:flex;align-items:center}
  tog: { width: 50, height: 29, borderRadius: 999, justifyContent: "center" },
  togKnob: { width: 21, height: 21, borderRadius: 999 },
});
