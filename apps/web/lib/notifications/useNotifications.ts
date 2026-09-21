"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  connectNotifications,
  getServerSnapshot,
  getSnapshot,
  subscribe,
  type NotificationsState,
} from "./store";

/**
 * Live notifications for the signed-in user. Safe to call from as many
 * components as you like — they all read the one shared feed (see `store.ts`).
 */
export function useNotifications(userId: string): NotificationsState {
  useEffect(() => {
    connectNotifications(userId);
  }, [userId]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
