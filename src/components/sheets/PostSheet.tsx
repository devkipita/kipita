import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { Button } from "../core/Button";
import { TextInput } from "../forms/TextInput";
import { DatePicker } from "../forms/DatePicker";
import { TimePicker } from "../forms/TimePicker";
import { Toggle } from "../forms/Toggle";
import { useTheme, useLocale } from "@/hooks";
import { useAuthStore, useUIStore } from "@/store";
import { createTrip, createRideRequest, queryKeys } from "@/lib/api";
import { MAX_SEATS, MIN_SEATS } from "@/lib/constants";
import { spacing, radius } from "@/theme";
import type { AppMode, RidePreferences } from "@/types";

/** Kenyan shilling — shown after the amount, e.g. "1,500 KSh". */
const CURRENCY_LABEL = "KSh";

interface PostSheetProps {
  role: AppMode;
  from: string;
  to: string;
  date: string | null;
  departure_time: string | null;
  preferences: RidePreferences;
}

/** Common fares travellers pick most — one tap instead of typing. */
const PRICE_PRESETS = [900, 1500, 3000];

/** Parse a date + time string pair into a Date, or null. */
function toDate(date: string | null, time: string | null): Date | null {
  if (!date) return null;
  const dt = new Date(`${date}T${time ?? "00:00"}`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/**
 * Post-on-empty flow. Opened when a route search finds nobody: a passenger
 * requests a ride, a driver offers one. On success the DB broadcasts a
 * notification to everyone on the route (migration 008), which also fans out
 * as a push (007). Kept light — route, when, seats (+ fare for drivers).
 */
export function PostSheet({
  role,
  from,
  to,
  date,
  departure_time,
  preferences,
}: PostSheetProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const closeSheet = useUIStore((s) => s.closeSheet);
  const queryClient = useQueryClient();

  const isDriver = role === "driver";

  // Only treat the searched time as a real schedule if it's actually in the
  // future — a stale draft (e.g. 02:30 from a past search) should default to
  // "leaving now", never a nonsensical past time.
  const seededFuture = useMemo(() => {
    const dt = toDate(date, departure_time);
    return dt ? dt.getTime() > Date.now() : false;
  }, [date, departure_time]);

  const [when, setWhen] = useState<"now" | "later">(
    seededFuture ? "later" : "now",
  );
  const [pickDate, setPickDate] = useState<string | null>(
    seededFuture ? date : null,
  );
  const [pickTime, setPickTime] = useState<string | null>(
    seededFuture ? departure_time : null,
  );
  const [seats, setSeats] = useState(isDriver ? 3 : 1);
  const [price, setPrice] = useState("");
  const [prefs, setPrefs] = useState<RidePreferences>(preferences);
  const [showComfort, setShowComfort] = useState(false);
  const [posted, setPosted] = useState(false);

  const togglePref = useCallback(
    (key: keyof RidePreferences) => (val: boolean) =>
      setPrefs((prev) => ({ ...prev, [key]: val })),
    [],
  );

  const priceNumber = Number(price);
  const scheduleReady = when === "now" || Boolean(pickDate);
  const canPost =
    scheduleReady && (!isDriver || (priceNumber > 0 && !Number.isNaN(priceNumber)));

  const chooseNow = useCallback(() => setWhen("now"), []);
  const chooseLater = useCallback(() => {
    setWhen("later");
    // Seed a concrete, editable slot: the next quarter-hour from now.
    const quarter = 1000 * 60 * 15;
    const slot = new Date(Math.ceil(Date.now() / quarter) * quarter);
    setPickDate((d) => d ?? format(slot, "yyyy-MM-dd"));
    setPickTime((tm) => tm ?? format(slot, "HH:mm"));
  }, []);

  const whenSummary = useMemo(() => {
    if (when === "now") return t("leaving_now");
    const dt = toDate(pickDate, pickTime);
    if (!dt) return t("leaving_now");
    return pickTime ? format(dt, "EEE d MMM · HH:mm") : format(dt, "EEE d MMM");
  }, [when, pickDate, pickTime, t]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const now = new Date();
      const useDate = when === "later" ? pickDate! : format(now, "yyyy-MM-dd");
      const useTime =
        when === "later" ? pickTime ?? "00:00" : format(now, "HH:mm");

      if (isDriver) {
        return createTrip({
          driver_id: user.id,
          from_location: from.trim(),
          to_location: to.trim(),
          departure_date: useDate,
          departure_time: useTime,
          seats_total: seats,
          price_per_seat: priceNumber,
          preferences: prefs,
        });
      }
      return createRideRequest({
        passenger_id: user.id,
        from_location: from.trim(),
        to_location: to.trim(),
        preferred_date: when === "later" ? pickDate : null,
        preferred_time: when === "later" ? pickTime : null,
        seats_needed: seats,
        preferences: prefs,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all(),
      });
      setPosted(true);
      setTimeout(closeSheet, 1600);
    },
  });

  const stepSeats = useCallback(
    (delta: number) =>
      setSeats((s) => Math.min(MAX_SEATS, Math.max(MIN_SEATS, s + delta))),
    [],
  );

  // ── Success state ──
  if (posted) {
    return (
      <View style={[styles.container, styles.successBox]}>
        <View style={[styles.successIcon, { backgroundColor: colors.primary }]}>
          <Icon name="checkmark" size={34} color={colors.onPrimary} />
        </View>
        <Text variant="titleLarge" style={styles.bold} align="center">
          {isDriver ? t("ride_posted") : t("request_posted")}
        </Text>
        <Text variant="bodyMedium" color={colors.textSecondary} align="center">
          {t("post_broadcast_note")}
        </Text>
      </View>
    );
  }

  return (
    <BottomSheetScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
        {/* ── Friendly, benefit-led header ── */}
        <View style={styles.header}>
          <View
            style={[styles.headerIcon, { backgroundColor: colors.surfaceVariant }]}
          >
            <Icon
              name={isDriver ? "car-sport" : "hand-left"}
              size={22}
              color={colors.primary}
            />
          </View>
          <View
            style={[
              styles.eyebrowPill,
              { backgroundColor: colors.tertiaryContainer },
            ]}
          >
            <Icon
              name="alert-circle-outline"
              size={13}
              color={colors.onTertiaryContainer}
            />
            <Text
              variant="labelSmall"
              color={colors.onTertiaryContainer}
              style={styles.eyebrow}
            >
              {isDriver ? t("no_requests_available") : t("no_rides_available")}
            </Text>
          </View>
          <Text variant="titleLarge" style={styles.bold}>
            {isDriver ? t("offer_your_ride") : t("post_your_trip")}
          </Text>
          <Text variant="bodyMedium" color={colors.textSecondary}>
            {isDriver ? t("post_ride_prompt") : t("post_request_prompt")}
          </Text>
        </View>

        {/* ── Route card (what they just searched) ── */}
        <View style={[styles.routeCard, { backgroundColor: colors.surfaceVariant }]}>
          <View style={styles.routeLine}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text variant="titleSmall" style={styles.routeText} numberOfLines={1}>
              {from}
            </Text>
          </View>
          <View style={styles.routeConnector}>
            <View style={[styles.connectorLine, { borderColor: colors.border }]} />
          </View>
          <View style={styles.routeLine}>
            <View style={[styles.dot, { backgroundColor: colors.error }]} />
            <Text variant="titleSmall" style={styles.routeText} numberOfLines={1}>
              {to}
            </Text>
          </View>
        </View>

        {/* ── When ── */}
        <View style={styles.field}>
          <View style={styles.fieldHeadRow}>
            <Text variant="titleSmall">{t("when")}</Text>
            <Text variant="titleSmall" color={colors.primary} style={styles.bold}>
              {whenSummary}
            </Text>
          </View>
          <View
            style={[
              styles.segment,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          >
            {(["now", "later"] as const).map((option) => {
              const active = when === option;
              return (
                <Pressable
                  key={option}
                  onPress={option === "now" ? chooseNow : chooseLater}
                  style={[
                    styles.segmentBtn,
                    active && { backgroundColor: colors.primaryContainer },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Icon
                    name={option === "now" ? "flash" : "calendar-outline"}
                    size={15}
                    color={active ? colors.onPrimaryContainer : colors.textSecondary}
                  />
                  <Text
                    variant="labelLarge"
                    color={active ? colors.onPrimaryContainer : colors.textSecondary}
                  >
                    {option === "now" ? t("leaving_now") : t("pick_a_time")}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {when === "later" && (
            <View style={styles.dateTimeRow}>
              <View style={styles.flex}>
                <DatePicker
                  value={pickDate}
                  onChange={setPickDate}
                  placeholder={t("date")}
                  minDate={new Date()}
                />
              </View>
              <View style={styles.flex}>
                <TimePicker
                  value={pickTime}
                  onChange={setPickTime}
                  placeholder={t("departure_time")}
                />
              </View>
            </View>
          )}
        </View>

        {/* ── Seats ── */}
        <View style={styles.stepperRow}>
          <Text variant="titleSmall">
            {isDriver ? t("seats_offered") : t("seats_needed")}
          </Text>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => stepSeats(-1)}
              disabled={seats <= MIN_SEATS}
              style={[
                styles.stepBtn,
                { backgroundColor: colors.surfaceVariant },
                seats <= MIN_SEATS && styles.stepDisabled,
              ]}
              hitSlop={6}
            >
              <Icon name="remove" size={20} color={colors.text} />
            </Pressable>
            <Text variant="titleMedium" style={styles.seatCount}>
              {seats}
            </Text>
            <Pressable
              onPress={() => stepSeats(1)}
              disabled={seats >= MAX_SEATS}
              style={[
                styles.stepBtn,
                { backgroundColor: colors.surfaceVariant },
                seats >= MAX_SEATS && styles.stepDisabled,
              ]}
              hitSlop={6}
            >
              <Icon name="add" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>

        {/* ── Fare (driver only): quick presets above a custom input ── */}
        {isDriver && (
          <View style={styles.field}>
            <Text variant="titleSmall">{t("price_label")}</Text>
            <View style={styles.presetRow}>
              {PRICE_PRESETS.map((preset) => {
                const selected = priceNumber === preset;
                return (
                  <Pressable
                    key={preset}
                    onPress={() => setPrice(String(preset))}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: selected
                          ? colors.primaryContainer
                          : colors.surfaceContainerHigh,
                        borderColor: selected
                          ? colors.primaryContainer
                          : colors.borderLight,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      variant="labelLarge"
                      color={selected ? colors.onPrimaryContainer : colors.text}
                    >
                      {preset.toLocaleString()} {CURRENCY_LABEL}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              icon="cash-outline"
              keyboardType="number-pad"
              value={price}
              onChangeText={setPrice}
              placeholder={`${t("custom_amount")} (${CURRENCY_LABEL})`}
            />
          </View>
        )}

        {/* ── Choose your comfort — collapsed by default to stay tidy ── */}
        <View style={styles.field}>
          <Pressable
            onPress={() => setShowComfort((v) => !v)}
            style={[
              styles.comfortHead,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: showComfort ? colors.primary : colors.borderLight,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ expanded: showComfort }}
          >
            <View style={styles.comfortHeadLeft}>
              <Icon name="options-outline" size={18} color={colors.primary} />
              <Text variant="titleSmall">{t("choose_comfort")}</Text>
            </View>
            <Icon
              name={showComfort ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>

          {showComfort && (
            <View
              style={[
                styles.prefsCard,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
            >
              <Toggle
                label={t("luggage")}
                icon="briefcase-outline"
                value={prefs.luggage}
                onToggle={togglePref("luggage")}
              />
              <Toggle
                label={t("pets")}
                icon="paw-outline"
                value={prefs.pets}
                onToggle={togglePref("pets")}
              />
              <Toggle
                label={t("silent_ride")}
                icon="volume-mute-outline"
                value={prefs.silent_ride}
                onToggle={togglePref("silent_ride")}
              />
              <Toggle
                label={t("music")}
                icon="musical-notes-outline"
                value={prefs.music}
                onToggle={togglePref("music")}
              />
            </View>
          )}
        </View>
        <View style={styles.submitWrap}>
          <Button
            label={isDriver ? t("offer_a_ride") : t("request_a_ride")}
            onPress={() => mutation.mutate()}
            variant="filled"
            size="lg"
            fullWidth
            disabled={!canPost}
            loading={mutation.isPending}
            icon="megaphone-outline"
          />
        </View>
    </BottomSheetScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
    // Room so the CTA clears the bottom of the sheet when scrolled.
    paddingBottom: spacing["4xl"],
  },
  submitWrap: { marginTop: spacing.xs },
  bold: { fontWeight: "700" },
  flex: { flex: 1 },
  header: { gap: spacing.xs, alignItems: "flex-start" },
  eyebrowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  eyebrow: { fontWeight: "700", letterSpacing: 0.3 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  routeCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  routeLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  routeText: { flex: 1 },
  routeConnector: { paddingLeft: 3 },
  connectorLine: {
    height: 12,
    borderLeftWidth: 1,
    borderStyle: "dashed",
  },
  field: { gap: spacing.sm },
  fieldHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  segment: {
    flexDirection: "row",
    borderRadius: radius.full,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: radius.full,
  },
  dateTimeRow: { flexDirection: "row", gap: spacing.md },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDisabled: { opacity: 0.4 },
  seatCount: { minWidth: 24, textAlign: "center" },
  comfortHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  comfortHeadLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  prefsCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  presetChip: {
    paddingHorizontal: spacing.lg,
    height: 38,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  successBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing["3xl"],
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
