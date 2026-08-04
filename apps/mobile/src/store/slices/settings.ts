import { create } from 'zustand';
import { storage, STORAGE_KEYS } from '@/lib/utils/mmkv';

/** User-configurable app settings, persisted locally via MMKV. */
export interface AppSettings {
  // Notifications
  pushEnabled: boolean;
  rideUpdates: boolean;
  chatMessages: boolean;
  roadAlerts: boolean;
  promotions: boolean;
  // Experience
  haptics: boolean;
  soundEffects: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  pushEnabled: true,
  rideUpdates: true,
  chatMessages: true,
  roadAlerts: true,
  promotions: false,
  haptics: true,
  soundEffects: true,
};

interface SettingsState extends AppSettings {
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  reset: () => void;
}

const persist = (state: SettingsState) => {
  const { pushEnabled, rideUpdates, chatMessages, roadAlerts, promotions, haptics, soundEffects } = state;
  storage.setJSON(STORAGE_KEYS.SETTINGS, {
    pushEnabled, rideUpdates, chatMessages, roadAlerts, promotions, haptics, soundEffects,
  });
};

const saved = storage.getJSON<Partial<AppSettings>>(STORAGE_KEYS.SETTINGS);

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  ...(saved ?? {}),

  setSetting: (key, value) => {
    set({ [key]: value } as Partial<SettingsState>);
    persist(get());
  },

  reset: () => {
    set({ ...DEFAULT_SETTINGS });
    persist(get());
  },
}));
