#!/bin/bash
# perf-reader2.sh — the reader under load: cold launch, Audiobooks tab, open
# The Little Prince, then janky % while the read-along plays untouched (V1),
# through five page turns (V2), and settled again (V3). Writes $OUT/gfx-V*.txt.
#
# The only launch here is a COLD one after force-stop — never bring the app
# to the front with a LAUNCHER intent mid-test; expo-router treats it as a
# deep link to "/" and resets the stack to Home.
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

"$ADB" shell cmd statusbar collapse; "$ADB" shell am force-stop "$PKG"; sleep 1
"$ADB" shell am start -W -n "$PKG/.MainActivity" | tr -d '\r' | grep -E 'TotalTime|WaitTime'; sleep 7; shot reader-launch
echo "== Audiobooks tab, open The Little Prince =="
"$ADB" shell input tap 680 2111; sleep 2.5
"$ADB" shell input tap 818 1630; sleep 7; shot reader-open

echo "== V1: reader, read-along, playing, no touch (8s) =="
reset; sleep 8; dump V1

echo "== V2: page turns (next x3, prev x2) =="
reset
for i in 1 2 3; do "$ADB" shell input tap 933 1817; sleep 1.5; done
for i in 1 2; do "$ADB" shell input tap 73 1817; sleep 1.5; done
sleep 1; dump V2
shot reader-end

echo "== V3: after page turns, no touch (6s) =="
reset; sleep 6; dump V3
echo "DONE"
