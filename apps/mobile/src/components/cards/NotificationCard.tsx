import React, { memo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { useTheme } from "@/hooks";
import { spacing, radius } from "@/theme";
import { formatShortRelativeTime } from "@/lib/formatters";
import { createSubtleScheme } from "@/lib/utils/carColor";
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
  system: "#3E63A8",
};

interface NotificationCardProps {
  notification: AppNotification;
  onPress: () => void;
}

export const NotificationCard = memo(function NotificationCard({
  notification,
  onPress,
}: NotificationCardProps) {
  const { colors, isDark } = useTheme();
  const icon = NOTIF_ICONS[notification.type];
  // Colour is reserved for the icon + its surrounding circle and the title
  // (header). The card surface and body/meta text stay monochromatic.
  const scheme = createSubtleScheme(NOTIF_SOURCES[notification.type], isDark);
  const unread = !notification.read;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          // Unread reads as a filled chip; read blends flat into the list.
          backgroundColor: unread ? colors.card : "transparent",
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${unread ? "Unread. " : ""}${notification.title}`}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: scheme.pillBg, opacity: unread ? 1 : 0.5 },
        ]}
      >
        <Icon name={icon} size={20} color={scheme.pillInk} />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            variant="titleSmall"
            color={unread ? scheme.ink : colors.textSecondary}
            numberOfLines={1}
            style={[styles.title, unread && styles.titleUnread]}
          >
            {notification.title}
          </Text>
          <Text
            variant="caption"
            color={colors.textTertiary}
            style={styles.time}
          >
            {formatShortRelativeTime(notification.created_at)}
          </Text>
          {unread && (
            <View style={[styles.dot, { backgroundColor: scheme.pillInk }]} />
          )}
        </View>
        <Text
          variant="bodySmall"
          color={unread ? colors.textSecondary : colors.textTertiary}
          numberOfLines={2}
        >
          {notification.body}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    flexShrink: 1,
    fontWeight: "700",
  },
  titleUnread: {
    fontWeight: "800",
  },
  time: {
    marginLeft: "auto",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
