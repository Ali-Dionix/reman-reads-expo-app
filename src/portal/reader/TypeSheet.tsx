// The text settings sheet — `[data-rr-lr-type-menu]`, `.rr-lr-menu.rr-lr-sheet`
// with `.rr-lr-sheet-grab`, `.rr-lr-sheet-in`, `.rr-lr-menu-h`,
// `.rr-lr-menu-row` (`[data-rr-lr-type-fs="1..5"]`,
// `[data-rr-lr-type-face="serif|sans"]`, `[data-rr-lr-type-lh="1|2|3"]`,
// `[data-rr-lr-type-gild]`, `[data-rr-lr-type-pages]`), `.rr-lr-menu-foot`.
//
// Site: app/data/accountListeningPage.ts (markup and rules at the ≤900px
// branch); behaviour in app/components/ListeningEnhancer.tsx — typePrefs,
// saveTypePrefs / applyTypePrefs (`.is-on` on the row in force, the gild
// row's note "on" / "off"), the -type-* handlers.
//
// "this sets the read-along text. the book pages keep their own type." The
// settings dress the REFLOWED galley view, which the app does not stand yet —
// it reads off the rendered pages — so the choices are kept by the frame
// (`TypePrefs`) and applied nowhere until the galley layer lands.
//
// `[data-rr-lr-type-pages]` is the SURFACE toggle — "Reading view: the pages
// / the text view" (typePrefs.pg) — shown whenever the open book has
// rendered pages (`surf.hidden = !hasPages(openSlug)`), phone included. The
// app stands the pages alone, so the row is rendered on (`the pages`) when
// the frame says `hasPages`, and is inert until the text view lands.
//
// THE PHONE CONSOLE HAS NO OPENER for this sheet on the site (keyboard A);
// see LampSheet.tsx for the same note. The sheet's chrome is
// console/Sheet.tsx's, shared with the dial's and the lamp's.

import { MenuFoot, MenuHead, MenuRow, Sheet } from "./console/Sheet";

export type TypePrefs = {
  /** 1–5. */
  fs: 1 | 2 | 3 | 4 | 5;
  face: "serif" | "sans";
  /** 1 tight, 2 normal, 3 loose. */
  lh: 1 | 2 | 3;
  /** Word-by-word highlight. */
  gild: boolean;
  /** Pages per view — the codex's --per; one leaf on a phone. */
  per: 1 | 2;
  /** The surface: the author's pages (true) or the text view. Always the
   *  pages while the app has no text view. */
  pg?: boolean;
};

export const TYPE_DEFAULTS: TypePrefs = { fs: 3, face: "serif", lh: 2, gild: true, per: 1, pg: true };

export function TypeSheet({
  open,
  onClose,
  night,
  prefs,
  setPrefs,
  bottom,
  hasPages = false,
}: {
  open: boolean;
  onClose: () => void;
  night: boolean;
  prefs: TypePrefs;
  setPrefs: (next: TypePrefs) => void;
  bottom: number;
  /** The open book has rendered pages — the surface row shows. */
  hasPages?: boolean;
  /** The frame's cap; the sheet keeps the site's own (`min(58vh,470px)`). */
  maxHeight?: number;
}) {
  return (
    <Sheet open={open} onClose={onClose} night={night} bottom={bottom} label="Text settings">
      <MenuHead night={night}>Text settings</MenuHead>

      {([1, 2, 3, 4, 5] as const).map((n) => (
        <MenuRow
          key={n}
          night={night}
          first={n === 1}
          label={`Text size ${n}`}
          note={n === 1 ? "smallest" : n === 5 ? "largest" : undefined}
          on={prefs.fs === n}
          onPress={() => setPrefs({ ...prefs, fs: n })}
        />
      ))}
      <MenuRow night={night} label="Serif type" on={prefs.face === "serif"} onPress={() => setPrefs({ ...prefs, face: "serif" })} />
      <MenuRow night={night} label="Sans-serif type" on={prefs.face === "sans"} onPress={() => setPrefs({ ...prefs, face: "sans" })} />
      <MenuRow night={night} label="Tight line spacing" on={prefs.lh === 1} onPress={() => setPrefs({ ...prefs, lh: 1 })} />
      <MenuRow night={night} label="Normal line spacing" on={prefs.lh === 2} onPress={() => setPrefs({ ...prefs, lh: 2 })} />
      <MenuRow night={night} label="Loose line spacing" on={prefs.lh === 3} onPress={() => setPrefs({ ...prefs, lh: 3 })} />
      <MenuRow
        night={night}
        label="Word-by-word highlight"
        note={prefs.gild ? "on" : "off"}
        on={prefs.gild}
        onPress={() => setPrefs({ ...prefs, gild: !prefs.gild })}
      />
      {/* [data-rr-lr-type-pages] — the surface. On until the text view
          lands: a tap re-affirms the pages rather than offering a view the
          app cannot stand. */}
      {hasPages ? (
        <MenuRow
          night={night}
          label="Reading view"
          note={prefs.pg === false ? "the text view" : "the pages"}
          on={prefs.pg !== false}
          onPress={() => setPrefs({ ...prefs, pg: true })}
        />
      ) : null}

      <MenuFoot>this sets the read-along text. the book pages keep their own type.</MenuFoot>
    </Sheet>
  );
}
