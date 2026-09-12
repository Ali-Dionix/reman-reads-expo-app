// `[data-rr-shf="side-table"]` — "Continue listening.", the shelf row
// (shelfCard.ts shelfRowHtml, sized down on this row only by accountPage.ts).
// The phone branch (≤640px):
//
//   .rr-shf             margin 26px 0 0
//   .rr-shf-h           margin 0 0 4px
//     h3                600 23px/1.08 Cormorant -.005em ink        (= <Head>)
//     p                 400 12.5px/1.55 Manrope ink .58; margin-top 5 (= <Lede>)
//   .rr-shf-row         flex; gap 12 (side-table); padding 2px 2px 10px;
//                       overflow-x auto; snap
//   .rr-shf-card        flex-basis calc((100vw - 68px)/3.3)  — 3.3 to a screen
//   .rr-shf-cover       2/3; radius 3; spine colour under cover art; two ink drops
//   .rr-shf-meta        margin-top 6; .68rem/1.35 brown
//   .rr-shf-pad         display:none at ≤640px and on (hover:none)
//
// WHAT IS ON IT. AccountEnhancer fills this row with the reader's unfinished
// recordings (a time-left line and a gilt progress rule), and when nothing is
// resting — every guest, every new reader — with the recordings that ARE
// playable, at their full runtime and no rule. The heading never changes;
// only the supporting line moves. The app reads the first case off the deck
// (a recording on the platter with something heard); persisted needle
// positions come with Phase 2.
//
// The type overlay (.rr-shf-type) is not printed: every recording's art is
// `baked`, carrying its own title, and shelfCardHtml prints nothing over it.

import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, View } from "react-native";

import { useInk } from "../../theme/ink";
import { useTheme } from "../../theme/ThemeProvider";
import { Cover } from "../../ui/Cover";
import { Head, Lede, Txt } from "../../ui/Type";

export type ShelfCard = {
  slug: string;
  title: string;
  art: string;
  spine: string;
  /** "18 hr 56 min", or "4 hr 12 min left" for a resting one. */
  meta: string;
  /** 0..1 — the gilt rule; absent for a recording not yet started. */
  progress?: number;
};

export function ContinueShelf({
  cards,
  sub,
  onOpen,
}: {
  cards: ShelfCard[];
  sub: string;
  onOpen: (slug: string) => void;
}) {
  const { width, brass } = useInk();
  const { colors } = useTheme();
  // calc((100vw - 68px)/3.3)
  const cardW = (width - 68) / 3.3;

  return (
    <View accessibilityRole="summary" accessibilityLabel="Continue listening." style={{ marginTop: 26 }}>
      <View style={{ marginBottom: 4 }}>
        <Head>Continue listening.</Head>
        <Lede tone={0.58} style={{ marginTop: 5 }}>
          {sub}
        </Lede>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardW + 12}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={{ paddingTop: 2, paddingHorizontal: 2, paddingBottom: 10, gap: 12 }}
      >
        {cards.map((c) => (
          <Pressable
            key={c.slug}
            onPress={() => onOpen(c.slug)}
            accessibilityRole="link"
            accessibilityLabel={c.title}
            style={{ width: cardW }}
          >
            {/* .rr-shf-cover — the kit's sleeve */}
            <Cover art={c.art} spine={c.spine} width={cardW}>
              {c.progress != null ? (
                // .rr-shf-rule — a 3px gilt rule flush with the sleeve's foot;
                // its ::before fill is linear-gradient(90deg,#9b7a4d,#b98f55),
                // brass to gold6 left to right, visibly lighter at its far end.
                <View
                  style={{ pointerEvents: "none", position: "absolute", left: 0, right: 0, bottom: 0, height: 3, backgroundColor: brass(0.22, "bg") }}
                >
                  <LinearGradient
                    colors={[colors.brass, colors.gold6]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${Math.round(Math.min(1, Math.max(0, c.progress)) * 100)}%`,
                    }}
                  />
                </View>
              ) : null}
            </Cover>
            <Txt size={10.88} line={1.35} color="brown" style={{ marginTop: 6 }}>
              {c.meta}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
