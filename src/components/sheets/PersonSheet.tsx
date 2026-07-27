import React, { memo } from "react";
import { View, StyleSheet, Linking, Pressable } from "react-native";
import { Text } from "../core/Text";
import { Avatar } from "../core/Avatar";
import { Button } from "../core/Button";
import { Icon } from "../core/Icon";
import { Divider } from "../core/Divider";
import { useTheme, useLocale } from "@/hooks";
import { useAuthStore, useUIStore } from "@/store";
import { haptic } from "@/lib/utils/haptics";
import { spacing, radius } from "@/theme";
import { formatRating, formatPhone } from "@/lib/formatters";
import type { User } from "@/types";

interface PersonSheetProps {
  user: User;
  onMessage?: () => void;
}

export const PersonSheet = memo(function PersonSheet({
  user,
  onMessage,
}: PersonSheetProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const currentUser = useAuthStore((s) => s.user);
  const openSheet = useUIStore((s) => s.openSheet);
  const isSelf = currentUser?.id === user.id;

  const handleCall = () => {
    if (user.phone) {
      Linking.openURL(`tel:${user.phone}`);
    }
  };

  const handleReport = () => {
    haptic.light();
    openSheet("report", { type: "user", reportedUser: user });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Avatar uri={user.avatar_url} name={user.full_name} size={64} />
        <View style={styles.headerInfo}>
          <Text variant="headlineSmall">{user.full_name}</Text>
          <View style={styles.verifiedRow}>
            <Icon
              name={
                user.is_verified ? "checkmark-circle" : "alert-circle-outline"
              }
              size={16}
              color={user.is_verified ? colors.success : colors.warning}
            />
            <Text
              variant="labelSmall"
              color={user.is_verified ? colors.success : colors.warning}
            >
              {t(user.is_verified ? "verified" : "unverified")}
            </Text>
          </View>
        </View>
      </View>

      <Divider />

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Icon name="star" size={20} color={colors.warning} />
          <Text variant="titleMedium">{formatRating(user.rating)}</Text>
          <Text variant="caption" color={colors.textTertiary}>
            {t("rating")}
          </Text>
        </View>
        <View style={styles.stat}>
          <Icon name="car-outline" size={20} color={colors.primary} />
          <Text variant="titleMedium">{user.total_trips}</Text>
          <Text variant="caption" color={colors.textTertiary}>
            {t("total_trips")}
          </Text>
        </View>
      </View>

      <Divider />

      {/* Contact */}
      {user.phone && (
        <View style={styles.contactRow}>
          <Icon name="call-outline" size={18} color={colors.textSecondary} />
          <Text variant="bodyMedium" color={colors.textSecondary}>
            {formatPhone(user.phone)}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {user.phone && (
          <Button
            label={t("call")}
            onPress={handleCall}
            variant="outlined"
            icon="call-outline"
            size="md"
          />
        )}
        {onMessage && (
          <Button
            label={t("message")}
            onPress={onMessage}
            variant="filled"
            icon="chatbubble-outline"
            size="md"
          />
        )}
      </View>

      {/* Report — hidden when viewing your own profile */}
      {!isSelf && (
        <>
          <Divider />
          <Pressable
            onPress={handleReport}
            style={({ pressed }) => [styles.reportRow, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={`${t("report")} ${user.full_name}`}
          >
            <View style={[styles.reportIcon, { backgroundColor: colors.errorContainer }]}>
              <Icon name="flag-outline" size={18} color={colors.onErrorContainer} />
            </View>
            <View style={styles.reportText}>
              <Text variant="bodyMedium" color={colors.error}>
                {`${t("report")} ${user.full_name}`}
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                {t("report_person_body")}
              </Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.outline} />
          </Pressable>
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  stat: {
    alignItems: "center",
    gap: 4,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  reportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  reportText: {
    flex: 1,
    gap: 2,
  },
});
