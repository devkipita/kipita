import { create } from 'zustand';
import type { AppMode } from '@/types';
import { storage, STORAGE_KEYS } from '@/lib/utils/mmkv';

interface ModeState {
  mode: AppMode;
  hasSelected: boolean;
  setMode: (mode: AppMode) => void;
  setHasSelected: (val: boolean) => void;
}

export const useModeStore = create<ModeState>((set) => ({
  mode: (storage.getString(STORAGE_KEYS.APP_MODE) as AppMode) ?? 'passenger',
  hasSelected: storage.getBoolean(STORAGE_KEYS.ONBOARDED),
  setMode: (mode) => {
    storage.setString(STORAGE_KEYS.APP_MODE, mode);
    set({ mode, hasSelected: true });
    storage.setBoolean(STORAGE_KEYS.ONBOARDED, true);
  },
  setHasSelected: (hasSelected) => set({ hasSelected }),
}));
