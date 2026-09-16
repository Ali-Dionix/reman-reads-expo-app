#!/bin/bash
# env.sh — sourced by every script in this folder. Git Bash on Windows.
#
#   ADB          the platform-tools adb.exe (default: $ANDROID_HOME, else
#                %LOCALAPPDATA%\Android\Sdk)
#   PKG          the app id (default com.romanreads.app)
#   OUT          where dumps, traces and screenshots land, as a C:/… path so
#                node and adb accept it (default scripts/perf/out, git-ignored;
#                override with RR_PERF_OUT)
#
# MSYS_NO_PATHCONV=1 stops Git Bash rewriting /data/local/tmp/… device paths
# in adb arguments. The price is that adb no longer understands /c/… paths in
# ARGUMENTS either — hand it C:/… (see README).
export MSYS_NO_PATHCONV=1
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# the same folder as a C:/ path — node.exe and adb.exe get THIS one, never /c/…
HERE_W="$(cygpath -m "$HERE")"
ADB="${ADB:-$(cygpath -u "${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}")/platform-tools/adb.exe}"
PKG="${PKG:-com.romanreads.app}"
OUT="$(cygpath -m "${RR_PERF_OUT:-$HERE/out}")"
mkdir -p "$OUT"

# THE APP MUST BE IN FRONT before any scripted tap: a tap sent while the
# owner is in another app lands in that app (it happened — one landed in
# Photos). Every script that taps calls this first and stops if the focused
# window is not the app or the launcher. `require_front app` insists on the
# app itself.
front() { "$ADB" shell dumpsys window 2>/dev/null | tr -d '\r' | grep -m1 mCurrentFocus; }
require_front() {
  local f; f="$(front)"
  # the shade over the app is collapsible; anything else is not ours to close
  case "$f" in *NotificationShade*) "$ADB" shell cmd statusbar collapse >/dev/null; sleep 0.8; f="$(front)";; esac
  case "$f" in
    *"$PKG"*) return 0 ;;
    *NexusLauncher*|*launcher*) [ "$1" = app ] && { echo "STOP: the launcher is in front, not the app: $f" >&2; exit 3; } || return 0 ;;
    *) echo "STOP: another window is in front — not tapping: $f" >&2; exit 3 ;;
  esac
}

# gfxinfo helpers shared by the room scripts
dump() { "$ADB" shell dumpsys gfxinfo "$PKG" | tr -d '\r' > "$OUT/gfx-$1.txt"; echo "[$1] $(grep -E 'Total frames rendered|Janky frames:|50th percentile:|90th percentile:|99th percentile:' "$OUT/gfx-$1.txt" | sed -E 's/ percentile//' | tr '\n' ' ')"; }
reset() { "$ADB" shell dumpsys gfxinfo "$PKG" reset > /dev/null; }
shot() { "$ADB" exec-out screencap -p > "$OUT/$1.png"; }
