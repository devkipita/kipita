import React, { useState, useCallback, useMemo } from "react";
import { View, TextInput, Pressable, StyleSheet, Platform } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useMutation } from "@tanstack/react-query";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { Button } from "../core/Button";
import { useTheme, useLocale } from "@/hooks";
import { useAuthStore, useUIStore } from "@/store";
import { createReport, type ReportType } from "@/lib/api/reports";
import { haptic } from "@/lib/utils/haptics";
import { spacing, radius, typography } from "@/theme";
import type { IconName } from "../core/Icon";
import type { TranslationKey } from "@/lib/i18n/en";
import type { Booking, User } from "@/types";

export interface ReportSheetPayload {
  type: ReportType;
  reportedUser?: User | null;
  booking?: Booking | null;
}

interface ReasonOption {
  value: string;
  key: TranslationKey;
}

/** Reason chips per report flow. Some values are shared across flows. */
const REASONS: Record<ReportType, ReasonOption[]> = {
  lost_item: [
    { value: "phone", key: "reason_phone" },
    { value: "wallet", key: "reason_wallet" },
    { value: "keys", key: "reason_keys" },
    { value: "bag", key: "reason_bag" },
    { value: "documents", key: "reason_documents" },
    { value: "other", key: "reason_other" },
  ],
  safety: [
    { value: "unsafe_driving", key: "reason_unsafe_driving" },
    { value: "harassment", key: "reason_harassment" },
    { value: "vehicle_condition", key: "reason_vehicle_condition" },
    { value: "wrong_route", key: "reason_wrong_route" },
    { value: "other", key: "reason_other" },
  ],
  user: [
    { value: "bad_behaviour", key: "reason_bad_behaviour" },
    { value: "no_show", key: "reason_no_show" },
    { value: "harassment", key: "reason_harassment" },
    { value: "unsafe", key: "reason_unsafe" },
    { value: "fake_profile", key: "reason_fake_profile" },
    { value: "other", key: "reason_other" },
  ],
};

const HEADER: Record<ReportType, { icon: IconName; title: TranslationKey; body: TranslationKey }> = {
  lost_item: {
    icon: "search-outline",
    title: "find_lost_item",
    body: "find_lost_item_body",
  },
  safety: {
    icon: "shield-checkmark-outline",
    title: "report_safety_issue",
    body: "report_safety_body",
  },
  user: {
    icon: "flag-outline",
    title: "report_person_title",
    body: "report_person_body",
  },
};

export function ReportSheet({ payload }: { payload: ReportSheetPayload }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const closeSheet = useUIStore((s) => s.closeSheet);

  const reasons = REASONS[payload.type];
  const header = HEADER[payload.type];
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [done, setDone] = useState(false);

  const reportedName =
    payload.type === "user" ? payload.reportedUser?.full_name : undefined;

  const mutation = useMutation({
    mutationFn: () =>
      createReport({
        reporterId: user!.id,
        type: payload.type,
        reportedUserId: payload.reportedUser?.id ?? null,
        bookingId: payload.booking?.id ?? null,
        reason: reason || null,
        description: description,
        contact: payload.type === "lost_item" ? contact : null,
      }),
    onSuccess: () => {
      haptic.success();
      setDone(true);
    },
  });

  const canSubmit = useMemo(
    () => !!user && !!reason && description.trim().length >= 4 && !mutation.isPending,
    [user, reason, description, mutation.isPending],
  );

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    mutation.mutate();
  }, [canSubmit, mutation]);

  // Success confirmation state.
  if (done) {
    return (
      <View style={styles.success}>
        <View style={[styles.successIcon, { backgroundColor: colors.successContainer }]}>
          <Icon name="checkmark-circle" size={40} color={colors.onSuccessContainer} />
        </View>
        <Text variant="titleLarge" color={colors.text} align="center" style={styles.bold}>
          {t("report_submitted")}
        </Text>
        <Text variant="bodyMedium" color={colors.textSecondary} align="center">
          {t("report_submitted_body")}
        </Text>
        <Button label={t("done")} onPress={closeSheet} size="lg" fullWidth />
      </View>
    );
  }

  return (
    <BottomSheetScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={[styles.headerIcon, { backgroundColor: colors.secondaryContainer }]}>
          <Icon name={header.icon} size={22} color={colors.onSecondaryContainer} />
        </View>
        <View style={styles.flex}>
          <Text variant="titleLarge" color={colors.text} style={styles.bold}>
            {reportedName
              ? `${t("report")} ${reportedName}`
              : t(header.title)}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {t(header.body)}
          </Text>
        </View>
      </View>

      {/* Trip context, when opened from a trip */}
      {payload.booking?.trip && (
        <View style={[styles.context, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Icon name="car-outline" size={16} color={colors.textSecondary} />
          <Text variant="labelMedium" color={colors.textSecondary} numberOfLines={1} style={styles.flex}>
            {payload.booking.trip.from_location} → {payload.booking.trip.to_location}
          </Text>
        </View>
      )}

      {/* Reason chips */}
      <Text variant="labelMedium" color={colors.textSecondary}>
        {payload.type === "lost_item" ? t("what_did_you_lose") : t("reason")}
      </Text>
      <View style={styles.chipRow}>
        {reasons.map((r) => {
          const selected = reason === r.value;
          return (
            <Pressable
              key={r.value}
              onPress={() => {
                haptic.selection();
                setReason(r.value);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: selected
                    ? colors.secondaryContainer
                    : colors.surfaceContainerHigh,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              {selected && (
                <Icon name="checkmark" size={14} color={colors.onSecondaryContainer} />
              )}
              <Text
                variant="labelMedium"
                color={selected ? colors.onSecondaryContainer : colors.textSecondary}
              >
                {t(r.key)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Description */}
      <Text variant="labelMedium" color={colors.textSecondary}>
        {t("describe_details")}
      </Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder={t("report_placeholder")}
        placeholderTextColor={colors.placeholder}
        multiline
        maxLength={600}
        style={[
          styles.input,
          typography.bodyMedium,
          { color: colors.text, backgroundColor: colors.surfaceContainerHigh },
          Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null,
        ]}
      />

      {/* Callback contact — lost item only */}
      {payload.type === "lost_item" && (
        <>
          <Text variant="labelMedium" color={colors.textSecondary}>
            {t("callback_contact")}
          </Text>
          <TextInput
            value={contact}
            onChangeText={setContact}
            placeholder={t("callback_contact_placeholder")}
            placeholderTextColor={colors.placeholder}
            keyboardType="phone-pad"
            style={[
              styles.contactInput,
              typography.bodyMedium,
              { color: colors.text, backgroundColor: colors.surfaceContainerHigh },
              Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null,
            ]}
          />
        </>
      )}

      {mutation.isError && (
        <Text variant="caption" color={colors.error}>
          {t("report_error")}
        </Text>
      )}

      <Button
        label={t("submit_report")}
        onPress={handleSubmit}
        size="lg"
        fullWidth
        loading={mutation.isPending}
        disabled={!canSubmit}
      />
    </BottomSheetScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, gap: spacing.md },
  flex: { flex: 1 },
  bold: { fontWeight: "700" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  context: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  input: {
    minHeight: 110,
    borderRadius: radius.md,
    padding: spacing.md,
    textAlignVertical: "top",
  },
  contactInput: {
    height: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  success: {
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: "center",
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
});
