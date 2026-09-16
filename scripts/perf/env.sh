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
ADB="${ADB:-$(cygpath -u "${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}")/platform-tools/adb.exe}"
PKG="${PKG:-com.romanreads.app}"
OUT="$(cygpath -m "${RR_PERF_OUT:-$HERE/out}")"
mkdir -p "$OUT"

# gfxinfo helpers shared by the room scripts
dump() { "$ADB" shell dumpsys gfxinfo "$PKG" | tr -d '\r' > "$OUT/gfx-$1.txt"; echo "[$1] $(grep -E 'Total frames rendered|Janky frames:|50th percentile:|90th percentile:|99th percentile:' "$OUT/gfx-$1.txt" | sed -E 's/ percentile//' | tr '\n' ' ')"; }
reset() { "$ADB" shell dumpsys gfxinfo "$PKG" reset > /dev/null; }
shot() { "$ADB" exec-out screencap -p > "$OUT/$1.png"; }
