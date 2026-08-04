import React, { memo, useCallback } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Text } from "../core/Text";
import { Avatar } from "../core/Avatar";
import { Icon } from "../core/Icon";
import { Chip } from "../core/Chip";
import { Divider } from "../core/Divider";
import { useTheme, useLocale } from "@/hooks";
import { spacing, radius } from "@/theme";
import {
  formatDate,
  formatTime,
  formatCurrency,
  formatPhone,
  formatRating,
} from "@/lib/formatters";
import { useUIStore } from "@/store";
import type { Trip, RideRequest } from "@/types";

// ── Mock reviews ──
const ALL_REVIEWS = [
  {
    id: "r1",
    author: "Grace Wanjiku",
    stars: 5,
    date: "2 Dec 2024",
    comment:
      "Very punctual and friendly. Car was clean and comfortable. Highly recommend!",
  },
  {
    id: "r2",
    author: "Kevin Otieno",
    stars: 5,
    date: "18 Nov 2024",
    comment:
      "Great driver, played good music and drove safely. Will book again.",
  },
  {
    id: "r3",
    author: "Mercy Njeri",
    stars: 4,
    date: "5 Nov 2024",
    comment:
      "Arrived on time, comfortable journey. Slight delay at Mtito Andei but overall good.",
  },
  {
    id: "r4",
    author: "Brian Kamau",
    stars: 5,
    date: "22 Oct 2024",
    comment: "Excellent service, very accommodating with luggage.",
  },
  {
    id: "r5",
    author: "Aisha Odhiambo",
    stars: 4,
    date: "10 Oct 2024",
    comment: "Safe driver, good conversation. Would use again.",
  },
];

function getReviewsForPerson(personId: string) {
  const offset = personId.charCodeAt(personId.length - 1) % ALL_REVIEWS.length;
  const result = [];
  for (let i = 0; i < 3; i++) {
    result.push(ALL_REVIEWS[(offset + i) % ALL_REVIEWS.length]);
  }
  return result;
}

interface RideDetailsSheetProps {
  item: Trip | RideRequest;
  variant: "ride" | "request";
}

export const RideDetailsSheet = memo(function RideDetailsSheet({
  item,
  variant,
}: RideDetailsSheetProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const isRide = variant === "ride";
  const ride = isRide ? (item as Trip) : undefined;
  const request = !isRide ? (item as RideRequest) : undefined;
  const person = ride?.driver ?? request?.passenger;

  const setActiveChat = useUIStore((s) => s.setActiveChat);
  const openSheet = useUIStore((s) => s.openSheet);

  const handleMessage = useCallback(() => {
    if (!person) return;
    const conversationId = `conv-${person.id}`;
    setActiveChat({
      conversationId,
      participantName: person.full_name,
      participantAvatar: person.avatar_url,
    });
    openSheet("chat", { conversationId });
  }, [person, setActiveChat, openSheet]);

  const handleCall = useCallback(() => {
    if (!person?.phone) return;
    Linking.openURL(`tel:${person.phone}`);
  }, [person]);

  const reviews = person ? getReviewsForPerson(person.id) : [];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── Scrollable content ── */}
      <BottomSheetScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* A) Route banner */}
        <View style={styles.routeBanner}>
          <View style={styles.routePoint}>
            <Icon name="ellipse" size={12} color={colors.success} />
            <Text variant="titleLarge" style={styles.routeLabel}>
              {item.from_location}
            </Text>
          </View>
          <View style={styles.routeDashedRow}>
            <View style={[styles.dottedLine, { borderColor: colors.border }]} />
          </View>
          <View style={styles.routePoint}>
            <Icon name="location" size={14} color={colors.error} />
            <Text variant="titleLarge" style={styles.routeLabel}>
              {item.to_location}
            </Text>
          </View>

          {/* Chips row below route */}
          <View style={styles.routeChipsRow}>
            {ride && (
              <>
                {ride.departure_date && (
                  <View
                    style={[
                      styles.infoChip,
                      {
                        backgroundColor: colors.surfaceVariant ?? colors.card,
                        borderColor: colors.borderLight,
                      },
                    ]}
                  >
                    <Icon
                      name="calendar-outline"
                      size={13}
                      color={colors.textSecondary}
                    />
                    <Text variant="labelSmall" color={colors.textSecondary}>
                      {formatDate(ride.departure_date)}
                    </Text>
                  </View>
                )}
                {ride.departure_time && (
                  <View
                    style={[
                      styles.infoChip,
                      {
                        backgroundColor: colors.surfaceVariant ?? colors.card,
                        borderColor: colors.borderLight,
                      },
                    ]}
                  >
                    <Icon
                      name="time-outline"
                      size={13}
                      color={colors.textSecondary}
                    />
                    <Text variant="labelSmall" color={colors.textSecondary}>
                      {formatTime(ride.departure_time)}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.infoChip,
                    {
                      backgroundColor: colors.primaryContainer,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Icon name="cash-outline" size={13} color={colors.primary} />
                  <Text variant="labelSmall" color={colors.primary}>
                    {formatCurrency(ride.price_per_seat)} / seat
                  </Text>
                </View>
              </>
            )}
            {request && (
              <>
                {request.preferred_date && (
                  <View
                    style={[
                      styles.infoChip,
                      {
                        backgroundColor: colors.surfaceVariant ?? colors.card,
                        borderColor: colors.borderLight,
                      },
                    ]}
                  >
                    <Icon
                      name="calendar-outline"
                      size={13}
                      color={colors.textSecondary}
                    />
                    <Text variant="labelSmall" color={colors.textSecondary}>
                      {formatDate(request.preferred_date)}
                    </Text>
                  </View>
                )}
                {request.preferred_time && (
                  <View
                    style={[
                      styles.infoChip,
                      {
                        backgroundColor: colors.surfaceVariant ?? colors.card,
                        borderColor: colors.borderLight,
                      },
                    ]}
                  >
                    <Icon
                      name="time-outline"
                      size={13}
                      color={colors.textSecondary}
                    />
                    <Text variant="labelSmall" color={colors.textSecondary}>
                      {formatTime(request.preferred_time)}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.infoChip,
                    {
                      backgroundColor: colors.surfaceVariant ?? colors.card,
                      borderColor: colors.borderLight,
                    },
                  ]}
                >
                  <Icon
                    name="people-outline"
                    size={13}
                    color={colors.textSecondary}
                  />
                  <Text variant="labelSmall" color={colors.textSecondary}>
                    {request.seats_needed} seat
                    {request.seats_needed !== 1 ? "s" : ""}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        <Divider />

        {/* B) Driver/Passenger profile card */}
        {person && (
          <View
            style={[
              styles.profileCard,
              { backgroundColor: colors.surfaceVariant ?? colors.card },
            ]}
          >
            <Avatar uri={person.avatar_url} name={person.full_name} size={64} />
            <View style={styles.profileInfo}>
              <Text variant="headlineMedium" style={styles.profileName}>
                {person.full_name}
              </Text>
              {/* Verified badge */}
              <View style={styles.verifiedRow}>
                {person.is_verified ? (
                  <>
                    <Icon
                      name="checkmark-circle"
                      size={16}
                      color={colors.success}
                    />
                    <Text variant="labelMedium" color={colors.success}>
                      Verified {isRide ? "driver" : "passenger"}
                    </Text>
                  </>
                ) : (
                  <>
                    <Icon
                      name="checkmark-circle-outline"
                      size={16}
                      color={colors.textTertiary}
                    />
                    <Text variant="labelMedium" color={colors.textTertiary}>
                      Unverified
                    </Text>
                  </>
                )}
              </View>
              {/* Rating + trips */}
              <Text variant="bodyMedium" color={colors.textSecondary}>
                {"★"} {formatRating(person.rating)} · {person.total_trips} trips
              </Text>
              {/* Phone */}
              {person.phone && (
                <View style={styles.contactRow}>
                  <Icon
                    name="call-outline"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {formatPhone(person.phone)}
                  </Text>
                </View>
              )}
              {/* Email */}
              {person.email && (
                <View style={styles.contactRow}>
                  <Icon
                    name="mail-outline"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {person.email}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* C) Vehicle card (ride only) */}
        {isRide && ride?.vehicle && (
          <View
            style={[
              styles.vehicleCard,
              {
                backgroundColor: colors.surfaceVariant ?? colors.card,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Icon name="car-outline" size={20} color={colors.textSecondary} />
            <Text variant="bodyMedium" color={colors.text}>
              {ride.vehicle.make} {ride.vehicle.model} {ride.vehicle.year} ·{" "}
              {ride.vehicle.color} · {ride.vehicle.plate_number}
            </Text>
          </View>
        )}

        {/* D) Preferences row */}
        {(item.preferences.luggage ||
          item.preferences.pets ||
          item.preferences.silent_ride ||
          item.preferences.music) && (
          <View style={styles.prefsRow}>
            {item.preferences.luggage && (
              <Chip label={t("luggage")} icon="briefcase-outline" selected />
            )}
            {item.preferences.pets && (
              <Chip label={t("pets")} icon="paw-outline" selected />
            )}
            {item.preferences.silent_ride && (
              <Chip
                label={t("silent_ride")}
                icon="volume-mute-outline"
                selected
              />
            )}
            {item.preferences.music && (
              <Chip label={t("music")} icon="musical-notes-outline" selected />
            )}
          </View>
        )}

        <Divider />

        {/* E) Reviews section */}
        {person && reviews.length > 0 && (
          <View style={styles.reviewsSection}>
            <Text variant="titleMedium" style={styles.reviewsTitle}>
              Ratings &amp; Reviews
            </Text>
            {reviews.map((review) => (
              <View
                key={review.id}
                style={[styles.reviewItem, { borderColor: colors.borderLight }]}
              >
                <View style={styles.reviewHeader}>
                  <Avatar uri={null} name={review.author} size={32} />
                  <View style={styles.reviewMeta}>
                    <Text variant="labelMedium" style={styles.reviewAuthor}>
                      {review.author}
                    </Text>
                    <View style={styles.reviewStarsRow}>
                      <Text variant="bodySmall" color={colors.warning}>
                        {"★".repeat(review.stars)}
                        {"☆".repeat(5 - review.stars)}
                      </Text>
                      <Text variant="caption" color={colors.textTertiary}>
                        {review.date}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text
                  variant="bodySmall"
                  color={colors.textSecondary}
                  style={styles.reviewComment}
                >
                  {review.comment}
                </Text>
              </View>
            ))}
          </View>
        )}
      </BottomSheetScrollView>

      {/* ── Fixed bottom action bar ── */}
      <View
        style={[
          styles.actionBar,
          { borderTopColor: colors.divider, backgroundColor: colors.surface },
        ]}
      >
        <Pressable
          onPress={handleCall}
          disabled={!person?.phone}
          style={[
            styles.actionBtn,
            {
              backgroundColor: person?.phone
                ? colors.primaryContainer
                : (colors.surfaceVariant ?? colors.card),
              borderColor: person?.phone ? colors.primary : colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Call"
        >
          <Icon
            name="call-outline"
            size={20}
            color={person?.phone ? colors.primary : colors.textTertiary}
          />
          <Text
            variant="labelLarge"
            color={person?.phone ? colors.primary : colors.textTertiary}
          >
            Call
          </Text>
        </Pressable>

        <Pressable
          onPress={handleMessage}
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Message"
        >
          <Icon name="chatbubble-outline" size={20} color="#fff" />
          <Text variant="labelLarge" color="#fff">
            Message
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },

  /* Route banner */
  routeBanner: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.xs,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  routeLabel: {
    flex: 1,
  },
  routeDashedRow: {
    paddingLeft: 5,
    height: 20,
    justifyContent: "center",
  },
  dottedLine: {
    height: 20,
    width: 0,
    borderLeftWidth: 2,
    borderStyle: "dashed",
    marginLeft: 1,
  },
  routeChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },

  /* Profile card */
  profileCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.lg,
    marginHorizontal: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  profileInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  profileName: {
    fontWeight: "700",
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  /* Vehicle card */
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },

  /* Preferences */
  prefsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },

  /* Reviews */
  reviewsSection: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  reviewsTitle: {
    fontWeight: "700",
  },
  reviewItem: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  reviewMeta: {
    flex: 1,
    gap: 2,
  },
  reviewAuthor: {
    fontWeight: "600",
  },
  reviewStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  reviewComment: {
    lineHeight: 20,
  },

  /* Action bar */
  actionBar: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.xl,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "transparent",
  },
});
