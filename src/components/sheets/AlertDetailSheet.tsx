import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { Avatar } from "../core/Avatar";
import { Divider } from "../core/Divider";
import { useTheme, useLocale } from "@/hooks";
import { useAuthStore } from "@/store";
import { fetchAlertComments, addAlertComment, reactToAlert } from "@/lib/api";
import { queryKeys } from "@/lib/api";
import { spacing, radius } from "@/theme";
import { formatShortRelativeTime } from "@/lib/formatters";
import type { Alert, AlertComment, AlertCategory } from "@/types";

// ── Category badge colours ──
const CATEGORY_COLORS: Record<AlertCategory, string> = {
  traffic: "#D4B896",
  accident: "#D4B896",
  road_closure: "#D4B896",
  weather: "#9EC5A2",
  police: "#2F6C4F",
  general: "#9EC5A2",
};

const CATEGORY_LABELS: Record<AlertCategory, string> = {
  traffic: "Traffic",
  accident: "Accident",
  road_closure: "Road Closure",
  weather: "Weather",
  police: "Police",
  general: "General",
};

// ── Reaction emojis ──
const REACTIONS = [
  { emoji: "👍", key: "thumbs_up" },
  { emoji: "❤️", key: "heart" },
  { emoji: "😮", key: "wow" },
  { emoji: "😢", key: "sad" },
] as const;

interface AlertDetailSheetProps {
  alert: Alert;
}

export const AlertDetailSheet = function AlertDetailSheet({
  alert,
}: AlertDetailSheetProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState("");
  const [selectedReaction, setSelectedReaction] = useState<string | null>(
    alert.user_reaction ?? null,
  );

  const catColor = CATEGORY_COLORS[alert.category];
  const catLabel = CATEGORY_LABELS[alert.category];

  // ── Fetch comments ──
  const { data: comments = [] } = useQuery<AlertComment[]>({
    queryKey: queryKeys.alerts.comments(alert.id),
    queryFn: () => fetchAlertComments(alert.id),
    staleTime: 30_000,
  });

  // ── Add comment mutation ──
  const addCommentMutation = useMutation({
    mutationFn: (content: string) =>
      addAlertComment({ alert_id: alert.id, user_id: user!.id, content }),
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({
        queryKey: queryKeys.alerts.comments(alert.id),
      });
    },
  });

  // ── React mutation ──
  const reactMutation = useMutation({
    mutationFn: (reaction: string) =>
      reactToAlert(alert.id, user!.id, reaction),
    onSuccess: (_data, reaction) => {
      setSelectedReaction((prev) => (prev === reaction ? null : reaction));
    },
  });

  const handleSendComment = useCallback(() => {
    const trimmed = commentText.trim();
    if (!trimmed || !user) return;
    addCommentMutation.mutate(trimmed);
  }, [commentText, user, addCommentMutation]);

  const handleReaction = useCallback(
    (reactionKey: string) => {
      if (!user) return;
      reactMutation.mutate(reactionKey);
    },
    [user, reactMutation],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      {/* ── FIXED TOP: alert info ── */}
      <View style={styles.fixedTop}>
        {/* Category badge */}
        <View
          style={[styles.categoryBadge, { backgroundColor: catColor + "20" }]}
        >
          <Text variant="labelSmall" color={catColor} style={styles.badgeText}>
            {catLabel.toUpperCase()}
          </Text>
        </View>

        {/* Location & time row */}
        <View style={styles.locationRow}>
          <Icon
            name="location-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Text
            variant="bodyMedium"
            color={colors.text}
            style={styles.locationText}
          >
            {alert.location}
          </Text>
        </View>
        <Text variant="caption" color={colors.textTertiary}>
          {formatShortRelativeTime(alert.created_at)}
        </Text>

        {/* Author row */}
        {alert.user && (
          <View style={styles.authorRow}>
            <Avatar
              uri={alert.user.avatar_url}
              name={alert.user.full_name}
              size={32}
            />
            <View>
              <Text variant="labelMedium" color={colors.text}>
                {alert.user.full_name}
              </Text>
              <Text variant="caption" color={colors.textTertiary}>
                Posted this alert
              </Text>
            </View>
          </View>
        )}

        {/* Alert body text */}
        <View
          style={[
            styles.bodyCard,
            {
              backgroundColor: colors.surfaceVariant ?? colors.card,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <Text
            variant="bodyMedium"
            color={colors.text}
            style={styles.bodyText}
          >
            {alert.content}
          </Text>
        </View>

        {/* Reactions row */}
        <View style={styles.reactionsSection}>
          <Text
            variant="labelSmall"
            color={colors.textSecondary}
            style={styles.reactionsLabel}
          >
            REACTIONS
          </Text>
          <View style={styles.reactionsRow}>
            {REACTIONS.map(({ emoji, key }) => {
              const isSelected = selectedReaction === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => handleReaction(key)}
                  style={[
                    styles.reactionBtn,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryContainer
                        : (colors.surfaceVariant ?? colors.card),
                      borderColor: isSelected
                        ? colors.primary
                        : colors.borderLight,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`React with ${emoji}`}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </Pressable>
              );
            })}
            <View style={styles.reactionCount}>
              <Icon
                name="heart-outline"
                size={14}
                color={colors.textTertiary}
              />
              <Text variant="caption" color={colors.textTertiary}>
                {alert.reactions_count}
              </Text>
            </View>
          </View>
        </View>

        <Divider />
        <Text
          variant="titleSmall"
          color={colors.text}
          style={styles.commentsTitle}
        >
          Comments ({comments.length})
        </Text>
      </View>

      {/* ── SCROLLABLE: comments list ── */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.commentsScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {comments.map((comment) => (
          <View key={comment.id} style={styles.commentItem}>
            <Avatar
              uri={comment.user?.avatar_url ?? null}
              name={comment.user?.full_name ?? "User"}
              size={28}
            />
            <View
              style={[
                styles.commentBubble,
                { backgroundColor: colors.surfaceVariant ?? colors.card },
              ]}
            >
              <Text
                variant="labelSmall"
                color={colors.text}
                style={styles.commentAuthor}
              >
                {comment.user?.full_name ?? "Anonymous"}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {comment.content}
              </Text>
              <Text variant="caption" color={colors.textTertiary}>
                {formatShortRelativeTime(comment.created_at)}
              </Text>
            </View>
          </View>
        ))}
        {comments.length === 0 && (
          <Text
            variant="bodySmall"
            color={colors.textTertiary}
            style={styles.noComments}
          >
            No comments yet. Be the first to comment.
          </Text>
        )}
      </ScrollView>

      {/* ── FIXED BOTTOM: comment input ── */}
      {user ? (
        <View
          style={[
            styles.inputRow,
            { borderTopColor: colors.divider, backgroundColor: colors.surface },
          ]}
        >
          <Avatar uri={user.avatar_url} name={user.full_name} size={32} />
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.surfaceVariant ?? colors.card,
                color: colors.text,
                borderColor: colors.borderLight,
              },
            ]}
            placeholder="Add a comment..."
            placeholderTextColor={colors.textTertiary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={handleSendComment}
            disabled={!commentText.trim() || addCommentMutation.isPending}
            style={[
              styles.sendBtn,
              {
                backgroundColor: commentText.trim()
                  ? colors.primary
                  : colors.divider,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send comment"
          >
            <Icon
              name="send"
              size={18}
              color={commentText.trim() ? "#fff" : colors.textTertiary}
            />
          </Pressable>
        </View>
      ) : (
        <View
          style={[
            styles.signInBar,
            { borderTopColor: colors.divider, backgroundColor: colors.surface },
          ]}
        >
          <Icon
            name="lock-closed-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Text variant="bodySmall" color={colors.textSecondary}>
            Sign in to react and comment
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },

  /* Fixed top */
  fixedTop: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeText: {
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  locationText: {
    fontWeight: "600",
    flex: 1,
  },

  /* Author */
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  /* Body */
  bodyCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  bodyText: {
    lineHeight: 22,
  },

  /* Reactions */
  reactionsSection: {
    gap: spacing.sm,
  },
  reactionsLabel: {
    letterSpacing: 0.5,
  },
  reactionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  reactionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  reactionEmoji: {
    fontSize: 20,
  },
  reactionCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: spacing.sm,
  },

  /* Comments header */
  commentsTitle: {
    fontWeight: "700",
  },

  /* Scrollable comments */
  commentsScrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  noComments: {
    fontStyle: "italic",
  },
  commentItem: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  commentBubble: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  commentAuthor: {
    fontWeight: "700",
  },

  /* Input row */
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Sign-in bar */
  signInBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
  },
});
