import React, { useCallback, useMemo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { Avatar } from "../core/Avatar";
import { Divider } from "../core/Divider";
import { ALERT_META } from "../cards/alertMeta";
import { AlertEngagement } from "../cards/AlertEngagement";
import { useTheme, useLocale } from "@/hooks";
import { useUIStore, useDetailStore } from "@/store";
import { queryKeys, fetchAlertComments } from "@/lib/api";
import { spacing, radius } from "@/theme";
import { formatShortRelativeTime } from "@/lib/formatters";
import type { Alert, AlertComment } from "@/types";

// A comment is "short" enough to pair with a second in the peek preview.
const SHORT_COMMENT = 90;

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

  const { data: comments = [] } = useQuery<AlertComment[]>({
    queryKey: queryKeys.alerts.comments(alert.id),
    queryFn: () => fetchAlertComments(alert.id),
    staleTime: 30_000,
  });

  // Preview the first comment, or two if both are short enough to fit.
  const preview = useMemo(() => {
    if (comments.length === 0) return [];
    const [first, second] = comments;
    const isShort = (c?: AlertComment) => (c?.content.length ?? 0) <= SHORT_COMMENT;
    return second && isShort(first) && isShort(second) ? [first, second] : [first];
  }, [comments]);

  const total = Math.max(alert.comments_count, comments.length);
  const remaining = Math.max(0, total - preview.length);

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

      {/* Functional reactions + engagement stats */}
      <AlertEngagement alert={alert} onComment={openFull} />

      <Divider />

      {/* Comment preview: first one or two short comments */}
      {preview.length > 0 && (
        <View style={styles.previewList}>
          {preview.map((comment) => (
            <View key={comment.id} style={styles.commentRow}>
              <Avatar
                uri={comment.user?.avatar_url ?? null}
                name={comment.user?.full_name ?? "User"}
                size={30}
              />
              <View style={styles.commentBody}>
                <View style={styles.commentHead}>
                  <Text
                    variant="labelSmall"
                    color={colors.text}
                    style={[styles.bold, styles.flex]}
                    numberOfLines={1}
                  >
                    {comment.user?.full_name ?? "Anonymous"}
                  </Text>
                  <Text variant="caption" color={colors.textTertiary}>
                    {formatShortRelativeTime(comment.created_at)}
                  </Text>
                </View>
                <Text
                  variant="bodySmall"
                  color={colors.textSecondary}
                  numberOfLines={3}
                >
                  {comment.content}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* See more / start the discussion */}
      <Pressable
        onPress={openFull}
        style={[styles.seeMore, { backgroundColor: colors.primaryContainer }]}
        accessibilityRole="button"
      >
        <Icon name="chatbubbles-outline" size={18} color={colors.primary} />
        <Text variant="labelLarge" color={colors.primary} style={styles.flex}>
          {remaining > 0
            ? `${t("see_more")} · ${remaining} ${t("comments").toLowerCase()}`
            : total > 0
              ? `${t("see_all")} ${t("comments").toLowerCase()}`
              : t("write_comment")}
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
  previewList: { gap: spacing.md },
  commentRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  commentBody: { flex: 1, gap: 2 },
  commentHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  seeMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
});
