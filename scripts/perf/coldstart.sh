#!/bin/bash
# coldstart.sh [cold|warm] [label]
#
# Start → first meaningful paint. `am start -W` reports TotalTime (the
# activity's first drawn window — for an Expo app that is the SPLASH), so the
# script also screencaps on the phone every ~150 ms for 4 s into raw RGBA
# frames stamped with the device uptime, pulls them, and first-paint.mjs
# finds the frame where the splash gives way to the room — and says whether
# a blank or grey frame came between.
#
#   cold   am force-stop first (the process is gone)
#   warm   the app is in the background (press Home first): am start only
#
# Output: $OUT/cold-<label>.txt (am start -W), $OUT/cs-<label>/f-<n>.raw +
# times.txt, and first-paint.mjs's verdict on stdout.
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
MODE="${1:-cold}"; LABEL="${2:-$MODE}"
DEV=/data/local/tmp/cs
"$ADB" shell "rm -rf $DEV; mkdir -p $DEV"
"$ADB" shell cmd statusbar collapse >/dev/null
if [ "$MODE" = cold ]; then "$ADB" shell am force-stop "$PKG"; sleep 1.5; fi
# one shell: the start and the capture loop share the device clock
"$ADB" shell "cat /proc/uptime > $DEV/t0.txt; am start -W -n $PKG/.MainActivity > $DEV/am.txt; for i in \$(seq -w 1 26); do echo \"\$i \$(cat /proc/uptime)\" >> $DEV/times.txt; screencap $DEV/f-\$i.raw; done"
"$ADB" shell cat $DEV/am.txt | tr -d '\r' > "$OUT/cold-$LABEL.txt"
grep -E 'ThisTime|TotalTime|WaitTime|Status|LaunchState' "$OUT/cold-$LABEL.txt"
rm -rf "$OUT/cs-$LABEL"; mkdir -p "$OUT/cs-$LABEL"
"$ADB" pull $DEV "$OUT/cs-$LABEL" >/dev/null
node "$HERE_W/first-paint.mjs" "$OUT/cs-$LABEL/cs" "$LABEL"
"$ADB" shell rm -rf $DEV
