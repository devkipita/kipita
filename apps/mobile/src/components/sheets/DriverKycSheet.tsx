import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { useMutation } from "@tanstack/react-query";
import { Text } from "../core/Text";
import { Icon, IconName } from "../core/Icon";
import { Button } from "../core/Button";
import { TextInput } from "../forms/TextInput";
import { useTheme, useLocale, useRefreshDriverKyc, useDriverKyc } from "@/hooks";
import { useUIStore } from "@/store";
import {
  submitDriverKyc,
  uploadKycPhoto,
  isDocumentNumberValid,
  normaliseDocumentNumber,
  KYC_DOCUMENT_RULES,
  type KycDocumentType,
  type KycPhotoKind,
} from "@/lib/api/driver";
import { resolveAppUserId } from "@/lib/api/session";
import { pickAndCompressImage } from "@/lib/utils/media";
import { haptic } from "@/lib/utils/haptics";
import { spacing, radius } from "@/theme";

interface DriverKycSheetProps {
  onSubmitted?: () => void;
}

type StepId = "document" | "selfie" | "vehicle";

const STEPS: StepId[] = ["document", "selfie", "vehicle"];

const DOCUMENT_TYPES: { id: KycDocumentType; icon: IconName; key: string }[] = [
  { id: "national_id", icon: "card-outline", key: "kyc_doc_national_id" },
  {
    id: "driving_licence",
    icon: "document-text-outline",
    key: "kyc_doc_driving_licence",
  },
  { id: "passport", icon: "airplane-outline", key: "kyc_doc_passport" },
];

const STEP_META: Record<
  StepId,
  { kind: KycPhotoKind; icon: IconName; title: string; photo: string; help: string }
> = {
  document: {
    kind: "document",
    icon: "card-outline",
    title: "kyc_title_document",
    photo: "kyc_photo_document",
    help: "kyc_photo_document_help",
  },
  selfie: {
    kind: "selfie",
    icon: "person-outline",
    title: "kyc_title_selfie",
    photo: "kyc_photo_selfie",
    help: "kyc_photo_selfie_help",
  },
  vehicle: {
    kind: "vehicle",
    icon: "car-sport-outline",
    title: "kyc_title_vehicle",
    photo: "kyc_photo_vehicle",
    help: "kyc_photo_vehicle_help",
  },
};

/**
 * Driver verification.
 *
 * A passenger rides with no checks; offering rides needs an identity document,
 * a face to match it to and the car itself. Each photo lands in the private
 * `kyc-documents` bucket under the driver's own folder, and the submit goes
 * through `submit_driver_kyc` — `authenticated` cannot write the approval
 * columns directly (migrations 035 and 047).
 *
 * Three steps, one at a time, each one closing with a tick: a driver abandons a
 * wall of fields, but finishes a short run they can see the end of.
 */
export function DriverKycSheet({ onSubmitted }: DriverKycSheetProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { height, width } = useWindowDimensions();
  const closeSheet = useUIStore((s) => s.closeSheet);
  const refreshKyc = useRefreshDriverKyc();
  const { isRejected } = useDriverKyc();

  // Small phones get shorter photo tiles so the CTA stays above the fold.
  const compact = height < 720 || width < 360;
  const tileHeight = compact ? 136 : 178;

  const [stepIndex, setStepIndex] = useState(0);
  const [docType, setDocType] = useState<KycDocumentType>("national_id");
  const [docNumber, setDocNumber] = useState("");
  const [numberTouched, setNumberTouched] = useState(false);
  // `photos` holds the storage paths the server verifies; `previews` holds the
  // local file URIs, which are the only thing that can actually be rendered —
  // the bucket is private.
  const [photos, setPhotos] = useState<Partial<Record<StepId, string>>>({});
  const [previews, setPreviews] = useState<Partial<Record<StepId, string>>>({});
  const [uploading, setUploading] = useState<StepId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const step = STEPS[stepIndex];
  const meta = STEP_META[step];
  const rule = KYC_DOCUMENT_RULES[docType];

  const numberValid = isDocumentNumberValid(docType, docNumber);
  const stepComplete =
    step === "document"
      ? numberValid && Boolean(photos.document)
      : Boolean(photos[step]);

  const doneCount = useMemo(
    () =>
      STEPS.filter((id) =>
        id === "document" ? numberValid && photos.document : photos[id],
      ).length,
    [numberValid, photos],
  );

  // ── The progress rail: the only thing on screen that says "nearly there" ──
  const progress = useSharedValue(0);
  const pop = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(doneCount / STEPS.length, { duration: 420 });
  }, [doneCount, progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.max(progress.value * 100, 4)}%`,
  }));
  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  const celebrate = useCallback(() => {
    haptic.success();
    pop.value = withSequence(
      withTiming(1.12, { duration: 140 }),
      withSpring(1, { damping: 9 }),
    );
  }, [pop]);

  const handlePickPhoto = useCallback(async () => {
    setError(null);
    const picked = await pickAndCompressImage();
    if (!picked) return;

    const was = Boolean(photos[step]);
    setUploading(step);
    try {
      const userId = await resolveAppUserId();
      const path = await uploadKycPhoto(picked.uri, userId, meta.kind);
      setPhotos((prev) => ({ ...prev, [step]: path }));
      setPreviews((prev) => ({ ...prev, [step]: picked.uri }));
      if (!was) celebrate();
    } catch {
      setError(t("kyc_upload_failed"));
      haptic.error();
    } finally {
      setUploading(null);
    }
  }, [step, meta.kind, photos, celebrate, t]);

  const mutation = useMutation({
    mutationFn: () =>
      submitDriverKyc({
        document_type: docType,
        document_number: normaliseDocumentNumber(docNumber),
        document_photo: photos.document!,
        selfie_photo: photos.selfie!,
        vehicle_photo: photos.vehicle!,
      }),
    onSuccess: () => {
      haptic.success();
      refreshKyc();
      setSubmitted(true);
    },
    onError: (e: Error) => {
      haptic.error();
      setError(e.message);
    },
  });

  const goBack = useCallback(() => {
    setError(null);
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setError(null);
    if (stepIndex < STEPS.length - 1) {
      haptic.light();
      setStepIndex((i) => i + 1);
      return;
    }
    mutation.mutate();
  }, [stepIndex, mutation]);

  // ── Sent for review ──
  if (submitted) {
    return (
      <View style={[styles.container, styles.doneBox]}>
        <View style={[styles.doneIcon, { backgroundColor: colors.primary }]}>
          <Icon name="shield-checkmark" size={36} color={colors.onPrimary} />
        </View>
        <Text variant="titleLarge" style={styles.bold} align="center">
          {t("kyc_review_title")}
        </Text>
        <Text variant="bodyMedium" color={colors.textSecondary} align="center">
          {t("kyc_review_body")}
        </Text>
        <Button
          label={t("done")}
          onPress={() => {
            closeSheet();
            // Hands control back to whatever sent them here — the role switch,
            // or the publish sheet they were part-way through.
            onSubmitted?.();
          }}
          variant="filled"
          size="lg"
          fullWidth
        />
      </View>
    );
  }

  const isLastStep = stepIndex === STEPS.length - 1;
  const busy = uploading !== null || mutation.isPending;
  const photoPath = photos[step];

  return (
    <View style={styles.container}>
      {/* ── Progress rail ── */}
      <View style={styles.railWrap}>
        <View style={styles.railHead}>
          <Text variant="labelLarge" color={colors.textSecondary}>
            {t("kyc_progress_label")}
          </Text>
          <Animated.View style={popStyle}>
            <Text variant="labelLarge" color={colors.primary} style={styles.bold}>
              {doneCount}/{STEPS.length}
            </Text>
          </Animated.View>
        </View>
        <View style={[styles.railTrack, { backgroundColor: colors.surfaceVariant }]}>
          <Animated.View
            style={[
              styles.railFill,
              progressStyle,
              { backgroundColor: colors.primary },
            ]}
          />
        </View>
        <View style={styles.pipRow}>
          {STEPS.map((id, i) => {
            const filled =
              id === "document" ? numberValid && photos.document : photos[id];
            const current = i === stepIndex;
            return (
              <View key={id} style={styles.pip}>
                <View
                  style={[
                    styles.pipDot,
                    {
                      backgroundColor: filled
                        ? colors.primary
                        : current
                          ? colors.primaryContainer
                          : colors.surfaceVariant,
                    },
                  ]}
                >
                  {filled ? (
                    <Icon name="checkmark" size={12} color={colors.onPrimary} />
                  ) : (
                    <Icon
                      name={STEP_META[id].icon}
                      size={12}
                      color={
                        current ? colors.onPrimaryContainer : colors.textSecondary
                      }
                    />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <BottomSheetScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {stepIndex === 0 && (
          <View style={styles.intro}>
            <Text variant="titleLarge" style={styles.bold}>
              {t("become_a_driver")}
            </Text>
            <Text variant="bodyMedium" color={colors.textSecondary}>
              {t("driver_kyc_intro")}
            </Text>
          </View>
        )}

        {isRejected && stepIndex === 0 && (
          <View
            style={[styles.banner, { backgroundColor: colors.errorContainer }]}
          >
            <Icon
              name="alert-circle-outline"
              size={16}
              color={colors.onErrorContainer}
            />
            <Text
              variant="bodySmall"
              color={colors.onErrorContainer}
              style={styles.flex}
            >
              {t("kyc_rejected_banner")}
            </Text>
          </View>
        )}

        <Text variant="titleMedium" style={styles.bold}>
          {t(meta.title as any)}
        </Text>

        {/* ── Step 1 also carries the document type and its number ── */}
        {step === "document" && (
          <>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t("kyc_pick_document")}
            </Text>
            <View style={styles.typeRow}>
              {DOCUMENT_TYPES.map((option) => {
                const selected = option.id === docType;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => {
                      haptic.selection();
                      setDocType(option.id);
                      setNumberTouched(false);
                    }}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: selected
                          ? colors.primaryContainer
                          : colors.surfaceContainerHigh,
                        borderColor: selected
                          ? colors.primary
                          : colors.borderLight,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Icon
                      name={option.icon}
                      size={16}
                      color={
                        selected ? colors.onPrimaryContainer : colors.textSecondary
                      }
                    />
                    <Text
                      variant="labelMedium"
                      color={selected ? colors.onPrimaryContainer : colors.text}
                      numberOfLines={1}
                    >
                      {t(option.key as any)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              label={t("kyc_number_label")}
              icon="keypad-outline"
              autoCapitalize="characters"
              autoCorrect={false}
              keyboardType={rule.keyboard}
              value={docNumber}
              onChangeText={(v) => {
                setDocNumber(v);
                setNumberTouched(true);
              }}
              onBlur={() => setNumberTouched(true)}
              placeholder={rule.example}
              hint={`${t("kyc_number_hint")} ${rule.example}`}
              error={
                numberTouched && docNumber.length > 0 && !numberValid
                  ? `${t("kyc_number_invalid")} ${rule.example}`
                  : undefined
              }
            />
          </>
        )}

        {/* ── Photo tile ── */}
        <Pressable
          onPress={handlePickPhoto}
          disabled={busy}
          style={[
            styles.tile,
            {
              height: tileHeight,
              backgroundColor: colors.surfaceContainerHigh,
              borderColor: photoPath ? colors.primary : colors.borderLight,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t(meta.photo as any)}
        >
          {photoPath ? (
            <>
              <Image
                source={previews[step]}
                style={styles.tileImage}
                contentFit="cover"
              />
              <View
                style={[styles.tileDone, { backgroundColor: colors.primary }]}
              >
                <Icon name="checkmark" size={16} color={colors.onPrimary} />
                <Text variant="labelMedium" color={colors.onPrimary}>
                  {t("kyc_photo_added")}
                </Text>
              </View>
            </>
          ) : uploading === step ? (
            <View style={styles.tileCenter}>
              <ActivityIndicator color={colors.primary} />
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t("kyc_uploading")}
              </Text>
            </View>
          ) : (
            <View style={styles.tileCenter}>
              <View
                style={[
                  styles.tileIcon,
                  { backgroundColor: colors.surfaceVariant },
                ]}
              >
                <Icon name="camera-outline" size={22} color={colors.primary} />
              </View>
              <Text variant="titleSmall">{t(meta.photo as any)}</Text>
              <Text
                variant="bodySmall"
                color={colors.textSecondary}
                align="center"
                style={styles.tileHelp}
              >
                {t(meta.help as any)}
              </Text>
            </View>
          )}
        </Pressable>

        {photoPath && (
          <Pressable onPress={handlePickPhoto} disabled={busy} hitSlop={8}>
            <Text variant="labelLarge" color={colors.primary}>
              {t("kyc_replace_photo")}
            </Text>
          </Pressable>
        )}

        {error && (
          <View
            style={[styles.banner, { backgroundColor: colors.errorContainer }]}
          >
            <Icon
              name="alert-circle-outline"
              size={16}
              color={colors.onErrorContainer}
            />
            <Text
              variant="bodySmall"
              color={colors.onErrorContainer}
              style={styles.flex}
            >
              {error}
            </Text>
          </View>
        )}

        <View style={[styles.note, { backgroundColor: colors.surfaceVariant }]}>
          <Icon name="lock-closed-outline" size={16} color={colors.textSecondary} />
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.flex}>
            {t("kyc_privacy_note")}
          </Text>
        </View>
      </BottomSheetScrollView>

      <View style={styles.footer}>
        {stepIndex > 0 && (
          <Button
            label={t("kyc_back")}
            onPress={goBack}
            variant="outlined"
            size="lg"
            style={styles.backBtn}
          />
        )}
        <View style={styles.flex}>
          <Button
            label={isLastStep ? t("submit_for_review") : t("kyc_continue")}
            onPress={goNext}
            variant="filled"
            size="lg"
            fullWidth
            disabled={!stepComplete || busy}
            loading={mutation.isPending}
            icon={isLastStep ? "shield-checkmark-outline" : undefined}
            iconRight={isLastStep ? undefined : "arrow-forward"}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  bold: { fontWeight: "700" },
  scroll: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  intro: { gap: spacing.xs },
  railWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  railHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  railTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  railFill: { height: 6, borderRadius: 3 },
  pipRow: { flexDirection: "row", gap: spacing.sm },
  pip: { flex: 1, alignItems: "center" },
  pipDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  typeRow: { flexDirection: "row", gap: spacing.sm },
  typeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 40,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  tile: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  tileImage: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  tileCenter: { alignItems: "center", gap: spacing.xs, padding: spacing.md },
  tileHelp: { maxWidth: 260 },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  tileDone: {
    position: "absolute",
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  banner: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  note: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  backBtn: { minWidth: 104 },
  doneBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing["3xl"],
  },
  doneIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
});
