// The closing band — `.rr-ly-band` from app/data/accountLibraryPage.ts at its
// app pass: a ruled note, not a filled panel, OUTSIDE `.rr-pt-wrap` so the
// brick rule runs edge to edge.
//
//   .rr-ly-band      margin 8px 0 0; padding 18px 0 20px; 1px dashed brick .42
//                    over it; text centred
//   h2               600 21px/1.15 Cormorant, ink
//   p                margin 7px auto 0; 400 13px/1.6 Manrope ink .62; 34rem
//   .rr-ly-band-row  gap 10, 15px above, centred, wrapping
//   .rr-pt-btn       the kit's Button (src/ui/Button.tsx); --ghost its ghost
//
// Copy is the builder's, verbatim. "Request any book" leaves the app for the
// website's contact page through the reading door; "Browse all books" is the
// site's /library, which in the app is THIS room — the press hands the room
// `onBrowse`, and the room lands the reader on the whole catalogue.

import { View } from "react-native";

import { openOnSite } from "../../lib/web";
import { Button } from "../../ui/Button";
import { Rule } from "../../ui/Rule";
import { Txt } from "../../ui/Type";

export function Band({ onBrowse }: { onBrowse: () => void }) {
  return (
    <View style={{ marginTop: 8 }}>
      <Rule kind="brick" />
      <View style={{ paddingTop: 18, paddingBottom: 20, alignItems: "center" }}>
        <Txt family="Cormorant Garamond" weight={600} size={21} line={1.15} style={{ textAlign: "center" }}>
          Cannot find the book you want?
        </Txt>
        <Txt size={13} line={1.6} tone={0.62} style={{ marginTop: 7, maxWidth: 34 * 16, textAlign: "center" }}>
          Every book we list is in stock and reaches you in 1 to 2 days. If the one you want is not here, ask us and we will print and bind it for you.
        </Txt>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 15 }}>
          <Button label="Request any book" onPress={() => void openOnSite("/contact")} />
          <Button label="Browse all books" ghost onPress={onBrowse} />
        </View>
      </View>
    </View>
  );
}
