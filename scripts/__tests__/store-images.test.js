const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const { readPngInfo } = require('../lib/png-info');
const { checkFeatureGraphic, checkPlayIcon, checkScreenshot } = require('../lib/store-image-rules');

// ── a tiny PNG writer that can use any of the row filters, to prove the reader undoes them ──────────────
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => (Buffer.from(buf).reduce((c, b) => crcTable[(c ^ b) & 0xff] ^ (c >>> 8), 0xffffffff) ^ 0xffffffff) >>> 0;
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}
const paeth = (a, b, c) => {
  const p = a + b - c;
  const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** rows: array of Buffers (raw pixel bytes, `channels` per pixel). filterFor(y) picks the filter type per row. */
function makePng({ width, height, channels, pixel, filterFor = () => 0, tag }) {
  const rows = Array.from({ length: height }, (_, y) => Buffer.from(Array.from({ length: width }, (_, x) => pixel(x, y)).flat()));
  const encoded = rows.map((row, y) => {
    const f = filterFor(y);
    const prev = y > 0 ? rows[y - 1] : Buffer.alloc(row.length);
    const out = Buffer.alloc(row.length + 1);
    out[0] = f;
    for (let i = 0; i < row.length; i += 1) {
      const left = i >= channels ? row[i - channels] : 0;
      const up = prev[i];
      const upLeft = i >= channels ? prev[i - channels] : 0;
      const predictor = [0, left, up, (left + up) >> 1, paeth(left, up, upLeft)][f];
      out[i + 1] = (row[i] - predictor) & 0xff;
    }
    return out;
  });
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = channels === 4 ? 6 : 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    ...(tag ? [chunk('tEXt', Buffer.from(`Comment\0${tag}`, 'latin1'))] : []),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(encoded))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

describe('readPngInfo', () => {
  const opaque = (x, y) => [x * 20, y * 20, 128, 255];
  const withHole = (x, y) => (x === 3 && y === 2 ? [10, 20, 30, 0] : opaque(x, y));

  it('reads size, colour type and the placeholder tag', () => {
    const info = readPngInfo(makePng({ width: 8, height: 5, channels: 4, pixel: opaque, tag: 'slipbird-placeholder' }));
    expect(info).toMatchObject({ width: 8, height: 5, bitDepth: 8, colorName: 'RGBA', hasAlphaChannel: true, alphaMin: 255, placeholder: true });
    const rgb = readPngInfo(makePng({ width: 4, height: 4, channels: 3, pixel: (x, y) => [x, y, 0] }));
    expect(rgb).toMatchObject({ colorName: 'RGB', hasAlphaChannel: false, placeholder: false });
  });

  it.each([
    [0, 'None'],
    [1, 'Sub'],
    [2, 'Up'],
    [3, 'Average'],
    [4, 'Paeth'],
  ])('finds a single transparent pixel through the %s (%s) row filter', (filter) => {
    const info = readPngInfo(makePng({ width: 8, height: 6, channels: 4, pixel: withHole, filterFor: () => filter }));
    expect(info.alphaMin).toBe(0);
    expect(readPngInfo(makePng({ width: 8, height: 6, channels: 4, pixel: opaque, filterFor: () => filter })).alphaMin).toBe(255);
  });

  it('handles rows that each use a different filter', () => {
    const info = readPngInfo(makePng({ width: 9, height: 8, channels: 4, pixel: withHole, filterFor: (y) => y % 5 }));
    expect(info.alphaMin).toBe(0);
  });

  it('rejects files that are not PNGs', () => {
    expect(() => readPngInfo(Buffer.from('GIF89a not a png at all, definitely more than thirty-three bytes'))).toThrow('not a PNG');
  });
});

describe('Play image rules', () => {
  const png = (over) => ({ width: 1024, height: 500, bitDepth: 8, colorType: 2, colorName: 'RGB', hasAlphaChannel: false, interlaced: false, alphaMin: 255, ...over });

  it('feature graphic: exactly 1024×500 with no alpha channel', () => {
    expect(checkFeatureGraphic(png({}))).toEqual([]);
    expect(checkFeatureGraphic(png({ width: 1024, height: 501 }))[0]).toMatch(/exactly 1024×500/);
    expect(checkFeatureGraphic(png({ colorType: 6, colorName: 'RGBA', hasAlphaChannel: true }))[0]).toMatch(/no alpha channel/);
  });

  it('icon: exactly 512×512, 32-bit, no transparent pixel', () => {
    const icon = png({ width: 512, height: 512, colorType: 6, colorName: 'RGBA', hasAlphaChannel: true });
    expect(checkPlayIcon(icon)).toEqual([]);
    expect(checkPlayIcon({ ...icon, width: 500 })[0]).toMatch(/exactly 512×512/);
    expect(checkPlayIcon({ ...icon, alphaMin: 0 })[0]).toMatch(/transparent pixels/);
    expect(checkPlayIcon({ ...icon, colorType: 2, colorName: 'RGB', hasAlphaChannel: false })[0]).toMatch(/32-bit/);
    expect(checkPlayIcon({ ...icon, alphaMin: null })[0]).toMatch(/could not read/);
  });

  it('screenshots: 320–3840 px, at most 2:1, no alpha channel', () => {
    expect(checkScreenshot(png({ width: 1080, height: 1920 }))).toEqual([]);
    expect(checkScreenshot(png({ width: 1080, height: 2160 }))).toEqual([]); // exactly 2:1 is allowed
    expect(checkScreenshot(png({ width: 1080, height: 2400 }), 'a.png').join()).toMatch(/taller than 2:1/); // 20:9 phones need cropping
    expect(checkScreenshot(png({ width: 300, height: 500 })).join()).toMatch(/minimum is 320/);
    expect(checkScreenshot(png({ width: 2000, height: 3900 })).join()).toMatch(/maximum is 3840/);
    expect(checkScreenshot(png({ width: 1080, height: 1920, colorType: 6, colorName: 'RGBA', hasAlphaChannel: true })).join()).toMatch(/alpha channel/);
  });
});

describe('the generated store assets', () => {
  const read = (f) => readPngInfo(fs.readFileSync(path.join(__dirname, '..', '..', 'docs/store/assets', f)));

  it('the feature graphic is 1024×500 with no alpha channel', () => {
    const info = read('feature-graphic.png');
    expect([info.width, info.height, info.hasAlphaChannel]).toEqual([1024, 500, false]);
    expect(checkFeatureGraphic(info)).toEqual([]);
  });

  it('the Play icon is 512×512, 32-bit and has no transparent pixel', () => {
    const info = read('play-icon-512.png');
    expect([info.width, info.height, info.colorName, info.alphaMin]).toEqual([512, 512, 'RGBA', 255]);
    expect(checkPlayIcon(info)).toEqual([]);
  });
});
