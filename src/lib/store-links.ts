/** The Android application id; must match `expo.android.package` in app.json (a test checks). */
export const ANDROID_PACKAGE = 'com.atillaturker.slipbird';

export type StoreLinks = {
  /** Opens the store app directly. */
  primary: string;
  /** Used when the primary link can't be opened (no Play Store app): the web listing. */
  fallback: string;
};

/**
 * Where "Rate Slipbird" goes. Android opens the Play Store listing (`market://`), falling back to the web page.
 * iOS has no link yet: it needs the App Store id once the app has one —
 * `itms-apps://apps.apple.com/app/id<APPLE_ID>?action=write-review` — so the row is hidden there for now.
 */
export function reviewLinks(platform: string): StoreLinks | null {
  if (platform === 'android') {
    return {
      primary: `market://details?id=${ANDROID_PACKAGE}`,
      fallback: `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
    };
  }
  return null;
}
