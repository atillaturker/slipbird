#!/usr/bin/env node
/**
 * Checks the Google Play images against Play's rules (scripts/lib/store-image-rules.js):
 *   docs/store/assets/feature-graphic.png   1024×500, no alpha channel
 *   docs/store/assets/play-icon-512.png     512×512, 32-bit, fully opaque
 *   docs/store/screenshots/<lang>/*.png     phone screenshots, 2–8 per language (see docs/store/screenshots.md)
 * Usage: npm run check:store-images      (exit code 1 if anything is wrong)
 */
const fs = require('fs');
const path = require('path');

const { readPngInfo } = require('./lib/png-info');
const { SCREENSHOT, checkFeatureGraphic, checkPlayIcon, checkScreenshot } = require('./lib/store-image-rules');

const root = path.join(__dirname, '..');
let problems = 0;
const report = (label, list, note) => {
  console.log(`${list.length ? 'FAIL' : 'PASS'}  ${label}${note ? `  (${note})` : ''}`);
  for (const p of list) console.log(`        ${p}`);
  problems += list.length;
};

function checkFile(relative, check) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) return report(relative, ['missing'], 'run: node scripts/generate-store-assets.js');
  const info = readPngInfo(fs.readFileSync(file));
  report(relative, check(info), `${info.width}×${info.height} ${info.colorName}${info.placeholder ? ', placeholder' : ''}`);
}

checkFile('docs/store/assets/feature-graphic.png', checkFeatureGraphic);
checkFile('docs/store/assets/play-icon-512.png', checkPlayIcon);

const shotsDir = path.join(root, 'docs/store/screenshots');
if (!fs.existsSync(shotsDir)) {
  console.log('----  no screenshots yet (docs/store/screenshots/<lang>/*.png) — see docs/store/screenshots.md');
} else {
  for (const lang of fs.readdirSync(shotsDir).filter((d) => fs.statSync(path.join(shotsDir, d)).isDirectory())) {
    const files = fs.readdirSync(path.join(shotsDir, lang)).filter((f) => /\.png$/i.test(f)).sort();
    const list = [];
    if (files.length < SCREENSHOT.minCount || files.length > SCREENSHOT.maxCount) {
      list.push(`${lang}: ${files.length} screenshots; Play takes ${SCREENSHOT.minCount}–${SCREENSHOT.maxCount} per language`);
    }
    for (const f of files) {
      try {
        list.push(...checkScreenshot(readPngInfo(fs.readFileSync(path.join(shotsDir, lang, f))), `${lang}/${f}`));
      } catch (error) {
        list.push(`${lang}/${f}: ${error.message}`);
      }
    }
    report(`docs/store/screenshots/${lang}`, list, `${files.length} images`);
  }
}

console.log(problems ? `\n${problems} problem(s)` : '\nall images meet the rules');
process.exit(problems ? 1 : 0);
