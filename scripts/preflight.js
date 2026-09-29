#!/usr/bin/env node
/**
 * Pre-release checks: `npm run preflight`. Exits 1 if anything would be wrong to ship (see docs/RELEASE.md).
 *
 *  - production Supabase secrets: no PARSE_QUOTA_DISABLED, no ALLOW_PARSER_OVERRIDE, the required ones present
 *  - .env.example holds no real values, no env files are tracked by git
 *  - app.json: EAS project id, matching ids, version
 *  - the published privacy policy answers
 *  - store assets exist
 * Reads secret NAMES only (never values). Needs `npx supabase login` and a linked project.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { checkAppConfig, checkEnvExample, checkSecretNames, checkTrackedFiles, summarize } = require('./lib/preflight-checks');
const { readPngInfo } = require('./lib/png-info');
const { checkFeatureGraphic, checkPlayIcon } = require('./lib/store-image-rules');

const root = path.join(__dirname, '..');
const results = [];
const section = (title, items) => {
  console.log(`\n${title}`);
  for (const r of items) {
    console.log(`  ${{ pass: 'PASS', fail: 'FAIL', warn: 'WARN' }[r.level]}  ${r.label}${r.detail ? `\n        ${r.detail}` : ''}`);
    results.push(r);
  }
};
const run = (cmd, args) => spawnSync(cmd, args, { cwd: root, encoding: 'utf8', timeout: 120_000 });

// 1. Production secrets (names only).
const secrets = run('npx', ['--yes', 'supabase', 'secrets', 'list']);
let names = null;
try {
  const parsed = JSON.parse(secrets.stdout);
  names = (parsed.secrets ?? parsed).map((s) => s.name);
} catch {
  names = null;
}
section(
  'Supabase secrets (production)',
  names
    ? checkSecretNames(names)
    : [{ level: 'fail', label: 'could not read the Supabase secrets', detail: 'run `npx supabase login` and `npx supabase link --project-ref <ref>`, then try again' }],
);

// 2. The repository.
const tracked = run('git', ['ls-files']).stdout.split('\n').filter(Boolean);
const envExample = fs.existsSync(path.join(root, '.env.example')) ? fs.readFileSync(path.join(root, '.env.example'), 'utf8') : '';
section('Repository', [...checkEnvExample(envExample), ...checkTrackedFiles(tracked)]);

// 3. App config.
section('app.json', checkAppConfig(JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))));

// 4. Store material: the images must meet Play's rules; a generated placeholder is a warning until you replace it.
function storeImage(relative, check) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) return { level: 'warn', label: `${relative} is missing`, detail: 'run: node scripts/generate-store-assets.js (placeholder) or add your own' };
  const info = readPngInfo(fs.readFileSync(file));
  const problems = check(info);
  if (problems.length) return { level: 'fail', label: `${relative} breaks Play's rules`, detail: problems.join('; ') };
  return info.placeholder
    ? { level: 'warn', label: `${relative} is still the generated placeholder`, detail: 'replace it with final artwork before publishing' }
    : { level: 'pass', label: `${relative} meets Play's rules (${info.width}×${info.height})` };
}
section('Store images', [storeImage('docs/store/assets/feature-graphic.png', checkFeatureGraphic), storeImage('docs/store/assets/play-icon-512.png', checkPlayIcon)]);

// 5. The published privacy policy (asynchronous).
const privacyUrl = /PRIVACY_URL\s*=\s*'([^']+)'/.exec(fs.readFileSync(path.join(root, 'src/config.ts'), 'utf8'))?.[1];
(async () => {
  let policy;
  try {
    const response = await fetch(privacyUrl, { signal: AbortSignal.timeout(15_000) });
    policy = response.ok ? { level: 'pass', label: `privacy policy is live (${privacyUrl})` } : { level: 'fail', label: `privacy policy answers HTTP ${response.status}`, detail: 'enable GitHub Pages (Settings → Pages → master /docs)' };
  } catch (error) {
    policy = { level: 'fail', label: `privacy policy is unreachable (${privacyUrl})`, detail: error.message };
  }
  section('Privacy policy', [policy]);

  console.log('\nNote: the privacy policy still says Google may use free-tier Gemini text to improve its products.');
  console.log('      If you enable Gemini billing, remove it (docs/RELEASE.md → "Gemini billing disclosure").');

  const { ok, pass, warn, fail } = summarize(results);
  console.log(`\n${ok ? 'Ready.' : 'NOT ready to release.'}  ${pass} passed, ${warn} warnings, ${fail} failed`);
  process.exit(ok ? 0 : 1);
})();
