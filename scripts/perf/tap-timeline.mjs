// Parse `dumpsys gfxinfo <pkg> framestats` and report, for the last input
// event, the frames that followed it: latency to the first frame, the
// cadence of the transition, and any stutter gaps.
//   node tap-timeline.mjs <framestats.txt> <label>
//
// Columns are read by header name — the set differs by Android version.
// The tap's frame carries a non-zero InputEventId; when no frame does, the
// window was reset just before the tap, so the first frame after the reset
// is the tap's.
//
// FLAG 8 ROWS (HWUI SkippedFrame): the UI thread did its work (HandleInput,
// traversals, draw, sync) but the render thread did not record this frame —
// its render-thread columns (IssueDrawCommands, SwapBuffers, GpuCompleted,
// FrameCompleted) still hold an EARLIER frame's values and read as garbage
// (negative relative times). For those rows the trustworthy moment is
// SyncStart, when the UI thread handed the frame over; the pixels follow a
// few ms later. Such rows are kept and reported with `ui` timing; rows whose
// FrameCompleted precedes their own IntendedVsync are otherwise junk.
import { readFileSync } from "node:fs";

const [file, label] = process.argv.slice(2);
const text = readFileSync(file, "utf8");
const rows = [];
let cols = null, inBlock = false;
for (const line of text.split(/\r?\n/)) {
  if (line.startsWith("---PROFILEDATA---")) { inBlock = !inBlock; cols = null; continue; }
  if (!inBlock) continue;
  if (line.startsWith("Flags,")) { cols = line.split(","); continue; }
  if (!cols || !line.trim()) continue;
  const v = line.split(",").map(Number);
  const r = {}; cols.forEach((c, i) => (r[c] = v[i]));
  rows.push(r);
}
rows.sort((a, b) => a.IntendedVsync - b.IntendedVsync);
const seen = new Set();
const frames = [];
for (const r of rows) {
  if (seen.has(r.IntendedVsync)) continue;
  seen.add(r.IntendedVsync);
  const skipped = (r.Flags & 8) !== 0;
  const rtValid = r.FrameCompleted > r.IntendedVsync && r.FrameCompleted > r.SyncStart;
  if (!skipped && !rtValid) continue; // junk
  frames.push({ ...r, skipped, rtValid: rtValid && !skipped });
}
const withInput = frames.filter((r) => r.InputEventId && r.InputEventId !== 0);
if (!frames.length) { console.log(JSON.stringify({ label, error: "no frames" })); process.exit(0); }
const lastIn = withInput.length ? withInput[withInput.length - 1] : frames[0];
const t0 = (withInput.length && lastIn.HandleInputStart) || lastIn.IntendedVsync;
const after = frames.filter((r) => r.IntendedVsync >= lastIn.IntendedVsync);
const ms = (ns) => Math.round(ns / 1e5) / 10;
// `at` = when the pixels were done (render thread) or, for a skipped row,
// when the UI thread handed the frame over (`ui`); `dur` = the frame's own
// length from its intended vsync
const seq = after.map((r) => r.rtValid
  ? { at: ms(r.FrameCompleted - t0), dur: ms(r.FrameCompleted - r.IntendedVsync), kind: "rt" }
  : { at: ms(r.SyncStart - t0), dur: ms(r.SyncStart - r.IntendedVsync), kind: "ui" });
const gaps = [];
for (let i = 1; i < seq.length; i++) { const d = seq[i].at - seq[i - 1].at; if (d > 40) gaps.push({ afterMs: seq[i - 1].at, gapMs: Math.round(d) }); }
const first = seq[0], last = seq[seq.length - 1];
console.log(JSON.stringify({
  label,
  inputFrames: withInput.length,
  framesAfterTap: seq.length,
  firstFrameDoneMs: first?.at,
  firstFrameKind: first?.kind,
  lastFrameDoneMs: last?.at,
  slowFrames: seq.filter((s) => s.dur > 16.7).length,
  worstFrameMs: Math.max(...seq.map((s) => s.dur)),
  uiOnlyFrames: seq.filter((s) => s.kind === "ui").length,
  stutters: gaps,
  cadence: seq.slice(0, 40).map((s) => (s.kind === "ui" ? `${s.at}u` : s.at)),
}));
