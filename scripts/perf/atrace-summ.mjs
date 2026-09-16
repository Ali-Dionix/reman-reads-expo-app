// Summarise an atrace (-z) capture: per-thread slice names by total time,
// for the app's pid only. Usage: node atrace-summ.mjs <file.trace> <pkg> [topN]
//
// Capture on the phone (works on the release build):
//   adb shell atrace --async_start -c -b 64000 gfx view hwui sched
//   … drive the app …
//   adb shell atrace --async_stop -z -o /data/local/tmp/t.trace
//   adb pull /data/local/tmp/t.trace C:/…/t.trace
// The app's main thread is comm ".romanreads.app" (comm is 15 chars); the JS
// thread is usually "mqt_js" — confirm from the thread column. Look for
// "Texture upload", "prepareTree", "Record View#draw()" and a per-vsync
// "Drawing 0 0 1008 2244" (a full-window invalidate every frame means
// something is animating that should not).
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const [file, pkg, topArg] = process.argv.slice(2);
const raw = readFileSync(file);
const head = raw.indexOf("TRACE:\n");
const body = head >= 0 ? raw.subarray(head + 7) : raw;
let text;
try { text = inflateSync(body).toString("latin1"); } catch { text = raw.toString("latin1"); }
const lines = text.split("\n");
console.log("trace lines:", lines.length);

// find the app's pid from any line naming it
let pid = null;
for (const l of lines) {
  const m = l.match(new RegExp(`^\\s*(\\S+?)-(\\d+)\\s+\\(\\s*(\\d+)\\)`));
  if (m && m[1].includes(pkg)) { pid = m[3]; break; }
}
if (!pid) { // fall back: any comm that looks like the package's main thread
  for (const l of lines) { const m = l.match(/^\s*(\S+)-(\d+)\s+\(\s*(\d+)\)/); if (m && m[1].startsWith(pkg.slice(0, 15))) { pid = m[3]; break; } }
}
console.log("app pid:", pid);

// tracing_mark_write: B|pid|name ... E|pid  (per thread stacks)
const stacks = new Map(); // tid -> [{name, ts}]
const totals = new Map(); // key thread:name -> {n, ms, max}
const threadName = new Map();
const re = /^\s*(.+?)-(\d+)\s+\(\s*(-?\d+)\)\s+\[\d+\]\s+\S+\s+([\d.]+):\s+tracing_mark_write:\s+([BE])\|(\d+)(?:\|(.*))?$/;
for (const l of lines) {
  const m = l.match(re);
  if (!m) continue;
  const [, comm, tid, tgid, ts, kind, mpid, name] = m;
  if (mpid !== pid) continue;
  threadName.set(tid, comm);
  const t = parseFloat(ts) * 1000;
  if (kind === "B") {
    if (!stacks.has(tid)) stacks.set(tid, []);
    stacks.get(tid).push({ name: (name || "").trim(), ts: t });
  } else {
    const st = stacks.get(tid);
    if (!st || !st.length) continue;
    const s = st.pop();
    const d = t - s.ts;
    const key = `${comm}:${s.name}`;
    const e = totals.get(key) || { n: 0, ms: 0, max: 0 };
    e.n += 1; e.ms += d; e.max = Math.max(e.max, d);
    totals.set(key, e);
  }
}
const top = Number(topArg || 40);
const rows = [...totals.entries()].sort((a, b) => b[1].ms - a[1].ms).slice(0, top);
console.log("\nthread:slice                                                   n     total ms   max ms");
for (const [k, e] of rows) console.log(`${k.slice(0, 62).padEnd(62)} ${String(e.n).padStart(4)} ${e.ms.toFixed(1).padStart(11)} ${e.max.toFixed(1).padStart(8)}`);
