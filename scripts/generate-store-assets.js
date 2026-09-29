#!/usr/bin/env node
/**
 * PLACEHOLDER Google Play graphics, generated from the brand tokens (src/theme.ts) and the app's Instrument Sans font:
 *
 *   docs/store/assets/feature-graphic.png   1024×500, 24-bit RGB PNG, no alpha  (Play Console "Feature graphic")
 *   docs/store/assets/play-icon-512.png     512×512, 32-bit PNG, fully opaque   (Play Console "App icon")
 *
 * Both are PLACEHOLDERS: a generated mark, the wordmark and the tagline in English and Turkish. Replace them with final
 * artwork when it exists. Every file this script writes carries the PNG text tag "slipbird-placeholder"; the script will
 * NOT overwrite a file that lacks the tag (i.e. your final art) unless you pass --force. `npm run preflight` warns while
 * a file still has the tag.
 *
 * Usage: node scripts/generate-store-assets.js [--force]
 * Needs the dev dependency @resvg/resvg-js (SVG → pixels) — no other tools.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Resvg } = require('@resvg/resvg-js');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'docs/store/assets');
const force = process.argv.includes('--force');
const PLACEHOLDER_TAG = 'slipbird-placeholder';

// ── brand tokens (light theme) ───────────────────────────────────────────────────────────────────────────
const theme = fs.readFileSync(path.join(root, 'src/theme.ts'), 'utf8');
function color(name) {
  const hex = new RegExp(`\\b${name}: '(#[0-9a-fA-F]{6})'`).exec(theme)?.[1];
  if (!hex) throw new Error(`theme.ts has no ${name}`);
  return hex;
}
const STAMP = color('stamp');
const SLIP = color('paperRaised');
const RULE = color('ruleStrong');
const PAPER = color('paper');
const font = path.join(root, 'node_modules/@expo-google-fonts/instrument-sans/600SemiBold/InstrumentSans_600SemiBold.ttf');
if (!fs.existsSync(font)) throw new Error('Instrument Sans is missing: run npm install');

// ── the mark, in a unit square (same drawing as scripts/generate-icons.js) ───────────────────────────────
const SLIP_BOX = { x0: 0.29, x1: 0.71, y0: 0.19, yb: 0.73, teeth: 7, amp: 0.028 };

function slipPath() {
  const { x0, x1, y0, yb, teeth, amp } = SLIP_BOX;
  const step = (x1 - x0) / teeth;
  let d = `M${x0} ${y0} L${x1} ${y0} L${x1} ${yb}`;
  // Torn bottom edge, right to left: each tooth dips by `amp` at its middle.
  for (let i = teeth - 1; i >= 0; i -= 1) d += ` L${(x0 + (i + 0.5) * step).toFixed(4)} ${yb + amp} L${(x0 + i * step).toFixed(4)} ${yb}`;
  return `${d} Z`;
}

/** The mark as SVG elements in unit-square coordinates. */
function markElements() {
  const stamp = { cx: 0.565, cy: 0.575, r: 0.125 };
  const lines = [
    [0.35, 0.29, 0.65],
    [0.35, 0.37, 0.58],
    [0.35, 0.45, 0.65],
  ]
    .map(([x, y, x2]) => `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y}" stroke="${RULE}" stroke-width="0.022" stroke-linecap="round"/>`)
    .join('');
  return `
    <path d="${slipPath()}" fill="${SLIP}"/>
    ${lines}
    <circle cx="${stamp.cx}" cy="${stamp.cy}" r="${stamp.r + 0.018}" fill="${SLIP}"/>
    <circle cx="${stamp.cx}" cy="${stamp.cy}" r="${stamp.r}" fill="${STAMP}"/>
    <polyline points="0.518,0.58 0.553,0.618 0.615,0.538" fill="none" stroke="${SLIP}" stroke-width="0.025" stroke-linecap="round" stroke-linejoin="round"/>`;
}

const xml = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ── the two graphics ─────────────────────────────────────────────────────────────────────────────────────
function featureGraphicSvg() {
  const S = 560; // mark size in px
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <rect width="1024" height="500" fill="${STAMP}"/>
  <g transform="translate(${110 - SLIP_BOX.x0 * S} ${250 - ((SLIP_BOX.y0 + SLIP_BOX.yb + SLIP_BOX.amp) / 2) * S}) scale(${S})">${markElements()}</g>
  <g font-family="Instrument Sans" font-weight="600" fill="${SLIP}">
    <text x="410" y="238" font-size="104" letter-spacing="-2">${xml('Slipbird')}</text>
    <text x="414" y="300" font-size="36" fill="${PAPER}">${xml('Scan it. Check it. Done.')}</text>
    <text x="414" y="350" font-size="30" fill="${PAPER}" fill-opacity="0.82">${xml('Tara. Kontrol et. Bitti.')}</text>
  </g>
</svg>`;
}

function playIconSvg() {
  const S = 1.22; // same crop as the app icon
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${STAMP}"/>
  <g transform="translate(${256 - 0.5 * S * 512} ${256 - 0.5 * S * 512}) scale(${S * 512})">${markElements()}</g>
</svg>`;
}

function render(svg) {
  const resvg = new Resvg(svg, { font: { fontFiles: [font], loadSystemFonts: false, defaultFontFamily: 'Instrument Sans' } });
  const image = resvg.render();
  return { width: image.width, height: image.height, rgba: image.pixels };
}

// ── PNG encoding (so the colour type is exactly what Play asks for, and the placeholder tag is in the file) ─
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
/** `channels` 3 = 24-bit RGB (no alpha channel at all), 4 = 32-bit RGBA. */
function encodePng({ width, height, rgba }, channels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = channels === 3 ? 2 : 6;
  const row = width * channels + 1;
  const raw = Buffer.alloc(row * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const from = (y * width + x) * 4;
      const to = y * row + 1 + x * channels;
      raw[to] = rgba[from];
      raw[to + 1] = rgba[from + 1];
      raw[to + 2] = rgba[from + 2];
      if (channels === 4) raw[to + 3] = rgba[from + 3];
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('tEXt', Buffer.from(`Comment\0${PLACEHOLDER_TAG}`, 'latin1')),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Never opaque-check by eye: the icon must have no transparent pixel, the feature graphic no alpha channel at all. */
function assertOpaque({ rgba }, name) {
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] !== 255) throw new Error(`${name} has a transparent pixel`);
}

function write(name, image, channels) {
  const file = path.join(outDir, name);
  if (fs.existsSync(file) && !fs.readFileSync(file).includes(PLACEHOLDER_TAG) && !force) {
    console.log(`kept   docs/store/assets/${name} (not a generated placeholder — your artwork; use --force to overwrite)`);
    return;
  }
  assertOpaque(image, name);
  fs.writeFileSync(file, encodePng(image, channels));
  console.log(`wrote  docs/store/assets/${name}  ${image.width}×${image.height}  ${channels === 3 ? '24-bit RGB, no alpha' : '32-bit RGBA, fully opaque'}`);
}

fs.mkdirSync(outDir, { recursive: true });
write('feature-graphic.png', render(featureGraphicSvg()), 3);
write('play-icon-512.png', render(playIconSvg()), 4);
