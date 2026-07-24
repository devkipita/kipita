import React, { useCallback, memo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Linking,
  Platform,
  Share,
  Alert,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/core/Text";
import { Icon } from "@/components/core/Icon";
import { Avatar } from "@/components/core/Avatar";
import { GlassCard } from "@/components/core/GlassCard";
import { useTheme, useLocale, useAppMode } from "@/hooks";
import { useAuthStore, useUIStore, useSettingsStore } from "@/store";
import { supabase } from "@/lib/supabase";
import { storage, STORAGE_KEYS } from "@/lib/utils/mmkv";
import { haptic } from "@/lib/utils/haptics";
import { spacing, radius, palette } from "@/theme";
import { FLOATING_TAB_BAR_SPACE } from "@/components/shared/FloatingTabBar";
import { formatRating, formatDate } from "@/lib/formatters";
import {
  APP_NAME,
  APP_VERSION,
  SUPPORT_EMAIL,
  WEBSITE_URL,
  TERMS_URL,
  PRIVACY_URL,
  COOKIES_URL,
  RATE_URL,
} from "@/lib/constants";
import type { ThemeMode } from "@/hooks/useTheme";
import type { IconName } from "@/components/core/Icon";

// ── Cross-platform confirm / notify helpers (web + native) ──
function confirmAction(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
  destructive = false,
) {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    if (
      typeof window !== "undefined" &&
      window.confirm(`${title}\n\n${message}`)
    )
      onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    {
      text: confirmLabel,
      style: destructive ? "destructive" : "default",
      onPress: onConfirm,
    },
  ]);
}

function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined")
      window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export default function ProfileScreen() {
  const { colors, themeMode, setThemeMode, isDark } = useTheme();
  const { t, locale, changeLocale } = useLocale();
  const { mode, toggle: toggleMode, isDriver } = useAppMode();
  const user = useAuthStore((s) => s.user);
  const openSheet = useUIStore((s) => s.openSheet);

  const settings = useSettingsStore();

  const handleSignOut = useCallback(() => {
    confirmAction(
      "Sign out",
      `You'll need to sign in again to book or offer rides.`,
      t("sign_out"),
      async () => {
        await supabase.auth.signOut();
        useAuthStore.getState().reset();
      },
    );
  }, [t]);

  const handleDeleteAccount = useCallback(() => {
    confirmAction(
      "Delete account",
      "This will start account deletion. We will email you to confirm and remove your data within 30 days.",
      "Request deletion",
      () => {
        Linking.openURL(
          `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Delete my Kipita account")}&body=${encodeURIComponent(
            `Please delete my account associated with ${user?.email ?? user?.phone ?? "this profile"}.`,
          )}`,
        );
      },
      true,
    );
  }, [user]);

  const handleShare = useCallback(async () => {
    const message = `Carpool smarter across Kenya with ${APP_NAME}. ${WEBSITE_URL}`;
    try {
      if (Platform.OS === "web") {
        const nav: any = typeof navigator !== "undefined" ? navigator : null;
        if (nav?.share) {
          await nav.share({ title: APP_NAME, text: message, url: WEBSITE_URL });
        } else if (nav?.clipboard) {
          await nav.clipboard.writeText(WEBSITE_URL);
          notify("Link copied", "Kipita link copied to your clipboard.");
        }
      } else {
        await Share.share({ message, title: APP_NAME });
      }
    } catch {
      /* user cancelled — ignore */
    }
  }, []);

  const handleClearCache = useCallback(() => {
    confirmAction(
      "Clear search cache",
      "This removes your saved route search draft. Your account is not affected.",
      "Clear",
      () => {
        storage.remove(STORAGE_KEYS.ROUTE_SEARCH_DRAFT);
        haptic.success();
        notify("Cache cleared", "Your saved route search has been removed.");
      },
    );
  }, []);

  const handleResetSettings = useCallback(() => {
    confirmAction(
      "Reset settings",
      "Restore notifications and experience settings to their defaults.",
      "Reset",
      () => {
        useSettingsStore.getState().reset();
        haptic.success();
      },
    );
  }, []);

  const openMail = useCallback(
    (subject: string) =>
      Linking.openURL(
        `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`,
      ),
    [],
  );

  const openUrl = useCallback((url: string) => Linking.openURL(url), []);

  const viewProfile = useCallback(() => {
    if (user) openSheet("person", { user });
  }, [user, openSheet]);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ── */}
      {user ? (
        <Animated.View entering={FadeInDown.duration(400)}>
          <LinearGradient
            colors={[colors.primary, palette.green900] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroTop}>
              <View style={styles.avatarRing}>
                <Avatar
                  uri={user.avatar_url}
                  name={user.full_name}
                  size={64}
                  onPress={viewProfile}
                />
              </View>
              <View style={styles.heroInfo}>
                <Text
                  variant="headlineSmall"
                  color={palette.white}
                  numberOfLines={1}
                >
                  {user.full_name}
                </Text>
                <View style={styles.badgesRow}>
                  <View style={styles.heroBadge}>
                    <Icon
                      name={
                        user.is_verified
                          ? "checkmark-circle"
                          : "alert-circle-outline"
                      }
                      size={13}
                      color={palette.white}
                    />
                    <Text variant="labelSmall" color={palette.white}>
                      {t(user.is_verified ? "verified" : "unverified")}
                    </Text>
                  </View>
                </View>
                <Text variant="caption" color="rgba(255,255,255,0.75)">
                  Member since {formatDate(user.created_at)}
                </Text>
              </View>
              <Pressable
                onPress={viewProfile}
                hitSlop={10}
                style={styles.heroEdit}
                accessibilityRole="button"
                accessibilityLabel={t("edit_profile")}
              >
                <Icon name="chevron-forward" size={20} color={palette.white} />
              </Pressable>
            </View>

            {/* Stats strip */}
            <View style={styles.heroStats}>
              <HeroStat
                icon="star"
                value={formatRating(user.rating)}
                label={t("rating")}
              />
              <View style={styles.heroStatDivider} />
              <HeroStat
                icon="car-sport"
                value={String(user.total_trips)}
                label={t("total_trips")}
              />
              <View style={styles.heroStatDivider} />
              <HeroStat
                icon={isDriver ? "car" : "person"}
                value={isDriver ? t("driver") : t("passenger")}
                label="Mode"
                onPress={toggleMode}
              />
            </View>
          </LinearGradient>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInDown.duration(400)}>
          <LinearGradient
            colors={[colors.primary, palette.green900] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.guestHero}
          >
            <View style={[styles.guestIconWrap]}>
              <Icon name="person-outline" size={30} color={palette.white} />
            </View>
            <Text variant="titleLarge" color={palette.white} align="center">
              Welcome to {APP_NAME}
            </Text>
            <Text
              variant="bodySmall"
              color="rgba(255,255,255,0.85)"
              align="center"
            >
              Sign in to book rides, message drivers and manage your trips.
            </Text>
            <Pressable
              onPress={() => openSheet("auth", {})}
              style={styles.guestBtn}
              accessibilityRole="button"
              accessibilityLabel={t("sign_in")}
            >
              <Icon name="log-in-outline" size={18} color={colors.primary} />
              <Text variant="labelLarge" color={colors.primary}>
                {t("sign_in")}
              </Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      )}

      {/* ── Account ── */}
      {user && (
        <SettingsGroup title="Account" delay={60}>
          <SettingsRow
            icon="person-circle-outline"
            tint={colors.primary}
            label="View profile"
            subtitle="See how others see you"
            onPress={viewProfile}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            tint={user.is_verified ? colors.success : colors.warning}
            label={t("verification")}
            value={t(user.is_verified ? "verified" : "unverified")}
            onPress={
              user.is_verified
                ? undefined
                : () => openMail("Verify my Kipita account")
            }
          />
        </SettingsGroup>
      )}

      {/* ── Preferences ── */}
      <SettingsGroup title="Preferences" delay={100}>
        <SettingsRow
          icon="color-palette-outline"
          tint={colors.secondary}
          label={t("theme")}
          trailing={
            <ThemeToggle themeMode={themeMode} setThemeMode={setThemeMode} />
          }
        />
        <SettingsRow
          icon="language-outline"
          tint={colors.primary}
          label={t("language")}
          trailing={
            <LanguageToggle locale={locale} changeLocale={changeLocale} />
          }
        />
        {user && (
          <SettingsRow
            icon="swap-horizontal-outline"
            tint={colors.info}
            label={t("switch_mode")}
            value={isDriver ? t("driver") : t("passenger")}
            onPress={toggleMode}
          />
        )}
      </SettingsGroup>

      {/* ── Notifications ── */}
      <SettingsGroup
        title="Notifications"
        footer="Choose which alerts Kipita can send you."
        delay={140}
      >
        <SettingsRow
          icon="notifications-outline"
          tint={colors.warning}
          label="Push notifications"
          subtitle="Master switch for all alerts"
          trailing={
            <RowSwitch
              value={settings.pushEnabled}
              onValueChange={(v) => settings.setSetting("pushEnabled", v)}
            />
          }
        />
        <SettingsRow
          icon="car-outline"
          tint={colors.primary}
          label="Ride & trip updates"
          trailing={
            <RowSwitch
              value={settings.rideUpdates}
              disabled={!settings.pushEnabled}
              onValueChange={(v) => settings.setSetting("rideUpdates", v)}
            />
          }
        />
        <SettingsRow
          icon="chatbubble-ellipses-outline"
          tint={colors.secondary}
          label="Chat messages"
          trailing={
            <RowSwitch
              value={settings.chatMessages}
              disabled={!settings.pushEnabled}
              onValueChange={(v) => settings.setSetting("chatMessages", v)}
            />
          }
        />
        <SettingsRow
          icon="megaphone-outline"
          tint={colors.warning}
          label="Road alerts"
          trailing={
            <RowSwitch
              value={settings.roadAlerts}
              disabled={!settings.pushEnabled}
              onValueChange={(v) => settings.setSetting("roadAlerts", v)}
            />
          }
        />
        <SettingsRow
          icon="pricetag-outline"
          tint={colors.secondary}
          label="Promotions & tips"
          trailing={
            <RowSwitch
              value={settings.promotions}
              disabled={!settings.pushEnabled}
              onValueChange={(v) => settings.setSetting("promotions", v)}
            />
          }
        />
      </SettingsGroup>

      {/* ── Experience ── */}
      <SettingsGroup title="Experience" delay={180}>
        <SettingsRow
          icon="phone-portrait-outline"
          tint={colors.primary}
          label="Haptic feedback"
          subtitle="Vibrate on taps and actions"
          trailing={
            <RowSwitch
              value={settings.haptics}
              onValueChange={(v) => settings.setSetting("haptics", v)}
            />
          }
        />
        <SettingsRow
          icon="volume-high-outline"
          tint={colors.secondary}
          label="Sound effects"
          trailing={
            <RowSwitch
              value={settings.soundEffects}
              onValueChange={(v) => settings.setSetting("soundEffects", v)}
            />
          }
        />
      </SettingsGroup>

      {/* ── Support ── */}
      <SettingsGroup title="Support" delay={220}>
        <SettingsRow
          icon="help-buoy-outline"
          tint={colors.primary}
          label={t("contact_support")}
          onPress={() => openMail("Kipita support request")}
        />
        <SettingsRow
          icon="star-outline"
          tint={colors.warning}
          label={`Rate ${APP_NAME}`}
          onPress={() => openUrl(RATE_URL)}
        />
        <SettingsRow
          icon="share-social-outline"
          tint={colors.secondary}
          label="Share the app"
          onPress={handleShare}
        />
        <SettingsRow
          icon="globe-outline"
          tint={colors.primary}
          label="Visit website"
          onPress={() => openUrl(WEBSITE_URL)}
        />
      </SettingsGroup>

      {/* ── Legal ── */}
      <SettingsGroup title="Legal" delay={260}>
        <SettingsRow
          icon="document-text-outline"
          tint={colors.textSecondary}
          label={t("terms")}
          onPress={() => openUrl(TERMS_URL)}
        />
        <SettingsRow
          icon="lock-closed-outline"
          tint={colors.textSecondary}
          label={t("privacy")}
          onPress={() => openUrl(PRIVACY_URL)}
        />
        <SettingsRow
          icon="finger-print-outline"
          tint={colors.textSecondary}
          label={t("cookies")}
          onPress={() => openUrl(COOKIES_URL)}
        />
        <SettingsRow
          icon="information-circle-outline"
          tint={colors.textSecondary}
          label={t("about")}
          value={`v${APP_VERSION}`}
          onPress={() =>
            notify(`${APP_NAME} v${APP_VERSION}`, "Carpooling, made for Kenya.")
          }
        />
      </SettingsGroup>

      {/* ── Data & danger ── */}
      <SettingsGroup title="Data" delay={300}>
        <SettingsRow
          icon="trash-bin-outline"
          tint={colors.textSecondary}
          label="Clear search cache"
          onPress={handleClearCache}
        />
        <SettingsRow
          icon="refresh-outline"
          tint={colors.textSecondary}
          label="Reset settings"
          onPress={handleResetSettings}
        />
        {user && (
          <SettingsRow
            icon="log-out-outline"
            tint={colors.error}
            label={t("sign_out")}
            destructive
            onPress={handleSignOut}
          />
        )}
        {user && (
          <SettingsRow
            icon="close-circle-outline"
            tint={colors.error}
            label="Delete account"
            destructive
            onPress={handleDeleteAccount}
          />
        )}
      </SettingsGroup>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Text variant="labelMedium" color={colors.textTertiary}>
          {APP_NAME}
        </Text>
        <Text variant="caption" color={colors.textTertiary}>
          Version {APP_VERSION}
        </Text>
      </View>
    </ScrollView>
  );
}

// ══════════════════════ Sub-components ══════════════════════

const HeroStat = memo(function HeroStat({
  icon,
  value,
  label,
  onPress,
}: {
  icon: IconName;
  value: string;
  label: string;
  onPress?: () => void;
}) {
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      style={heroStatStyles.cell}
      accessibilityRole={onPress ? "button" : undefined}
    >
      <Icon name={icon} size={18} color={palette.white} />
      <Text variant="titleMedium" color={palette.white} numberOfLines={1}>
        {value}
      </Text>
      <Text variant="caption" color="rgba(255,255,255,0.7)">
        {label}
      </Text>
    </Wrapper>
  );
});

const SettingsGroup = memo(function SettingsGroup({
  title,
  footer,
  delay = 0,
  children,
}: {
  title: string;
  footer?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(delay)}
      style={groupStyles.wrapper}
    >
      <Text
        variant="labelMedium"
        color={colors.textTertiary}
        style={groupStyles.title}
      >
        {title.toUpperCase()}
      </Text>
      <GlassCard borderRadius={radius.xl}>
        <View style={groupStyles.card}>
          {items.map((child, i) => (
            <View key={i}>
              {child}
              {i < items.length - 1 && (
                <View
                  style={[
                    groupStyles.divider,
                    { backgroundColor: colors.divider },
                  ]}
                />
              )}
            </View>
          ))}
        </View>
      </GlassCard>
      {footer && (
        <Text
          variant="caption"
          color={colors.textTertiary}
          style={groupStyles.footer}
        >
          {footer}
        </Text>
      )}
    </Animated.View>
  );
});

const SettingsRow = memo(function SettingsRow({
  icon,
  tint,
  label,
  subtitle,
  value,
  trailing,
  onPress,
  destructive,
}: {
  icon: IconName;
  tint?: string;
  label: string;
  subtitle?: string;
  value?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const { colors } = useTheme();
  const iconColor = destructive ? colors.error : (tint ?? colors.primary);

  const inner = (
    <>
      <View style={[rowStyles.iconWrap, { backgroundColor: iconColor + "1F" }]}>
        <Icon name={icon} size={18} color={iconColor} />
      </View>
      <View style={rowStyles.labelCol}>
        <Text
          variant="bodyMedium"
          color={destructive ? colors.error : colors.text}
          numberOfLines={1}
        >
          {label}
        </Text>
        {subtitle && (
          <Text variant="caption" color={colors.textTertiary} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {value && (
        <Text
          variant="labelMedium"
          color={colors.textTertiary}
          style={rowStyles.value}
        >
          {value}
        </Text>
      )}
      {trailing}
      {onPress && !trailing && (
        <Icon name="chevron-forward" size={16} color={colors.textTertiary} />
      )}
    </>
  );

  if (!onPress) {
    return <View style={rowStyles.row}>{inner}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        rowStyles.row,
        pressed && { backgroundColor: colors.ripple },
      ]}
    >
      {inner}
    </Pressable>
  );
});

/** Compact animated on/off switch used as a trailing control in rows. */
const RowSwitch = memo(function RowSwitch({
  value,
  onValueChange,
  disabled,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const on = value && !disabled;

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(on ? colors.primary : colors.border, {
      duration: 200,
    }),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withTiming(value ? SW_TRACK_W - SW_THUMB - 3 : 3, {
          duration: 200,
        }),
      },
    ],
  }));

  const handlePress = useCallback(() => {
    if (disabled) return;
    haptic.light();
    onValueChange(!value);
  }, [disabled, value, onValueChange]);

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={disabled ? { opacity: 0.4 } : undefined}
    >
      <Animated.View style={[swStyles.track, trackStyle]}>
        <Animated.View
          style={[
            swStyles.thumb,
            { backgroundColor: colors.surface },
            thumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
});

/** 3-way theme toggle pill: Light | System | Dark */
const ThemeToggle = memo(function ThemeToggle({
  themeMode,
  setThemeMode,
}: {
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
}) {
  const { colors } = useTheme();
  const options: { key: ThemeMode; icon: IconName }[] = [
    { key: "light", icon: "sunny-outline" },
    { key: "system", icon: "phone-portrait-outline" },
    { key: "dark", icon: "moon-outline" },
  ];
  return (
    <View
      style={[toggleStyles.pill, { backgroundColor: colors.surfaceVariant }]}
    >
      {options.map((o) => {
        const active = themeMode === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => {
              haptic.selection();
              setThemeMode(o.key);
            }}
            style={[
              toggleStyles.pillOption,
              active && { backgroundColor: colors.primary },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <Icon
              name={o.icon}
              size={15}
              color={active ? colors.onPrimary : colors.textSecondary}
            />
          </Pressable>
        );
      })}
    </View>
  );
});

/** 2-way language toggle pill: EN | SW */
const LanguageToggle = memo(function LanguageToggle({
  locale,
  changeLocale,
}: {
  locale: string;
  changeLocale: (l: any) => void;
}) {
  const { colors } = useTheme();
  const options = ["en", "sw"] as const;
  const labels = { en: "EN", sw: "SW" };
  return (
    <View
      style={[toggleStyles.pill, { backgroundColor: colors.surfaceVariant }]}
    >
      {options.map((o) => {
        const active = locale === o;
        return (
          <Pressable
            key={o}
            onPress={() => {
              haptic.selection();
              changeLocale(o);
            }}
            style={[
              toggleStyles.pillOption,
              toggleStyles.pillOptionWide,
              active && { backgroundColor: colors.primary },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <Text
              variant="labelMedium"
              color={active ? colors.onPrimary : colors.textSecondary}
            >
              {labels[o]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

// ══════════════════════ Styles ══════════════════════

const SW_TRACK_W = 46;
const SW_TRACK_H = 28;
const SW_THUMB = 22;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: FLOATING_TAB_BAR_SPACE,
    gap: spacing.lg,
  },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatarRing: {
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    padding: 2,
  },
  heroInfo: { flex: 1, gap: 4 },
  badgesRow: { flexDirection: "row" },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  heroEdit: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  guestHero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  guestIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: spacing.xs,
  },
  guestBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: palette.white,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  footer: {
    alignItems: "center",
    gap: 2,
    paddingTop: spacing.sm,
  },
});

const heroStatStyles = StyleSheet.create({
  cell: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingHorizontal: spacing.xs,
  },
});

const groupStyles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  title: {
    paddingLeft: spacing.sm,
    letterSpacing: 0.8,
  },
  card: { overflow: "hidden" },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 34 + spacing.md,
  },
  footer: {
    paddingLeft: spacing.sm,
    paddingTop: 2,
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 58,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  labelCol: { flex: 1, gap: 1 },
  value: { marginRight: 2 },
});

const swStyles = StyleSheet.create({
  track: {
    width: SW_TRACK_W,
    height: SW_TRACK_H,
    borderRadius: SW_TRACK_H / 2,
    justifyContent: "center",
  },
  thumb: {
    width: SW_THUMB,
    height: SW_THUMB,
    borderRadius: SW_THUMB / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});

const toggleStyles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    borderRadius: radius.md,
    padding: 3,
    gap: 2,
  },
  pillOption: {
    width: 34,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  pillOptionWide: {
    width: 42,
  },
});
