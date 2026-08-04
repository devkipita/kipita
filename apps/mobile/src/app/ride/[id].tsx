import React, { useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Linking,
  Alert as RNAlert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/core/Text";
import { Avatar } from "@/components/core/Avatar";
import { Icon, IconName } from "@/components/core/Icon";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useTheme, useLocale, useSafeBack } from "@/hooks";
import { useUIStore, useAuthStore, useDetailStore, useTripStore, useReviewStore } from "@/store";
import { spacing, radius, shadows } from "@/theme";
import {
  formatDate,
  formatTime,
  formatCurrency,
  formatPhone,
  formatRating,
} from "@/lib/formatters";
import { getReviewsForPerson } from "@/lib/mock/reviews";
import { haptic } from "@/lib/utils/haptics";
import type { Trip, RideRequest, Booking } from "@/types";

export default function RideProfileScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const router = useRouter();
  const goBack = useSafeBack();
  const insets = useSafeAreaInsets();
  const { id, view } = useLocalSearchParams<{ id: string; view?: string }>();
  // Profile mode reuses this page to show just the person + reviews (no ride
  // details). `id` is then a person id and the person is read from the store.
  const isProfileMode = view === "profile";

  const trip = useDetailStore((s) => (id ? s.trips[id] : undefined));
  const request = useDetailStore((s) => (id ? s.requests[id] : undefined));
  const storedPerson = useDetailStore((s) => (id ? s.people[id] : undefined));
  const user = useAuthStore((s) => s.user);
  const openSheet = useUIStore((s) => s.openSheet);
  const setActiveChat = useUIStore((s) => s.setActiveChat);
  const setTripBooking = useTripStore((s) => s.setBooking);

  const item = (trip ?? request) as Trip | RideRequest | undefined;
  const isRide = !!trip;
  const person = isProfileMode
    ? storedPerson
    : trip?.driver ?? request?.passenger;
  const userReviews = useReviewStore((s) => (person ? s.byPerson[person.id] : undefined));
  // User-written reviews first, then the seeded mock ones (deduped by id).
  const reviews = person
    ? [
        ...(userReviews ?? []),
        ...getReviewsForPerson(person.id).filter(
          (r) => !(userReviews ?? []).some((u) => u.id === r.id),
        ),
      ]
    : [];

  const handleMessage = useCallback(() => {
    if (!person) return;
    if (!user) {
      openSheet("auth", { returnAction: handleMessage });
      return;
    }
    const conversationId = `conv-${person.id}`;
    setActiveChat({
      conversationId,
      participantName: person.full_name,
      participantAvatar: person.avatar_url,
      participant: person,
    });
    router.push(`/chat/${conversationId}` as any);
  }, [person, user, openSheet, setActiveChat, router]);

  const handleBook = useCallback(() => {
    if (!user) {
      openSheet("auth", { returnAction: handleBook });
      return;
    }
    haptic.light();

    if (isRide && trip) {
      const nowIso = new Date().toISOString();
      const booking: Booking = {
        id: `temp-${trip.id}`,
        trip_id: trip.id,
        passenger_id: user.id,
        driver_id: trip.driver_id,
        seats_booked: 1,
        total_price: trip.price_per_seat,
        status: "pending_payment",
        payment_id: null,
        created_at: nowIso,
        updated_at: nowIso,
        trip,
        driver: trip.driver,
      };
      // Stash so the live-trip screen can pick it up after payment succeeds.
      setTripBooking(booking);
      openSheet("payment", { booking });
      return;
    }

    // Driver accepting a passenger request.
    RNAlert.alert(
      t("accept_request"),
      `${item?.from_location} → ${item?.to_location}`,
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("accept_request"), onPress: handleMessage },
      ],
    );
  }, [user, isRide, trip, item, t, openSheet, handleMessage, setTripBooking]);

  const handleCall = useCallback(() => {
    if (person?.phone) Linking.openURL(`tel:${person.phone}`);
  }, [person]);

  // Profile mode needs a person; ride mode needs the ride/request item.
  if (isProfileMode ? !person : !item) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Header onBack={() => goBack()} title="" />
        <EmptyState
          icon={isProfileMode ? "person-outline" : "car-outline"}
          message={isProfileMode ? t("empty_results") : t("no_rides_found")}
        />
      </View>
    );
  }

  const primaryLabel = isRide
    ? `${t("book")} · ${formatCurrency((item as Trip).price_per_seat)}`
    : t("accept_request");

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header
        onBack={() => goBack()}
        title={
          isProfileMode
            ? t("profile")
            : isRide
              ? t("ride_details")
              : t("request_details")
        }
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 128 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Route card — tonal surface, no borders. Timeline + info pills. */}
        {!isProfileMode && item && (
        <View
          style={[styles.card, styles.routeCard, { backgroundColor: colors.surfaceContainerLow }]}
        >
          <View style={styles.timeline}>
            <View style={styles.timelineRail}>
              <View style={[styles.node, { backgroundColor: colors.successContainer }]}>
                <View style={[styles.nodeDot, { backgroundColor: colors.success }]} />
              </View>
              <View style={[styles.railLine, { backgroundColor: colors.outlineVariant }]} />
              <Icon name="location" size={20} color={colors.error} />
            </View>
            <View style={styles.timelineLabels}>
              <View style={styles.timelineStop}>
                <Text variant="labelSmall" color={colors.textTertiary}>
                  {t("from")}
                </Text>
                <Text variant="titleMedium" style={styles.semibold} color={colors.text}>
                  {item.from_location}
                </Text>
              </View>
              <View style={styles.timelineStop}>
                <Text variant="labelSmall" color={colors.textTertiary}>
                  {t("to")}
                </Text>
                <Text variant="titleMedium" style={styles.semibold} color={colors.text}>
                  {item.to_location}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.chipsRow}>
            {isRide ? (
              <>
                {trip!.departure_date && (
                  <SoftPill icon="calendar-outline" text={formatDate(trip!.departure_date)} />
                )}
                {trip!.departure_time && (
                  <SoftPill icon="time-outline" text={formatTime(trip!.departure_time)} />
                )}
                <SoftPill
                  icon="cash-outline"
                  text={`${formatCurrency(trip!.price_per_seat)} / seat`}
                  tone="primary"
                />
              </>
            ) : (
              <>
                {request!.preferred_date && (
                  <SoftPill icon="calendar-outline" text={formatDate(request!.preferred_date)} />
                )}
                {request!.preferred_time && (
                  <SoftPill icon="time-outline" text={formatTime(request!.preferred_time)} />
                )}
                <SoftPill
                  icon="people-outline"
                  text={`${request!.seats_needed} seat${request!.seats_needed !== 1 ? "s" : ""}`}
                  tone="primary"
                />
              </>
            )}
          </View>
        </View>
        )}

        {/* Profile card — soft surface, tonal stat pills instead of inline text. */}
        {person && (
          <View
            style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}
          >
            <View style={styles.profileHead}>
              <Avatar uri={person.avatar_url} name={person.full_name} size={64} />
              <View style={styles.profileInfo}>
                <Text variant="titleLarge" style={styles.semibold} color={colors.text}>
                  {person.full_name}
                </Text>
                <View style={styles.statRow}>
                  <StatPill
                    icon={person.is_verified ? "checkmark-circle" : "alert-circle-outline"}
                    text={
                      person.is_verified
                        ? isProfileMode
                          ? t("verified")
                          : `${t("verified")} · ${isRide ? "driver" : "passenger"}`
                        : t("unverified")
                    }
                    tone={person.is_verified ? "success" : "warning"}
                  />
                </View>
                <View style={styles.statRow}>
                  <StatPill
                    icon="star"
                    text={formatRating(person.rating)}
                    tone="rating"
                  />
                  <StatPill icon="navigate-outline" text={`${person.total_trips} trips`} />
                </View>
              </View>
            </View>

            {person.phone && (
              <Pressable
                onPress={handleCall}
                style={[styles.callRow, { backgroundColor: colors.surfaceContainerHigh }]}
                accessibilityRole="button"
                accessibilityLabel={t("call")}
              >
                <View style={[styles.callIcon, { backgroundColor: colors.primaryContainer }]}>
                  <Icon name="call" size={16} color={colors.onPrimaryContainer} />
                </View>
                <Text variant="bodyMedium" color={colors.text} style={styles.flex}>
                  {formatPhone(person.phone)}
                </Text>
                <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
              </Pressable>
            )}
          </View>
        )}

        {/* Vehicle — tonal tile with a soft icon well, no border. */}
        {isRide && trip!.vehicle && (
          <View style={[styles.card, styles.vehicleCard, { backgroundColor: colors.surfaceContainerLow }]}>
            <View style={[styles.vehicleIcon, { backgroundColor: colors.secondaryContainer }]}>
              <Icon name="car-sport" size={22} color={colors.onSecondaryContainer} />
            </View>
            <View style={styles.flex}>
              <Text variant="labelSmall" color={colors.textTertiary}>
                {t("vehicle")}
              </Text>
              <Text variant="bodyMedium" color={colors.text} style={styles.semibold}>
                {trip!.vehicle.make} {trip!.vehicle.model} {trip!.vehicle.year}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {trip!.vehicle.color} · {trip!.vehicle.plate_number}
              </Text>
            </View>
          </View>
        )}

        {/* Preferences — soft tonal pills, no outlines. */}
        {!isProfileMode && item &&
          (item.preferences.luggage ||
          item.preferences.pets ||
          item.preferences.silent_ride ||
          item.preferences.music) && (
          <View style={styles.prefsRow}>
            {item.preferences.luggage && (
              <SoftPill icon="briefcase-outline" text={t("luggage")} tone="secondary" />
            )}
            {item.preferences.pets && (
              <SoftPill icon="paw-outline" text={t("pets")} tone="secondary" />
            )}
            {item.preferences.silent_ride && (
              <SoftPill icon="volume-mute-outline" text={t("silent_ride")} tone="secondary" />
            )}
            {item.preferences.music && (
              <SoftPill icon="musical-notes-outline" text={t("music")} tone="secondary" />
            )}
          </View>
        )}

        {/* Reviews — each its own soft tile (a grid), separated by gap not lines. */}
        {person && reviews.length > 0 && (
          <View style={styles.reviews}>
            <View style={styles.sectionHead}>
              <Text variant="titleMedium" style={styles.semibold} color={colors.text}>
                {t("ratings_reviews")}
              </Text>
              <View style={[styles.countPill, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Text variant="labelSmall" color={colors.textSecondary}>
                  {reviews.length}
                </Text>
              </View>
            </View>
            {reviews.map((review) => (
              <View
                key={review.id}
                style={[styles.reviewCard, { backgroundColor: colors.surfaceContainerLow }]}
              >
                <View style={styles.reviewHead}>
                  <Avatar uri={null} name={review.author} size={36} />
                  <View style={styles.flex}>
                    <Text variant="labelLarge" style={styles.semibold} color={colors.text}>
                      {review.author}
                    </Text>
                    <View style={styles.starsRow}>
                      <Text variant="bodySmall" color={colors.warning}>
                        {"★".repeat(review.stars)}
                        <Text color={colors.outlineVariant}>{"★".repeat(5 - review.stars)}</Text>
                      </Text>
                      <Text variant="caption" color={colors.textTertiary}>
                        {review.date}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text
                  variant="bodyMedium"
                  color={colors.textSecondary}
                  style={styles.reviewComment}
                >
                  {review.comment}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating action bar — pill buttons, tonal + filled, no border line. */}
      <View
        style={[
          styles.actionBar,
          {
            paddingBottom: insets.bottom + spacing.md,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Pressable
          onPress={handleMessage}
          style={({ pressed }) => [
            styles.actionBtn,
            isProfileMode ? styles.bookBtn : styles.messageBtn,
            isProfileMode && shadows.md,
            {
              backgroundColor: isProfileMode
                ? colors.primary
                : colors.secondaryContainer,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("message")}
        >
          <Icon
            name="chatbubble-ellipses"
            size={20}
            color={isProfileMode ? colors.onPrimary : colors.onSecondaryContainer}
          />
          <Text
            variant="labelLarge"
            style={styles.semibold}
            color={isProfileMode ? colors.onPrimary : colors.onSecondaryContainer}
          >
            {t("message")}
          </Text>
        </Pressable>

        {!isProfileMode && (
          <Pressable
            onPress={handleBook}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.bookBtn,
              shadows.md,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
          >
            <Icon
              name={isRide ? "checkmark-circle" : "hand-right"}
              size={20}
              color={colors.onPrimary}
            />
            <Text variant="labelLarge" style={styles.semibold} color={colors.onPrimary}>
              {primaryLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable
        onPress={onBack}
        hitSlop={10}
        style={[styles.backBtn, { backgroundColor: colors.surfaceContainerHigh }]}
      >
        <Icon name="arrow-back" size={22} color={colors.text} />
      </Pressable>
      <Text variant="titleMedium" color={colors.text} style={styles.semibold}>
        {title}
      </Text>
      <View style={styles.backBtn} />
    </View>
  );
}

type PillTone = "neutral" | "primary" | "secondary" | "success" | "warning" | "rating";

function toneColors(colors: ReturnType<typeof useTheme>["colors"], tone: PillTone) {
  switch (tone) {
    case "primary":
      return { bg: colors.primaryContainer, fg: colors.onPrimaryContainer };
    case "secondary":
      return { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer };
    case "success":
      return { bg: colors.successContainer, fg: colors.onSuccessContainer };
    case "warning":
      return { bg: colors.warningContainer, fg: colors.onWarningContainer };
    case "rating":
      return { bg: colors.surfaceContainerHigh, fg: colors.warning };
    default:
      return { bg: colors.surfaceContainerHigh, fg: colors.onSurfaceVariant };
  }
}

function SoftPill({
  icon,
  text,
  tone = "neutral",
}: {
  icon?: IconName;
  text: string;
  tone?: PillTone;
}) {
  const { colors } = useTheme();
  const { bg, fg } = toneColors(colors, tone);
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon && <Icon name={icon} size={14} color={fg} />}
      <Text variant="labelMedium" color={fg}>
        {text}
      </Text>
    </View>
  );
}

function StatPill({
  icon,
  text,
  tone = "neutral",
}: {
  icon: IconName;
  text: string;
  tone?: PillTone;
}) {
  const { colors } = useTheme();
  const { bg, fg } = toneColors(colors, tone);
  return (
    <View style={[styles.statPill, { backgroundColor: bg }]}>
      <Icon name={icon} size={13} color={fg} />
      <Text variant="labelMedium" color={fg}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  semibold: { fontWeight: "700" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },

  content: { gap: spacing.md, paddingTop: spacing.sm, paddingHorizontal: spacing.lg },

  // Shared soft card — tonal fill, generous radius, no borders.
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
  },

  routeCard: { gap: spacing.lg },
  timeline: { flexDirection: "row", gap: spacing.md },
  timelineRail: { width: 20, alignItems: "center", paddingTop: 2 },
  node: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeDot: { width: 8, height: 8, borderRadius: radius.full },
  railLine: { width: 2, flex: 1, minHeight: 24, marginVertical: 4, borderRadius: 1 },
  timelineLabels: { flex: 1, justifyContent: "space-between", gap: spacing.lg },
  timelineStop: { gap: 2 },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },

  profileHead: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  profileInfo: { flex: 1, gap: spacing.sm },
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.full,
  },

  callRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radius.lg,
  },
  callIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },

  vehicleCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },

  prefsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },

  reviews: { gap: spacing.sm, marginTop: spacing.xs },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  countPill: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewCard: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  reviewHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  starsRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 },
  reviewComment: { lineHeight: 21 },

  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 56,
    borderRadius: radius.full,
  },
  messageBtn: { flex: 1 },
  bookBtn: { flex: 1.5 },
});
