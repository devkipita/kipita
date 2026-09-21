import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/core/Text";
import { Icon } from "@/components/core/Icon";
import { AppBackground } from "@/components/core/AppBackground";
import { RouteSearchForm } from "@/components/shared/RouteSearchForm";
import { FLOATING_TAB_BAR_SPACE } from "@/components/shared/FloatingTabBar";
import { TripCard } from "@/components/cards/TripCard";
import { AlertCard } from "@/components/cards/AlertCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { MovingCar } from "@/components/core/MovingCar";
import { useTheme, useLocale, useAppMode } from "@/hooks";
import { useUIStore, useAuthStore, useDetailStore } from "@/store";
import {
  queryKeys,
  fetchTrips,
  fetchRequests,
  fetchAlertPreview,
} from "@/lib/api";
import { QUERY_STALE_TIMES, DEFAULT_PREFERENCES } from "@/lib/constants";
import { tabBarHidden } from "@/lib/utils/tabBar";
import { spacing, radius } from "@/theme";
import type {
  RouteSearchForm as FormData,
  Trip,
  RideRequest,
  Alert,
} from "@/types";

const PANEL_RADIUS = 32;

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLocale();
  const { config, isDriver, mode } = useAppMode();
  const user = useAuthStore((s) => s.user);
  const openSheet = useUIStore((s) => s.openSheet);
  const setTrip = useDetailStore((s) => s.setTrip);
  const setRequest = useDetailStore((s) => s.setRequest);
  const setAlertDetail = useDetailStore((s) => s.setAlert);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchParams, setSearchParams] = useState<{
    from?: string;
    to?: string;
    date?: string | null;
    departure_time?: string | null;
  }>({});
  const [searching, setSearching] = useState(false);
  const [lastForm, setLastForm] = useState<FormData | null>(null);

  const searchQueryKey = isDriver
    ? queryKeys.requests.search(
        searchParams.from ?? "",
        searchParams.to ?? "",
        searchParams.date,
        searchParams.departure_time,
      )
    : queryKeys.trips.search(
        searchParams.from ?? "",
        searchParams.to ?? "",
        searchParams.date,
        searchParams.departure_time,
      );

  const searchQueryFn = useCallback(async (): Promise<
    (Trip | RideRequest)[]
  > => {
    if (isDriver) {
      return fetchRequests(searchParams);
    }
    return fetchTrips(searchParams);
  }, [isDriver, searchParams]);

  const { data: items = [], isLoading: itemsLoading } = useQuery<
    (Trip | RideRequest)[]
  >({
    queryKey: searchQueryKey,
    queryFn: searchQueryFn,
    staleTime: QUERY_STALE_TIMES.rides,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: queryKeys.alerts.preview(),
    queryFn: fetchAlertPreview,
    staleTime: QUERY_STALE_TIMES.alerts,
  });

  const handleSearch = useCallback((form: FormData) => {
    setLastForm(form);
    setSearchParams({
      from: form.from,
      to: form.to,
      date: form.date,
      departure_time: form.departure_time,
    });
    setSearching(true);
  }, []);

  // When a deliberate search comes back empty, offer to post: a passenger
  // posts a ride request, a driver posts a ride. Everyone on the route is then
  // notified (server broadcast). Requires sign-in first.
  useEffect(() => {
    if (!searching || itemsLoading || !lastForm) return;
    setSearching(false);
    if (items.length > 0) return;

    const openPost = () =>
      openSheet("post", {
        role: mode,
        from: lastForm.from,
        to: lastForm.to,
        date: lastForm.date,
        departure_time: lastForm.departure_time,
        preferences: lastForm.preferences,
      });

    setSearchExpanded(false);
    if (!user) {
      openSheet("auth", { returnAction: openPost });
      return;
    }
    openPost();
  }, [searching, itemsLoading, items.length, lastForm, mode, user, openSheet]);

  // Explicit "post" CTA from the empty state. Reuses the last searched route;
  // if none exists yet, open the planner so the user enters one first.
  const handlePostRequest = useCallback(() => {
    const from = lastForm?.from ?? searchParams.from ?? "";
    const to = lastForm?.to ?? searchParams.to ?? "";
    if (from.trim().length < 2 || to.trim().length < 2) {
      setSearchExpanded(true);
      return;
    }
    const openPost = () =>
      openSheet("post", {
        role: mode,
        from,
        to,
        date: lastForm?.date ?? searchParams.date ?? null,
        departure_time:
          lastForm?.departure_time ?? searchParams.departure_time ?? null,
        preferences: lastForm?.preferences ?? DEFAULT_PREFERENCES,
      });
    if (!user) {
      openSheet("auth", { returnAction: openPost });
      return;
    }
    openPost();
  }, [lastForm, searchParams, mode, user, openSheet]);

  // Hide the floating tab bar while scrolling down the alerts feed, reveal it
  // when scrolling up or resting at the top.
  const lastScrollY = useSharedValue(0);
  const onPanelScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
      if (y <= 0) {
        tabBarHidden.value = withTiming(0, { duration: 200 });
      } else if (y - lastScrollY.value > 6) {
        tabBarHidden.value = withTiming(1, { duration: 200 });
      } else if (lastScrollY.value - y > 6) {
        tabBarHidden.value = withTiming(0, { duration: 200 });
      }
      lastScrollY.value = y;
    },
  });

  const collapseSearch = useCallback(() => {
    setSearchExpanded(false);
  }, []);

  const openAllAlerts = useCallback(() => {
    router.push("/(tabs)/alerts");
  }, [router]);

  // Swipe up on the panel handle: collapse the planner if it's open, otherwise
  // jump to the full alerts feed. Uses react-native-gesture-handler rather than
  // PanResponder — the handle is a Pressable, and RN's responder negotiation
  // lets the press win, so the old PanResponder never fired.
  const handleSwipeUp = useCallback(() => {
    if (searchExpanded) {
      collapseSearch();
    } else {
      openAllAlerts();
    }
  }, [searchExpanded, collapseSearch, openAllAlerts]);

  const panelSwipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-10, 10])
        .failOffsetX([-20, 20])
        .onEnd((event) => {
          if (event.translationY < -28 || event.velocityY < -600) {
            runOnJS(handleSwipeUp)();
          }
        }),
    [handleSwipeUp],
  );

  const handleItemPress = useCallback(
    (item: Trip | RideRequest) => {
      if (!user) {
        openSheet("auth", { returnAction: () => handleItemPress(item) });
        return;
      }
      // Open the full-page profile (not a cramped popup) so reviews and the
      // Message/Book actions are always reachable.
      if (isDriver) {
        setRequest(item as RideRequest);
      } else {
        setTrip(item as Trip);
      }
      router.push(`/ride/${item.id}` as any);
    },
    [user, isDriver, openSheet, setTrip, setRequest, router],
  );

  const handleAvatarPress = useCallback(
    (item: Trip | RideRequest) => {
      const person = (item as Trip).driver ?? (item as RideRequest).passenger;
      if (person) openSheet("person", { user: person });
    },
    [openSheet],
  );

  const handleAlertPress = useCallback(
    (alert: Alert) => {
      // Peek in a drawer; the drawer offers "See more" → full thread.
      setAlertDetail(alert);
      openSheet("alert_details", { alert });
    },
    [openSheet, setAlertDetail],
  );

  const renderCarouselItem = useCallback(
    ({ item }: { item: Trip | RideRequest }) => (
      <TripCard
        item={item}
        variant={isDriver ? "request" : "ride"}
        onPress={() => handleItemPress(item)}
        onAvatarPress={() => handleAvatarPress(item)}
      />
    ),
    [isDriver, handleItemPress, handleAvatarPress],
  );

  return (
    <AppBackground>
      {/*
       * HERO — no fixed height, wraps the search form.
       * When "More options" expands, this section grows naturally
       * and the drawer panel below gets pushed down.
       */}
      <View style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        <RouteSearchForm
          onSearch={handleSearch}
          loading={itemsLoading && searching}
          expanded={searchExpanded}
          onExpandedChange={setSearchExpanded}
        />
      </View>

      {/* ── Available rides / requests — on the background, right under search ── */}
      <View style={styles.availableSection}>
        <Text
          variant="titleMedium"
          color={colors.text}
          style={[styles.sectionTitle, styles.availableTitle]}
        >
          {t(config.homeCarouselTitle as any)}
        </Text>

        {itemsLoading ? (
          <LoadingState size="small" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={isDriver ? "hand-right-outline" : "car-outline"}
            illustration={
              isDriver ? undefined : <MovingCar width={260} height={114} />
            }
            message={t(config.emptyResults as any)}
            chip={!isDriver}
            actionLabel={t(config.postAction as any)}
            onAction={handlePostRequest}
          />
        ) : (
          <View style={styles.carouselWrap}>
            <FlashList
              data={items}
              renderItem={renderCarouselItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.lg }}
              ItemSeparatorComponent={() => (
                <View style={{ width: spacing.md }} />
              )}
            />
          </View>
        )}
      </View>

      {/* ── Notifications panel — takes all remaining vertical space ── */}
      <View
        style={[
          styles.panel,
          {
            backgroundColor: isDark
              ? colors.surface
              : colors.surfaceContainerLowest,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: isDark ? 0.35 : 0.08,
            shadowRadius: 20,
            elevation: 16,
          },
        ]}
      >
        {/* Drag handle + swipe affordance */}
        <GestureDetector gesture={panelSwipe}>
          <Pressable
            onPress={handleSwipeUp}
            style={styles.panelHandleArea}
            accessibilityRole="button"
            accessibilityLabel={
              searchExpanded
                ? t("swipe_close_search")
                : t("swipe_all_alerts")
            }
          >
            <View
              style={[styles.handle, { backgroundColor: colors.outlineVariant }]}
            />
            <View
              style={[
                styles.handleHintRow,
                { backgroundColor: colors.primaryContainer },
              ]}
            >
              <Icon name="chevron-up" size={15} color={colors.onPrimaryContainer} />
              <Text
                variant="labelMedium"
                color={colors.onPrimaryContainer}
                style={styles.handleHintText}
              >
                {searchExpanded ? t("swipe_close_search") : t("swipe_all_alerts")}
              </Text>
            </View>
          </Pressable>
        </GestureDetector>

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={onPanelScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.panelContent,
            { paddingBottom: FLOATING_TAB_BAR_SPACE },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Road alerts (vertical feed) ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                variant="titleMedium"
                color={colors.text}
                style={styles.sectionTitle}
              >
                {t("road_alerts")}
              </Text>
              <Pressable
                onPress={() => router.push("/(tabs)/alerts")}
                hitSlop={8}
              >
                <Text variant="labelMedium" color={colors.primary}>
                  {t("see_all")}
                </Text>
              </Pressable>
            </View>

            {alerts.length === 0 ? (
              <EmptyState
                icon="megaphone-outline"
                message={t("empty_alerts")}
              />
            ) : (
              <View style={styles.alertsList}>
                {alerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onPress={() => handleAlertPress(alert)}
                  />
                ))}
              </View>
            )}
          </View>
        </Animated.ScrollView>
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  /* ── Hero: content-sized, grows when advanced options expand ── */
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  /* ── Available rides: sits on the app background, above the panel ── */
  availableSection: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  availableTitle: {
    paddingHorizontal: spacing.lg,
  },

  /* ── Notifications panel: flex:1 so it fills whatever space remains ── */
  panel: {
    flex: 1,
    borderTopLeftRadius: PANEL_RADIUS,
    borderTopRightRadius: PANEL_RADIUS,
    overflow: "hidden",
    minHeight: 200, // ensures panel never completely disappears
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
  },
  panelHandleArea: {
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  handleHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  handleHintText: {
    fontWeight: "700",
  },
  panelContent: {
    paddingTop: spacing.md,
    gap: spacing.xl,
  },

  /* ── Sections ── */
  section: {
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontWeight: "700",
  },
  carouselWrap: {
    height: "auto",
  },
  alertsList: {
    gap: spacing.sm,
  },
});
