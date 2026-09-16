// first-paint.mjs <dir> <label> — classify the raw screencap frames a
// coldstart.sh run pulled: which frame is still the splash, which is the
// room, and whether a blank (one flat colour, not the splash's) frame came
// between. Raw `screencap` = 12-byte header (w, h, format LE u32) + RGBA.
//
// A frame is sampled on a 24×48 grid. "Splash" = ≥ 97 % of samples within
// 6/255 of the splash ground (#faf7ef by day, #0d1322 by night) — the icon
// is small. "Blank" = ≥ 99 % of samples one colour that is NOT the splash
// ground. Anything else is content. Times are device uptime seconds.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const [dir, label] = process.argv.slice(2);
const times = new Map();
for (const l of readFileSync(join(dir, "times.txt"), "utf8").split(/\r?\n/)) {
  const m = l.match(/^(\d+)\s+([\d.]+)/);
  if (m) times.set(m[1], Number(m[2]));
}
const t0 = Number(readFileSync(join(dir, "t0.txt"), "utf8").trim().split(/\s+/)[0]);
const SPLASH = [[0xfa, 0xf7, 0xef], [0x0d, 0x13, 0x22]];
const near = (a, b, tol) => Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol && Math.abs(a[2] - b[2]) <= tol;

const rows = [];
for (const f of readdirSync(dir).filter((n) => n.endsWith(".raw")).sort()) {
  const buf = readFileSync(join(dir, f));
  const w = buf.readUInt32LE(0), h = buf.readUInt32LE(4);
  const px = (x, y) => { const o = 12 + (y * w + x) * 4; return [buf[o], buf[o + 1], buf[o + 2]]; };
  const samples = [];
  for (let gy = 0; gy < 48; gy++) for (let gx = 0; gx < 24; gx++) samples.push(px(Math.floor((gx + 0.5) * w / 24), Math.floor((gy + 0.5) * h / 48)));
  const n = samples.length;
  const splashShare = Math.max(...SPLASH.map((g) => samples.filter((s) => near(s, g, 6)).length / n));
  // the dominant colour
  const bins = new Map();
  for (const s of samples) { const k = `${s[0] >> 3},${s[1] >> 3},${s[2] >> 3}`; bins.set(k, (bins.get(k) || 0) + 1); }
  const [domK, domN] = [...bins.entries()].sort((a, b) => b[1] - a[1])[0];
  const dom = domK.split(",").map((v) => (Number(v) << 3) + 4);
  const flat = domN / n;
  const isSplash = splashShare >= 0.97;
  const isBlank = !isSplash && flat >= 0.99;
  const idx = f.match(/f-(\d+)/)[1];
  const t = times.get(idx);
  rows.push({ f, ms: t != null ? Math.round((t - t0) * 1000) : null, kind: isSplash ? "splash" : isBlank ? "BLANK" : "content", splashShare: +splashShare.toFixed(2), flat: +flat.toFixed(2), dom: `#${dom.map((v) => v.toString(16).padStart(2, "0")).join("")}` });
}
const firstContent = rows.find((r) => r.kind === "content");
const blanks = rows.filter((r) => r.kind === "BLANK");
console.log(JSON.stringify({ label, frames: rows.length, firstContentMs: firstContent?.ms ?? null, blankFrames: blanks.map((b) => ({ ms: b.ms, dom: b.dom })), timeline: rows.map((r) => `${r.ms}:${r.kind[0]}`).join(" ") }));
for (const r of rows) console.error(`${r.f} ${String(r.ms).padStart(5)} ms  ${r.kind.padEnd(7)} splash=${r.splashShare} flat=${r.flat} ${r.dom}`);
