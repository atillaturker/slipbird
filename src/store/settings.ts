import { getLocales } from 'expo-localization';
import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

import { applyLanguage, LANGUAGE_KEY, readLanguageSetting } from '@/i18n';
import { defaultHomeCurrency, isCurrencyCode } from '@/lib/currency';
import type { LanguageSetting } from '@/lib/language';

const HOME_CURRENCY_KEY = 'homeCurrency';
const BUDGET_ALERTS_KEY = 'budgetAlerts';

function readHomeCurrency(): string {
  const stored = Storage.getItemSync(HOME_CURRENCY_KEY);
  return isCurrencyCode(stored) ? stored : defaultHomeCurrency(getLocales()[0]?.currencyCode);
}

type SettingsState = {
  language: LanguageSetting;
  homeCurrency: string;
  /** Local notifications at 80% and 100% of a budget. On unless turned off (Settings, M6). */
  budgetAlerts: boolean;
  setBudgetAlerts: (on: boolean) => void;
  setLanguage: (language: LanguageSetting) => void;
  setHomeCurrency: (currency: string) => void;
};

export const useSettings = create<SettingsState>((set) => ({
  language: readLanguageSetting(),
  homeCurrency: readHomeCurrency(),
  budgetAlerts: Storage.getItemSync(BUDGET_ALERTS_KEY) !== 'false',
  setBudgetAlerts: (on) => {
    Storage.setItemSync(BUDGET_ALERTS_KEY, on ? 'true' : 'false');
    set({ budgetAlerts: on });
  },
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
