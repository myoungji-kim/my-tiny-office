import { crc32, deflateSync } from "node:zlib";

// The sidebar's logo as pixel art: the office on the dark tile, one window lit.
const ART = [
  "................",
  "..DDDDDDDDDDDD..",
  ".DDDDDDDDDDDDDD.",
  ".DDDDDDWWDDDDDD.",
  ".DDDDDWDDWDDDDD.",
  ".DDDDWDDDDWDDDD.",
  ".DDDWDDDDDDWDDD.",
  ".DDWDDDDDDDDWDD.",
  ".DDWDDDDDDDDWDD.",
  ".DDWDYYDDDDDWDD.",
  ".DDWDYYDDWWDWDD.",
  ".DDWDDDDDWWDWDD.",
  ".DDWDDDDDWWDWDD.",
  ".DDDWWWWWWWWDDD.",
  "..DDDDDDDDDDDD..",
  "................",
];
const COLORS = { ".": [0, 0, 0, 0], D: [0x1b, 0x1b, 0x1f, 255], W: [255, 255, 255, 255], Y: [0xf2, 0xc4, 0x6d, 255] };

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  return Buffer.concat([head, data, crc]);
}

// The art scaled up by whole pixels, so it stays crisp at every size.
export function png(size) {
  const scale = size / ART.length;
  const rows = [];
  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x += 1) Buffer.from(COLORS[ART[Math.floor(y / scale)][Math.floor(x / scale)]]).copy(row, 1 + x * 4);
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), chunk("IDAT", deflateSync(Buffer.concat(rows))), chunk("IEND", Buffer.alloc(0))]);
}

// Windows: an .ico holding PNGs.
export function ico(sizes = [16, 32, 48, 256]) {
  const images = sizes.map(png);
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(sizes.length, 4);
  let offset = head.length;
  sizes.forEach((size, i) => {
    const at = 6 + 16 * i;
    head.writeUInt8(size % 256, at);
    head.writeUInt8(size % 256, at + 1);
    head.writeUInt16LE(1, at + 4);
    head.writeUInt16LE(32, at + 6);
    head.writeUInt32LE(images[i].length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += images[i].length;
  });
  return Buffer.concat([head, ...images]);
}

// macOS: an .icns holding PNGs.
export function icns() {
  const entries = [
    ["ic07", 128],
    ["ic08", 256],
    ["ic09", 512],
    ["ic10", 1024],
  ].map(([type, size]) => {
    const data = png(size);
    const head = Buffer.alloc(8);
    head.write(type, 0, "ascii");
    head.writeUInt32BE(8 + data.length, 4);
    return Buffer.concat([head, data]);
  });
  const body = Buffer.concat(entries);
  const head = Buffer.alloc(8);
  head.write("icns", 0, "ascii");
  head.writeUInt32BE(8 + body.length, 4);
  return Buffer.concat([head, body]);
}
