// `.rr-ov-hello` — the greeting: one line, and the number under it.
// accountPage.ts:
//
//   .rr-ov-hello        padding:2px 0 2px
//   p                   700 9px Manrope .22em uppercase brass       "Roman Reads"
//   h1                  500 clamp(26px,6.8vw,36px)/1.04 Cormorant -.012em ink,
//                       margin-top 8; the name is a 600 <b>
//   .rr-ov-hello-meta   flex, align center, gap 6px 14px, margin-top 10
//     span              600 10.5px Manrope, ink .58
//     span b            700 8px Manrope .2em uppercase gold2, margin-right 5

import { View } from "react-native";

import { useInk } from "../../theme/ink";
import { Txt } from "../../ui/Type";

export function Hello({ name, cardNo }: { name: string; cardNo: string }) {
  const { clamp } = useInk();
  const size = clamp(26, 6.8, 36);
  return (
    <View style={{ paddingVertical: 2 }}>
      <Txt weight={700} size={9} ls={0.22} upper color="brass">
        Roman Reads
      </Txt>
      <Txt
        family="Cormorant Garamond"
        weight={500}
        size={size}
        line={1.04}
        ls={-0.012}
        style={{ marginTop: 8 }}
        accessibilityRole="header"
      >
        Welcome back,{" "}
        <Txt family="Cormorant Garamond" weight={600} size={size} line={1.04} ls={-0.012}>
          {name}
        </Txt>
        .
      </Txt>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          columnGap: 14,
          rowGap: 6,
          marginTop: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {/* The <b> is inline in the span's 14px line, on its baseline: the
              span's ascent is 11, the b's 9 over an 11px box, so the b sits
              2px down — 1px of half-leading in a 13px line plus 1px of padding,
              which lands the baseline on the same whole pixel. */}
          <Txt weight={700} size={8} ls={0.2} upper color="gold2" line={13} style={{ paddingTop: 1, marginRight: 5 }}>
            Member no.
          </Txt>
          <Txt weight={600} size={10.5} tone={0.58}>
            {cardNo}
          </Txt>
        </View>
      </View>
    </View>
  );
}
