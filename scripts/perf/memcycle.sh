#!/bin/bash
# memcycle.sh — memory before and after ten tab cycles, then before and
# after three reader open / close cycles. Starts on Home, nothing playing,
# reader closed. Prints PSS / RSS / Graphics / Native / Dalvik each time and
# the deltas. Coordinates: the Pixel 8 Pro's tab bar (Home 96, Library 325,
# Audiobooks 680, Profile 905 at y 2111), the Audiobooks billboard's play
# seal (818,1630) and the reader's back glyph (62,185).
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
require_front app
mem() { "$ADB" shell dumpsys meminfo "$PKG" | tr -d '\r' | awk -v tag="$1" '
  /TOTAL PSS:/ {pss=$3; rss=$6}
  /^ +Graphics:/ {gfx=$2}
  /^ +Native Heap:/ {nat=$3}
  /^ +Dalvik Heap:/ {dal=$3}
  END {printf "[%s] PSS %d kB  RSS %d kB  Graphics %d kB  Native %d kB  Dalvik %d kB\n", tag, pss, rss, gfx, nat, dal}'; }
"$ADB" shell cmd statusbar collapse >/dev/null
mem "tabs before"
for c in 1 2 3 4 5 6 7 8 9 10; do
  for xy in "325 2111" "680 2111" "905 2111" "96 2111"; do "$ADB" shell input tap $xy; sleep 0.45; done
done
sleep 3; mem "tabs after 10 cycles"
"$ADB" shell input tap 680 2111; sleep 1.5
mem "reader before"
for c in 1 2 3; do
  "$ADB" shell input tap 818 1630; sleep 4
  # the reader's arrow closes the CHAPTER first, then the book: two taps to pop
  "$ADB" shell input tap 62 185; sleep 1.5
  "$ADB" shell input tap 62 185; sleep 2
done
sleep 3; mem "reader after 3 open/close"
"$ADB" shell input tap 96 2111
