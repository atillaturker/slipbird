/**
 * Pure checks behind `npm run preflight` (scripts/preflight.js does the reading). Each returns results of the form
 * { level: 'pass' | 'fail' | 'warn', label, detail? }; any 'fail' stops a release.
 */

/** Secrets that lift protections meant for development only. */
const FORBIDDEN_SECRETS = {
  PARSE_QUOTA_DISABLED: 'lifts the 15-parses-a-month limit. Run: npx supabase secrets unset PARSE_QUOTA_DISABLED   then redeploy: npx supabase functions deploy parse-receipt',
  ALLOW_PARSER_OVERRIDE: 'lets any signed-in user choose the AI model. Run: npx supabase secrets unset ALLOW_PARSER_OVERRIDE   then redeploy: npx supabase functions deploy parse-receipt',
};

const REQUIRED_SECRETS = {
  PARSER_PROVIDER: 'parse-receipt cannot choose a provider without it',
  REVENUECAT_SECRET_KEY: 'Pro subscribers would be held to the free monthly limit',
};

/** Secret names the deployed parse-receipt function has (names only — values never leave Supabase). */
function checkSecretNames(names) {
  const have = new Set(names);
  const results = [];
  for (const [name, why] of Object.entries(FORBIDDEN_SECRETS)) {
    results.push(have.has(name) ? { level: 'fail', label: `${name} is set in production`, detail: why } : { level: 'pass', label: `${name} is not set` });
  }
  for (const [name, why] of Object.entries(REQUIRED_SECRETS)) {
    results.push(have.has(name) ? { level: 'pass', label: `${name} is set` } : { level: 'fail', label: `${name} is missing`, detail: why });
  }
  // Each provider in the chain needs its key and model.
  for (const provider of ['GROQ', 'GEMINI']) {
    const missing = [`${provider}_API_KEY`, `${provider}_MODEL`].filter((n) => !have.has(n));
    results.push(
      missing.length === 0
        ? { level: 'pass', label: `${provider} key and model are set` }
        : { level: 'warn', label: `${provider}: missing ${missing.join(', ')}`, detail: 'that provider is skipped in the PARSER_PROVIDER chain' },
    );
  }
  return results;
}

/** `.env.example` is committed to a public repo: it may list variables, never carry real values. */
function checkEnvExample(text) {
  const bad = [];
  for (const line of text.split('\n')) {
    const m = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (!m) continue;
    const [, key, value] = m;
    if (/(KEY|SECRET|TOKEN|PASSWORD)$/.test(key) && value.trim() !== '') bad.push(key);
    if (key === 'EXPO_PUBLIC_SUPABASE_URL' && /supabase\.(co|com)/.test(value)) bad.push(key);
  }
  return bad.length === 0
    ? [{ level: 'pass', label: '.env.example holds no real values' }]
    : [{ level: 'fail', label: `.env.example has real values for ${bad.join(', ')}`, detail: 'it is committed to a public repo — keep them in .env.local / EAS variables and restore the placeholders' }];
}

/** Env files must never be tracked by git. */
function checkTrackedFiles(files) {
  const tracked = files.filter((f) => /(^|\/)\.env(\.[^/]*)?$/.test(f) && !f.endsWith('.example'));
  return tracked.length === 0
    ? [{ level: 'pass', label: 'no .env files are tracked by git' }]
    : [{ level: 'fail', label: `tracked env files: ${tracked.join(', ')}`, detail: 'git rm --cached them and rotate anything they held' }];
}

/** The things store builds need from app.json. */
function checkAppConfig(appJson) {
  const e = appJson.expo ?? {};
  const results = [];
  results.push(e.extra?.eas?.projectId ? { level: 'pass', label: 'EAS project id is set' } : { level: 'fail', label: 'expo.extra.eas.projectId is missing', detail: 'run: npx eas-cli@latest init' });
  results.push(
    e.ios?.bundleIdentifier && e.ios.bundleIdentifier === e.android?.package
      ? { level: 'pass', label: `app id ${e.android.package}` }
      : { level: 'fail', label: 'iOS bundle id and Android package differ or are missing' },
  );
  results.push(/^\d+\.\d+\.\d+$/.test(e.version ?? '') ? { level: 'pass', label: `version ${e.version}` } : { level: 'fail', label: 'expo.version is not x.y.z' });
  return results;
}

/** Summarises results; `ok` is false if anything failed. */
function summarize(results) {
  const count = (level) => results.filter((r) => r.level === level).length;
  return { ok: count('fail') === 0, pass: count('pass'), warn: count('warn'), fail: count('fail') };
}

module.exports = { FORBIDDEN_SECRETS, REQUIRED_SECRETS, checkSecretNames, checkEnvExample, checkTrackedFiles, checkAppConfig, summarize };
