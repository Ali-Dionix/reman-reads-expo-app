// The platter's follower — the site's loadBand (`st.speed = speedFor(slug)`
// on EVERY cue) and its runRamp, as one node that draws nothing.
//
// Mount it ONCE, under AudioProvider, somewhere that is always there —
// app/(tabs)/_layout.tsx beside the Tabs, or the listening room's root — and
// every book that lands on the platter takes ITS OWN dial before the
// recorder's first stamp, whether it was begun from the open volume, the
// home tab's rows or the tab bar (app/(tabs)/index.tsx, src/portal/
// TornNav.tsx call begin() with no console mounted). Without it the deck's
// `rate` is one global that only the open console ever sets: 1.5× left on
// Crime and Punishment plays Meditations at 1.5× and is stamped into
// Meditations' spot as if the reader had chosen it.
//
// The creep rides here too, so it keeps counting with the volume shut (the
// console's own call stands down while this is mounted — console/speed.ts).

import { useDeck } from "../../../lib/audioStore";
import { useFollowBookSpeed, useSpeedRamp } from "./speed";

export function SpeedFollower(): null {
  const { now } = useDeck();
  useFollowBookSpeed();
  useSpeedRamp(now?.slug ?? "", "room");
  return null;
}
