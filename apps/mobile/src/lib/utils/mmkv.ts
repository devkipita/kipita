import { MMKV } from 'react-native-mmkv';

/** App-wide fast local storage */
export const appStorage = new MMKV({ id: 'kipita-app' });

/** Typed MMKV helpers */
export const storage = {
  getString: (key: string) => appStorage.getString(key) ?? null,
  setString: (key: string, value: string) => appStorage.set(key, value),
  getBoolean: (key: string) => appStorage.getBoolean(key) ?? false,
  setBoolean: (key: string, value: boolean) => appStorage.set(key, value),
  getJSON: <T>(key: string): T | null => {
    const raw = appStorage.getString(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setJSON: <T>(key: string, value: T) => appStorage.set(key, JSON.stringify(value)),
  remove: (key: string) => appStorage.delete(key),
  clear: () => appStorage.clearAll(),
};

// Storage keys
export const STORAGE_KEYS = {
  THEME: 'theme',
  LOCALE: 'locale',
  APP_MODE: 'app_mode',
  ROUTE_SEARCH_DRAFT: 'route_search_draft',
  ONBOARDED: 'onboarded',
  SETTINGS: 'app_settings',
} as const;
