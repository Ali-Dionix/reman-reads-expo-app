// The typewriter — Hermes's reply arriving a character at a time, 14 ms a
// character as on the web (hermesDesk's walker).
//
// ITS OWN COMPONENT, ITS OWN STATE. The room used to keep the revealed text
// in its own useState and set it from a 14 ms setInterval: seventy state
// changes a second, each one re-rendering the whole Ask AI screen — every
// slip in the thread, the chips, the picker, the margin — for as long as a
// reply typed (a 400-character answer is 400 renders in 5.6 s). Here the
// count lives in the one Text that changes, driven off requestAnimationFrame
// from the elapsed clock (never more than one update a frame, the same 14 ms
// pace whatever the display's rate), and the room hears from it twice:
// onProgress every forty characters (the site's scrollToEnd cadence) and
// onDone once.
//
// `render(n)` draws the first n characters however the caller likes — the
// margin note sets its word in bold. Without it the text simply grows.

import { useEffect, useState, type ReactNode } from "react";

export function Typewriter({
  text,
  paceMs = 14,
  onProgress,
  onDone,
  render,
}: {
  text: string;
  /** Milliseconds a character. */
  paceMs?: number;
  /** Every forty characters, with the count so far. */
  onProgress?: (shown: number) => void;
  /** Once, when the last character is in. */
  onDone?: () => void;
  render?: (shown: number) => ReactNode;
}) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let alive = true;
    let raf = 0;
    let last = 0;
    const start = performance.now();
    setShown(0);
    const tick = (now: number) => {
      if (!alive) return;
      const n = Math.min(text.length, Math.floor((now - start) / paceMs));
      if (n !== last) {
        // a stride of forty, crossed: the site scrolls the thread here
        if (Math.floor(n / 40) > Math.floor(last / 40)) onProgress?.(n);
        last = n;
        setShown(n);
      }
      if (n < text.length) raf = requestAnimationFrame(tick);
      else onDone?.();
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
    // a new text restarts; the callbacks are read fresh each frame by closure
    // over the latest render, so they are deliberately not dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, paceMs]);

  return <>{render ? render(shown) : text.slice(0, shown)}</>;
}
