// `.rr-ap-note` — a notice, appShell.ts's kit part 5: where a coming-soon
// fact or a guest-mode warning goes. Dashed brick rules above and below, a
// brass label, one sentence. No fill, no card — a line ruled onto the page,
// which is what a note in a book is.
//
//   .rr-ap-note{margin:22px 0 0;padding:13px 0 14px;border-top/bottom:1px dashed rgba(126,45,31,.42)}
//   b  700 8.5px Manrope .22em uppercase, brick
//   p  400 13.5px/1.6 Manrope, ink .7, margin-top 6

import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { Rule } from "./Rule";
import { Txt } from "./Type";

export function Note({
  label,
  children,
  style,
}: {
  label: string;
  /** The sentence — a string, or a <Txt> tree for an inline link. */
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ marginTop: 22 }, style]}>
      <Rule kind="brick" />
      <View style={{ paddingTop: 13, paddingBottom: 14 }}>
        <Txt weight={700} size={8.5} ls={0.22} upper color="brick">
          {label}
        </Txt>
        {typeof children === "string" ? (
          <Txt size={13.5} line={1.6} tone={0.7} style={{ marginTop: 6 }}>
            {children}
          </Txt>
        ) : (
          <View style={{ marginTop: 6 }}>{children}</View>
        )}
      </View>
      <Rule kind="brick" />
    </View>
  );
}
