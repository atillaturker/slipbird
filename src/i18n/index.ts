import { getLocales } from 'expo-localization';
import Storage from 'expo-sqlite/kv-store';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { isLanguageSetting, resolveLanguage, type LanguageSetting } from '@/lib/language';

import en from './en.json';
import tr from './tr.json';

export const LANGUAGE_KEY = 'language';

export function readLanguageSetting(): LanguageSetting {
  const stored = Storage.getItemSync(LANGUAGE_KEY);
  return isLanguageSetting(stored) ? stored : 'system';
}

export function applyLanguage(setting: LanguageSetting) {
  return i18n.changeLanguage(resolveLanguage(setting, getLocales()[0]?.languageCode));
}

export const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, tr: { translation: tr } },
  lng: resolveLanguage(readLanguageSetting(), getLocales()[0]?.languageCode),
  fallbackLng: 'en',
  initAsync: false,
  interpolation: { escapeValue: false },
});
