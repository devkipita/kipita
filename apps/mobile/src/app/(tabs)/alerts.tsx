import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, TextInput, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/core/Text';
import { Icon } from '@/components/core/Icon';
import { AlertCard } from '@/components/cards/AlertCard';
import { NotificationCard } from '@/components/cards/NotificationCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useTheme, useLocale, useSafeBack } from '@/hooks';
import { useAuthStore, useUIStore } from '@/store';
import {
  queryKeys,
  fetchAlerts,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/api';
import { notificationRoute } from '@/lib/notifications/route';
import { QUERY_STALE_TIMES } from '@/lib/constants';
import { spacing, radius, typography } from '@/theme';
import { FLOATING_TAB_BAR_SPACE } from '@/components/shared/FloatingTabBar';
import type { Alert, AppNotification } from '@/types';

type Tab = 'alerts' | 'notifications' | 'system';

const TABS: { key: Tab; labelKey: string }[] = [
  { key: 'alerts', labelKey: 'road_alerts_tab' },
  { key: 'notifications', labelKey: 'notifications' },
  { key: 'system', labelKey: 'system_alerts' },
];

const SEARCH_HEIGHT = 44;
const COLLAPSE_AT = 28;

export default function AlertsScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const router = useRouter();
  const goBack = useSafeBack();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const openSheet = useUIStore((s) => s.openSheet);
  const queryClient = useQueryClient();
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<Tab>(
    tab === 'notifications' || tab === 'system' ? tab : 'alerts',
  );
  const [query, setQuery] = useState('');
  const scrollY = useSharedValue(0);

  useEffect(() => {
    if (tab === 'notifications' || tab === 'system' || tab === 'alerts') {
      setActiveTab(tab);
    }
  }, [tab]);

  const searchStyle = useAnimatedStyle(() => {
    const hidden = scrollY.value > COLLAPSE_AT;
    return {
      height: withTiming(hidden ? 0 : SEARCH_HEIGHT, { duration: 180 }),
      opacity: withTiming(hidden ? 0 : 1, { duration: 140 }),
      marginBottom: withTiming(hidden ? 0 : spacing.sm, { duration: 180 }),
    };
  });

  const onListScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      scrollY.value = event.nativeEvent.contentOffset.y;
    },
    [scrollY],
  );

  const selectTab = useCallback(
    (next: Tab) => {
      scrollY.value = 0;
      setActiveTab(next);
    },
    [scrollY],
  );

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

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
  });

  const needle = query.trim().toLowerCase();

  const visibleAlerts = useMemo(() => {
    if (!needle) return alerts;
    return alerts.filter(
      (a) =>
        a.content.toLowerCase().includes(needle) ||
        a.location.toLowerCase().includes(needle),
    );
  }, [alerts, needle]);

  const visibleNotifs = useMemo(() => {
    const scoped = notifications.filter((n) =>
      activeTab === 'system' ? n.type === 'system' : n.type !== 'system',
    );
    if (!needle) return scoped;
    return scoped.filter(
      (n) =>
        n.title.toLowerCase().includes(needle) ||
        n.body.toLowerCase().includes(needle),
    );
  }, [notifications, activeTab, needle]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const handleAlertPress = useCallback(
    (alert: Alert) => openSheet('alert_details', { alert }),
    [openSheet],
  );

  const handleNotifPress = useCallback(
    (notif: AppNotification) => {
      if (!notif.read) markReadMutation.mutate(notif.id);
      const path = notificationRoute(notif.data);
      if (path) router.push(path as any);
    },
    [markReadMutation, router],
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

  const isAlerts = activeTab === 'alerts';
  const loading = isAlerts ? alertsLoading : notifsLoading;
  const searchPlaceholder = isAlerts ? t('search_alerts') : t('search_notifications');

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => goBack()}
          hitSlop={12}
          style={[styles.backBtn, { backgroundColor: colors.surfaceContainerHigh }]}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Icon name="arrow-back" size={20} color={colors.text} />
        </Pressable>

        <Text variant="titleLarge" color={colors.text} style={styles.title}>
          {t('alerts')}
        </Text>

        {!isAlerts && unreadCount > 0 ? (
          <Pressable
            onPress={() => markAllMutation.mutate()}
            hitSlop={10}
            style={[styles.markAll, { backgroundColor: colors.primaryContainer }]}
            accessibilityRole="button"
            accessibilityLabel={t('mark_all_read')}
          >
            <Icon name="checkmark-done" size={15} color={colors.onPrimaryContainer} />
            <Text variant="labelSmall" color={colors.onPrimaryContainer} style={styles.markAllText}>
              {t('mark_all_read')}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

      <Animated.View style={[styles.searchWrap, searchStyle]}>
        <View
          style={[
            styles.search,
            { backgroundColor: colors.surfaceContainerHigh },
          ]}
        >
          <Icon name="search" size={16} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.placeholder}
            style={[styles.searchInput, typography.input, { color: colors.text }]}
            returnKeyType="search"
            accessibilityLabel={searchPlaceholder}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('clear')}
            >
              <Icon name="close-circle" size={16} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </Animated.View>

      <View style={styles.segment} accessibilityRole="tablist">
        {TABS.map(({ key, labelKey }) => {
          const selected = activeTab === key;
          const badge = key === 'notifications' ? unreadCount : 0;
          return (
            <Pressable
              key={key}
              onPress={() => selectTab(key)}
              style={[
                styles.segmentBtn,
                {
                  backgroundColor: selected
                    ? colors.primary
                    : colors.surfaceContainerHigh,
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={t(labelKey as any)}
            >
              <Text
                variant="labelMedium"
                color={selected ? colors.onPrimary : colors.textSecondary}
                numberOfLines={1}
                style={styles.segmentLabel}
              >
                {t(labelKey as any)}
              </Text>
              {badge > 0 && !selected && (
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              )}
            </Pressable>
          );
        })}
      </View>

      {isAlerts && user && (
        <Pressable
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => openSheet('alert_post', undefined)}
          accessibilityRole="button"
          accessibilityLabel={t('post_alert')}
        >
          <Icon name="add" size={24} color={colors.onPrimary} />
        </Pressable>
      )}

      {loading ? (
        <LoadingState />
      ) : isAlerts ? (
        visibleAlerts.length === 0 ? (
          <EmptyState
            icon="megaphone-outline"
            message={needle ? t('no_results') : t('empty_alerts')}
          />
        ) : (
          <FlashList
            data={visibleAlerts}
            renderItem={renderAlert}
            keyboardShouldPersistTaps="handled"
            onScroll={onListScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{
              padding: spacing.lg,
              paddingBottom: FLOATING_TAB_BAR_SPACE,
            }}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          />
        )
      ) : !user ? (
        <EmptyState
          icon="log-in-outline"
          message={t('sign_in')}
          actionLabel={t('sign_in')}
          onAction={() => openSheet('auth', {})}
        />
      ) : visibleNotifs.length === 0 ? (
        <EmptyState
          icon={activeTab === 'system' ? 'information-circle-outline' : 'notifications-outline'}
          message={needle ? t('no_results') : t('empty_notifications')}
        />
      ) : (
        <FlashList
          data={visibleNotifs}
          renderItem={renderNotif}
          keyboardShouldPersistTaps="handled"
          onScroll={onListScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: FLOATING_TAB_BAR_SPACE,
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontWeight: '800',
  },
  markAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.full,
  },
  markAllText: {
    fontWeight: '700',
  },
  searchWrap: {
    overflow: 'hidden',
    marginHorizontal: spacing.lg,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: SEARCH_HEIGHT,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    padding: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  segment: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 30,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  segmentLabel: {
    fontWeight: '600',
    fontSize: 12.5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: FLOATING_TAB_BAR_SPACE - spacing.xl,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
});
