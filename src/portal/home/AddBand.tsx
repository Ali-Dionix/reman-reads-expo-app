// `.rr-ov-add` — "Add your own book.", the import grid. accountPage.ts:
//
//   .rr-ap-band          margin 30px 0 0                          (= <BandHead>)
//   .rr-ap-band-h        margin 0 0 2px — collapses into .rr-ap-acts's 16px
//                        top margin on the web; the kit's head draws none
//   .rr-ov-add .rr-ap-acts   five cells, five columns, at every width
//
// The five cells are ADD_WAYS (Files, Scan, Text, Link — appShell.ts, the same
// list the + sheet draws its rows from) plus Clone, which is deliberately NOT
// in ADD_WAYS: it records the voice that reads the books, it does not bring
// one in. All five are behind the subscription (IMPORTS_NEED_SUBSCRIPTION):
// padlocked, full strength, and STILL TAPPABLE — a locked cell's job is to
// explain itself, so it opens the gate panel rather than its own.
//
// The supporting line is the "shut" wording the page bakes; ImportsEnhancer
// rewrites it for a subscriber (ADD_SUB_OPEN). The app has no subscription
// state yet, so it bakes the same safe one.

import { BandHead } from "../../ui/BandHead";
import { Acts, type Act } from "../../ui/Acts";
import type { IconName } from "../../ui/Icon";

export type AddKey = "files" | "scan" | "text" | "link" | "voice";

/** ADD_WAYS, verbatim, plus the fifth cell. */
const CELLS: { key: AddKey; label: string; icon: IconName }[] = [
  { key: "files", label: "Files", icon: "files" },
  { key: "scan", label: "Scan", icon: "camera" },
  { key: "text", label: "Text", icon: "pencil" },
  { key: "link", label: "Link", icon: "link" },
  { key: "voice", label: "Clone", icon: "mic" },
];

/** app/data/importFormats.ts — a shop door, not a safe. */
export const IMPORTS_NEED_SUBSCRIPTION = true;

const ADD_SUB_SHUT =
  "Add a book from your files, a photo, a link, or text you paste, and the app reads it out loud. Clone your voice and the book is read in it. Both come with the subscription. Only you can open a book you add.";
const ADD_SUB_OPEN =
  "Add a book from your files, a photo, a link, or text you paste, and the app reads it out loud. Clone your voice and the book is read in it. Only you can open a book you add.";

export function AddBand({ onOpen }: { onOpen: (key: AddKey) => void }) {
  const acts: Act[] = CELLS.map((c) => ({
    label: c.label,
    icon: c.icon,
    locked: IMPORTS_NEED_SUBSCRIPTION,
    onPress: () => onOpen(c.key),
  }));
  return (
    <>
      <BandHead
        title="Add your own book."
        sub={IMPORTS_NEED_SUBSCRIPTION ? ADD_SUB_SHUT : ADD_SUB_OPEN}
      />
      <Acts acts={acts} columns={5} />
    </>
  );
}
