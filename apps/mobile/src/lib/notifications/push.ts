import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

/**
 * Push-notification plumbing.
 *
 * Delivery is fanned out server-side: a Postgres trigger on `notifications`
 * INSERT (migration 007) pushes to Expo for us, so every in-app notification —
 * ride_match, payment_success, new_message, new_alert, … — also arrives as a
 * device push, differentiated by the row's own type/title/body. The client's
 * only jobs are (1) obtain an Expo push token and store it on the user row and
 * (2) decide how a notification behaves while the app is foregrounded.
 */

/** How notifications behave when received with the app in the foreground. */
export function configureNotificationHandler() {
  if (Platform.OS === 'web') return; // native module unavailable on web
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/** Android requires an explicit channel for heads-up notifications. */
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Kipita',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2F6C4F',
  });
}

/** Resolve the EAS projectId the Expo push service needs to mint a token. */
function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

/**
 * Request permission, mint an Expo push token, and persist it on the user's
 * row. Safe to call repeatedly (idempotent upsert). No-ops on web, on a denied
 * permission, or when no EAS projectId is configured yet.
 *
 * @returns the token if registration succeeded, otherwise null.
 */
export async function registerForPushNotifications(
  userId: string,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    await ensureAndroidChannel();

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    const projectId = getProjectId();
    if (!projectId) {
      console.warn(
        '[push] No EAS projectId — set expo.extra.eas.projectId (or run an EAS build) before push can register.',
      );
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    if (!token) return null;

    const { error } = await supabase
      .from('users')
      .update({
        push_token: token,
        push_platform: Platform.OS,
        push_token_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (error) throw error;

    return token;
  } catch (err) {
    // Never let push registration break the session bootstrap.
    console.warn('[push] registration failed:', err);
    return null;
  }
}

/** Clear the stored token so a logged-out device stops receiving pushes. */
export async function unregisterPushToken(userId: string): Promise<void> {
  try {
    await supabase
      .from('users')
      .update({ push_token: null, push_token_updated_at: new Date().toISOString() })
      .eq('id', userId);
  } catch (err) {
    console.warn('[push] unregister failed:', err);
  }
}
