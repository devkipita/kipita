import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Text } from "@/components/core/Text";
import { Avatar } from "@/components/core/Avatar";
import { Icon } from "@/components/core/Icon";
import { Composer, type ComposerAttachment } from "@/components/shared/Composer";
import { VoiceNote } from "@/components/shared/VoiceNote";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useTheme, useLocale, useSafeBack, useAppMode } from "@/hooks";
import { useAuthStore, useUIStore, useChatStore, useDetailStore } from "@/store";
import { spacing, radius } from "@/theme";
import { formatRelativeTime } from "@/lib/formatters";
import { fetchMessages } from "@/lib/api/messages";
import { gateway } from "@/lib/realtime/gateway";
import { haptic } from "@/lib/utils/haptics";
import type { Message } from "@/types";
import type { TranslationKey } from "@/lib/i18n/en";

// Stable reference so the Zustand selector never returns a fresh [] each render
// (a new array every time loops forever → "Maximum update depth exceeded").
const EMPTY_MESSAGES: Message[] = [];

// Context-aware canned replies. The driver and passenger see different phrasing
// so a tap says the right thing for their side of the ride.
const DRIVER_QUICK_REPLIES: TranslationKey[] = [
  "qr_omw",
  "qr_be_right_there",
  "qr_where_pick_you",
  "qr_arrived_pickup",
  "qr_running_late",
];
const PASSENGER_QUICK_REPLIES: TranslationKey[] = [
  "qr_here",
  "qr_where_wait",
  "qr_omw",
  "qr_running_late",
  "qr_thanks",
];

export default function ChatScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { isDriver } = useAppMode();
  const router = useRouter();
  const goBack = useSafeBack();
  const insets = useSafeAreaInsets();
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();

  const user = useAuthStore((s) => s.user);
  const activeChat = useUIStore((s) => s.activeChat);
  const messages = useChatStore(
    (s) => s.messagesByConv[conversationId ?? ""] ?? EMPTY_MESSAGES,
  );
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<ComposerAttachment | null>(null);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (!conversationId) return;
    let mounted = true;
    const chat = useChatStore.getState();
    chat.setActive(conversationId);

    // Seed from server, then let realtime keep it live.
    fetchMessages(conversationId)
      .then((msgs) => {
        if (!mounted) return;
        chat.setMessages(conversationId, msgs);
        setLoading(false);
      })
      .catch(() => mounted && setLoading(false));

    const leave = gateway.joinConversation(conversationId);

    return () => {
      mounted = false;
      useChatStore.getState().setActive(null);
      leave();
    };
  }, [conversationId]);

  const handleSend = useCallback(() => {
    const content = text.trim();
    if ((!content && !attachment) || !user || !conversationId) return;
    setText("");
    setAttachment(null);
    // Global store owns optimistic insert + durable outbox + retry.
    useChatStore.getState().send({
      conversationId,
      senderId: user.id,
      content,
      attachment: attachment
        ? {
            type: attachment.type,
            uri: attachment.uri,
            // GIFs are already public Giphy URLs; images are local until upload.
            remote: attachment.type === "gif",
            meta: { width: attachment.width, height: attachment.height },
          }
        : undefined,
    });
  }, [text, attachment, user, conversationId]);

  const handleOpenProfile = useCallback(() => {
    const participant = activeChat?.participant;
    if (!participant) return;
    haptic.light();
    // Reuse the ride/profile page in person-only mode (no ride details).
    useDetailStore.getState().setPerson(participant);
    router.push(`/ride/${participant.id}?view=profile` as any);
  }, [activeChat?.participant, router]);

  const handleQuickReply = useCallback(
    (message: string) => {
      if (!user || !conversationId) return;
      haptic.light();
      useChatStore.getState().send({
        conversationId,
        senderId: user.id,
        content: message,
      });
    },
    [user, conversationId],
  );

  const handleSendVoice = useCallback(
    (uri: string, durationMs: number) => {
      if (!user || !conversationId) return;
      useChatStore.getState().send({
        conversationId,
        senderId: user.id,
        content: "",
        attachment: { type: "audio", uri, remote: false, meta: { durationMs } },
      });
    },
    [user, conversationId],
  );

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isMine = item.sender_id === user?.id;
      // M3 container role for sent bubbles: softer tonal fill (dark-green bg /
      // light-green text in dark mode) instead of the bright high-emphasis primary.
      const fg = isMine ? colors.onPrimaryContainer : colors.text;
      const isMedia =
        item.attachment_type === "image" || item.attachment_type === "gif";
      const isAudio = item.attachment_type === "audio";
      // Optimistic bubbles keep a temp- id until the server confirms — for
      // image/audio that means the file is still uploading.
      const uploading = item.id.startsWith("temp-") && !!item.attachment_type;
      const ratio =
        item.attachment_meta?.width && item.attachment_meta?.height
          ? item.attachment_meta.width / item.attachment_meta.height
          : 1;

      return (
        <View
          style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleTheirs,
            isMedia && styles.bubbleMedia,
            { backgroundColor: isMine ? colors.primaryContainer : colors.surfaceContainerHigh },
          ]}
        >
          {isMedia && item.attachment_url && (
            <View
              style={[
                styles.media,
                { aspectRatio: Math.max(0.6, Math.min(ratio, 1.6)) },
              ]}
            >
              <Image
                source={{ uri: item.attachment_url }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={150}
              />
              {uploading && (
                <View style={styles.mediaOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </View>
          )}

          {isAudio && item.attachment_url && (
            <VoiceNote
              uri={item.attachment_url}
              durationMs={item.attachment_meta?.durationMs}
              tint={fg}
              track={isMine ? colors.onPrimaryContainer + "66" : colors.outline}
            />
          )}

          {!!item.content && (
            <Text
              variant="bodyMedium"
              color={fg}
              style={isMedia ? styles.mediaCaption : undefined}
            >
              {item.content}
            </Text>
          )}
          <Text
            variant="caption"
            color={isMine ? colors.onPrimaryContainer + "AA" : colors.textTertiary}
            style={[styles.time, isMedia && styles.timeOnMedia]}
          >
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>
      );
    },
    [user?.id, colors],
  );

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + spacing.sm },
        ]}
      >
        <Pressable onPress={goBack} hitSlop={10} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={handleOpenProfile}
          disabled={!activeChat?.participant}
          style={styles.headerPerson}
          accessibilityRole="button"
          accessibilityLabel={`View ${
            activeChat?.participantName ?? "profile"
          }'s profile`}
        >
          <Avatar
            uri={activeChat?.participantAvatar ?? null}
            name={activeChat?.participantName ?? "?"}
            size={36}
          />
          <View style={styles.flex}>
            <Text variant="titleSmall" color={colors.text} numberOfLines={1}>
              {activeChat?.participantName ?? "Chat"}
            </Text>
            <View style={styles.presenceRow}>
              <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
              <Text variant="caption" color={colors.textSecondary}>
                {isDriver ? t("passenger") : t("driver")}
              </Text>
            </View>
          </View>
          {activeChat?.participant && (
            <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
          )}
        </Pressable>
      </View>

      {/* Messages */}
      {loading ? (
        <LoadingState />
      ) : messages.length === 0 ? (
        <View style={styles.flex}>
          <EmptyState icon="chatbubble-outline" message={t("empty_chat")} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Quick replies — role-aware canned messages, hidden while typing */}
      {!text.trim() && !attachment && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.quickRow}
          >
            {(isDriver ? DRIVER_QUICK_REPLIES : PASSENGER_QUICK_REPLIES).map(
              (key) => (
                <Pressable
                  key={key}
                  onPress={() => handleQuickReply(t(key))}
                  style={[
                    styles.quickChip,
                    {
                      backgroundColor: colors.surfaceContainerHigh,
                      borderColor: colors.borderLight,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t(key)}
                >
                  <Text variant="labelMedium" color={colors.primary}>
                    {t(key)}
                  </Text>
                </Pressable>
              ),
            )}
          </ScrollView>
        </Animated.View>
      )}

      {/* Composer with emojis */}
      <View style={{ paddingBottom: insets.bottom }}>
        <Composer
          value={text}
          onChangeText={setText}
          onSend={handleSend}
          placeholder={t("type_message")}
          media
          attachment={attachment}
          onAttachmentChange={setAttachment}
          voice
          onSendVoice={handleSendVoice}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: { width: 36, height: 40, alignItems: "center", justifyContent: "center" },
  headerPerson: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  presenceRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  onlineDot: { width: 7, height: 7, borderRadius: 3.5 },
  quickRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  quickChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  listContent: { padding: spacing.md },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    marginBottom: spacing.xs,
  },
  bubbleMine: { alignSelf: "flex-end", borderBottomRightRadius: radius.xs },
  bubbleTheirs: { alignSelf: "flex-start", borderBottomLeftRadius: radius.xs },
  // Media bubbles: image bleeds to the card edges (only the bubble's rounded
  // corners clip it) — no inner padding, just a small caption/time inset below.
  bubbleMedia: { padding: 0, overflow: "hidden" },
  media: {
    width: 248,
    overflow: "hidden",
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  mediaCaption: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  time: { alignSelf: "flex-end", marginTop: 2 },
  timeOnMedia: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: 2,
  },
});
