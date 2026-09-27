export const supportedLanguages = ['en', 'tr'] as const;
export type AppLanguage = (typeof supportedLanguages)[number];
export type LanguageSetting = 'system' | AppLanguage;

export function isLanguageSetting(value: unknown): value is LanguageSetting {
  return value === 'system' || supportedLanguages.includes(value as AppLanguage);
}

/** The app language: an explicit setting wins, otherwise Turkish devices get Turkish and everyone else English. */
export function resolveLanguage(setting: LanguageSetting, deviceLanguageCode: string | null | undefined): AppLanguage {
  if (setting !== 'system') return setting;
  return deviceLanguageCode?.toLowerCase() === 'tr' ? 'tr' : 'en';
}
