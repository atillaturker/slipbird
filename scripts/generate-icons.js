#!/usr/bin/env node
/**
 * Placeholder app art from the brand tokens: a blank slip with a torn edge and a stamped check
 * (docs/SPEC.md M7). Replace assets/images/* with final artwork when it exists; nothing else depends on this.
 * Usage: node scripts/generate-icons.js
 * No dependencies: shapes are rasterised with supersampling and written as PNG with zlib.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.join(__dirname, '..');
const theme = fs.readFileSync(path.join(root, 'src/theme.ts'), 'utf8');

/** The n-th occurrence (0 = light, 1 = dark) of `name: '#rrggbb'` in theme.ts. */
function color(name, n = 0) {
  const matches = [...theme.matchAll(new RegExp(`\\b${name}: '#([0-9a-fA-F]{6})'`, 'g'))];
  const hex = matches[n]?.[1];
  if (!hex) throw new Error(`theme.ts has no ${name} #${n}`);
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
const STAMP = color('stamp');
const SLIP = color('paperRaised');
const RULE = color('ruleStrong');

const SIZE = 1024;
const SAMPLES = 3; // per axis

// ── geometry (unit square, y down) ───────────────────────────────────────────────────────────────────────
const slip = { x0: 0.29, x1: 0.71, y0: 0.19, yb: 0.73, teeth: 7, amp: 0.028 };
const tri = (t) => 1 - Math.abs(2 * (t - Math.floor(t)) - 1); // 0..1 triangle wave
function inSlip(x, y) {
  if (x < slip.x0 || x > slip.x1 || y < slip.y0) return false;
  const edge = slip.yb + slip.amp * tri(((x - slip.x0) / (slip.x1 - slip.x0)) * slip.teeth);
  return y <= edge;
}
function inCapsule(x, y, ax, ay, bx, by, r) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) <= r;
}
const lines = [
  [0.35, 0.29, 0.65, 0.29],
  [0.35, 0.37, 0.58, 0.37],
  [0.35, 0.45, 0.65, 0.45],
].map(([ax, ay, bx, by]) => ({ ax, ay, bx, by, r: 0.011 }));
const stamp = { cx: 0.565, cy: 0.575, r: 0.125 };
const checkMarks = [
  [0.518, 0.58, 0.553, 0.618],
  [0.553, 0.618, 0.615, 0.538],
].map(([ax, ay, bx, by]) => ({ ax, ay, bx, by, r: 0.0125 }));

const inStamp = (x, y) => Math.hypot(x - stamp.cx, y - stamp.cy) <= stamp.r;
const inLines = (x, y) => lines.some((l) => inCapsule(x, y, l.ax, l.ay, l.bx, l.by, l.r));
const inCheck = (x, y) => checkMarks.some((c) => inCapsule(x, y, c.ax, c.ay, c.bx, c.by, c.r));
// A ring of paper around the stamp separates it from the lines behind it.
const inStampRing = (x, y) => Math.hypot(x - stamp.cx, y - stamp.cy) <= stamp.r + 0.018;

/** RGBA of the artwork at a point, or null for transparent. `mode`: 'full' (slip + details) or 'mono' (silhouette). */
function art(x, y, mode) {
  if (mode === 'mono') {
    // White slip with the lines, the stamp and the check cut out, so the system can tint it.
    if (inSlip(x, y) && !inLines(x, y) && !(inStamp(x, y) && !inCheck(x, y))) return [255, 255, 255, 1];
    return null;
  }
  if (inCheck(x, y) && inStamp(x, y)) return [...SLIP, 1];
  if (inStamp(x, y)) return [...STAMP, 1];
  if (inSlip(x, y) && inStampRing(x, y)) return [...SLIP, 1];
  if (inSlip(x, y)) return inLines(x, y) ? [...RULE, 1] : [...SLIP, 1];
  return null;
}

/**
 * Renders the artwork at `scale` around the centre onto a background: 'stamp' fill, 'rounded' (stamp rounded
 * square on transparent), or 'none' (transparent). `mode` picks full colour or the mono silhouette.
 */
function render({ background, scale = 1, mode = 'full', radius = 0.225 }) {
  const rgba = Buffer.alloc(SIZE * SIZE * 4);
  const samples = SAMPLES * SAMPLES;
  for (let py = 0; py < SIZE; py += 1) {
    for (let px = 0; px < SIZE; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const u = (px + (sx + 0.5) / SAMPLES) / SIZE;
          const v = (py + (sy + 0.5) / SAMPLES) / SIZE;
          let pixel = null;
          const fg = art(0.5 + (u - 0.5) / scale, 0.5 + (v - 0.5) / scale, mode);
          if (fg) pixel = fg;
          else if (background === 'stamp') pixel = [...STAMP, 1];
          else if (background === 'rounded') {
            const qx = Math.max(Math.abs(u - 0.5) - (0.5 - radius), 0);
            const qy = Math.max(Math.abs(v - 0.5) - (0.5 - radius), 0);
            if (Math.hypot(qx, qy) <= radius) pixel = [...STAMP, 1];
          }
          if (pixel) {
            r += pixel[0] * pixel[3];
            g += pixel[1] * pixel[3];
            b += pixel[2] * pixel[3];
            a += pixel[3];
          }
        }
      }
      const i = (py * SIZE + px) * 4;
      if (a > 0) {
        rgba[i] = Math.round(r / a);
        rgba[i + 1] = Math.round(g / a);
        rgba[i + 2] = Math.round(b / a);
        rgba[i + 3] = Math.round((a / samples) * 255);
      }
    }
  }
  return rgba;
}

// ── PNG ─────────────────────────────────────────────────────────────────────────────────────────────────
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}
function png(rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(SIZE, 0);
  header.writeUInt32BE(SIZE, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    raw[y * (SIZE * 4 + 1)] = 0;
    rgba.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = path.join(root, 'assets/images');
const files = {
  // iOS icon: full-bleed square (the system rounds it).
  'icon.png': render({ background: 'stamp', scale: 1.22 }),
  // Android adaptive: foreground inside the 66% safe zone over a solid stamp-green background colour.
  'android-icon-foreground.png': render({ background: 'none', scale: 0.98 }),
  'android-icon-monochrome.png': render({ background: 'none', scale: 0.98, mode: 'mono' }),
  // Splash: the badge itself on a plain paper (light) / dark paper background set in app.json.
  'splash-icon.png': render({ background: 'rounded', scale: 1.0 }),
};
fs.mkdirSync(out, { recursive: true });
for (const [name, rgba] of Object.entries(files)) {
  fs.writeFileSync(path.join(out, name), png(rgba));
  console.log('wrote assets/images/' + name);
}
