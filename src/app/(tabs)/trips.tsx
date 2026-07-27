import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/core/Text';
import { Icon, type IconName } from '@/components/core/Icon';
import { BookingCard } from '@/components/cards/BookingCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useTheme, useLocale, useAppMode } from '@/hooks';
import { useAuthStore, useUIStore, useTripStore } from '@/store';
import { queryKeys, fetchCurrentBookings, fetchPreviousBookings, fetchIncomingRequests } from '@/lib/api';
import { QUERY_STALE_TIMES } from '@/lib/constants';
import { spacing, radius } from '@/theme';
import { FLOATING_TAB_BAR_SPACE } from '@/components/shared/FloatingTabBar';
import type { Booking } from '@/types';

type Tab = 'current' | 'previous' | 'incoming';

// Stable empty default so undefined query results don't create a fresh [] each
// render (which would re-run the seeding effect on every render).
const EMPTY_BOOKINGS: Booking[] = [];

export default function TripsScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { isDriver } = useAppMode();
  const user = useAuthStore(s => s.user);
  const openSheet = useUIStore(s => s.openSheet);
  const setTripBooking = useTripStore(s => s.setBooking);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('current');

  const tabs = useMemo(() => {
    const base: {
      key: Tab;
      label: string;
      icon: IconName;
      activeIcon: IconName;
    }[] = [
      {
        key: 'current',
        label: t('current'),
        icon: 'car-sport-outline',
        activeIcon: 'car-sport',
      },
      {
        key: 'previous',
        label: t('previous'),
        icon: 'time-outline',
        activeIcon: 'time',
      },
    ];
    if (isDriver) {
      base.push({
        key: 'incoming',
        label: t('incoming_requests'),
        icon: 'arrow-down-circle-outline',
        activeIcon: 'arrow-down-circle',
      });
    }
    return base;
  }, [isDriver, t]);

  const { data: currentBookings = EMPTY_BOOKINGS, isLoading: currentLoading, error: currentError, refetch: refetchCurrent } = useQuery({
    queryKey: queryKeys.bookings.current(user?.id ?? ''),
    queryFn: () => fetchCurrentBookings(user!.id),
    enabled: !!user && activeTab === 'current',
    staleTime: QUERY_STALE_TIMES.trips,
  });

  const { data: previousBookings = EMPTY_BOOKINGS, isLoading: prevLoading } = useQuery({
    queryKey: queryKeys.bookings.previous(user?.id ?? ''),
    queryFn: () => fetchPreviousBookings(user!.id),
    enabled: !!user && activeTab === 'previous',
    staleTime: QUERY_STALE_TIMES.trips,
  });

  const { data: incomingBookings = EMPTY_BOOKINGS, isLoading: incomingLoading } = useQuery({
    queryKey: queryKeys.bookings.incoming(user?.id ?? ''),
    queryFn: () => fetchIncomingRequests(user!.id),
    enabled: !!user && isDriver && activeTab === 'incoming',
    staleTime: QUERY_STALE_TIMES.trips,
  });

  // Seed the trip store so tapping a card is instant and realtime status
  // overrides always reconcile against fully-joined booking data.
  useEffect(() => {
    for (const b of [...currentBookings, ...incomingBookings, ...previousBookings]) {
      setTripBooking(b);
    }
  }, [currentBookings, incomingBookings, previousBookings, setTripBooking]);

  const data = activeTab === 'current' ? currentBookings
    : activeTab === 'previous' ? previousBookings
    : incomingBookings;

  const isLoading = activeTab === 'current' ? currentLoading
    : activeTab === 'previous' ? prevLoading
    : incomingLoading;

  const handleBookingPress = useCallback(
    (booking: Booking) => {
      // Open the live trip screen (ordering → on-trip → ending).
      setTripBooking(booking);
      router.push(`/trip/${booking.id}` as any);
    },
    [setTripBooking, router],
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
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tab,
                selected && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Icon
                name={selected ? tab.activeIcon : tab.icon}
                size={18}
                color={selected ? colors.primary : colors.textSecondary}
              />
              <Text
                variant="labelLarge"
                color={selected ? colors.primary : colors.textSecondary}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
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
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
});
