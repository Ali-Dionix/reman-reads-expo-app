// Find in this chapter — `[data-rr-lr-search-menu]`, `.rr-lr-menu.rr-lr-menu--rail`
// (accountListeningPage.ts 675-716, dark 1400-1520, ≤620px 1626): a torn
// card hung under the rail's right end, `top:calc(100% + 10px)`, padding
// 22/22/21, turned .4deg, at z-index 5 — over the stage, under nothing (the
// bands are 3). The generic rail card is `width:min(280px,calc(100vw -
// 24px))`; THIS one is overridden to `min(360px,calc(100vw - 24px))` (line
// 703). Its right edge is not the CSS's: toggleMenu sets it inline — close
// to flush with the button that opened it, clamped inside the viewport:
//   right = max(8, min(innerWidth - btn.right - 6, innerWidth - w - 8))
// which on a 390 phone is 16px — the card spans x=8..374. The stock is the
// drawer's own (TornCard, CARD_BG_DAY / CARD_BG_NIGHT under the five-layer
// mask), cut from the measured box, as the drawer is.
//
// Inside: `.rr-lr-menu-h` "Find in this chapter" over `.rr-lr-search-in`
// (the field, focused on open — toggleMenu's input.focus()) over
// `.rr-lr-search-out`: a `.rr-lr-search-note` in the hand, or the hits as
// printed lines (`.rr-lr-search-hit`: em / b / em — the context either side
// and the match in brick). Behaviour: readAlong.ts searchGalley, and
// ListeningEnhancer's paintSearch (2525) and the search-hit handler (3225):
// a hit seeks to the first word starting at or before the matched character
// (wordAtChar), shuts the menu and announces "Playing from the found word."
//
// THE GALLEY IS THE SAME ONE THE CODEX READS: loadGalley caches per (slug,
// voice, band), so the chapter open on the desk has already been fetched by
// the leaf and this menu's ask is answered from memory.

import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { loadGalley, useGalleyVersion, type Galley } from "../../../lib/galley";
import { FONTS, lh, lineOf } from "../../../theme/type";
import { useBox } from "../../../ui/DashedBox";
import { SmallCaps } from "./SmallCaps";
import { TornCard } from "./TornCard";

/** readAlong.ts GalleyHit — the coordinates seekToChar takes, and the
 *  printed context either side of the match for the row. */
type Hit = { para: number; char: number; before: string; match: string; after: string };

/** readAlong.ts searchGalley — null when there is no galley to search, []
 *  under two characters, else up to `max` hits in reading order. */
function searchGalley(g: Galley | null | undefined, query: string, max = 24): Hit[] | null {
  if (!g) return null;
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  const hits: Hit[] = [];
  for (let p = 0; p < g.paras.length && hits.length < max; p++) {
    const text = g.paras[p];
    const lower = text.toLowerCase();
    let i = lower.indexOf(needle);
    while (i >= 0 && hits.length < max) {
      hits.push({
        para: p,
        char: i,
        before: (i > 34 ? "…" : "") + text.slice(Math.max(0, i - 34), i),
        match: text.slice(i, i + needle.length),
        after: text.slice(i + needle.length, i + needle.length + 52) + "…",
      });
      i = lower.indexOf(needle, i + needle.length);
    }
  }
  return hits;
}

/** readAlong.ts wordAtChar — the last word of the paragraph whose start is
 *  at or before the character; -1 when the paragraph has no timed word. */
function wordAtChar(g: Galley, para: number, at: number): number {
  let ans = -1;
  for (let w = 0; w < g.words.length; w++) {
    const word = g.words[w];
    if (word[0] !== para) {
      if (ans >= 0) break; // past the paragraph
      continue;
    }
    if (word[1] <= at) ans = w;
    else break;
  }
  return ans;
}

export function SearchMenu({
  top,
  night,
  slug,
  voice,
  band,
  galleyPath,
  anchorRight,
  onHit,
}: {
  top: number;
  night: boolean;
  slug: string;
  /** The pressing in force — the galley is per pressing. */
  voice: string | null;
  /** The chapter standing on the desk (galleyBand). */
  band: number;
  galleyPath: string | undefined;
  /** The right edge of the button that opened the card, in window px — the
   *  site aligns the card's right edge close to flush with it. */
  anchorRight: number;
  /** A hit: the second the matched word is read at. The frame drops the
   *  needle there and shuts the menu. */
  onHit: (seconds: number) => void;
}) {
  const { width: windowW } = useWindowDimensions();
  const [box, onLayout] = useBox();
  const width = Math.min(360, windowW - 24);
  const flush = windowW - anchorRight - 6;
  const right = Math.max(8, Math.min(flush, windowW - width - 8));

  const [query, setQuery] = useState("");
  // .rr-lr-search-in:focus-visible{outline:2px solid #9B7A4D;outline-offset:1px}
  // — a text field matches :focus-visible whenever it is focused, so the
  // ring is on from the moment the sheet opens onto it
  const [focused, setFocused] = useState(false);
  // undefined while the galley is in the post; null when there is none
  const [gal, setGal] = useState<Galley | null | undefined>(undefined);
  const galleyVersion = useGalleyVersion();
  useEffect(() => {
    let alive = true;
    loadGalley(slug, voice, band, galleyPath).then((g) => {
      if (alive) setGal(g);
    });
    return () => {
      alive = false;
    };
  }, [slug, voice, band, galleyPath, galleyVersion]);
  useEffect(() => {
    setGal(undefined);
  }, [slug, voice, band, galleyPath]);

  // toggleMenu("search"): the sheet opens onto its input, ready to type.
  // autoFocus alone can land before the window is keyed on some platforms,
  // so the focus is also asked for on the next frame.
  const inputRef = useRef<TextInput>(null);
  useEffect(() => {
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, []);

  const hits = gal === undefined ? [] : searchGalley(gal, query);
  const trimmed = query.trim();
  const note =
    hits === null
      ? "open a chapter first. this searches the chapter you are reading."
      : trimmed.length < 2
        ? "type two letters or more; tap a result to play from that word."
        : hits.length === 0
          ? "no matches in this chapter."
          : null;

  const press = (h: Hit) => {
    if (!gal) return;
    const w = wordAtChar(gal, h.para, h.char);
    if (w < 0) return;
    onHit(gal.words[w][3] / 1000);
    AccessibilityInfo.announceForAccessibility("Playing from the found word.");
  };

  const hitInk = night ? "rgba(240,229,207,.78)" : "rgba(11,10,8,.78)";
  const hitRule = night ? "rgba(201,166,98,.3)" : "rgba(110,86,58,.22)";
  const hitMark = night ? "#D2AF69" : "#7E2D1F";

  return (
    <View style={[styles.menu, { top, right, width }]} onLayout={onLayout} accessibilityLabel="Find in this chapter">
      <TornCard width={width} height={box.h} night={night} id="rr-search" />
      {/* .rr-lr-menu-h — Cormorant 500 small caps 14.5px .16em, an 8px pad
          over a 1px rule, 2px under */}
      <View style={[styles.head, { borderBottomColor: night ? "rgba(201,166,98,.35)" : "rgba(110,86,58,.3)" }]}>
        <SmallCaps
          size={14.5}
          ls={0.16}
          fontFamily={FONTS.serifMedium}
          lineHeight={lh("Cormorant Garamond", 14.5)}
          color={night ? "#F4EBD6" : "#0B0A08"}
        >
          Find in this chapter
        </SmallCaps>
      </View>
      {/* in a View of its own: the stock behind is absolutely positioned and
          a bare input, unpositioned on the web target, would paint under it */}
      <View style={styles.fieldWrap}>
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          returnKeyType="search"
          placeholder="a word or a phrase…"
          placeholderTextColor={night ? "rgba(240,229,207,.4)" : "rgba(11,10,8,.4)"}
          accessibilityLabel="Find in this chapter"
          style={[
            styles.field,
            night
              ? { backgroundColor: "rgba(22,29,44,.6)", borderColor: "rgba(201,166,98,.45)", color: "#EADFC6" }
              : { backgroundColor: "rgba(255,255,255,.85)", borderColor: "rgba(110,86,58,.45)", color: "#171411" },
            focused && styles.fieldFocus,
          ]}
        />
      </View>
      {/* .rr-lr-search-out{max-height:min(46vh,340px);overflow-y:auto} */}
      <ScrollView
        style={styles.out}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {note ? (
          <Text style={[styles.note, { color: night ? "#C4A37A" : "#6E563A" }]}>{note}</Text>
        ) : (
          hits!.map((h, i) => (
            // .rr-lr-search-hit — a printed line: context, the match in brick, context
            <Pressable
              key={`${h.para}:${h.char}`}
              onPress={() => press(h)}
              accessibilityRole="button"
              accessibilityLabel={`${h.before}${h.match}${h.after}`}
              style={({ pressed }) => [
                styles.hit,
                i > 0 && { borderTopWidth: 1, borderTopColor: hitRule },
                pressed && { backgroundColor: night ? "rgba(201,166,98,.09)" : "rgba(110,86,58,.08)" },
              ]}
            >
              <Text style={[styles.hitText, { color: hitInk }]}>
                <Text style={styles.hitCtx}>{h.before}</Text>
                <Text style={[styles.hitMark, { color: hitMark }]}>{h.match}</Text>
                <Text style={styles.hitCtx}>{h.after}</Text>
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // .rr-lr-menu--rail — the card's mask is the TornCard behind; the CSS
  // drop-shadow is masked away with everything outside the stock, so none
  menu: {
    position: "absolute",
    zIndex: 5,
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 21,
    transform: [{ rotate: "0.4deg" }],
  },
  // .rr-lr-menu-h{margin:0 0 2px;padding-bottom:8px;border-bottom:1px solid}
  head: { paddingBottom: 8, marginBottom: 2, borderBottomWidth: 1 },
  // .rr-lr-search-in{margin:2px 0 6px;padding:9px 11px;border:1px solid;
  //   border-radius:2px;font:500 14px Manrope}
  fieldWrap: { marginTop: 2, marginBottom: 6 },
  field: {
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderRadius: 2,
    fontFamily: FONTS.sansMedium,
    fontSize: 14,
    lineHeight: lh("Manrope", 14),
  },
  fieldFocus: { outlineWidth: 2, outlineStyle: "solid", outlineColor: "#9B7A4D", outlineOffset: 1 },
  out: { maxHeight: 340, flexGrow: 0 },
  // .rr-lr-search-note{margin:6px 0 2px;font:500 14px/1.4 Caveat;rotate(-.4deg)}
  note: {
    marginTop: 6,
    marginBottom: 2,
    fontFamily: FONTS.hand,
    fontSize: 14,
    lineHeight: lineOf(14, 1.4),
    transform: [{ rotate: "-0.4deg" }],
  },
  // .rr-lr-search-hit{padding:9px 3px;font:14.5px/1.45 Cormorant;text-align:left}
  hit: { paddingVertical: 9, paddingHorizontal: 3 },
  hitText: { fontFamily: FONTS.serifRegular, fontSize: 14.5, lineHeight: lineOf(14.5, 1.45) },
  // em — no rule of its own, so the UA italic stands: Cormorant 400 italic
  hitCtx: { fontFamily: FONTS.serifItalicLight },
  // b{color:#7E2D1F;font-weight:600}
  hitMark: { fontFamily: FONTS.serif },
});
