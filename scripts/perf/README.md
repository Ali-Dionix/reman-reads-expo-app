# scripts/perf — measuring the release app on a phone

The rig that found every lag in this app so far: `dumpsys gfxinfo` for frame
percentiles and per-frame timelines, `atrace` for what a thread was doing,
`screencap` for the truth about what is on screen. Git Bash on Windows; the
phone is the owner's Pixel 8 Pro (1008×2244, 120 Hz, tab bar at y≈2111).
Every number in `docs/APP-QA-*.md` and the perf commits' bodies came from
these scripts — re-run the same script before and after a change and keep
the change only if the number moves.

## Connect

```bash
ADB=/c/Users/mohsi/AppData/Local/Android/Sdk/platform-tools/adb.exe
"$ADB" mdns services            # lists _adb-tls-connect._tcp  ip:port (the port changes)
"$ADB" connect 192.168.18.52:34421
"$ADB" devices                  # must say  device
"$ADB" shell svc power stayon true      # screen stays on while charging — revert to false when done
"$ADB" shell cmd statusbar collapse     # the shade and heads-ups eat taps
```

`env.sh` (sourced by every script) sets `MSYS_NO_PATHCONV=1` so device paths
like `/data/local/tmp/t.trace` survive Git Bash. The price: adb no longer
understands `/c/…` in ARGUMENTS — give `adb pull` / `adb install` a `C:/…`
path. Output lands in `scripts/perf/out/` (git-ignored) unless `RR_PERF_OUT`
says otherwise. `PKG` defaults to `com.romanreads.app`.

## The scripts

| Script | What it measures | Output |
| --- | --- | --- |
| `tap-measure.sh "label x y" …` | Tap-to-frame latency of one interaction: reset framestats, tap, wait 1.6 s (`WAIT`), dump, summarise. First frame after the tap, cadence, stutter gaps > 40 ms. | `out/fs-<label>.txt`, `out/shot-<label>.png`, one JSON line per tap |
| `tap-timeline.mjs <framestats.txt> <label>` | The parser behind it. Columns by header name; rows with FrameCompleted < IntendedVsync are junk; the tap's frame carries a non-zero InputEventId, and when none does the first frame after the reset is the tap's. | JSON |
| `perf-rooms2.sh` | Janky % and p50/p90/p99 of every room, audio playing then paused: Home idle + scroll, Audiobooks idle + scroll, Library scroll, then paused idle + scroll. Starts on Home, signed in, nothing playing. | `out/gfx-P1…P7.txt` |
| `perf-reader2.sh` | The reader under load: cold start (`am start -W`, prints TotalTime), Audiobooks tab, open The Little Prince, read-along idle (V1), five page turns (V2), settled (V3). | `out/gfx-V1…V3.txt` |
| `perf-ab.sh` | Reader idle (A1) + page turns (A2) then Home scroll (B), with logcat captured. Starts inside the reader, playing. | `out/gfx-A*.txt`, `out/gfx-B.txt`, `out/logcat.txt` |
| `atrace-summ.mjs <trace> <pkg> [topN]` | Per-thread slice totals of an atrace capture, the app's pid only. | table |
| `build-apk.cmd` | The release APK (arm64) from the short clone `C:\rr\m`. | `C:\rr\m\android\app\build\outputs\apk\release\app-release.apk` |

Reading a `gfx-*.txt`: `Janky frames` (the share over the frame budget),
`50th/90th/99th percentile` (ms), and the histogram. At 120 Hz the budget is
8.3 ms; p90 ≤ 12 ms and < 2 % janky is a smooth scroll.

## A trace

```bash
"$ADB" shell atrace --async_start -c -b 64000 gfx view hwui sched
# … drive the app (input tap / swipe, or by hand) …
"$ADB" shell atrace --async_stop -z -o /data/local/tmp/t.trace
"$ADB" pull /data/local/tmp/t.trace C:/Users/mohsi/…/t.trace
node scripts/perf/atrace-summ.mjs C:/Users/mohsi/…/t.trace com.romanreads.app 40
```

Works on the release build. The app's main thread is comm `.romanreads.app`
(comm is 15 chars), the JS thread `mqt_js`. Look for `Texture upload` (a
bitmap re-uploaded every frame), `prepareTree` (ms per frame of bitmap
preparation), `Record View#draw()` (a view re-recording its display list),
and `Drawing 0 0 1008 2244` on every vsync (a full-window invalidate: something
is animating that should not).

## Other measurements

```bash
# cold start → TotalTime, then screencap for the first meaningful paint
"$ADB" shell am force-stop com.romanreads.app
"$ADB" shell am start -W -n com.romanreads.app/.MainActivity

# memory before / after ten tab cycles or three reader open-close cycles
"$ADB" shell dumpsys meminfo com.romanreads.app | grep -E "TOTAL PSS|TOTAL RSS|Graphics|Native Heap|Dalvik"

# audio underruns (a stutter you cannot hear): before and after a scenario
"$ADB" shell dumpsys media.audio_flinger | grep -iE "underrun|xrun"

# JS warnings and crashes for a flow
"$ADB" logcat -c; "$ADB" logcat -v time -s ReactNativeJS:V AndroidRuntime:E
```

## Traps, all measured

- **Never bring the app to the front with a LAUNCHER intent or `monkey`
  mid-test** — expo-router treats it as a deep link to `/` and resets the
  stack to Home. Only a cold-start measurement uses `am start`, after
  `am force-stop`.
- `uiautomator dump` is pruned to ~58 nodes and `dumpsys activity top` times
  out — derive coordinates from a `screencap` instead (`exec-out screencap -p`).
- Screen recording is variable-frame-rate here (a tab cut is one frame) and
  show_touches does not draw: use framestats for latency, never a recording.
- Play Protect asks "send for a security check?" on every `adb install` —
  tap Don't send (≈502,1633; confirm from a screenshot).
- `adb install -r C:/rr/m/android/app/build/outputs/apk/release/app-release.apk`
  — a Windows path; a `/c/` path fails to stat under MSYS_NO_PATHCONV.
- Building: only from `C:\rr\m` (the 250-char CMake object-path limit kills
  a build from the Downloads path), only detached (`Start-Process` — the Bash
  tool caps at 10 min), `.env.local` present or the APK cannot sign in. See
  the memory note `local-apk-build-recipe`.
