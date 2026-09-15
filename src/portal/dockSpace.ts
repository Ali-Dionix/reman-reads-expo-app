// How much room the travelling record takes above the tab bar.
//
// The dock (ListeningDock.tsx) is drawn over the page, in the same absolute
// stack as the bar, so nothing under it moves when it appears — but the
// page must still END above it, or the last band of every room is under a
// player the moment a chapter starts. The site says so in CSS:
//
//   body.rr-ld-on .rr-pt-content { padding-bottom: calc(180px + safe) }
//
// against the shell's usual 94px + safe — the dock stacks its own height.
// The phone has no body class, so the dock publishes the height it laid
// out at and every page that pads itself clear of the bar (useContentInsets)
// and every sheet that rises from it (the library's filter fold) adds it.
// Zero when the needle is up.

import { useSyncExternalStore } from "react";

let height = 0;
const listeners = new Set<() => void>();

/** The dock's laid-out height, or 0 once it is gone. Whole pixels only. */
export function setDockHeight(h: number): void {
  const next = Math.max(0, Math.round(h));
  if (next === height) return;
  height = next;
  listeners.forEach((fn) => fn());
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** The room the dock is taking right now — 0 when there is no dock. */
export const useDockHeight = (): number => useSyncExternalStore(subscribe, () => height, () => height);
