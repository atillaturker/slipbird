import appConfig from '../../../app.json';
import listing from '../../../docs/store/listing.json';
import { PRIVACY_URL } from '../../config';
import { FREE_BUDGET_LIMIT } from '../pro';

// App Store Connect and Google Play Console limits (characters).
const LIMITS = { name: 30, subtitle: 30, promotionalText: 170, shortDescription: 80, keywords: 100, whatsNew: 4000, description: 4000 } as const;

// Google Play Console limits (Play Console → Store listing → Main store listing): title 30, short description 80,
// full description 4000, and release notes ("What's new") only 500 — far less than the App Store's 4000 checked above.
const PLAY_LIMITS = { name: 30, shortDescription: 80, description: 4000, whatsNew: 500 } as const;

const locales = Object.entries(listing.locales) as [string, Record<keyof typeof LIMITS | 'appleLocale' | 'playLocale', string>][];

describe.each(locales)('store listing (%s)', (_locale, text) => {
  it.each(Object.entries(LIMITS))('%s fits its store limit (%d)', (field, limit) => {
    expect([...text[field as keyof typeof LIMITS]].length).toBeLessThanOrEqual(limit);
    expect(text[field as keyof typeof LIMITS].trim()).not.toBe('');
  });

  it.each(Object.entries(PLAY_LIMITS))('Google Play: %s is at most %d characters', (field, limit) => {
    expect([...text[field as keyof typeof PLAY_LIMITS]].length).toBeLessThanOrEqual(limit);
  });

  it('follows the copy rules: calm, no exclamation marks, no emoji', () => {
    for (const field of Object.keys(LIMITS)) {
      const value = text[field as keyof typeof LIMITS];
      expect(value).not.toContain('!');
      expect(/\p{Extended_Pictographic}/u.test(value)).toBe(false);
    }
  });

  it('has keywords without spaces after the commas (they count against the limit)', () => {
    expect(text.keywords).not.toMatch(/,\s|\s,/);
  });

  it('states the free limits the app enforces', () => {
    expect(text.description).toContain('15');
    expect(text.description).toContain(String(FREE_BUDGET_LIMIT));
  });
});

describe('store listing (app)', () => {
  it('matches app.json and the in-app links', () => {
    expect(listing.app.bundleId).toBe(appConfig.expo.ios.bundleIdentifier);
    expect(listing.app.bundleId).toBe(appConfig.expo.android.package);
    expect(listing.app.privacyUrl).toBe(PRIVACY_URL);
    expect(listing.app.name).toBe(appConfig.expo.name);
  });

  it('covers the languages the app ships in', () => {
    expect(Object.keys(listing.locales).sort()).toEqual(['en', 'tr']);
    expect(appConfig.expo.locales).toHaveProperty('en');
    expect(appConfig.expo.locales).toHaveProperty('tr');
  });
});
