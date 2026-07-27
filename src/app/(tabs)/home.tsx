import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  PanResponder,
} from "react-native";
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
import { useTheme, useLocale, useAppMode } from "@/hooks";
import { useUIStore, useAuthStore, useDetailStore } from "@/store";
import {
  queryKeys,
  fetchTrips,
  fetchRequests,
  fetchAlertPreview,
} from "@/lib/api";
import { QUERY_STALE_TIMES } from "@/lib/constants";
import { spacing } from "@/theme";
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
  const { config, isDriver } = useAppMode();
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
    setSearchParams({
      from: form.from,
      to: form.to,
      date: form.date,
      departure_time: form.departure_time,
    });
    setSearching(true);
  }, []);

  const collapseSearch = useCallback(() => {
    setSearchExpanded(false);
  }, []);

  const openAllAlerts = useCallback(() => {
    router.push("/(tabs)/alerts");
  }, [router]);

  const panelPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
          gestureState.dy < -8,
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dy < -28) {
            // Swipe up: collapse the search planner if open, otherwise jump
            // straight into the full-screen alerts feed (gamified pull-up).
            if (searchExpanded) {
              collapseSearch();
            } else {
              openAllAlerts();
            }
          }
        },
      }),
    [collapseSearch, searchExpanded, openAllAlerts],
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
            message={t(config.emptyResults as any)}
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
        {/* Drag handle */}
        <Pressable
          onPress={searchExpanded ? collapseSearch : openAllAlerts}
          style={styles.panelHandleArea}
          accessibilityRole="button"
          accessibilityLabel={
            searchExpanded ? "Collapse search" : "Open all road alerts"
          }
          {...panelPanResponder.panHandlers}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          <View style={styles.handleHintRow}>
            <Icon
              name={searchExpanded ? "chevron-up" : "megaphone-outline"}
              size={13}
              color={colors.textTertiary}
            />
            <Text variant="caption" color={colors.textTertiary}>
              {searchExpanded ? "Swipe up to collapse" : t("pull_up_alerts")}
            </Text>
          </View>
        </Pressable>

        <ScrollView
          showsVerticalScrollIndicator={false}
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
        </ScrollView>
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
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
  },
  panelHandleArea: {
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  handleHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  panelContent: {
    paddingTop: spacing.md,
    gap: spacing.xl,
  },

  /* ── Sections ── */
  section: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
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
    gap: spacing.md,
  },
});
