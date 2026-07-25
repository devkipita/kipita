import React, { memo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { useTheme } from "@/hooks";
import { spacing, radius } from "@/theme";
import { formatRelativeTime } from "@/lib/formatters";
import { createTonalCardScheme } from "@/lib/utils/carColor";
import type { AppNotification, NotificationType } from "@/types";
import type { IconName } from "../core/Icon";

const NOTIF_ICONS: Record<NotificationType, IconName> = {
  ride_match: "car-outline",
  request_match: "hand-right-outline",
  payment_success: "checkmark-circle-outline",
  payment_failed: "close-circle-outline",
  trip_started: "navigate-outline",
  trip_completed: "flag-outline",
  new_message: "chatbubble-outline",
  new_alert: "megaphone-outline",
  system: "information-circle-outline",
};

const NOTIF_SOURCES: Record<NotificationType, string> = {
  ride_match: "#1167D8",
  request_match: "#6C3DD1",
  payment_success: "#2F6C4F",
  payment_failed: "#C9342C",
  trip_started: "#D96704",
  trip_completed: "#00786B",
  new_message: "#163A8C",
  new_alert: "#B88912",
  system: "#404854",
};

interface NotificationCardProps {
  notification: AppNotification;
  onPress: () => void;
}

export const NotificationCard = memo(function NotificationCard({
  notification,
  onPress,
}: NotificationCardProps) {
  const { isDark } = useTheme();
  const icon = NOTIF_ICONS[notification.type];
  const scheme = createTonalCardScheme(
    NOTIF_SOURCES[notification.type],
    isDark,
    notification.read ? "request" : "ride",
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: scheme.leftBg,
          borderColor: scheme.outline,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      accessibilityRole="button"
    >
      <View style={styles.mainPanel}>
        <View style={[styles.iconWrap, { backgroundColor: scheme.pillBg }]}>
          <Icon name={icon} size={20} color={scheme.pillInk} />
        </View>
        <View style={styles.content}>
          <Text variant="titleSmall" color={scheme.leftInk} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text variant="bodySmall" color={scheme.leftMuted} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>
      </View>
      <View
        style={[
          styles.sidePanel,
          { backgroundColor: scheme.rightBg, borderLeftColor: scheme.outline },
        ]}
      >
        <View
          style={[
            styles.sideBadge,
            { backgroundColor: scheme.rightAccentSoft },
          ]}
        >
          <Icon name={icon} size={18} color={scheme.rightAccent} />
        </View>
        <Text variant="labelMedium" color={scheme.rightInk} align="center">
          {formatRelativeTime(notification.created_at)}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  mainPanel: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sidePanel: {
    width: 96,
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderLeftWidth: 1,
  },
  sideBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
});
