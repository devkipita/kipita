import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuthStore, useSettingsStore } from '@/store';
import {
  registerForPushNotifications,
  unregisterPushToken,
} from '@/lib/notifications/push';

/** Route a notification tap to the most relevant screen based on its payload. */
function routeFromData(
  router: ReturnType<typeof useRouter>,
  data: Record<string, any> | undefined,
) {
  if (!data) return;
  if (data.booking_id) {
    router.push(`/trip/${data.booking_id}` as any);
  } else if (data.conversation_id) {
    router.push(`/chat/${data.conversation_id}` as any);
  } else if (data.alert_id) {
    router.push(`/alert/${data.alert_id}` as any);
  } else {
    router.push('/(tabs)/alerts' as any);
  }
}

/**
 * Owns the push-notification lifecycle for the app:
 *  - registers / refreshes the Expo push token whenever we have a signed-in
 *    user and the user hasn't disabled push in settings;
 *  - clears the token when push is switched off;
 *  - handles taps on notifications (foreground, background, and cold-start).
 *
 * Delivery itself is server-side (Postgres trigger → Expo), so there is no
 * per-notification client code here — only registration and navigation.
 */
export function usePushNotifications() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const pushEnabled = useSettingsStore((s) => s.pushEnabled);
  const registeredFor = useRef<string | null>(null);

  // Register / unregister the device token.
  useEffect(() => {
    if (Platform.OS === 'web') return; // no push on web
    if (!userId) {
      registeredFor.current = null;
      return;
    }
    if (!pushEnabled) {
      if (registeredFor.current === userId) {
        void unregisterPushToken(userId);
        registeredFor.current = null;
      }
      return;
    }
    if (registeredFor.current === userId) return; // already registered this session
    registeredFor.current = userId;
    void registerForPushNotifications(userId);
  }, [userId, pushEnabled]);

  // Handle a tap that launched / resumed the app from a notification.
  useEffect(() => {
    if (Platform.OS === 'web') return; // native notifications unavailable on web
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      routeFromData(router, res.notification.request.content.data as any);
    });

    // Cold start: the app was opened by tapping a notification.
    void Notifications.getLastNotificationResponseAsync().then((res) => {
      if (res) routeFromData(router, res.notification.request.content.data as any);
    });

    return () => sub.remove();
  }, [router]);
}
