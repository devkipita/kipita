import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Linking,
  Platform,
  Animated,
  Easing,
  Alert as RNAlert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Text } from "@/components/core/Text";
import { Avatar } from "@/components/core/Avatar";
import { Icon } from "@/components/core/Icon";
import { Divider } from "@/components/core/Divider";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusFlow } from "@/components/shared/StatusFlow";
import { useTheme, useLocale, useAppMode, useSafeBack } from "@/hooks";
import { useAuthStore, useUIStore, useTripStore, useReviewStore } from "@/store";
import { updateBookingStatus, fetchCurrentBookings, releaseEscrow, requestRefund, queryKeys } from "@/lib/api";
import { spacing, radius, typography } from "@/theme";
import { statusTone, STATUS_ICON } from "@/theme/statusTone";
import {
  formatDate,
  formatTime,
  formatCurrency,
  formatRating,
} from "@/lib/formatters";
import { haptic } from "@/lib/utils/haptics";
import type { IconName } from "@/components/core/Icon";
import type { BookingStatus } from "@/types";
import type { TranslationKey } from "@/lib/i18n/en";

/** Which stepper node is active for a given status (0=Booked, 1=On the way, 2=Arrived). */
const STEP_INDEX: Record<BookingStatus, number> = {
  pending_payment: 0,
  confirmed: 0,
  in_progress: 1,
  completed: 2,
  cancelled: 0,
};

const STEPS: { key: TranslationKey; icon: IconName }[] = [
  { key: "step_confirmed", icon: "checkmark-circle" },
  { key: "step_ongoing", icon: "navigate" },
  { key: "step_done", icon: "flag" },
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "27 Jul 2026" — matches the review date format used elsewhere. */
function formatReviewDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function TripScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { isDriver } = useAppMode();
  const router = useRouter();
  const goBack = useSafeBack();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const user = useAuthStore((s) => s.user);
  const openSheet = useUIStore((s) => s.openSheet);
  const setActiveChat = useUIStore((s) => s.setActiveChat);
  const booking = useTripStore((s) => (id ? s.bookings[id] : undefined));
  const override = useTripStore((s) => (id ? s.statusOverride[id] : undefined));
  const setStatus = useTripStore((s) => s.setStatus);
  const setTripBooking = useTripStore((s) => s.setBooking);
  const addReview = useReviewStore((s) => s.addReview);
  const reviewsByPerson = useReviewStore((s) => s.byPerson);

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  // Cold-load fallback: opened via deep-link / refresh with an empty store.
  const { data: coldBookings } = useQuery({
    queryKey: queryKeys.bookings.current(user?.id ?? ""),
    queryFn: () => fetchCurrentBookings(user!.id),
    enabled: !!user && !booking,
  });
  useEffect(() => {
    if (booking || !coldBookings) return;
    const found = coldBookings.find((b) => b.id === id);
    if (found) setTripBooking(found);
  }, [booking, coldBookings, id, setTripBooking]);

  const status: BookingStatus = override ?? booking?.status ?? "confirmed";
  const ride = booking?.trip;
  const person = isDriver ? booking?.passenger : booking?.driver;
  const alreadyReviewed =
    !!person &&
    (reviewsByPerson[person.id] ?? []).some((r) => r.id === `booking-${id}`);

  const transition = useCallback(
    (next: BookingStatus) => {
      if (!id) return;
      haptic.light();
      setStatus(id, next);
      void updateBookingStatus(id, next).catch(() => {});
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all() });
    },
    [id, setStatus, queryClient],
  );

  const handleMessage = useCallback(() => {
    if (!person) return;
    const conversationId = `conv-${person.id}`;
    setActiveChat({
      conversationId,
      participantName: person.full_name,
      participantAvatar: person.avatar_url,
      participant: person,
    });
    router.push(`/chat/${conversationId}` as any);
  }, [person, setActiveChat, router]);

  const handleCall = useCallback(() => {
    if (person?.phone) Linking.openURL(`tel:${person.phone}`);
  }, [person]);

  /**
   * Driver ends the ride → complete the trip and release the escrowed fare to
   * the driver (minus the Kipita fee). Best-effort against the backend; the
   * status override keeps the UI moving even for mock/temp bookings.
   */
  const endRideAndRelease = useCallback(() => {
    if (!booking) return;
    RNAlert.alert(t("end_ride_release_title"), t("end_ride_release_body"), [
      { text: t("not_now"), style: "cancel" },
      {
        text: t("end_and_pay"),
        onPress: () => {
          transition("completed");
          if (!booking.id.startsWith("temp-")) {
            void releaseEscrow(booking.id, booking.driver_id)
              .then((r) => {
                if (r.released) haptic.success();
              })
              .catch(() => {});
          }
        },
      },
    ]);
  }, [booking, t, transition]);

  const confirmCancel = useCallback(() => {
    RNAlert.alert(t("confirm_cancel_trip"), undefined, [
      { text: t("not_now"), style: "cancel" },
      {
        text: t("cancel_trip"),
        style: "destructive",
        onPress: () => {
          transition("cancelled");
          // Passenger cancelling a paid ride opens an admin-verified refund of
          // the escrowed fare (no money moves until an admin approves).
          if (!isDriver && booking && !booking.id.startsWith("temp-")) {
            void requestRefund(booking.id)
              .then((r) => {
                if (r.requested) {
                  haptic.success();
                  RNAlert.alert(t("refund_requested_title"), t("refund_requested_body"));
                }
              })
              .catch(() => {});
          }
        },
      },
    ]);
  }, [t, transition, isDriver, booking]);

  const submitRating = useCallback(() => {
    if (rating === 0 || !person || !id) return;
    haptic.success();
    addReview(person.id, {
      id: `booking-${id}`,
      author: user?.full_name ?? "You",
      stars: rating,
      date: formatReviewDate(new Date()),
      comment: reviewText.trim() || "Rated this trip.",
    });
    RNAlert.alert(t("review_thanks"));
    goBack();
  }, [rating, reviewText, person, id, user, addReview, t, goBack]);

  if (!booking) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Header onBack={() => goBack()} title={t("your_trip")} />
        <EmptyState icon="car-outline" message={t("empty_trips")} />
      </View>
    );
  }

  const tone = statusTone(colors, status);
  const stepIdx = STEP_INDEX[status];
  const isCancelled = status === "cancelled";
  const isCompleted = status === "completed";
  const isLive = status === "in_progress";

  const bannerText: string =
    status === "pending_payment"
      ? t("awaiting_payment")
      : status === "confirmed"
        ? isDriver
          ? t("passengers_boarding")
          : t("getting_ready")
        : status === "in_progress"
          ? t("on_trip")
          : status === "completed"
            ? t("trip_complete")
            : t("trip_cancelled_status");

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header onBack={() => goBack()} title={t("your_trip")} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 130 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero status card — background retints per trip state. */}
        <View style={[styles.hero, { backgroundColor: tone.container }]}>
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: tone.onContainer + "22" }]}>
              <Icon name={STATUS_ICON[status]} size={22} color={tone.onContainer} />
            </View>
            <View style={styles.flex}>
              <Text variant="titleSmall" color={tone.onContainer} style={styles.bold}>
                {bannerText}
              </Text>
              {ride && (
                <Text variant="caption" color={tone.onContainer} style={styles.heroSub}>
                  {ride.from_location} → {ride.to_location}
                </Text>
              )}
            </View>
            {isLive && <LiveDot color={tone.accent} />}
          </View>

          {/* Progress tracker — animated flowing-dot legs tinted to the state
             accent; the current leg streams toward the next stage. */}
          {!isCancelled && (
            <View style={styles.flowWrap}>
              <StatusFlow
                steps={STEPS.map((s) => ({
                  key: s.key,
                  label: t(s.key),
                  icon: s.icon,
                }))}
                currentIndex={stepIdx}
                state={isCompleted ? "complete" : "active"}
                accent={tone.accent}
                onAccent={tone.onAccent}
                track={tone.onContainer + "33"}
                labelColor={tone.onContainer}
              />
            </View>
          )}
        </View>

        {/* Route card */}
        {ride && (
          <View
            style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}
          >
            <View style={styles.routePoint}>
              <View style={styles.routeIconCol}>
                <View style={[styles.routeNode, { backgroundColor: colors.successContainer }]}>
                  <View style={[styles.routeNodeDot, { backgroundColor: colors.success }]} />
                </View>
                <View style={[styles.routeConnector, { backgroundColor: colors.outlineVariant }]} />
                <Icon name="location" size={18} color={colors.error} />
              </View>
              <View style={styles.routeText}>
                <Text variant="caption" color={colors.textTertiary}>
                  {t("pickup")}
                </Text>
                <Text variant="titleSmall" color={colors.text} style={styles.bold}>
                  {ride.from_location}
                </Text>
                <View style={styles.routeGap} />
                <Text variant="caption" color={colors.textTertiary}>
                  {t("dropoff")}
                </Text>
                <Text variant="titleSmall" color={colors.text} style={styles.bold}>
                  {ride.to_location}
                </Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <MetaPill icon="calendar-outline" text={formatDate(ride.departure_date)} />
              <MetaPill icon="time-outline" text={formatTime(ride.departure_time)} />
              <MetaPill
                icon="people-outline"
                text={`${booking.seats_booked} seat${booking.seats_booked > 1 ? "s" : ""}`}
              />
            </View>
          </View>
        )}

        {/* Person card */}
        {person && (
          <View
            style={[styles.personCard, { backgroundColor: colors.surfaceContainerLow }]}
          >
            <Avatar uri={person.avatar_url} name={person.full_name} size={52} />
            <View style={styles.flex}>
              <Text variant="titleSmall" color={colors.text} style={styles.bold}>
                {person.full_name}
              </Text>
              <View style={styles.inlineRow}>
                <Icon name="star" size={13} color={colors.warning} />
                <Text variant="caption" color={colors.textSecondary}>
                  {formatRating(person.rating)} · {isDriver ? t("passenger") : t("driver")}
                </Text>
              </View>
            </View>
            {person.phone && (
              <Pressable
                onPress={handleCall}
                style={[styles.roundBtn, { backgroundColor: colors.secondaryContainer }]}
                accessibilityLabel={t("call")}
              >
                <Icon name="call" size={18} color={colors.onSecondaryContainer} />
              </Pressable>
            )}
            <Pressable
              onPress={handleMessage}
              style={[styles.roundBtn, { backgroundColor: colors.primary }]}
              accessibilityLabel={t("message")}
            >
              <Icon name="chatbubble-ellipses" size={18} color={colors.onPrimary} />
            </Pressable>
          </View>
        )}

        {/* Vehicle — tonal tile with a soft icon well, no border. */}
        {ride?.vehicle && (
          <View
            style={[styles.vehicle, { backgroundColor: colors.surfaceContainerLow }]}
          >
            <View style={[styles.vehicleIcon, { backgroundColor: colors.secondaryContainer }]}>
              <Icon name="car-sport" size={20} color={colors.onSecondaryContainer} />
            </View>
            <Text variant="bodyMedium" color={colors.text} style={styles.flex}>
              {ride.vehicle.make} {ride.vehicle.model} · {ride.vehicle.color} ·{" "}
              {ride.vehicle.plate_number}
            </Text>
          </View>
        )}

        {/* Completion: fare summary + rating */}
        {isCompleted && (
          <View
            style={[styles.summary, { backgroundColor: colors.surfaceContainerLow }]}
          >
            <View style={styles.summaryRow}>
              <Text variant="titleSmall" color={colors.text} style={styles.bold}>
                {t("trip_summary")}
              </Text>
              <Icon name="checkmark-done-circle" size={22} color={colors.success} />
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium" color={colors.textSecondary}>
                {t("fare")}
              </Text>
              <Text variant="titleMedium" color={colors.primary} style={styles.bold}>
                {formatCurrency(booking.total_price)}
              </Text>
            </View>
            <Divider />

            {alreadyReviewed ? (
              // Already left a review for this trip — show a confirmation.
              <View style={styles.reviewedRow}>
                <Icon name="checkmark-circle" size={20} color={colors.success} />
                <Text variant="bodyMedium" color={colors.textSecondary} style={styles.flex}>
                  {t("review_posted")}
                </Text>
              </View>
            ) : (
              <>
                <Text variant="bodyMedium" color={colors.text} align="center">
                  {t("rate_prompt")}
                </Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => {
                        haptic.light();
                        setRating(n);
                      }}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`${n} stars`}
                    >
                      <Icon
                        name={n <= rating ? "star" : "star-outline"}
                        size={34}
                        color={colors.warning}
                      />
                    </Pressable>
                  ))}
                </View>

                {/* Written review — appears once a rating is picked */}
                {rating > 0 && (
                  <View style={styles.reviewField}>
                    <Text variant="labelMedium" color={colors.textSecondary}>
                      {t("write_review")}
                    </Text>
                    <TextInput
                      value={reviewText}
                      onChangeText={setReviewText}
                      placeholder={t("review_placeholder")}
                      placeholderTextColor={colors.placeholder}
                      multiline
                      maxLength={400}
                      style={[
                        styles.reviewInput,
                        typography.input,
                        {
                          color: colors.text,
                          backgroundColor: colors.surfaceContainerHigh,
                        },
                        Platform.OS === "web"
                          ? ({ outlineStyle: "none" } as any)
                          : null,
                      ]}
                    />
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Help & safety — previous (completed/cancelled) trips only */}
        {(isCompleted || isCancelled) && (
          <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}>
            <Text variant="titleSmall" color={colors.text} style={styles.bold}>
              {t("help_safety")}
            </Text>
            <HelpRow
              icon="search-outline"
              title={t("find_lost_item")}
              subtitle={t("find_lost_item_body")}
              onPress={() =>
                openSheet("report", { type: "lost_item", booking, reportedUser: person })
              }
            />
            <Divider />
            <HelpRow
              icon="shield-checkmark-outline"
              title={t("report_safety_issue")}
              subtitle={t("report_safety_body")}
              onPress={() =>
                openSheet("report", { type: "safety", booking, reportedUser: person })
              }
            />
            {person && (
              <>
                <Divider />
                <HelpRow
                  icon="flag-outline"
                  title={`${t("report")} ${person.full_name}`}
                  subtitle={isDriver ? t("report_passenger_body") : t("report_driver_body")}
                  onPress={() =>
                    openSheet("report", { type: "user", booking, reportedUser: person })
                  }
                />
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom action bar — pill buttons, no border line. */}
      <View
        style={[
          styles.actionBar,
          {
            paddingBottom: insets.bottom + spacing.md,
            backgroundColor: colors.surface,
          },
        ]}
      >
        {isCancelled ? (
          <PrimaryBtn
            label={t("back")}
            icon="arrow-back"
            onPress={() => goBack()}
          />
        ) : isCompleted ? (
          alreadyReviewed ? (
            <PrimaryBtn label={t("done")} icon="checkmark" onPress={() => goBack()} />
          ) : (
            <>
              <SecondaryBtn label={t("not_now")} onPress={() => goBack()} />
              <PrimaryBtn
                label={t("submit_review")}
                icon="checkmark"
                disabled={rating === 0}
                onPress={submitRating}
              />
            </>
          )
        ) : status === "pending_payment" ? (
          isDriver ? (
            <PrimaryBtn label={t("awaiting_payment")} icon="time-outline" disabled onPress={() => {}} />
          ) : (
            <PrimaryBtn
              label={t("pay_now")}
              icon="lock-closed-outline"
              onPress={() => openSheet("payment", { booking })}
            />
          )
        ) : status === "confirmed" ? (
          <>
            <SecondaryBtn label={t("cancel_trip")} onPress={confirmCancel} danger />
            {isDriver ? (
              <PrimaryBtn
                label={t("start_trip")}
                icon="play"
                onPress={() => transition("in_progress")}
              />
            ) : (
              <PrimaryBtn label={t("message")} icon="chatbubble-ellipses-outline" onPress={handleMessage} />
            )}
          </>
        ) : (
          /* in_progress */
          isDriver ? (
            <PrimaryBtn
              label={t("end_trip")}
              icon="flag"
              onPress={endRideAndRelease}
            />
          ) : (
            <PrimaryBtn label={t("message")} icon="chatbubble-ellipses-outline" onPress={handleMessage} />
          )
        )}
      </View>
    </View>
  );
}

// ── Small building blocks ──
function Header({ onBack, title }: { onBack: () => void; title: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable
        onPress={onBack}
        hitSlop={10}
        style={[styles.headerBtn, { backgroundColor: colors.surfaceContainerHigh }]}
      >
        <Icon name="arrow-back" size={22} color={colors.text} />
      </Pressable>
      <Text variant="titleMedium" color={colors.text} style={styles.bold}>
        {title}
      </Text>
      <View style={styles.headerBtn} />
    </View>
  );
}

/** Pulsing "live" indicator for the in-progress state. */
function LiveDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  const ringScale = scale.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const ringOpacity = scale.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={styles.liveDot}>
      <Animated.View
        style={[
          styles.liveRing,
          { backgroundColor: color, transform: [{ scale: ringScale }], opacity: ringOpacity },
        ]}
      />
      <View style={[styles.liveCore, { backgroundColor: color }]} />
    </View>
  );
}

function MetaPill({ icon, text }: { icon: IconName; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.metaPill, { backgroundColor: colors.surfaceContainerHigh }]}>
      <Icon name={icon} size={13} color={colors.textSecondary} />
      <Text variant="labelSmall" color={colors.textSecondary}>
        {text}
      </Text>
    </View>
  );
}

/** A tappable Help & safety row — icon well, title/subtitle, chevron. */
function HelpRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.helpRow,
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.helpIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
        <Icon name={icon} size={20} color={colors.onSurfaceVariant} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyMedium" color={colors.text} style={styles.bold}>
          {title}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {subtitle}
        </Text>
      </View>
      <Icon name="chevron-forward" size={18} color={colors.outline} />
    </Pressable>
  );
}

function PrimaryBtn({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionBtn,
        styles.actionPrimary,
        { backgroundColor: colors.primary, opacity: disabled ? 0.5 : pressed ? 0.9 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={20} color={colors.onPrimary} />
      <Text variant="labelLarge" color={colors.onPrimary} style={styles.bold}>
        {label}
      </Text>
    </Pressable>
  );
}

function SecondaryBtn({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  const bg = danger ? colors.errorContainer : colors.secondaryContainer;
  const fg = danger ? colors.onErrorContainer : colors.onSecondaryContainer;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        styles.actionSecondary,
        { backgroundColor: bg, opacity: pressed ? 0.85 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text variant="labelLarge" color={fg} style={styles.bold}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  bold: { fontWeight: "700" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: spacing.lg, gap: spacing.md },

  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  heroSub: { marginTop: 2, opacity: 0.85 },

  liveDot: { width: 12, height: 12, alignItems: "center", justifyContent: "center" },
  liveRing: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  liveCore: { width: 10, height: 10, borderRadius: 5 },

  flowWrap: {
    paddingHorizontal: spacing.xs,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
  },
  step: { alignItems: "center", gap: spacing.xs, width: 76 },
  stepDot: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    transform: [{ scale: 1.12 }],
  },
  stepIdle: { opacity: 0.7 },
  stepLine: { flex: 1, height: 3, borderRadius: 2, marginBottom: 20 },

  card: { borderRadius: radius.xl, padding: spacing.lg, gap: spacing.lg },
  routePoint: { flexDirection: "row", gap: spacing.md },
  routeIconCol: { alignItems: "center", paddingTop: 2, width: 20 },
  routeNode: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  routeNodeDot: { width: 8, height: 8, borderRadius: radius.full },
  routeConnector: { width: 2, flex: 1, marginVertical: 4, minHeight: 28, borderRadius: 1 },
  routeText: { flex: 1, gap: 2 },
  routeGap: { height: spacing.sm },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },

  personCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
  },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },

  vehicle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  vehicleIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },

  summary: { borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stars: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  reviewField: { gap: spacing.xs },
  reviewInput: {
    minHeight: 88,
    borderRadius: radius.md,
    padding: spacing.md,
    textAlignVertical: "top",
  },
  reviewedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

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
  actionPrimary: { flex: 1.5 },
  actionSecondary: { flex: 1 },

  helpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  helpIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
