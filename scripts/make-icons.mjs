// Draws the app icons: a net circle with a rust dot on the page gray.
// Run with `npm run icons`. It needs nothing beyond Node.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SURFACE = [0xf7, 0xf5, 0xf1];
const PAPER = [0xff, 0xff, 0xff];
const LINE = [0xe8, 0xe4, 0xdd];
const LINE_STRONG = [0xd3, 0xcd, 0xc3];
const ACCENT = [0xb8, 0x4a, 0x00];

/** Color at a point of the unit square. `radius` is the net's rim. */
function colorAt(x, y, radius) {
  const dx = x - 0.5;
  const dy = y - 0.5;
  const fromCenter = Math.hypot(dx, dy);
  // The selected point: southwest of center, where the slopes cluster.
  const fromDot = Math.hypot(dx + radius * 0.42, dy - radius * 0.2);
  const dot = radius * 0.17;

  if (fromDot < dot) return ACCENT;
  if (fromDot < dot * 1.45) return PAPER;
  if (fromDot < dot * 2) return ACCENT;
  if (fromCenter > radius) return SURFACE;
  if (fromCenter > radius * 0.95) return LINE_STRONG;
  const hairline = radius * 0.02;
  if (Math.abs(fromCenter - radius * 0.55) < hairline) return LINE;
  if (Math.abs(dx) < hairline || Math.abs(dy) < hairline) return LINE;
  return PAPER;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const check = Buffer.alloc(4);
  check.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, check]);
}

/** A `size` × `size` PNG, each pixel averaged from 4 × 4 samples. */
function png(size, radius) {
  const samples = 4;
  const rows = Buffer.alloc(size * (1 + size * 3));
  let o = 0;
  for (let py = 0; py < size; py++) {
    rows[o++] = 0; // no filter on this row
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const color = colorAt(
            (px + (sx + 0.5) / samples) / size,
            (py + (sy + 0.5) / samples) / size,
            radius,
          );
          sum[0] += color[0];
          sum[1] += color[1];
          sum[2] += color[2];
        }
      }
      rows[o++] = Math.round(sum[0] / samples ** 2);
      rows[o++] = Math.round(sum[1] / samples ** 2);
      rows[o++] = Math.round(sum[2] / samples ** 2);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8 bits per channel, RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
const icons = [
  ['icon-192.png', 192, 0.4],
  ['icon-512.png', 512, 0.4],
  // Launchers crop maskable icons to a circle; keep the net inside the safe zone.
  ['icon-maskable-512.png', 512, 0.3],
  ['apple-touch-icon.png', 180, 0.38],
];
for (const [name, size, radius] of icons) {
  writeFileSync(`public/icons/${name}`, png(size, radius));
  console.log(`public/icons/${name}`);
}
