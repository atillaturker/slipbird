import appConfig from '../../../app.json';
import { ANDROID_PACKAGE, reviewLinks } from '../store-links';

describe('reviewLinks', () => {
  it('opens the Play Store on Android, with the web listing as the fallback', () => {
    expect(reviewLinks('android')).toEqual({
      primary: 'market://details?id=com.atillaturker.slipbird',
      fallback: 'https://play.google.com/store/apps/details?id=com.atillaturker.slipbird',
    });
  });

  it('has no link on iOS or web until there is an App Store id', () => {
    expect(reviewLinks('ios')).toBeNull();
    expect(reviewLinks('web')).toBeNull();
  });

  it('uses the same package as app.json', () => {
    expect(ANDROID_PACKAGE).toBe(appConfig.expo.android.package);
  });
});
