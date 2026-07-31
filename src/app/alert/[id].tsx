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
import { ViewsGlyph } from "@/components/core/GlyphIcons";
import { Avatar } from "@/components/core/Avatar";
import { Divider } from "@/components/core/Divider";
import { Composer, type ComposerAttachment } from "@/components/shared/Composer";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ALERT_META } from "@/components/cards/alertMeta";
import { useTheme, useLocale, useSafeBack } from "@/hooks";
import { useAuthStore, useDetailStore, useUIStore } from "@/store";
import {
  fetchAlertComments,
  addAlertComment,
  setCommentLike,
  reactToAlert,
  queryKeys,
} from "@/lib/api";
import { uploadChatMedia } from "@/lib/api/storage";
import { spacing, radius } from "@/theme";
import { formatShortRelativeTime, formatCompactNumber } from "@/lib/formatters";
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
  const openSheet = useUIStore((s) => s.openSheet);
  const queryClient = useQueryClient();

  const alert = useDetailStore((s) => (id ? s.alerts[id] : undefined));
  const [commentText, setCommentText] = useState("");
  const [attachment, setAttachment] = useState<ComposerAttachment | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(
    alert?.user_reaction ?? null,
  );

  const { data: comments = [] } = useQuery<AlertComment[]>({
    queryKey: queryKeys.alerts.comments(id ?? ""),
    queryFn: () => fetchAlertComments(id ?? "", user?.id),
    enabled: !!id,
    staleTime: 30_000,
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({
      content,
      media,
    }: {
      content: string;
      media: ComposerAttachment | null;
    }) => {
      // GIFs are already hosted (remote Giphy URL); photos upload to storage.
      let image_url: string | null = null;
      if (media) {
        image_url =
          media.type === "gif"
            ? media.uri
            : await uploadChatMedia(media.uri, user!.id, "image");
      }
      return addAlertComment({
        alert_id: id!,
        user_id: user!.id,
        content,
        image_url,
      });
    },
    onSuccess: () => {
      setCommentText("");
      setAttachment(null);
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

  const commentsKey = queryKeys.alerts.comments(id ?? "");
  const likeCommentMutation = useMutation({
    mutationFn: ({ comment }: { comment: AlertComment }) =>
      setCommentLike(comment.id, user!.id, !comment.liked_by_me),
    // Optimistically flip the heart + count so the tap feels instant.
    onMutate: async ({ comment }) => {
      await queryClient.cancelQueries({ queryKey: commentsKey });
      const prev = queryClient.getQueryData<AlertComment[]>(commentsKey);
      queryClient.setQueryData<AlertComment[]>(commentsKey, (old) =>
        (old ?? []).map((c) =>
          c.id === comment.id
            ? {
                ...c,
                liked_by_me: !c.liked_by_me,
                likes_count: Math.max(
                  0,
                  (c.likes_count ?? 0) + (c.liked_by_me ? -1 : 1),
                ),
              }
            : c,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(commentsKey, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey });
    },
  });

  const handleLikeComment = useCallback(
    (comment: AlertComment) => {
      if (!user) return;
      likeCommentMutation.mutate({ comment });
    },
    [user, likeCommentMutation],
  );

  const handleSend = useCallback(() => {
    const trimmed = commentText.trim();
    if ((!trimmed && !attachment) || !user) return;
    addCommentMutation.mutate({ content: trimmed, media: attachment });
  }, [commentText, attachment, user, addCommentMutation]);

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

      {/* Likes + views — tap either to see who reacted / viewed */}
      <View style={styles.metaRow}>
        <Pressable
          onPress={() =>
            openSheet("alert_viewers", { alert, initialTab: "likes" })
          }
          style={styles.viewsRow}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`${alert.reactions_count} ${t("likes")}`}
        >
          <Icon name="heart" size={16} color={colors.textSecondary} />
          <Text variant="labelMedium" color={colors.textSecondary}>
            {formatCompactNumber(alert.reactions_count)}{" "}
            {t("likes").toLowerCase()}
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            openSheet("alert_viewers", { alert, initialTab: "views" })
          }
          style={styles.viewsRow}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`${alert.views_count} ${t("views")}`}
        >
          <ViewsGlyph size={16} color={colors.textSecondary} />
          <Text variant="labelMedium" color={colors.textSecondary}>
            {formatCompactNumber(alert.views_count)} {t("views").toLowerCase()}
          </Text>
        </Pressable>
      </View>

      <Divider />
      <Text variant="titleMedium" color={colors.text} style={styles.bold}>
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
            variant="bodyMedium"
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
              size={38}
            />
            <View style={styles.commentBody}>
              <View style={styles.commentHead}>
                <View style={styles.commentByline}>
                  <Text
                    variant="bodyMedium"
                    color={colors.text}
                    style={styles.bold}
                    numberOfLines={1}
                  >
                    {item.user?.full_name ?? "Anonymous"}
                  </Text>
                  <Text variant="caption" color={colors.textTertiary}>
                    · {formatShortRelativeTime(item.created_at)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleLikeComment(item)}
                  disabled={!user}
                  style={styles.likeBtn}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={
                    item.liked_by_me ? "Unlike comment" : "Like comment"
                  }
                >
                  <Icon
                    name={item.liked_by_me ? "heart" : "heart-outline"}
                    size={16}
                    color={item.liked_by_me ? colors.error : colors.textTertiary}
                  />
                  {!!item.likes_count && (
                    <Text
                      variant="caption"
                      color={item.liked_by_me ? colors.error : colors.textTertiary}
                    >
                      {formatCompactNumber(item.likes_count)}
                    </Text>
                  )}
                </Pressable>
              </View>
              {!!item.content && (
                <Text
                  variant="bodyMedium"
                  color={colors.text}
                  style={styles.commentText}
                >
                  {item.content}
                </Text>
              )}
              {!!item.image_url && (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.commentImage}
                  contentFit="cover"
                  transition={150}
                />
              )}
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
            media
            attachment={attachment}
            onAttachmentChange={setAttachment}
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

  listContent: { padding: spacing.lg, gap: spacing.lg },
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
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  viewsRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  reactionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  reactionEmoji: { fontSize: 20 },
  noComments: { fontStyle: "italic" },
  commentItem: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  commentBody: { flex: 1, gap: 4, paddingTop: 2 },
  commentHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  commentByline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  commentText: { lineHeight: 22 },
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  commentImage: {
    marginTop: 4,
    width: "80%",
    height: 180,
    borderRadius: radius.lg,
    backgroundColor: "#0002",
  },
  signIn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
  },
});
