// `.rr-hm-spec` — a sample page with its hard words underlined.
//
// A ruled sheet (a line every 31px, counted from the bottom), 1px ink at .5,
// a two-stop shadow, half a degree off true; a head with the title in brass
// small caps and the source in italic, on one baseline, over a brown rule;
// then the excerpt at Cormorant 500 18/1.85 with each hard word a button
// wearing a 2px dotted brick underline. Every colour is a daylight literal:
// the page is a theme island.
//
// THE EXCERPT IS ONE <Text>, AND EACH HARD WORD AN INLINE <View> INSIDE IT.
// On the web each hard word is an inline-block button whose 2px border sits
// UNDER the line box — at the bottom of a 33.3px inline-block, ~10px below
// the baseline — and grows the line by those 2px. A nested <Text> cannot
// draw a rule there (textDecoration hugs the baseline, and Android cannot
// dot it), and cannot grow its line; a flex-wrap row of tokens can, but
// counts each token's trailing space toward the fit where a browser hangs
// it, so its breaks drift from the page's. RN lays a View inside a Text out
// as an inline box (iOS and Android both; react-native-web as inline-flex),
// so the platform's own line breaker handles the hanging whitespace, the
// view still grows its line by 2px, and the paragraph is one accessible
// node rather than forty fragments.

import { Text, View } from "react-native";

import { Txt } from "../../ui/Type";
import { face } from "../../theme/type";
import { ISLAND } from "./island";
import { DottedLine, Ruled } from "./marks";

export type Run = { text: string; word?: boolean };
export type SpecimenData = { id: string; title: string; source: string; runs: Run[] };

const SIZE = 18;
const LINE = Math.round(SIZE * 1.85 * 100) / 100; // 33.3

export function Specimen({
  spec,
  rot,
  picked,
  onPick,
}: {
  spec: SpecimenData;
  /** `--rot`: −.5deg for the first page, .6deg for the second. */
  rot: number;
  /** The lit word on this page, if any. */
  picked: string | null;
  onPick: (word: string) => void;
}) {
  return (
    <View
      style={{
        paddingTop: 20,
        paddingHorizontal: 22,
        paddingBottom: 18,
        borderWidth: 1,
        borderColor: ISLAND.specEdge,
        backgroundColor: ISLAND.paper,
        boxShadow: ISLAND.specShadow,
        transform: [{ rotate: `${rot}deg` }],
      }}
    >
      <Ruled period={31} color={ISLAND.specRule} />
      {/* .rr-hm-spec-head: space-between on one baseline, 10px under, a brown rule */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 10,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: ISLAND.specHeadRule,
        }}
      >
        <Txt weight={700} size={9} ls={0.24} upper style={{ color: ISLAND.gold2, flexShrink: 1 }}>
          {spec.title}
        </Txt>
        <Txt family="Cormorant Garamond" weight={400} italic size={13} style={{ color: ISLAND.brown, flexShrink: 1 }}>
          {spec.source}
        </Txt>
      </View>
      {/* .rr-hm-spec-txt: margin-top 14, 500 18px/1.85 */}
      <Text
        style={{
          marginTop: 14,
          fontFamily: face("Cormorant Garamond", 500),
          fontSize: SIZE,
          lineHeight: LINE,
          color: ISLAND.ink2,
        }}
      >
        {spec.runs.map((run, i) =>
          run.word ? (
            <Word key={i} word={run.text} on={picked === run.text} onPress={() => onPick(run.text)} />
          ) : (
            run.text
          ),
        )}
      </Text>
    </View>
  );
}

/** `.rr-hm-word` — an inline box: padding 0 1px, the 2px dotted brick rule
 *  below; lit: a brass wash, brick type, the rule solid. The press lands on
 *  the inner Text (a View inside a Text takes no touches of its own on
 *  Android), and the whole box is announced as one button. */
function Word({ word, on, onPress }: { word: string; on: boolean; onPress: () => void }) {
  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={{ paddingHorizontal: 1, paddingBottom: 2, backgroundColor: on ? ISLAND.wordOn : "transparent" }}
    >
      <Text
        onPress={onPress}
        suppressHighlighting
        style={{
          fontFamily: face("Cormorant Garamond", 500),
          fontSize: SIZE,
          lineHeight: LINE,
          color: on ? ISLAND.brick : ISLAND.ink2,
        }}
      >
        {word}
      </Text>
      <DottedLine color={ISLAND.wordLine} solid={on} />
    </View>
  );
}
