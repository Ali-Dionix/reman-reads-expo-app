// The Reading Desk — src/portal/reader/Reader — as a screen of its own, on
// the ROOT stack over the tabs (app/_layout.tsx), so that opening a book is
// the platform's own push and closing it the platform's own pop: both drawn
// by the system at the display's rate, neither waiting on JavaScript, and
// the desk in the app's one window — where the root gesture handler, the
// root theme stage and the keyboard's resize all reach it.
//
// Until 16 Sep 2026 the reader was a React Native <Modal> mounted inside the
// Audiobooks room. A Modal is its own window: its own gesture root and theme
// stage, a keyboard that never resized it, an open that was one JS build of
// the whole desk before its first frame, and a close of six frames in 280 ms
// (measured on a Pixel 8 Pro).
//
// `/reader?slug=<slug>[&play=1]`. Every door to the volume comes through
// here: the Audiobooks room's seals (play=1: the needle drops too, the
// site's openAndBegin) and titles push it; the book page's Listen and the
// orders ledger's note go through the room's `?book=` deep link, which
// pushes it too, so closing the book lands on the Audiobooks floor as the
// site's /account/listening?book= does. A slug this build cannot play (no
// recording pressed) is sent back to the floor rather than shown an empty
// desk.
//
// THE DESK ARRIVES IN TWO STEPS. The push animates the moment the screen's
// native tree is up, so what is in the first render decides how soon the
// desk starts moving: the two bands and the field are cheap and come in
// with the transition; the book (a case, a photograph, its furniture) and
// the sheets are laid on the desk once the transition has ENDED — `settled`
// below, the navigator's transitionEnd — and the play, whose player is
// built on the UI thread (expo-audio blocks both threads while it is), waits
// until the book is ON the desk (`laid`, the codex's first layout) rather
// than stalling the first frame or the book's own mount. Measured on a
// Pixel 8 Pro before this: the transition began ~260 ms after the tap warm
// and ~360 cold, the whole desk being one JS build and one native mount.

import { Redirect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { recordingFor, useDeck } from "../src/lib/audioStore";
import { Reader } from "../src/portal/reader/Reader";

/** True once the push has finished animating — or at once where there is
 *  no native transition to wait for (the web), or after a bounded wait
 *  should the navigator never say (animation "none", a host without the
 *  event). */
function useSettled(): boolean {
  const navigation = useNavigation();
  const [settled, setSettled] = useState(Platform.OS === "web");
  useEffect(() => {
    if (settled) return;
    const off = navigation.addListener("transitionEnd" as never, () => setSettled(true));
    const t = setTimeout(() => setSettled(true), 700);
    return () => {
      off();
      clearTimeout(t);
    };
  }, [navigation, settled]);
  return settled;
}

export default function ReaderScreen() {
  const router = useRouter();
  const { slug, play } = useLocalSearchParams<{ slug?: string; play?: string }>();
  const recording = slug ? recordingFor(slug) : null;
  const settled = useSettled();

  // play=1 — the room's seal: the needle drops once the book is on the
  // desk (see the head of this file; a bounded wait in case it never lays
  // out). Once: begin() on a book already on the platter would resume a
  // paused one, and a re-render is not a tap.
  const { begin } = useDeck();
  const [laid, setLaid] = useState(false);
  const onLaid = useCallback(() => setLaid(true), []);
  useEffect(() => {
    if (!settled || laid) return;
    const t = setTimeout(() => setLaid(true), 1000);
    return () => clearTimeout(t);
  }, [settled, laid]);
  const dropped = useRef(false);
  useEffect(() => {
    if (!laid || play !== "1" || !recording || dropped.current) return;
    dropped.current = true;
    begin(recording.slug);
  }, [laid, play, recording, begin]);

  // shutBook: the pop — or, opened cold (a deep link with nothing beneath
  // it), the Audiobooks floor in its place
  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/listening");
  }, [router]);

  if (!recording) return <Redirect href="/listening" />;
  return <Reader recording={recording} onClose={close} settled={settled} onLaid={onLaid} />;
}
