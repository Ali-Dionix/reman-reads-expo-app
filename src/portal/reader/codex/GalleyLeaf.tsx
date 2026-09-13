// The reflowed galley — `.rr-lr-galley` / `.rr-lr-galley-scroll` /
// `.rr-lr-galley-type.rr-read-type` (app/data/accountListeningPage.ts and
// app/data/readingSurface.ts), the surface the site stands for EVERY hasText
// book whose chapter is open and whose pages are not rendered: the chapter's
// paragraphs in a measured column of Cormorant, the sounding word gilded and
// its sentence lit behind it, a finger on a word reading from there.
//
// On the site it is `position:absolute; inset:0` INSIDE `.rr-lr-stage`, a
// white sheet with a 1px ring and a lifted shadow that unfolds over the bound
// volume (`rr-lr-unfold`, .45s); here it stands in the volume's place in the
// same stage, which is the same picture. The read-along's data half is
// lib/galley.ts; the behaviour is app/components/readAlong.ts — the TYPE
// surface: `.is-sent` on the sentence's spans, `.is-word` on the word, the
// follow that centres the sentence as it changes and lets go the moment a
// hand scrolls the page, the chip that brings it back.
//
// THE FAST CLOCK IS READ HERE for the galley, as Codex.tsx reads it for the
// pages: this one component subscribes to the 100ms sample, so the gilt lands
// on every word while the frame re-renders at the transport's 500ms.
//
// The type: `.rr-read-type{max-width:34em; font-family:var(--rr-lr-ff);
// font-size:var(--rr-lr-fs,1.02rem); line-height:var(--rr-lr-lh,1.62);
// color:rgba(11,10,8,.9)} p{margin:0 0 .95em}` — the three custom properties
// are the text settings' (ListeningEnhancer.tsx applyTypePrefs: FS_STOPS
// .92/.97/1.02/1.1/1.2rem, LH_STOPS 1.48/1.62/1.8, Manrope for "sans"), and
// the em-relative measure and paragraph gap scale with the size as they do
// on the site. `gild` is setGilding(): off, no sentence wash, no word, no
// rule — the follow keeps centring the sentence. The scroller's padding at
// 390×844: `clamp(18px,3vh,34px)` → 25, `clamp(16px,4vw,40px)` → 16, and
// `26px + safe-area` at the foot.

import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { chaptersOf, useDeck, useFastPosition, type Recording } from "../../../lib/audioStore";
import {
  forgetGalley,
  loadGalley,
  paraRuns,
  sentenceOf,
  wordAt,
  wordStart,
  type Galley,
} from "../../../lib/galley";
import { FONTS } from "../../../theme/type";
import { Button } from "../../../ui/Button";
import { TYPE_DEFAULTS, type TypePrefs } from "../TypeSheet";
import { FollowChip } from "./FollowChip";
import { LampPool, leafInks } from "./leaves";

const UNFOLD_MS = 450;
const UNFOLD_EASE = Easing.bezier(0.22, 0.61, 0.36, 1);
/** FS_STOPS, in rem at the root's 16px: `[data-rr-lr-type-fs="1..5"]`. */
const FS_STOPS = [0.92, 0.97, 1.02, 1.1, 1.2] as const;
/** LH_STOPS: tight, normal, loose. */
const LH_STOPS = [1.48, 1.62, 1.8] as const;

/** The galley's type from the settings — `--rr-lr-fs`, `--rr-lr-lh`, `--rr-lr-ff`. */
export function galleyType(prefs: TypePrefs): { fs: number; lh: number; family: string } {
  return {
    fs: 16 * (FS_STOPS[prefs.fs - 1] ?? 1.02),
    lh: LH_STOPS[prefs.lh - 1] ?? 1.62,
    // 'Manrope',sans-serif at the body's weight, or Cormorant at 400
    family: prefs.face === "sans" ? FONTS.sans : FONTS.serifRegular,
  };
}

export function GalleyLeaf({
  recording,
  voice,
  band,
  sounding,
  night,
  prefs = TYPE_DEFAULTS,
  onReadFrom,
}: {
  recording: Recording;
  voice: string | null;
  /** The chapter OPEN on the sheet. */
  band: number;
  /** Whether that chapter is the one on the platter: only then does the
   *  clock gild its words. A chapter opened to read ("read first, listen
   *  after"; a guest refused the needle) stands its text ungilded. */
  sounding: boolean;
  night: boolean;
  /** The text settings: size, face, leading, the gilder's hand. */
  prefs?: TypePrefs;
  /** A finger read from a word — the frame re-arms its follow. */
  onReadFrom: (elsewhere: boolean) => void;
}) {
  const { seekTo, playAt } = useDeck();
  const position = useFastPosition();
  const { height: windowH } = useWindowDimensions();
  const ink = leafInks(night);
  const { fs: FS, lh: LH, family } = galleyType(prefs);
  const gild = prefs.gild;

  /* ------------------------------------------------- the text --- */

  const [gal, setGal] = useState<Galley | null | undefined>(undefined);
  const [tries, setTries] = useState(0);
  useEffect(() => {
    let alive = true;
    const chapters = chaptersOf(recording, voice);
    setGal(undefined);
    loadGalley(recording.slug, voice, band, chapters[band]?.galley).then((g) => {
      if (alive) setGal(g);
    });
    return () => {
      alive = false;
    };
  }, [recording, voice, band, tries]);

  const runs = useMemo(() => (gal ? paraRuns(gal) : []), [gal]);
  const wordIdx = gal && sounding ? wordAt(gal, position * 1000) : -1;
  const sent = gal && wordIdx >= 0 ? sentenceOf(gal, wordIdx) : null;
  const wordPara = gal && wordIdx >= 0 ? gal.words[wordIdx][0] : -1;

  /* ----------------------------------------------- the follow --- */

  // readAlong's d.following: on until a hand scrolls the page; the chip
  // brings it back; reading from a word re-arms it too
  const [following, setFollowing] = useState(true);
  const scroller = useRef<ScrollView>(null);
  const paraY = useRef<number[]>([]);
  const [viewH, setViewH] = useState(0);
  const lastCentred = useRef(-1);

  const centre = useCallback(
    (p: number, animated: boolean) => {
      const y = paraY.current[p];
      if (y == null || !scroller.current) return;
      // the site centres the sentence's first span; a paragraph's head at a
      // third of the view is the same place to within a few lines
      scroller.current.scrollTo({ y: Math.max(0, y - viewH * 0.34), animated });
      lastCentred.current = p;
    },
    [viewH],
  );

  useEffect(() => {
    if (!following || wordPara < 0) return;
    if (wordPara !== lastCentred.current) centre(wordPara, true);
  }, [following, wordPara, centre]);

  // a new chapter lands at its head and the follow is re-armed
  useEffect(() => {
    lastCentred.current = -1;
    paraY.current = [];
    setFollowing(true);
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, [band, gal]);

  const onHand = () => {
    // a drag is unambiguously the reader — it disengages even inside our own
    // scroll window
    setFollowing(false);
  };

  // readAlong's seekWord: the needle moves if this chapter is turning, and
  // is dropped here — this band, this second — if it is not (the deck
  // refuses a guest and the console says why)
  const readFrom = (i: number) => {
    if (!gal) return;
    onReadFrom(false);
    setFollowing(true);
    const at = wordStart(gal, i) / 1000;
    if (sounding) seekTo(at);
    else playAt(recording.slug, band, at);
  };

  /* ----------------------------------------------- the unfold --- */

  const rise = useSharedValue(1);
  useEffect(() => {
    rise.value = 1;
    rise.value = withTiming(0, { duration: UNFOLD_MS, easing: UNFOLD_EASE });
  }, [rise]);
  const unfold = useAnimatedStyle(() => ({
    opacity: 1 - rise.value,
    transform: [{ translateY: rise.value * 20 }],
  }));

  /* ------------------------------------------------- the inks --- */

  const type = night ? "rgba(240,229,207,.92)" : "rgba(11,10,8,.9)";
  const sentBg = night ? "rgba(224,183,112,.08)" : "rgba(155,122,77,.14)";
  const wordBg = night ? "rgba(224,183,112,.18)" : "rgba(155,122,77,.38)";
  const wordRule = night ? "rgba(224,183,112,.55)" : "rgba(155,122,77,.6)";
  const wordInk = night ? "#FFF6E2" : type;
  // the settings' type on the measure, the paragraph and the run
  const measureStyle = { maxWidth: 34 * FS };
  const paraStyle = { marginBottom: 0.95 * FS };
  const pStyle = { fontFamily: family, fontSize: FS, lineHeight: FS * LH, color: type };

  const footPad = 26;
  const topPad = Math.min(34, Math.max(18, windowH * 0.03));

  return (
    // no accessible name of its own — the site's .rr-lr-galley carries none;
    // the paragraphs are the accessible content
    <Animated.View style={[styles.galley, night ? styles.galleyNight : styles.galleyDay, unfold]}>
      {night ? (
        <View style={[StyleSheet.absoluteFill, styles.inert]}>
          <LinearGradient colors={[ink.paper[0], ink.paper[1]]} style={StyleSheet.absoluteFill} />
          <LampPool />
        </View>
      ) : null}

      {gal === undefined ? (
        <View style={styles.wait}>
          <ActivityIndicator color={night ? "#C9A662" : "#9B7A4D"} />
        </View>
      ) : gal === null ? (
        // .rr-lr-galley-err — the deadpan error and its one button
        <View style={styles.err}>
          <Text style={[styles.errP, { color: night ? "rgba(240,229,207,.72)" : "rgba(11,10,8,.72)" }]}>
            The chapter text didn't load. The audio plays on without it.
          </Text>
          <Button
            label="Try again"
            ghost
            onPress={() => {
              forgetGalley(recording.slug, voice, band);
              setTries((t) => t + 1);
            }}
          />
        </View>
      ) : (
        <ScrollView
          ref={scroller}
          style={styles.scroll}
          contentContainerStyle={[styles.type, { paddingTop: topPad, paddingBottom: footPad }]}
          onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
          onScrollBeginDrag={onHand}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <View style={[styles.measure, measureStyle]}>
            {runs.map((para, p) => (
              <View
                key={p}
                onLayout={(e) => {
                  paraY.current[p] = e.nativeEvent.layout.y;
                  // the sounding paragraph laid out after the beat that asked
                  // for it: centre it now, or the first centring is missed
                  if (following && p === wordPara && lastCentred.current !== p) centre(p, false);
                }}
                style={[styles.para, paraStyle]}
              >
                <Text style={pStyle}>
                  {para.map((r, k) => {
                    if (r.word < 0) return r.text;
                    // the gilder's hand off: the words stay tappable, uninked
                    const isWord = gild && r.word === wordIdx;
                    const inSent = gild && !!sent && r.word >= sent[0] && r.word <= sent[1];
                    return (
                      <Text
                        key={k}
                        onPress={() => readFrom(r.word)}
                        suppressHighlighting
                        style={
                          isWord
                            ? {
                                backgroundColor: wordBg,
                                color: wordInk,
                                textDecorationLine: "underline",
                                textDecorationColor: wordRule,
                              }
                            : inSent
                              ? { backgroundColor: sentBg }
                              : null
                        }
                      >
                        {r.text}
                      </Text>
                    );
                  })}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* the chip whenever the hand has the page and there is a place to go */}
      {!following && gal && wordPara >= 0 ? (
        <FollowChip
          onPress={() => {
            setFollowing(true);
            centre(wordPara, true);
          }}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // .rr-lr-galley{inset:0; box-shadow:0 0 0 1px rgba(43,30,16,.3),
  //   0 -10px 26px -14px rgba(43,30,16,.5)}
  galley: { flex: 1, alignSelf: "stretch", overflow: "hidden" },
  galleyDay: {
    backgroundColor: "#FFFFFF",
    boxShadow: "0 0 0 1px rgba(43,30,16,.3), 0 -10px 26px -14px rgba(43,30,16,.5)",
  },
  galleyNight: {
    backgroundColor: "#1A2233",
    boxShadow: "0 0 0 1px rgba(201,166,98,.2), 0 -12px 26px -12px rgba(0,0,0,.85)",
  },
  inert: { pointerEvents: "none" },
  scroll: { flex: 1 },
  // .rr-lr-galley-scroll{padding: … clamp(16px,4vw,40px) …}
  type: { paddingHorizontal: 16 },
  // .rr-read-type{margin:0 auto; max-width:34em} — the em is the settings'
  measure: { width: "100%", alignSelf: "center" },
  // p{margin:0 0 .95em} — likewise
  para: {},
  wait: { flex: 1, alignItems: "center", justifyContent: "center" },
  // .rr-lr-galley-err{margin:12vh auto 0; max-width:26em; gap:16px; italic 17px}
  err: { marginTop: 101, alignSelf: "center", maxWidth: 26 * 17, alignItems: "center", gap: 16, paddingHorizontal: 16 },
  errP: { fontFamily: FONTS.serifItalicLight, fontSize: 17, lineHeight: 24, textAlign: "center" },
});
