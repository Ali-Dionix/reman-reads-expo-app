// `.rr-hm-slip` — one turn of the conversation, a paper slip on the blotter.
//
// The reader's notes are slips in handwriting (Caveat 500 18.5/1.45), the
// AI's replies are ruled white slips (Cormorant 500 16.5/1.6, a line every
// 26px) with a "Roman Reads · AI" head and, once the wire answers, a
// handwritten source line in the bottom-right corner. Both are theme islands:
// every colour is ISLAND's daylight literal.
//
// Phone branch (≤760px): max-width 94%. A slip leans `rot` degrees, and the
// thread flips every even child (`:nth-child(even)` negates --slip-rot), so
// the tilt is decided by the caller from the slip's index.

import type { ReactNode } from "react";
import { View } from "react-native";

import { Txt } from "../../ui/Type";
import { ISLAND } from "./island";
import { Ruled } from "./marks";
import { Stamp } from "./parts";

export type SlipRole = "reader" | "hermes";

/** `--slip-rot` per role: the reader's .7deg, the AI's −.45deg. */
export const SLIP_ROT: Record<SlipRole, number> = { reader: 0.7, hermes: -0.45 };

export function Slip({
  role,
  rot,
  source,
  children,
}: {
  role: SlipRole;
  /** Degrees, sign already flipped for an even child. */
  rot: number;
  /** `.rr-hm-slip-src` — "live AI reply" / "answered from our catalog". */
  source?: string;
  /** The slip's text — a string, or Text runs for the starter's italic. */
  children: ReactNode;
}) {
  const hermes = role === "hermes";
  return (
    <View
      style={{
        maxWidth: "94%",
        alignSelf: hermes ? "flex-start" : "flex-end",
        paddingTop: 12,
        paddingHorizontal: 16,
        paddingBottom: hermes ? 22 : 12,
        borderWidth: 1,
        borderColor: ISLAND.slipEdge,
        backgroundColor: ISLAND.paper,
        boxShadow: ISLAND.slipShadow,
        transform: [{ rotate: `${rot}deg` }],
      }}
    >
      {hermes ? <Ruled period={26} color={ISLAND.slipRule} /> : null}
      {hermes ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 }}>
          <Txt weight={700} size={8.5} ls={0.24} upper style={{ color: ISLAND.gold2 }}>
            Roman Reads
          </Txt>
          <Stamp lit />
        </View>
      ) : null}
      {hermes ? (
        <Txt family="Cormorant Garamond" weight={500} size={16.5} line={1.6} style={{ color: ISLAND.ink2 }}>
          {children}
        </Txt>
      ) : (
        <Txt family="Caveat" weight={500} size={18.5} line={1.45} style={{ color: ISLAND.ink2 }}>
          {children}
        </Txt>
      )}
      {source ? (
        <View style={{ position: "absolute", right: 12, bottom: 3, transform: [{ rotate: "-1.6deg" }] }}>
          <Txt family="Caveat" weight={500} size={12} style={{ color: ISLAND.slipSrc }} numberOfLines={1}>
            {source}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}
