// Parse `dumpsys gfxinfo <pkg> framestats` and report, for the last input
// event, the frames that followed it: latency to the first frame, the
// cadence of the transition, and any stutter gaps.
//   node tap-timeline.mjs <framestats.txt> <label>
//
// Columns are read by header name — the set differs by Android version.
// Rows with FrameCompleted < IntendedVsync are junk. The tap's frame carries
// a non-zero InputEventId; when no frame does, the window was reset just
// before the tap, so the first frame after the reset is the tap's.
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
// drop dupes across windows / dumps
const seen = new Set(); const frames = rows.filter((r) => { if (!(r.FrameCompleted > r.IntendedVsync)) return false; const k = r.IntendedVsync; if (seen.has(k)) return false; seen.add(k); return true; });
const withInput = frames.filter((r) => r.InputEventId && r.InputEventId !== 0);
if (!frames.length) { console.log(JSON.stringify({ label, error: "no frames" })); process.exit(0); }
// the window was reset just before the tap, so with no input-marked frame the first frame IS the tap's
const lastIn = withInput.length ? withInput[withInput.length - 1] : frames[0];
const t0 = (withInput.length && lastIn.HandleInputStart) || lastIn.IntendedVsync;
const after = frames.filter((r) => r.IntendedVsync >= lastIn.IntendedVsync);
const ms = (ns) => Math.round(ns / 1e5) / 10;
const seq = after.map((r) => ({ at: ms(r.FrameCompleted - t0), dur: ms(r.FrameCompleted - r.IntendedVsync) }));
const gaps = [];
for (let i = 1; i < seq.length; i++) { const d = seq[i].at - seq[i - 1].at; if (d > 40) gaps.push({ afterMs: seq[i - 1].at, gapMs: Math.round(d) }); }
const first = seq[0], last = seq[seq.length - 1];
console.log(JSON.stringify({
  label,
  inputFrames: withInput.length,
  framesAfterTap: seq.length,
  firstFrameDoneMs: first?.at,
  lastFrameDoneMs: last?.at,
  slowFrames: seq.filter((s) => s.dur > 16.7).length,
  worstFrameMs: Math.max(...seq.map((s) => s.dur)),
  stutters: gaps,
  cadence: seq.slice(0, 40).map((s) => s.at),
}));
