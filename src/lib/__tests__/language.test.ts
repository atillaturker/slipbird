import { isLanguageSetting, resolveLanguage } from '../language';

describe('resolveLanguage', () => {
  it('follows the device when set to system', () => {
    expect(resolveLanguage('system', 'tr')).toBe('tr');
    expect(resolveLanguage('system', 'TR')).toBe('tr');
    expect(resolveLanguage('system', 'en')).toBe('en');
  });

  it('falls back to English for unsupported or missing device languages', () => {
    expect(resolveLanguage('system', 'de')).toBe('en');
    expect(resolveLanguage('system', null)).toBe('en');
    expect(resolveLanguage('system', undefined)).toBe('en');
  });

  it('uses an explicit setting over the device language', () => {
    expect(resolveLanguage('en', 'tr')).toBe('en');
    expect(resolveLanguage('tr', 'en')).toBe('tr');
  });
});

describe('isLanguageSetting', () => {
  it('accepts only known values', () => {
    expect(isLanguageSetting('system')).toBe(true);
    expect(isLanguageSetting('tr')).toBe(true);
    expect(isLanguageSetting('de')).toBe(false);
    expect(isLanguageSetting(null)).toBe(false);
  });
});
