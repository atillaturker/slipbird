import { getLocales } from 'expo-localization';
import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

import { applyLanguage, LANGUAGE_KEY, readLanguageSetting } from '@/i18n';
import { defaultHomeCurrency, isCurrencyCode } from '@/lib/currency';
import type { LanguageSetting } from '@/lib/language';

const HOME_CURRENCY_KEY = 'homeCurrency';

function readHomeCurrency(): string {
  const stored = Storage.getItemSync(HOME_CURRENCY_KEY);
  return isCurrencyCode(stored) ? stored : defaultHomeCurrency(getLocales()[0]?.currencyCode);
}

type SettingsState = {
  language: LanguageSetting;
  homeCurrency: string;
  setLanguage: (language: LanguageSetting) => void;
  setHomeCurrency: (currency: string) => void;
};

export const useSettings = create<SettingsState>((set) => ({
  language: readLanguageSetting(),
  homeCurrency: readHomeCurrency(),
  setLanguage: (language) => {
    Storage.setItemSync(LANGUAGE_KEY, language);
    set({ language });
    void applyLanguage(language);
  },
  setHomeCurrency: (currency) => {
    if (!isCurrencyCode(currency)) return;
    Storage.setItemSync(HOME_CURRENCY_KEY, currency);
    set({ homeCurrency: currency });
  },
}));
