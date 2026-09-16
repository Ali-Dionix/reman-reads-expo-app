#!/bin/bash
# perf-rooms2.sh — janky % and frame percentiles of every room, audio playing
# and paused. Starts on Home, signed in, nothing playing. Writes
# $OUT/gfx-P1…P7.txt and screenshots.
#
# Coordinates are the Pixel 8 Pro's (1008×2244, tab bar at y≈2111): the
# Meditations card on Home, the Reader's back glyph, the Audiobooks and
# Library tabs, the dock's play/pause. Confirm them from a screenshot before
# trusting a run on another layout.
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
require_front app
swipes() { for i in 1 2 3; do "$ADB" shell input swipe 504 1600 504 600 300; sleep 0.8; done; for i in 1 2; do "$ADB" shell input swipe 504 600 504 1600 300; sleep 0.8; done; sleep 0.8; }
"$ADB" shell cmd statusbar collapse >/dev/null

# SKIP_START=1 when a chapter is already playing (the reader scripts leave it so)
if [ -z "$SKIP_START" ]; then
  echo "== start playback: the first Continue card, then leave the reader =="
  "$ADB" shell input tap 179 1249; sleep 6; shot rooms-reader
  "$ADB" shell input tap 62 185; sleep 2; "$ADB" shell input tap 62 185; sleep 2.5; shot rooms-after-reader
fi

echo "== P1: Home, audio PLAYING, no touch (8s) =="
reset; sleep 8; dump P1
echo "== P2: Home scroll, playing =="
reset; swipes; dump P2

echo "== Audiobooks =="
"$ADB" shell input tap 680 2111; sleep 2.5; shot rooms-audiobooks
echo "== P3: Audiobooks, playing, no touch (6s) =="
reset; sleep 6; dump P3
echo "== P4: Audiobooks scroll, playing =="
reset; swipes; dump P4

echo "== Library =="
"$ADB" shell input tap 325 2111; sleep 2.5; shot rooms-library
echo "== P5: Library scroll, playing =="
reset; swipes; dump P5

echo "== pause (dock) =="
"$ADB" shell input tap 853 1922; sleep 2; shot rooms-paused
echo "== P6: Library, paused, no touch (5s) =="
reset; sleep 5; dump P6
echo "== P7: Library scroll, paused =="
reset; swipes; dump P7
echo "DONE"
