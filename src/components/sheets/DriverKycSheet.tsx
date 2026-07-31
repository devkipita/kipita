import React, { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { Button } from "../core/Button";
import { TextInput } from "../forms/TextInput";
import { DatePicker } from "../forms/DatePicker";
import { useTheme, useLocale } from "@/hooks";
import { useAuthStore, useUIStore } from "@/store";
import { submitDriverKyc } from "@/lib/api/driver";
import { spacing, radius } from "@/theme";

interface DriverKycSheetProps {
  onSubmitted?: () => void;
}

/**
 * Driver onboarding / KYC. A passenger can ride with no verification, but to
 * offer rides they must submit identity details here (national ID + driver's
 * licence). Submission sets KYC to `pending`; approval is reviewed separately.
 */
export function DriverKycSheet({ onSubmitted }: DriverKycSheetProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const closeSheet = useUIStore((s) => s.closeSheet);
  const queryClient = useQueryClient();

  const [nationalId, setNationalId] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState<string | null>(null);

  const canSubmit =
    nationalId.trim().length >= 4 && licenseNumber.trim().length >= 4;

  const mutation = useMutation({
    mutationFn: () =>
      submitDriverKyc({
        userId: user!.id,
        national_id: nationalId,
        license_number: licenseNumber,
        license_expiry: licenseExpiry,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driverProfile", user?.id] });
      closeSheet();
      onSubmitted?.();
    },
  });

  const handleSubmit = useCallback(() => {
    if (!user || !canSubmit) return;
    mutation.mutate();
  }, [user, canSubmit, mutation]);

  return (
    <View style={styles.container}>
      <BottomSheetScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.badge, { backgroundColor: colors.surfaceVariant }]}>
          <Icon name="shield-checkmark-outline" size={24} color={colors.primary} />
        </View>
        <Text variant="titleLarge" style={styles.bold}>
          {t("become_a_driver")}
        </Text>
        <Text variant="bodyMedium" color={colors.textSecondary}>
          {t("driver_kyc_intro")}
        </Text>

        <TextInput
          label={t("national_id")}
          icon="card-outline"
          keyboardType="number-pad"
          value={nationalId}
          onChangeText={setNationalId}
          placeholder="12345678"
        />
        <TextInput
          label={t("license_number")}
          icon="document-text-outline"
          autoCapitalize="characters"
          value={licenseNumber}
          onChangeText={setLicenseNumber}
          placeholder="DL-XXXXXXX"
        />
        <DatePicker
          label={t("license_expiry")}
          value={licenseExpiry}
          onChange={setLicenseExpiry}
          placeholder={t("optional")}
        />

        <View style={[styles.note, { backgroundColor: colors.surfaceVariant }]}>
          <Icon name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.flex}>
            {t("driver_kyc_review_note")}
          </Text>
        </View>
      </BottomSheetScrollView>

      <View style={styles.footer}>
        <Button
          label={t("submit_for_review")}
          onPress={handleSubmit}
          variant="filled"
          size="lg"
          fullWidth
          disabled={!canSubmit}
          loading={mutation.isPending}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md },
  bold: { fontWeight: "700" },
  flex: { flex: 1 },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  note: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  footer: { padding: spacing.lg, paddingTop: spacing.sm },
});
