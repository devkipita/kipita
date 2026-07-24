import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/core/Text';
import { Icon } from '@/components/core/Icon';
import { Button } from '@/components/core/Button';
import { AlertCard } from '@/components/cards/AlertCard';
import { NotificationCard } from '@/components/cards/NotificationCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useTheme, useLocale } from '@/hooks';
import { useAuthStore, useUIStore } from '@/store';
import {
  queryKeys,
  fetchAlerts,
  fetchNotifications,
  markNotificationRead,
  createAlert,
  reactToAlert,
  addAlertComment,
} from '@/lib/api';
import { QUERY_STALE_TIMES, ALERT_CATEGORIES } from '@/lib/constants';
import { spacing, radius } from '@/theme';
import { FLOATING_TAB_BAR_SPACE } from '@/components/shared/FloatingTabBar';
import type { Alert, AppNotification, AlertCategory } from '@/types';

type Tab = 'alerts' | 'notifications' | 'system';

export default function AlertsScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const user = useAuthStore(s => s.user);
  const openSheet = useUIStore(s => s.openSheet);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('alerts');
  const [showPostForm, setShowPostForm] = useState(false);

  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: queryKeys.alerts.feed(),
    queryFn: () => fetchAlerts(),
    staleTime: QUERY_STALE_TIMES.alerts,
    enabled: activeTab === 'alerts',
  });

  const { data: notifications = [], isLoading: notifsLoading } = useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () => fetchNotifications(user!.id),
    staleTime: QUERY_STALE_TIMES.notifications,
    enabled: !!user && (activeTab === 'notifications' || activeTab === 'system'),
  });

  const systemNotifs = notifications.filter(n => n.type === 'system');
  const userNotifs = notifications.filter(n => n.type !== 'system');

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
    },
  });

  const reactMutation = useMutation({
    mutationFn: ({ alertId, reaction }: { alertId: string; reaction: string }) =>
      reactToAlert(alertId, user!.id, reaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.feed() });
    },
  });

  const handleAlertPress = useCallback((alert: Alert) => {
    // Could navigate to detail, for now just expand
  }, []);

  const handleNotifPress = useCallback(
    (notif: AppNotification) => {
      if (!notif.read) {
        markReadMutation.mutate(notif.id);
      }
    },
    [markReadMutation],
  );

  const renderAlert = useCallback(
    ({ item }: { item: Alert }) => (
      <AlertCard alert={item} onPress={() => handleAlertPress(item)} />
    ),
    [handleAlertPress],
  );

  const renderNotif = useCallback(
    ({ item }: { item: AppNotification }) => (
      <NotificationCard notification={item} onPress={() => handleNotifPress(item)} />
    ),
    [handleNotifPress],
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'alerts', label: t('road_alerts_tab') },
    { key: 'notifications', label: t('notifications') },
    { key: 'system', label: t('system_alerts') },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.borderLight }]}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[
              styles.tab,
              activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.key }}
          >
            <Text
              variant="labelLarge"
              color={activeTab === tab.key ? colors.primary : colors.textSecondary}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Post Alert FAB (alerts tab only) */}
      {activeTab === 'alerts' && user && (
        <Pressable
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => openSheet('alert_post', undefined)}
          accessibilityRole="button"
          accessibilityLabel={t('post_alert')}
        >
          <Icon name="add" size={24} color={colors.onPrimary} />
        </Pressable>
      )}

      {/* Content */}
      {activeTab === 'alerts' && (
        alertsLoading ? (
          <LoadingState />
        ) : alerts.length === 0 ? (
          <EmptyState icon="megaphone-outline" message={t('empty_alerts')} />
        ) : (
          <FlashList
            data={alerts}
            renderItem={renderAlert}
            estimatedItemSize={130}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: FLOATING_TAB_BAR_SPACE }}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          />
        )
      )}

      {activeTab === 'notifications' && (
        !user ? (
          <EmptyState
            icon="log-in-outline"
            message={t('sign_in')}
            actionLabel={t('sign_in')}
            onAction={() => openSheet('auth', {})}
          />
        ) : notifsLoading ? (
          <LoadingState />
        ) : userNotifs.length === 0 ? (
          <EmptyState icon="notifications-outline" message={t('empty_notifications')} />
        ) : (
          <FlashList
            data={userNotifs}
            renderItem={renderNotif}
            estimatedItemSize={72}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: FLOATING_TAB_BAR_SPACE }}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          />
        )
      )}

      {activeTab === 'system' && (
        notifsLoading ? (
          <LoadingState />
        ) : systemNotifs.length === 0 ? (
          <EmptyState icon="information-circle-outline" message={t('empty_notifications')} />
        ) : (
          <FlashList
            data={systemNotifs}
            renderItem={renderNotif}
            estimatedItemSize={72}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: FLOATING_TAB_BAR_SPACE }}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
});
