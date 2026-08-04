import { create } from 'zustand';
import type { SheetType, User } from '@/types';

interface ActiveChat {
  conversationId: string;
  participantName: string;
  participantAvatar: string | null;
  /** Full profile of the other party, so the chat header can open their profile. */
  participant?: User;
}

interface UIState {
  activeSheet: SheetType;
  sheetPayload: Record<string, unknown> | null;
  isOffline: boolean;
  activeChat: ActiveChat | null;
  openSheet: (sheet: SheetType, payload?: Record<string, unknown>) => void;
  closeSheet: () => void;
  setOffline: (offline: boolean) => void;
  setActiveChat: (chat: ActiveChat) => void;
  clearActiveChat: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeSheet: null,
  sheetPayload: null,
  isOffline: false,
  activeChat: null,
  openSheet: (activeSheet, sheetPayload = null) => set({ activeSheet, sheetPayload }),
  closeSheet: () => set({ activeSheet: null, sheetPayload: null }),
  setOffline: (isOffline) => set({ isOffline }),
  setActiveChat: (activeChat) => set({ activeChat }),
  clearActiveChat: () => set({ activeChat: null }),
}));
