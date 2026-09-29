/**
 * Google Play's image rules (Play Console → Store listing → Preview assets), as checks that return a list of problems.
 * Source: https://support.google.com/googleplay/android-developer/answer/9866151 — re-read it before a release; the
 * numbers below are what it said when these checks were written.
 */

const SCREENSHOT = { min: 320, max: 3840, maxRatio: 2, minCount: 2, maxCount: 8 };

function common(info, name) {
  const problems = [];
  if (info.bitDepth !== 8) problems.push(`${name}: expected 8 bits per channel, found ${info.bitDepth}`);
  if (info.interlaced) problems.push(`${name}: interlaced PNGs cannot be checked — export non-interlaced`);
  return problems;
}

/** Feature graphic: exactly 1024×500, 24-bit PNG or JPEG, no alpha channel. */
function checkFeatureGraphic(info) {
  const problems = common(info, 'feature graphic');
  if (info.width !== 1024 || info.height !== 500) problems.push(`feature graphic must be exactly 1024×500, found ${info.width}×${info.height}`);
  if (info.hasAlphaChannel) problems.push('feature graphic must be 24-bit with no alpha channel (found ' + info.colorName + ')');
  return problems;
}

/** App icon: exactly 512×512, 32-bit PNG. Kept fully opaque (Play allows alpha, but a transparent icon is not wanted here). */
function checkPlayIcon(info) {
  const problems = common(info, 'app icon');
  if (info.width !== 512 || info.height !== 512) problems.push(`app icon must be exactly 512×512, found ${info.width}×${info.height}`);
  if (info.colorType !== 6) problems.push(`app icon must be a 32-bit PNG (RGBA), found ${info.colorName}`);
  if (info.alphaMin === null) problems.push('app icon: could not read the pixels to check for transparency');
  else if (info.alphaMin < 255) problems.push(`app icon has transparent pixels (lowest alpha ${info.alphaMin}); Slipbird's icon is fully opaque`);
  return problems;
}

/** Phone screenshot: each side 320–3840 px, the longer side at most twice the shorter, no alpha channel. */
function checkScreenshot(info, name = 'screenshot') {
  const problems = common(info, name);
  const short = Math.min(info.width, info.height);
  const long = Math.max(info.width, info.height);
  if (short < SCREENSHOT.min) problems.push(`${name}: shorter side is ${short}px, minimum is ${SCREENSHOT.min}`);
  if (long > SCREENSHOT.max) problems.push(`${name}: longer side is ${long}px, maximum is ${SCREENSHOT.max}`);
  if (long > SCREENSHOT.maxRatio * short) {
    problems.push(`${name}: ${info.width}×${info.height} is taller than 2:1 (${(long / short).toFixed(2)}:1) — crop the system bars or use a 16:9 / 18:9 device`);
  }
  if (info.hasAlphaChannel) {
    problems.push(`${name}: has an alpha channel (${info.colorName}); Play wants 24-bit. Remove it, e.g. magick in.png -background white -alpha remove -alpha off out.png`);
  }
  return problems;
}

module.exports = { SCREENSHOT, checkFeatureGraphic, checkPlayIcon, checkScreenshot };
