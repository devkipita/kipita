"use client";

import { useSyncExternalStore } from "react";
import { createUnseenAlertStore } from "@kipita/shared";

/**
 * Which road alerts the signed-in person has not opened. One store for the whole tab: the nav hook
 * fills it (useNavCounts), the nav badge shows its size, and each card in the feed reads its own
 * entry. The rule itself, and its tests, live in @kipita/shared (unseen-alerts.ts).
 *
 * Nothing writes to it on the server, so server renders see an empty store and the first client
 * render matches.
 */
export const unseenAlertStore = createUnseenAlertStore();

/** How many alerts are unread: the number on the nav badge. */
export function useUnseenAlertCount(): number {
  return useSyncExternalStore(
    unseenAlertStore.subscribe,
    () => unseenAlertStore.getSnapshot().size,
    () => 0,
  );
}

/** True while this alert has not been opened. */
export function useIsUnseenAlert(alertId: string): boolean {
  return useSyncExternalStore(
    unseenAlertStore.subscribe,
    () => unseenAlertStore.has(alertId),
    () => false,
  );
}
