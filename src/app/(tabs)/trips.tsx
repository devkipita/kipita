import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/core/Text';
import { BookingCard } from '@/components/cards/BookingCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useTheme, useLocale, useAppMode } from '@/hooks';
import { useAuthStore, useUIStore } from '@/store';
import { queryKeys, fetchCurrentBookings, fetchPreviousBookings, fetchIncomingRequests } from '@/lib/api';
import { QUERY_STALE_TIMES } from '@/lib/constants';
import { spacing, radius } from '@/theme';
import { FLOATING_TAB_BAR_SPACE } from '@/components/shared/FloatingTabBar';
import type { Booking } from '@/types';

type Tab = 'current' | 'previous' | 'incoming';

export default function TripsScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { isDriver } = useAppMode();
  const user = useAuthStore(s => s.user);
  const openSheet = useUIStore(s => s.openSheet);
  const [activeTab, setActiveTab] = useState<Tab>('current');

  const tabs = useMemo(() => {
    const base: { key: Tab; label: string }[] = [
      { key: 'current', label: t('current') },
      { key: 'previous', label: t('previous') },
    ];
    if (isDriver) {
      base.push({ key: 'incoming', label: t('incoming_requests') });
    }
    return base;
  }, [isDriver, t]);

  const { data: currentBookings = [], isLoading: currentLoading, error: currentError, refetch: refetchCurrent } = useQuery({
    queryKey: queryKeys.bookings.current(user?.id ?? ''),
    queryFn: () => fetchCurrentBookings(user!.id),
    enabled: !!user && activeTab === 'current',
    staleTime: QUERY_STALE_TIMES.trips,
  });

  const { data: previousBookings = [], isLoading: prevLoading } = useQuery({
    queryKey: queryKeys.bookings.previous(user?.id ?? ''),
    queryFn: () => fetchPreviousBookings(user!.id),
    enabled: !!user && activeTab === 'previous',
    staleTime: QUERY_STALE_TIMES.trips,
  });

  const { data: incomingBookings = [], isLoading: incomingLoading } = useQuery({
    queryKey: queryKeys.bookings.incoming(user?.id ?? ''),
    queryFn: () => fetchIncomingRequests(user!.id),
    enabled: !!user && isDriver && activeTab === 'incoming',
    staleTime: QUERY_STALE_TIMES.trips,
  });

  const data = activeTab === 'current' ? currentBookings
    : activeTab === 'previous' ? previousBookings
    : incomingBookings;

  const isLoading = activeTab === 'current' ? currentLoading
    : activeTab === 'previous' ? prevLoading
    : incomingLoading;

  const handleBookingPress = useCallback(
    (booking: Booking) => {
      openSheet('trip_details', { booking });
    },
    [openSheet],
  );

  const handleAvatarPress = useCallback(
    (booking: Booking) => {
      const person = isDriver ? booking.passenger : booking.driver;
      if (person) openSheet('person', { user: person });
    },
    [isDriver, openSheet],
  );

  const renderItem = useCallback(
    ({ item }: { item: Booking }) => (
      <BookingCard
        booking={item}
        onPress={() => handleBookingPress(item)}
        onAvatarPress={() => handleAvatarPress(item)}
      />
    ),
    [handleBookingPress, handleAvatarPress],
  );

  if (!user) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="log-in-outline"
          message={t('sign_in')}
          actionLabel={t('sign_in')}
          onAction={() => openSheet('auth', {})}
        />
      </View>
    );
  }

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

      {/* Content */}
      {isLoading ? (
        <LoadingState />
      ) : currentError && activeTab === 'current' ? (
        <ErrorState onRetry={refetchCurrent} />
      ) : data.length === 0 ? (
        <EmptyState icon="car-outline" message={t('empty_trips')} />
      ) : (
        <FlashList
          data={data}
          renderItem={renderItem}
          estimatedItemSize={140}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: FLOATING_TAB_BAR_SPACE }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        />
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
});
