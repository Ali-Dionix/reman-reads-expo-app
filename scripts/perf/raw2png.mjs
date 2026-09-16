// raw2png.mjs <frame.raw> <out.png> [shrink=4] — a raw `screencap` frame
// (12-byte header: width, height, format, then RGBA) as a PNG, downscaled by
// `shrink` (nearest), so a cold-start frame can be looked at. No dependencies.
import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const [inFile, outFile, shrinkArg] = process.argv.slice(2);
const shrink = Number(shrinkArg || 4);
const buf = readFileSync(inFile);
const w = buf.readUInt32LE(0), h = buf.readUInt32LE(4);
const ow = Math.floor(w / shrink), oh = Math.floor(h / shrink);
const raw = Buffer.alloc((ow * 3 + 1) * oh);
for (let y = 0; y < oh; y++) {
  raw[y * (ow * 3 + 1)] = 0; // filter: none
  for (let x = 0; x < ow; x++) {
    const o = 12 + ((y * shrink) * w + x * shrink) * 4;
    const p = y * (ow * 3 + 1) + 1 + x * 3;
    raw[p] = buf[o]; raw[p + 1] = buf[o + 1]; raw[p + 2] = buf[o + 2];
  }
}
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c; }
const crc32 = (b) => { let c = -1; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(ow, 0); ihdr.writeUInt32BE(oh, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
writeFileSync(outFile, Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
]));
console.log(`${outFile} ${ow}x${oh}`);
