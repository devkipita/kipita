import { AppState, type AppStateStatus, Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { useUIStore, useChatStore } from "@/store";

/**
 * Bridges platform signals into React Query and the UI:
 *  - onlineManager  ← NetInfo   (pause/refetch on connectivity changes)
 *  - focusManager   ← AppState  (refetch stale data on foreground)
 *  - useUIStore.isOffline       (drives the OfflineBanner, previously dead)
 *
 * Returns a cleanup fn. Call once from the root layout.
 */
export function setupQueryLifecycle(): () => void {
  // ── Connectivity ──
  let wasOnline = true;
  const unsubscribeNet = NetInfo.addEventListener((state) => {
    const online = Boolean(state.isConnected && state.isInternetReachable !== false);
    onlineManager.setOnline(online);
    useUIStore.getState().setOffline(!online);
    // On the offline→online edge, drain any queued messages.
    if (online && !wasOnline) void useChatStore.getState().flushOutbox();
    wasOnline = online;
  });

  // ── Foreground focus ──
  const onAppStateChange = (status: AppStateStatus) => {
    if (Platform.OS !== "web") {
      focusManager.setFocused(status === "active");
    }
  };
  const appStateSub = AppState.addEventListener("change", onAppStateChange);

  return () => {
    unsubscribeNet();
    appStateSub.remove();
  };
}
