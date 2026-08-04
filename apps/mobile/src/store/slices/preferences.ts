import { create } from 'zustand';
import type { ThemeMode } from '@/hooks/useTheme';
import type { Locale } from '@/lib/i18n';
import { storage, STORAGE_KEYS } from '@/lib/utils/mmkv';
import { setLocale } from '@/lib/i18n';

interface PreferencesState {
  themeMode: ThemeMode;
  locale: Locale;
  setThemeMode: (mode: ThemeMode) => void;
  setLocale: (locale: Locale) => void;
}

const savedLocale = (storage.getString(STORAGE_KEYS.LOCALE) as Locale) ?? 'en';
setLocale(savedLocale);

export const usePreferencesStore = create<PreferencesState>((set) => ({
  themeMode: (storage.getString(STORAGE_KEYS.THEME) as ThemeMode) ?? 'system',
  locale: savedLocale,
  setThemeMode: (themeMode) => {
    storage.setString(STORAGE_KEYS.THEME, themeMode);
    set({ themeMode });
  },
  setLocale: (locale) => {
    storage.setString(STORAGE_KEYS.LOCALE, locale);
    set({ locale });
  },
}));
