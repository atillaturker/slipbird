const { checkAppConfig, checkEnvExample, checkSecretNames, checkTrackedFiles, summarize } = require('../lib/preflight-checks');

const GOOD_SECRETS = ['PARSER_PROVIDER', 'GROQ_API_KEY', 'GROQ_MODEL', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'REVENUECAT_SECRET_KEY', 'REVENUECAT_ENTITLEMENT', 'SUPABASE_URL'];
const levels = (results) => results.map((r) => r.level);

describe('checkSecretNames', () => {
  it('passes a clean production project', () => {
    const results = checkSecretNames(GOOD_SECRETS);
    expect(summarize(results)).toEqual({ ok: true, pass: 6, warn: 0, fail: 0 });
  });

  it('fails when the development-only switches are present', () => {
    for (const name of ['PARSE_QUOTA_DISABLED', 'ALLOW_PARSER_OVERRIDE']) {
      const results = checkSecretNames([...GOOD_SECRETS, name]);
      const failed = results.filter((r) => r.level === 'fail');
      expect(failed).toHaveLength(1);
      expect(failed[0].label).toContain(name);
      expect(failed[0].detail).toContain(`secrets unset ${name}`);
      expect(failed[0].detail).toContain('functions deploy parse-receipt');
    }
  });

  it('fails without a provider chain or the RevenueCat secret', () => {
    expect(levels(checkSecretNames(GOOD_SECRETS.filter((n) => n !== 'PARSER_PROVIDER')))).toContain('fail');
    expect(levels(checkSecretNames(GOOD_SECRETS.filter((n) => n !== 'REVENUECAT_SECRET_KEY')))).toContain('fail');
  });

  it('only warns when one provider is not configured', () => {
    const results = checkSecretNames(GOOD_SECRETS.filter((n) => n !== 'GEMINI_API_KEY'));
    expect(summarize(results)).toMatchObject({ ok: true, warn: 1 });
  });
});

describe('checkEnvExample', () => {
  it('accepts placeholders and empty values', () => {
    const text = 'EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.10:54321\nEXPO_PUBLIC_SUPABASE_ANON_KEY=\n# a comment\nEXPO_PUBLIC_REVENUECAT_ANDROID_KEY=\n';
    expect(levels(checkEnvExample(text))).toEqual(['pass']);
  });

  it('rejects real keys and hosted urls', () => {
    const results = checkEnvExample('EXPO_PUBLIC_SUPABASE_URL=https://abc.supabase.co\nEXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_x\nEXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_x\n');
    expect(results).toHaveLength(1);
    expect(results[0].level).toBe('fail');
    expect(results[0].label).toContain('EXPO_PUBLIC_SUPABASE_URL');
    expect(results[0].label).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    expect(results[0].label).toContain('EXPO_PUBLIC_REVENUECAT_ANDROID_KEY');
  });
});

describe('checkTrackedFiles', () => {
  it('allows the example file, not real env files', () => {
    expect(levels(checkTrackedFiles(['.env.example', 'supabase/functions/.env.example', 'src/a.ts']))).toEqual(['pass']);
    expect(levels(checkTrackedFiles(['.env.local']))).toEqual(['fail']);
    expect(levels(checkTrackedFiles(['supabase/functions/.env']))).toEqual(['fail']);
  });
});

describe('checkAppConfig', () => {
  const ok = { expo: { version: '1.0.0', ios: { bundleIdentifier: 'a.b.c' }, android: { package: 'a.b.c' }, extra: { eas: { projectId: 'p' } } } };
  it('passes a release-ready config', () => {
    expect(summarize(checkAppConfig(ok)).ok).toBe(true);
  });
  it('fails without a project id or with mismatched ids', () => {
    expect(summarize(checkAppConfig({ expo: { ...ok.expo, extra: {} } })).ok).toBe(false);
    expect(summarize(checkAppConfig({ expo: { ...ok.expo, android: { package: 'x.y' } } })).ok).toBe(false);
    expect(summarize(checkAppConfig({ expo: { ...ok.expo, version: '1.0' } })).ok).toBe(false);
  });
});
