// The sleep timer's sheet — `[data-rr-lr-lamp-menu]`, `.rr-lr-menu.rr-lr-sheet`
// with `.rr-lr-sheet-grab`, `.rr-lr-sheet-in`, `.rr-lr-menu-h`,
// `.rr-lr-menu-row` (`[data-rr-lr-lamp-set]`, `[data-rr-lr-lamp-add]`,
// `[data-rr-lr-lamp-off]`), `.rr-lr-lamp-line`, `.rr-lr-menu-foot`.
//
// Site: app/data/accountListeningPage.ts (markup and rules at the ≤900px
// branch); behaviour in app/components/ListeningEnhancer.tsx — paintLamp
// ("stops at the end of this chapter" / "stops in m:ss"), setSleep,
// extendSleep — and the stage lamp that dims as the timer runs down
// (`.rr-lr-reader[data-lamp="75|50|30"] .rr-lr-lamp`).
//
// THE PHONE CONSOLE HAS NO OPENER for this sheet on the site: the lamp's
// button left the console when it became five slots, and the sheet is
// reached by the keyboard (T) — see the "toggleMenu('lamp')" handlers. The
// frame keeps the sheet in its `sheet` state so a room may open it; nothing
// on the console does yet.
//
// The timer itself — pausing playback when it lands, and the lamp dimming
// through 75/50/30 — is the frame's (`lamp` state) and still a TODO: this
// sheet only sets and clears the request. The sheet's chrome is
// console/Sheet.tsx's, shared with the dial's and the type sheet.

import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { mmss } from "../../lib/audioStore";
import { FONTS, lh } from "../../theme/type";
import { deckInk } from "./console/ink";
import { MenuFoot, MenuHead, MenuRow, Sheet } from "./console/Sheet";

/** What the reader asked for: the end of this chapter, or minutes from now. */
export type Lamp = { kind: "band" } | { kind: "at"; endsAt: number } | null;

const MINUTES = [15, 30, 45, 60];

/** paintLamp's line. */
const lampLine = (lamp: Lamp, nowMs: number): string => {
  if (!lamp) return " ";
  if (lamp.kind === "band") return "stops at the end of this chapter";
  const remain = Math.max(0, Math.round((lamp.endsAt - nowMs) / 1000));
  return `stops in ${mmss(remain)}`;
};

export function LampSheet({
  open,
  onClose,
  night,
  lamp,
  setLamp,
  bottom,
}: {
  open: boolean;
  onClose: () => void;
  night: boolean;
  lamp: Lamp;
  setLamp: (next: Lamp) => void;
  bottom: number;
  /** The frame's cap; the sheet keeps the site's own (`min(58vh,470px)`). */
  maxHeight?: number;
}) {
  const ink = deckInk(night);

  // the armed line counts down while the sheet is open (the site repaints it
  // on the store's tick)
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    if (!open || lamp?.kind !== "at") return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open, lamp]);

  return (
    <Sheet open={open} onClose={onClose} night={night} bottom={bottom} label="Sleep timer">
      <MenuHead night={night}>Sleep timer</MenuHead>

      {!lamp ? (
        <View>
          <MenuRow
            night={night}
            first
            label="at the end of this chapter"
            note="whichever one is playing then"
            onPress={() => {
              setLamp({ kind: "band" });
              onClose();
            }}
          />
          {MINUTES.map((m) => (
            <MenuRow
              key={m}
              night={night}
              label={`in ${m} minutes`}
              onPress={() => {
                setLamp({ kind: "at", endsAt: Date.now() + m * 60000 });
                onClose();
              }}
            />
          ))}
        </View>
      ) : (
        <View>
          {/* .rr-lr-lamp-line — Cormorant 19px, tabular, 4 under */}
          <Text style={[styles.lampLine, { color: ink.head }]}>{lampLine(lamp, nowMs)}</Text>
          {/* the site's extendSleep: only a MINUTES timer extends, and from
              now if its deadline has already passed; a chapter's-end timer
              is left as it is */}
          <MenuRow
            night={night}
            label="+15 minutes"
            onPress={() => {
              if (lamp.kind !== "at") return;
              setLamp({ kind: "at", endsAt: Math.max(lamp.endsAt, Date.now()) + 15 * 60000 });
            }}
          />
          <MenuRow
            night={night}
            label="Turn the timer off"
            onPress={() => {
              setLamp(null);
              onClose();
            }}
          />
        </View>
      )}

      <MenuFoot>playback pauses; your place is kept.</MenuFoot>
    </Sheet>
  );
}

/* -------------------------------------------------------------- styles --- */

const styles = StyleSheet.create({
  // .rr-lr-lamp-line{margin:0 0 4px;font-size:19px;font-variant-numeric:tabular-nums}
  lampLine: { marginBottom: 4, fontFamily: FONTS.serifRegular, fontSize: 19, lineHeight: lh("Cormorant Garamond", 19), fontVariant: ["tabular-nums"] },
});
