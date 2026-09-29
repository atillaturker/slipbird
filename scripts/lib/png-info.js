/**
 * A small PNG reader for checking store images: size, colour type, and whether any pixel is transparent.
 * Handles 8-bit, non-interlaced RGB / RGBA (what design tools and Android screenshots export); anything else reports
 * `alphaMin: null` so the caller can ask for a re-export instead of guessing.
 */
const zlib = require('zlib');

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const COLOR_TYPES = { 0: 'grayscale', 2: 'RGB', 3: 'palette', 4: 'grayscale+alpha', 6: 'RGBA' };

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Undoes PNG's per-row filters. `data` is the inflated IDAT stream. */
function unfilter(data, width, height, channels) {
  const stride = width * channels;
  const out = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = data[y * (stride + 1)];
    const line = data.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i += 1) {
      const left = i >= channels ? out[y * stride + i - channels] : 0;
      const up = y > 0 ? out[(y - 1) * stride + i] : 0;
      const upLeft = y > 0 && i >= channels ? out[(y - 1) * stride + i - channels] : 0;
      const predictor = [0, left, up, (left + up) >> 1, paeth(left, up, upLeft)][filter];
      if (predictor === undefined) throw new Error(`unknown PNG filter ${filter}`);
      out[y * stride + i] = (line[i] + predictor) & 0xff;
    }
  }
  return out;
}

/**
 * @returns {{ width, height, bitDepth, colorType, colorName, hasAlphaChannel, interlaced, alphaMin: number|null, placeholder: boolean }}
 *   alphaMin: the lowest alpha value in the image (255 = fully opaque); null if it could not be read.
 */
function readPngInfo(buffer) {
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG file');
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];
  const interlaced = buffer[28] === 1;
  const hasAlphaChannel = colorType === 4 || colorType === 6;

  const idat = [];
  for (let pos = 8; pos + 8 <= buffer.length; ) {
    const length = buffer.readUInt32BE(pos);
    if (buffer.toString('latin1', pos + 4, pos + 8) === 'IDAT') idat.push(buffer.subarray(pos + 8, pos + 8 + length));
    pos += 12 + length;
  }

  let alphaMin = null;
  if (bitDepth === 8 && !interlaced && (colorType === 2 || colorType === 6)) {
    const channels = colorType === 6 ? 4 : 3;
    const pixels = unfilter(zlib.inflateSync(Buffer.concat(idat)), width, height, channels);
    alphaMin = 255;
    if (channels === 4) for (let i = 3; i < pixels.length; i += 4) alphaMin = Math.min(alphaMin, pixels[i]);
  }

  return {
    width,
    height,
    bitDepth,
    colorType,
    colorName: COLOR_TYPES[colorType] ?? `type ${colorType}`,
    hasAlphaChannel,
    interlaced,
    alphaMin,
    placeholder: buffer.includes('slipbird-placeholder'),
  };
}

module.exports = { readPngInfo, unfilter };
