#!/bin/bash
# perf-ab.sh — A: the reader with audio playing (idle, then page turns);
# B: Home scroll. Starts INSIDE the reader, playing. Logcat is captured to
# $OUT/logcat.txt for the run. Writes $OUT/gfx-A1.txt, gfx-A2.txt, gfx-B.txt.
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

"$ADB" logcat -c
"$ADB" logcat -v time > "$OUT/logcat.txt" 2>&1 &
LC=$!

echo "== A1: reader idle, audio + read-along (10s) =="
reset; sleep 10; dump A1

echo "== A2: reader page turns (next x3, prev x1) =="
reset
for i in 1 2 3; do "$ADB" shell input tap 933 1817; sleep 1.5; done
"$ADB" shell input tap 73 1817; sleep 2
dump A2

echo "== back to Home =="
"$ADB" shell input tap 62 185; sleep 3
shot ab-home

echo "== B: Home scroll (3 up, 3 down) =="
reset
for i in 1 2 3; do "$ADB" shell input swipe 504 1700 504 700 300; sleep 0.9; done
for i in 1 2 3; do "$ADB" shell input swipe 504 700 504 1700 300; sleep 0.9; done
sleep 1
dump B

kill $LC 2>/dev/null
echo "logcat lines: $(wc -l < "$OUT/logcat.txt")"
echo "DONE"
