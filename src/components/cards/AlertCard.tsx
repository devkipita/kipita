import React, { memo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { Avatar } from "../core/Avatar";
import { AlertEngagement } from "./AlertEngagement";
import { useTheme, useLocale } from "@/hooks";
import { spacing, radius, shadows } from "@/theme";
import { formatShortRelativeTime, truncateWords } from "@/lib/formatters";
import { ALERT_META } from "./alertMeta";
import type { Alert } from "@/types";

const MAX_WORDS = 26;

interface AlertCardProps {
  alert: Alert;
  onPress: () => void;
}

export const AlertCard = memo(function AlertCard({
  alert,
  onPress,
}: AlertCardProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { icon: catIcon, color: catColor, label: catLabel } =
    ALERT_META[alert.category];

  const { text: body, truncated } = truncateWords(alert.content, MAX_WORDS);
  const authorName = alert.user?.full_name ?? catLabel;

  // ── Immersive media variant (image-backed) ──
  if (alert.image_url) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.media,
          shadows.md,
          { opacity: pressed ? 0.95 : 1 },
        ]}
        accessibilityRole="button"
      >
        <Image
          source={{ uri: alert.image_url }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.88)"]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.mediaTop}>
          <View style={[styles.catChip, { backgroundColor: catColor }]}>
            <Icon name={catIcon} size={12} color="#fff" />
            <Text variant="labelSmall" color="#fff" style={styles.catChipText}>
              {catLabel}
            </Text>
          </View>
        </View>

        <View style={styles.mediaBody}>
          <Text variant="titleSmall" color="#fff" numberOfLines={1}>
            {alert.location}
          </Text>
          <Text
            variant="bodySmall"
            color="rgba(255,255,255,0.92)"
            numberOfLines={2}
          >
            {body}
            {truncated ? ` ${t("read_more")}` : ""}
          </Text>
          <View style={styles.metaRow}>
            {alert.user && (
              <Avatar
                uri={alert.user.avatar_url}
                name={alert.user.full_name}
                size={18}
              />
            )}
            <Text variant="caption" color="rgba(255,255,255,0.7)">
              {authorName} · {formatShortRelativeTime(alert.created_at)}
            </Text>
          </View>
          <AlertEngagement
            alert={alert}
            onComment={onPress}
            variant="onMedia"
            compact
          />
        </View>
      </Pressable>
    );
  }

  // ── Subtle card feed row (comment-style) ──
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed
            ? colors.surfaceContainerHigh
            : colors.surfaceContainer,
        },
      ]}
      accessibilityRole="button"
    >
      <View style={styles.topRow}>
        <Avatar uri={alert.user?.avatar_url} name={authorName} size={40} />

        <View style={styles.body}>
          <View style={styles.authorLine}>
            <Text
              variant="labelLarge"
              color={colors.text}
              numberOfLines={1}
              style={styles.author}
            >
              {authorName}
            </Text>
            <Icon name={catIcon} size={12} color={catColor} />
            <Text variant="labelSmall" color={catColor} numberOfLines={1}>
              {catLabel}
            </Text>
            <View style={styles.headerSpacer} />
            <Text variant="caption" color={colors.textTertiary} numberOfLines={1}>
              {formatShortRelativeTime(alert.created_at)}
            </Text>
          </View>

          <Text
            variant="labelSmall"
            color={colors.textSecondary}
            style={styles.location}
            numberOfLines={1}
          >
            {alert.location}
          </Text>

          <Text variant="bodyMedium" color={colors.text} style={styles.content}>
            {body}
            {truncated && (
              <Text variant="bodyMedium" color={colors.primary}>
                {"  "}
                {t("read_more")}
              </Text>
            )}
          </Text>
        </View>
      </View>

      <AlertEngagement alert={alert} onComment={onPress} variant="default" compact />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  // Subtle card feed row
  row: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  authorLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  author: {
    flexShrink: 1,
    fontWeight: "700",
  },
  headerSpacer: {
    flex: 1,
  },
  location: {
    marginTop: -1,
  },
  content: {
    lineHeight: 20,
    marginTop: 2,
  },

  // Media variant
  media: {
    height: 200,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "#000",
    justifyContent: "space-between",
  },
  mediaTop: {
    flexDirection: "row",
    padding: spacing.md,
  },
  mediaBody: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  catChipText: {
    fontWeight: "700",
  },
});
