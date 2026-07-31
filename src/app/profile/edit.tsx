import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert as RNAlert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/core/Text";
import { Icon } from "@/components/core/Icon";
import { Avatar } from "@/components/core/Avatar";
import { Button } from "@/components/core/Button";
import { Divider } from "@/components/core/Divider";
import { TextInput } from "@/components/forms/TextInput";
import { useTheme, useLocale, useSafeBack } from "@/hooks";
import { useAuthStore } from "@/store";
import {
  updateProfile,
  requestEmailChange,
  requestPhoneChange,
  confirmPhoneChange,
} from "@/lib/api/profile";
import { uploadChatMedia } from "@/lib/api/storage";
import { pickImage, compressImage } from "@/lib/utils/media";
import { formatPhone } from "@/lib/formatters";
import { haptic } from "@/lib/utils/haptics";
import { spacing, radius } from "@/theme";
import type { Gender } from "@/types";
import type { IconName } from "@/components/core/Icon";
import type { TranslationKey } from "@/lib/i18n/en";

const GENDERS: { value: Gender; key: TranslationKey }[] = [
  { value: "male", key: "gender_male" },
  { value: "female", key: "gender_female" },
  { value: "other", key: "gender_other" },
  { value: "prefer_not_to_say", key: "gender_unspecified" },
];

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const goBack = useSafeBack();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [dob, setDob] = useState(user?.date_of_birth ?? "");
  const [gender, setGender] = useState<Gender | null>(user?.gender ?? null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.avatar_url ?? null,
  );
  // Local preview shown instantly while the picked image uploads.
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickAvatar = useCallback(async () => {
    if (!user) return;
    const picked = await pickImage();
    if (!picked) return;
    haptic.light();
    // Show the raw pick immediately, then compress + upload behind the overlay.
    setAvatarPreview(picked.uri);
    setUploadingAvatar(true);
    try {
      const compressed = await compressImage(
        picked.uri,
        picked.width,
        picked.height,
      );
      const url = await uploadChatMedia(
        compressed.uri,
        user.id,
        "image",
        "avatars",
      );
      setAvatarUrl(url);
    } catch {
      setAvatarPreview(null);
      RNAlert.alert(t("photo_upload_error"));
    } finally {
      setUploadingAvatar(false);
    }
  }, [user, t]);

  const save = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const profile = await updateProfile(user.id, {
        full_name: fullName.trim(),
        city: city.trim() || null,
        date_of_birth: dob.trim() || null,
        gender: gender ?? null,
        avatar_url: avatarUrl,
      });
      setUser({ ...user, ...profile });
      haptic.success();
      RNAlert.alert(t("profile_saved"));
      goBack();
    } catch {
      RNAlert.alert(t("profile_save_error"));
    } finally {
      setSaving(false);
    }
  }, [user, fullName, city, dob, gender, avatarUrl, setUser, t, goBack]);

  if (!user) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Header title={t("edit_profile")} onBack={goBack} />
      </View>
    );
  }

  const nameChanged = fullName.trim() !== (user.full_name ?? "");
  const cityChanged = (city.trim() || null) !== (user.city ?? null);
  const dobChanged = (dob.trim() || null) !== (user.date_of_birth ?? null);
  const genderChanged = (gender ?? null) !== (user.gender ?? null);
  const avatarChanged = (avatarUrl ?? null) !== (user.avatar_url ?? null);
  const dirty =
    nameChanged || cityChanged || dobChanged || genderChanged || avatarChanged;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header title={t("edit_profile")} onBack={goBack} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Profile photo ── */}
        <View style={styles.avatarSection}>
          <Pressable
            onPress={pickAvatar}
            disabled={uploadingAvatar}
            style={styles.avatarWrap}
            accessibilityRole="button"
            accessibilityLabel={t("change_photo")}
          >
            <Avatar
              uri={avatarPreview ?? avatarUrl}
              name={fullName || user.full_name || "You"}
              size={104}
            />
            {uploadingAvatar && (
              <View style={styles.avatarLoading}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
            <View
              style={[
                styles.avatarBadge,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.background,
                },
              ]}
            >
              <Icon name="camera" size={16} color={colors.onPrimary} />
            </View>
          </Pressable>
          <Pressable onPress={pickAvatar} disabled={uploadingAvatar} hitSlop={8}>
            <Text variant="labelMedium" color={colors.primary}>
              {t("change_photo")}
            </Text>
          </Pressable>
        </View>

        {/* ── Personal details ── */}
        <SectionTitle>{t("personal_details")}</SectionTitle>
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer }]}>
          <TextInput
            label={t("full_name")}
            placeholder={t("full_name")}
            icon="person-outline"
            autoCapitalize="words"
            value={fullName}
            onChangeText={setFullName}
          />
          <TextInput
            label={t("city")}
            placeholder={t("city_placeholder")}
            icon="location-outline"
            autoCapitalize="words"
            value={city}
            onChangeText={setCity}
          />
          <TextInput
            label={t("date_of_birth")}
            placeholder="YYYY-MM-DD"
            icon="calendar-outline"
            keyboardType="numbers-and-punctuation"
            value={dob}
            onChangeText={setDob}
            hint={t("date_of_birth_hint")}
          />

          <View style={styles.field}>
            <Text variant="labelMedium" color={colors.textSecondary} style={styles.fieldLabel}>
              {t("gender")}
            </Text>
            <View style={styles.chipRow}>
              {GENDERS.map((g) => {
                const selected = gender === g.value;
                return (
                  <Pressable
                    key={g.value}
                    onPress={() => {
                      haptic.selection();
                      setGender(selected ? null : g.value);
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
                      {t(g.key)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Contact & verification ── */}
        <SectionTitle>{t("contact_verification")}</SectionTitle>
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer }]}>
          <EmailField />
          <Divider />
          <PhoneField />
        </View>
        <Text variant="caption" color={colors.outline} style={styles.footNote}>
          {t("contact_verification_note")}
        </Text>
      </ScrollView>

      {/* Save bar */}
      <View
        style={[
          styles.saveBar,
          { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.surface },
        ]}
      >
        <Button
          label={t("save_changes")}
          onPress={save}
          size="lg"
          fullWidth
          loading={saving}
          disabled={!dirty || uploadingAvatar || fullName.trim().length < 2}
        />
      </View>
    </View>
  );
}

// ══════════════════════ Email field ══════════════════════

function EmailField() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user)!;

  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(user.email ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const verified = !!user.email_verified;

  const send = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await requestEmailChange(email);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("verify_error"));
    } finally {
      setBusy(false);
    }
  }, [email, t]);

  return (
    <ContactRow
      icon="mail-outline"
      label={t("email")}
      value={user.email || t("not_set")}
      verified={verified}
      editing={editing}
      onToggle={() => {
        setEditing((v) => !v);
        setSent(false);
        setError("");
        setEmail(user.email ?? "");
      }}
    >
      {sent ? (
        <View style={[styles.notice, { backgroundColor: colors.infoContainer }]}>
          <Icon name="mail-unread-outline" size={16} color={colors.onInfoContainer} />
          <Text variant="bodySmall" color={colors.onInfoContainer} style={styles.flex}>
            {t("email_confirm_sent")}
          </Text>
        </View>
      ) : (
        <>
          <TextInput
            placeholder="you@example.com"
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            error={error}
          />
          <Button
            label={t("send_confirmation")}
            onPress={send}
            size="md"
            fullWidth
            loading={busy}
            disabled={!email.includes("@") || email.trim() === user.email}
          />
        </>
      )}
    </ContactRow>
  );
}

// ══════════════════════ Phone field ══════════════════════

function PhoneField() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user)!;
  const setUser = useAuthStore((s) => s.setUser);

  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"edit" | "otp">("edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  const verified = !!user.phone_verified;

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const sendCode = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await requestPhoneChange(phone);
      setStep("otp");
      setResendIn(30);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("verify_error"));
    } finally {
      setBusy(false);
    }
  }, [phone, t]);

  const verify = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await confirmPhoneChange(phone, otp);
      haptic.success();
      setUser({ ...user, phone: phone.trim(), phone_verified: true });
      setEditing(false);
      setStep("edit");
      setOtp("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("verify_error"));
    } finally {
      setBusy(false);
    }
  }, [phone, otp, user, setUser, t]);

  return (
    <ContactRow
      icon="call-outline"
      label={t("phone_number")}
      value={user.phone ? formatPhone(user.phone) : t("not_set")}
      verified={verified}
      editing={editing}
      onToggle={() => {
        setEditing((v) => !v);
        setStep("edit");
        setError("");
        setOtp("");
        setPhone(user.phone ?? "");
      }}
    >
      {step === "edit" ? (
        <>
          <TextInput
            placeholder={t("enter_phone")}
            icon="call-outline"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            error={error}
            hint={t("phone_verify_hint")}
          />
          <Button
            label={t("send_code")}
            onPress={sendCode}
            size="md"
            fullWidth
            loading={busy}
            disabled={phone.trim().length < 9 || phone.trim() === user.phone}
          />
        </>
      ) : (
        <>
          <TextInput
            placeholder="000000"
            icon="keypad-outline"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
            error={error}
          />
          <Button
            label={t("verify")}
            onPress={verify}
            size="md"
            fullWidth
            loading={busy}
            disabled={otp.length < 6}
          />
          <Pressable
            onPress={resendIn > 0 ? undefined : sendCode}
            disabled={resendIn > 0}
            hitSlop={8}
          >
            <Text
              variant="labelMedium"
              color={resendIn > 0 ? colors.textTertiary : colors.primary}
              align="center"
            >
              {resendIn > 0 ? `${t("resend_code_in")} ${resendIn}s` : t("resend_code")}
            </Text>
          </Pressable>
        </>
      )}
    </ContactRow>
  );
}

// ══════════════════════ Shared building blocks ══════════════════════

function ContactRow({
  icon,
  label,
  value,
  verified,
  editing,
  onToggle,
  children,
}: {
  icon: IconName;
  label: string;
  value: string;
  verified: boolean;
  editing: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const { t } = useLocale();
  return (
    <View style={styles.contact}>
      <View style={styles.contactHead}>
        <View style={[styles.contactIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Icon name={icon} size={20} color={colors.onSurfaceVariant} />
        </View>
        <View style={styles.flex}>
          <Text variant="labelMedium" color={colors.textSecondary}>
            {label}
          </Text>
          <Text variant="bodyMedium" color={colors.text} numberOfLines={1}>
            {value}
          </Text>
        </View>
        <View
          style={[
            styles.verifyChip,
            {
              backgroundColor: verified
                ? colors.successContainer
                : colors.warningContainer,
            },
          ]}
        >
          <Icon
            name={verified ? "checkmark-circle" : "alert-circle-outline"}
            size={13}
            color={verified ? colors.onSuccessContainer : colors.onWarningContainer}
          />
          <Text
            variant="labelSmall"
            color={verified ? colors.onSuccessContainer : colors.onWarningContainer}
          >
            {t(verified ? "verified" : "unverified")}
          </Text>
        </View>
        <Pressable onPress={onToggle} hitSlop={10} accessibilityRole="button">
          <Text variant="labelMedium" color={colors.primary}>
            {editing ? t("cancel") : t("edit")}
          </Text>
        </Pressable>
      </View>
      {editing && <View style={styles.contactBody}>{children}</View>}
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <Text variant="labelMedium" color={colors.textSecondary} style={styles.sectionTitle}>
      {children.toUpperCase()}
    </Text>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable
        onPress={onBack}
        hitSlop={10}
        style={[styles.headerBtn, { backgroundColor: colors.surfaceContainerHigh }]}
        accessibilityRole="button"
        accessibilityLabel="Back"
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
  content: { padding: spacing.lg, gap: spacing.sm },
  avatarSection: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  avatarWrap: {
    position: "relative",
  },
  avatarLoading: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 52,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    paddingLeft: spacing.sm,
    letterSpacing: 0.8,
    marginTop: spacing.sm,
  },
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  field: { gap: spacing.xs },
  fieldLabel: { marginLeft: 2 },
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
  contact: { gap: spacing.md },
  contactHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  contactBody: { gap: spacing.md },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  footNote: { paddingLeft: spacing.sm, paddingTop: 2 },
  saveBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
