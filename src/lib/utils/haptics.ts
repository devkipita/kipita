import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@/store/slices/settings';

/**
 * Haptics wrapper that honours the user's "Haptic feedback" setting.
 * All app-level press/selection feedback should go through this so the
 * Settings toggle actually takes effect everywhere.
 */
const enabled = () => useSettingsStore.getState().haptics;

export const haptic = {
  light: () => {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  medium: () => {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  heavy: () => {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },
  selection: () => {
    if (enabled()) Haptics.selectionAsync();
  },
  success: () => {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  warning: () => {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
  error: () => {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },
};
