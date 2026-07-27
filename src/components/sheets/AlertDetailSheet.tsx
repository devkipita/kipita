import React, { useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { Avatar } from "../core/Avatar";
import { Divider } from "../core/Divider";
import { ALERT_META } from "../cards/alertMeta";
import { useTheme, useLocale } from "@/hooks";
import { useUIStore, useDetailStore } from "@/store";
import { spacing, radius } from "@/theme";
import { formatShortRelativeTime } from "@/lib/formatters";
import type { Alert } from "@/types";

const REACTIONS = ["👍", "❤️", "😮", "😢"] as const;

interface AlertDetailSheetProps {
  alert: Alert;
}

/**
 * Quick-peek drawer for a road alert. Deep content (full comment thread +
 * composer) lives on the full-page route — this is the fast glance with a
 * clear "See discussion" hand-off.
 */
export function AlertDetailSheet({ alert }: AlertDetailSheetProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const router = useRouter();
  const closeSheet = useUIStore((s) => s.closeSheet);
  const setAlert = useDetailStore((s) => s.setAlert);

  const meta = ALERT_META[alert.category];

  const openFull = useCallback(() => {
    setAlert(alert);
    closeSheet();
    router.push(`/alert/${alert.id}` as any);
  }, [alert, setAlert, closeSheet, router]);

  return (
    <BottomSheetScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {alert.image_url && (
        <Image
          source={{ uri: alert.image_url }}
          style={styles.hero}
          contentFit="cover"
          transition={200}
        />
      )}

      <View style={[styles.catBadge, { backgroundColor: meta.color + "22" }]}>
        <Icon name={meta.icon} size={13} color={meta.color} />
        <Text variant="labelSmall" color={meta.color} style={styles.bold}>
          {meta.label.toUpperCase()}
        </Text>
      </View>

      <View style={styles.inlineRow}>
        <Icon name="location-outline" size={16} color={colors.textSecondary} />
        <Text variant="titleSmall" color={colors.text} style={styles.flex}>
          {alert.location}
        </Text>
        <Text variant="caption" color={colors.textTertiary}>
          {formatShortRelativeTime(alert.created_at)}
        </Text>
      </View>

      {alert.user && (
        <View style={styles.inlineRow}>
          <Avatar uri={alert.user.avatar_url} name={alert.user.full_name} size={28} />
          <Text variant="labelMedium" color={colors.text}>
            {alert.user.full_name}
          </Text>
        </View>
      )}

      <Text variant="bodyLarge" color={colors.text} style={styles.body}>
        {alert.content}
      </Text>

      {/* Reactions (glance only) */}
      <View style={styles.reactionsRow}>
        {REACTIONS.map((emoji) => (
          <Pressable
            key={emoji}
            onPress={openFull}
            style={[
              styles.reactionBtn,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: colors.borderLight,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`React ${emoji}`}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
          </Pressable>
        ))}
      </View>

      <Divider />

      {/* Engagement summary + See more */}
      <Pressable
        onPress={openFull}
        style={[styles.seeMore, { backgroundColor: colors.primaryContainer }]}
        accessibilityRole="button"
      >
        <Icon name="chatbubbles-outline" size={18} color={colors.primary} />
        <Text variant="labelLarge" color={colors.primary} style={styles.flex}>
          {t("see_more")} · {alert.comments_count} {t("comments").toLowerCase()}
        </Text>
        <Icon name="arrow-forward" size={18} color={colors.primary} />
      </Pressable>
    </BottomSheetScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  flex: { flex: 1 },
  bold: { fontWeight: "700" },
  hero: {
    width: "100%",
    height: 180,
    borderRadius: radius.lg,
    backgroundColor: "#000",
  },
  catBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  body: { lineHeight: 24 },
  reactionsRow: { flexDirection: "row", gap: spacing.sm },
  reactionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  reactionEmoji: { fontSize: 20 },
  seeMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
});
