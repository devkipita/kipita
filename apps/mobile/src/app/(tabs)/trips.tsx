import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  ScrollView,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/core/Text';
import { Icon } from '@/components/core/Icon';
import { BookingCard } from '@/components/cards/BookingCard';
import { PromoCard, type Promo } from '@/components/cards/PromoCard';
import { WhyCard, type WhyItem } from '@/components/cards/WhyCard';
import { SectionHeading } from '@/components/core/SectionHeading';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useTheme, useLocale, useAppMode, useSafeBack } from '@/hooks';
import { useAuthStore, useUIStore, useTripStore } from '@/store';
import {
  queryKeys,
  fetchCurrentBookings,
  fetchPreviousBookings,
  fetchIncomingRequests,
} from '@/lib/api';
import { QUERY_STALE_TIMES } from '@/lib/constants';
import { spacing, radius, typography } from '@/theme';
import { FLOATING_TAB_BAR_SPACE } from '@/components/shared/FloatingTabBar';
import type { Booking } from '@/types';

type Tab = 'current' | 'previous' | 'incoming';
type Row =
  | { kind: 'heading'; id: string; title: string; subtitle: string; first?: boolean }
  | { kind: 'booking'; booking: Booking }
  | { kind: 'promoRail' }
  | { kind: 'whyRail' };

const EMPTY_BOOKINGS: Booking[] = [];
const SEARCH_HEIGHT = 44;
const COLLAPSE_AT = 28;

export default function TripsScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { isDriver } = useAppMode();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const openSheet = useUIStore((s) => s.openSheet);
  const setTripBooking = useTripStore((s) => s.setBooking);
  const router = useRouter();
  const goBack = useSafeBack();

  const [activeTab, setActiveTab] = useState<Tab>('current');
  const [query, setQuery] = useState('');
  const scrollY = useSharedValue(0);

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

  const tabs = useMemo(() => {
    const base: { key: Tab; label: string }[] = [
      { key: 'current', label: t('current') },
      { key: 'previous', label: t('previous') },
    ];
    if (isDriver) base.push({ key: 'incoming', label: t('incoming_requests') });
    return base;
  }, [isDriver, t]);

  const promos = useMemo<Promo[]>(
    () => [
      {
        id: 'invite',
        eyebrow: t('promo_invite_eyebrow'),
        headline: t('promo_invite_headline'),
        body: t('promo_invite_body'),
        cta: t('promo_invite_cta'),
        icon: 'people',
        tint: '#E5FFC3',
        ink: '#013330',
      },
      {
        id: 'offpeak',
        eyebrow: t('promo_offpeak_eyebrow'),
        headline: t('promo_offpeak_headline'),
        body: t('promo_offpeak_body'),
        cta: t('promo_offpeak_cta'),
        icon: 'time',
        tint: '#F8A783',
        ink: '#2A1002',
      },
      {
        id: 'safety',
        eyebrow: t('promo_safety_eyebrow'),
        headline: t('promo_safety_headline'),
        body: t('promo_safety_body'),
        cta: t('promo_safety_cta'),
        icon: 'shield-checkmark',
        tint: '#DDB8FB',
        ink: '#3B0A63',
      },
    ],
    [t],
  );

  const {
    data: currentBookings = EMPTY_BOOKINGS,
    isLoading: currentLoading,
    error: currentError,
    refetch: refetchCurrent,
  } = useQuery({
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

  useEffect(() => {
    for (const b of [...currentBookings, ...incomingBookings, ...previousBookings]) {
      setTripBooking(b);
    }
  }, [currentBookings, incomingBookings, previousBookings, setTripBooking]);

  const bookings =
    activeTab === 'current'
      ? currentBookings
      : activeTab === 'previous'
        ? previousBookings
        : incomingBookings;

  const isLoading =
    activeTab === 'current'
      ? currentLoading
      : activeTab === 'previous'
        ? prevLoading
        : incomingLoading;

  const needle = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!needle) return bookings;
    return bookings.filter((b) => {
      const person = isDriver ? b.passenger : b.driver;
      return (
        (b.trip?.from_location ?? '').toLowerCase().includes(needle) ||
        (b.trip?.to_location ?? '').toLowerCase().includes(needle) ||
        (person?.full_name ?? '').toLowerCase().includes(needle)
      );
    });
  }, [bookings, needle, isDriver]);

  const rows = useMemo<Row[]>(() => {
    if (filtered.length === 0) return [];

    const headingKey =
      activeTab === 'current'
        ? 'section_current_trips'
        : activeTab === 'previous'
          ? 'section_previous_trips'
          : 'section_incoming_trips';

    const out: Row[] = [
      {
        kind: 'heading',
        id: 'trips',
        title: t(headingKey as any),
        subtitle: t(`${headingKey}_sub` as any),
        first: true,
      },
      ...filtered.map((booking) => ({ kind: 'booking' as const, booking })),
    ];

    if (promos.length > 0) {
      out.push({
        kind: 'heading',
        id: 'offers',
        title: t('section_offers'),
        subtitle: t('section_offers_sub'),
      });
      out.push({ kind: 'promoRail' });
    }

    out.push({
      kind: 'heading',
      id: 'why',
      title: t('section_why'),
      subtitle: t('section_why_sub'),
    });
    out.push({ kind: 'whyRail' });

    return out;
  }, [filtered, promos, activeTab, t]);

  const handleBookingPress = useCallback(
    (booking: Booking) => {
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

  const whyItems = useMemo<WhyItem[]>(
    () => [
      {
        id: 'escrow',
        title: t('why_escrow_title'),
        body: t('why_escrow_body'),
        icon: 'lock-closed',
        tint: '#0E2A3F',
        ink: '#EAF3FB',
        accent: '#5FB2F2',
      },
      {
        id: 'verified',
        title: t('why_verified_title'),
        body: t('why_verified_body'),
        icon: 'shield-checkmark',
        tint: '#10301F',
        ink: '#E6F7EC',
        accent: '#5FD39A',
      },
      {
        id: 'mpesa',
        title: t('why_mpesa_title'),
        body: t('why_mpesa_body'),
        icon: 'phone-portrait',
        tint: '#331A10',
        ink: '#FDEDE3',
        accent: '#F8A783',
      },
      {
        id: 'alerts',
        title: t('why_alerts_title'),
        body: t('why_alerts_body'),
        icon: 'megaphone',
        tint: '#26163F',
        ink: '#F1E7FC',
        accent: '#C79BF5',
      },
    ],
    [t],
  );

  const handlePromoPress = useCallback(
    (promo: Promo) => {
      if (promo.id === 'safety') router.push('/(tabs)/profile' as any);
      else router.push('/(tabs)/home' as any);
    },
    [router],
  );

  const renderRow = useCallback(
    ({ item }: { item: Row }) => {
      if (item.kind === 'heading') {
        return (
          <SectionHeading
            title={item.title}
            subtitle={item.subtitle}
            first={item.first}
          />
        );
      }
      if (item.kind === 'promoRail') {
        return (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.railScroll}
            contentContainerStyle={styles.rail}
            snapToInterval={300 + spacing.md}
            decelerationRate="fast"
          >
            {promos.map((promo) => (
              <View key={promo.id} style={styles.railItem}>
                <PromoCard promo={promo} onPress={() => handlePromoPress(promo)} />
              </View>
            ))}
          </ScrollView>
        );
      }
      if (item.kind === 'whyRail') {
        return (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.railScroll}
            contentContainerStyle={styles.rail}
          >
            {whyItems.map((why) => (
              <WhyCard key={why.id} item={why} />
            ))}
          </ScrollView>
        );
      }
      return (
        <BookingCard
          booking={item.booking}
          onPress={() => handleBookingPress(item.booking)}
          onAvatarPress={() => handleAvatarPress(item.booking)}
        />
      );
    },
    [handleBookingPress, handleAvatarPress, handlePromoPress, promos, whyItems],
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
          {t('trips')}
        </Text>

        <View style={styles.backBtn} />
      </View>

      <Animated.View style={[styles.searchWrap, searchStyle]}>
        <View style={[styles.search, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Icon name="search" size={16} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('search_trips')}
            placeholderTextColor={colors.placeholder}
            style={[styles.searchInput, typography.input, { color: colors.text }]}
            returnKeyType="search"
            accessibilityLabel={t('search_trips')}
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
        {tabs.map(({ key, label }) => {
          const selected = activeTab === key;
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
              accessibilityLabel={label}
            >
              <Text
                variant="labelMedium"
                color={selected ? colors.onPrimary : colors.textSecondary}
                numberOfLines={1}
                style={styles.segmentLabel}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <LoadingState />
      ) : currentError && activeTab === 'current' ? (
        <ErrorState onRetry={refetchCurrent} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="car-outline"
          message={needle ? t('no_results') : t('empty_trips')}
        />
      ) : (
        <FlashList
          data={rows}
          renderItem={renderRow}
          keyboardShouldPersistTaps="handled"
          onScroll={onListScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: FLOATING_TAB_BAR_SPACE,
          }}
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
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  segmentLabel: {
    fontWeight: '600',
    fontSize: 12.5,
  },
  railScroll: {
    marginHorizontal: -spacing.lg,
  },
  rail: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  railItem: {
    width: 300,
  },
});
