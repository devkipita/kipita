import React, { useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Text as RNText,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Text } from "@/components/core/Text";
import { Icon } from "@/components/core/Icon";
import { Avatar } from "@/components/core/Avatar";
import { Divider } from "@/components/core/Divider";
import { Composer } from "@/components/shared/Composer";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ALERT_META } from "@/components/cards/alertMeta";
import { useTheme, useLocale, useSafeBack } from "@/hooks";
import { useAuthStore, useDetailStore } from "@/store";
import {
  fetchAlertComments,
  addAlertComment,
  reactToAlert,
  queryKeys,
} from "@/lib/api";
import { spacing, radius } from "@/theme";
import { formatShortRelativeTime } from "@/lib/formatters";
import type { AlertComment } from "@/types";

const REACTIONS = [
  { emoji: "👍", key: "thumbs_up" },
  { emoji: "❤️", key: "heart" },
  { emoji: "😮", key: "wow" },
  { emoji: "😢", key: "sad" },
] as const;

export default function AlertThreadScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const goBack = useSafeBack();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const alert = useDetailStore((s) => (id ? s.alerts[id] : undefined));
  const [commentText, setCommentText] = useState("");
  const [selectedReaction, setSelectedReaction] = useState<string | null>(
    alert?.user_reaction ?? null,
  );

  const { data: comments = [] } = useQuery<AlertComment[]>({
    queryKey: queryKeys.alerts.comments(id ?? ""),
    queryFn: () => fetchAlertComments(id ?? ""),
    enabled: !!id,
    staleTime: 30_000,
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) =>
      addAlertComment({ alert_id: id!, user_id: user!.id, content }),
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({
        queryKey: queryKeys.alerts.comments(id ?? ""),
      });
    },
  });

  const reactMutation = useMutation({
    mutationFn: (reaction: string) => reactToAlert(id!, user!.id, reaction),
    onSuccess: (_d, reaction) =>
      setSelectedReaction((prev) => (prev === reaction ? null : reaction)),
  });

  const handleSend = useCallback(() => {
    const trimmed = commentText.trim();
    if (!trimmed || !user) return;
    addCommentMutation.mutate(trimmed);
  }, [commentText, user, addCommentMutation]);

  if (!alert) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <BackHeader onBack={goBack} />
        <EmptyState icon="megaphone-outline" message={t("empty_alerts")} />
      </View>
    );
  }

  const meta = ALERT_META[alert.category];

  const Head = (
    <View style={styles.headContent}>
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
      </View>

      {alert.user && (
        <View style={styles.inlineRow}>
          <Avatar uri={alert.user.avatar_url} name={alert.user.full_name} size={28} />
          <Text variant="labelMedium" color={colors.text}>
            {alert.user.full_name}
          </Text>
          <Text variant="caption" color={colors.textTertiary}>
            · {formatShortRelativeTime(alert.created_at)}
          </Text>
        </View>
      )}

      <Text variant="bodyLarge" color={colors.text} style={styles.body}>
        {alert.content}
      </Text>

      {/* Reactions */}
      <View style={styles.reactionsRow}>
        {REACTIONS.map(({ emoji, key }) => {
          const isSel = selectedReaction === key;
          return (
            <Pressable
              key={key}
              onPress={() => user && reactMutation.mutate(key)}
              style={[
                styles.reactionBtn,
                {
                  backgroundColor: isSel
                    ? colors.primaryContainer
                    : colors.surfaceContainerHigh,
                  borderColor: isSel ? colors.primary : colors.borderLight,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`React ${emoji}`}
            >
              <RNText style={styles.reactionEmoji}>{emoji}</RNText>
            </Pressable>
          );
        })}
      </View>

      <Divider />
      <Text variant="titleSmall" color={colors.text} style={styles.bold}>
        {t("comments")} ({comments.length})
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <BackHeader onBack={goBack} title={meta.label} />

      <FlatList
        data={comments}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={Head}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text
            variant="bodySmall"
            color={colors.textTertiary}
            style={styles.noComments}
          >
            No comments yet. Be the first to comment.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.commentItem}>
            <Avatar
              uri={item.user?.avatar_url ?? null}
              name={item.user?.full_name ?? "User"}
              size={30}
            />
            <View
              style={[
                styles.commentBubble,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
            >
              <Text variant="labelSmall" color={colors.text} style={styles.bold}>
                {item.user?.full_name ?? "Anonymous"}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {item.content}
              </Text>
              <Text variant="caption" color={colors.textTertiary}>
                {formatShortRelativeTime(item.created_at)}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Composer — shared with chat */}
      {user ? (
        <View style={{ paddingBottom: insets.bottom }}>
          <Composer
            value={commentText}
            onChangeText={setCommentText}
            onSend={handleSend}
            sending={addCommentMutation.isPending}
            placeholder={t("write_comment")}
          />
        </View>
      ) : (
        <View
          style={[
            styles.signIn,
            {
              paddingBottom: insets.bottom + spacing.md,
              borderTopColor: colors.divider,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Icon name="lock-closed-outline" size={16} color={colors.textSecondary} />
          <Text variant="bodySmall" color={colors.textSecondary}>
            {t("sign_in")} to react and comment
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function BackHeader({
  onBack,
  title = "",
}: {
  onBack: () => void;
  title?: string;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
        <Icon name="arrow-back" size={24} color={colors.text} />
      </Pressable>
      <Text variant="titleMedium" color={colors.text} style={styles.bold}>
        {title}
      </Text>
      <View style={styles.backBtn} />
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
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  listContent: { padding: spacing.lg, gap: spacing.md },
  headContent: { gap: spacing.md, marginBottom: spacing.sm },
  hero: {
    width: "100%",
    height: 200,
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
  noComments: { fontStyle: "italic" },
  commentItem: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  commentBubble: { flex: 1, padding: spacing.md, borderRadius: radius.lg, gap: 2 },
  signIn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
  },
});
