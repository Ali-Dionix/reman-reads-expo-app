// `.rr-pf-guestnote` — the notice a guest pass draws under Profile's identity
// block and at the top of Settings (accountProfilePage.ts and
// accountSettingsPage.ts carry the same rule, verbatim):
//
//   margin 18px 0 0; padding 13px 0 14px; 1px dashed brick .42 above and
//   below; 400 13px/1.6 Manrope, ink .7
//   b   700 8.5px Manrope .22em uppercase brick, block, 6px under
//   a   ink, underlined, text-underline-offset 3px (RN has no offset; noted)
//
// The link is the site's `/login`: the app drops the pass and lands on the
// sign-in wall, which is the one door to an account it has.

import { View } from "react-native";

import { Rule } from "./Rule";
import { Txt } from "./Type";

export function GuestNote({ onCreateAccount }: { onCreateAccount: () => void }) {
  return (
    <View style={{ marginTop: 18 }}>
      <Rule kind="brick" />
      <View style={{ paddingTop: 13, paddingBottom: 14 }}>
        <Txt weight={700} size={8.5} ls={0.22} upper color="brick" style={{ marginBottom: 6 }}>
          Guest mode
        </Txt>
        <Txt size={13} line={1.6} tone={0.7}>
          Nothing here is saved, and anything that needs an account is switched off.{" "}
          <Txt
            size={13}
            line={1.6}
            color="ink"
            style={{ textDecorationLine: "underline" }}
            onPress={onCreateAccount}
            accessibilityRole="link"
          >
            Create a free account
          </Txt>{" "}
          and it all starts working.
        </Txt>
      </View>
      <Rule kind="brick" />
    </View>
  );
}
