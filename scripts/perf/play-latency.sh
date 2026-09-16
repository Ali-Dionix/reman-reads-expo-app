#!/bin/bash
# play-latency.sh "label x y" … — tap → the media session reports PLAYING.
#
# All on the device clock: one shell reads /proc/uptime and injects the tap;
# afterwards `dumpsys media_session` prints the app's PlaybackState with
# `updated=<ms since boot>`, the moment the state became PLAYING. Latency =
# updated − tap uptime. `input tap` itself takes ~10-20 ms to inject; the
# figure is an upper bound on what the ear hears (AudioTrack start is a few
# ms after the state flips). The tap must be one that STARTS playback (a
# paused deck's play, a card's play seal) — a tap on an already-playing deck
# reports the old state.
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
require_front app
for step in "$@"; do
  set -- $step
  label=$1; x=$2; y=$3
  t=$("$ADB" shell "cat /proc/uptime; input tap $x $y" | tr -d '\r' | head -1 | cut -d' ' -f1)
  sleep 2.5
  # the app's session block: "package=<pkg>", then its PlaybackState ~7 lines down
  st=$("$ADB" shell dumpsys media_session | tr -d '\r' | grep -A12 "package=$PKG" | grep -m1 -E "state=PlaybackState \{state=PLAYING")
  upd=$(echo "$st" | sed -nE 's/.*updated=([0-9]+).*/\1/p')
  if [ -n "$upd" ]; then
    lat=$(node -e "console.log(Math.round($upd - $t*1000))")
    echo "[$label] tap at uptime ${t}s → PLAYING updated at ${upd} ms: latency ${lat} ms"
  else
    echo "[$label] tap at uptime ${t}s → no PLAYING state found: $(echo "$st" | cut -c1-120)"
  fi
done
