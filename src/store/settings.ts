import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

import { applyLanguage, LANGUAGE_KEY, readLanguageSetting } from '@/i18n';
import type { LanguageSetting } from '@/lib/language';

type SettingsState = {
  language: LanguageSetting;
  setLanguage: (language: LanguageSetting) => void;
};

export const useSettings = create<SettingsState>((set) => ({
  language: readLanguageSetting(),
  setLanguage: (language) => {
    Storage.setItemSync(LANGUAGE_KEY, language);
    set({ language });
    void applyLanguage(language);
  },
}));
