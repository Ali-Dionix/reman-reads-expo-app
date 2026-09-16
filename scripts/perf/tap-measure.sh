#!/bin/bash
# tap-measure.sh "label x y" ["label x y" …]
#
# Tap-to-frame latency of one interaction: reset the app's framestats, tap,
# wait WAIT seconds (default 1.6), dump `gfxinfo framestats`, and summarise
# with tap-timeline.mjs — latency to the first frame after the tap, the
# cadence, stutter gaps. Per step: $OUT/fs-<label>.txt (raw framestats),
# $OUT/shot-<label>.png (the screen after the tap), one JSON line on stdout.
#
# Collapses the shade first — WhatsApp heads-ups and the shade eat taps.
# Coordinates are screen pixels; take a screenshot and derive them from the
# picture before any tap you are not sure of.
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
WAIT="${WAIT:-1.6}"
"$ADB" shell cmd statusbar collapse >/dev/null; sleep 0.5
for step in "$@"; do
  set -- $step
  label=$1; x=$2; y=$3
  "$ADB" shell dumpsys gfxinfo "$PKG" reset >/dev/null
  sleep 0.3
  "$ADB" shell input tap "$x" "$y"
  sleep "$WAIT"
  "$ADB" shell dumpsys gfxinfo "$PKG" framestats | tr -d '\r' > "$OUT/fs-$label.txt"
  node "$HERE/tap-timeline.mjs" "$OUT/fs-$label.txt" "$label"
  "$ADB" exec-out screencap -p > "$OUT/shot-$label.png"
  sleep 0.8
done
