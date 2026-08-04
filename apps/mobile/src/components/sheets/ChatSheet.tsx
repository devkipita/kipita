import React, {
  memo,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  useState,
} from "react";
import {
  View,
  StyleSheet,
  TextInput as RNTextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Text } from "../core/Text";
import { Avatar } from "../core/Avatar";
import { Icon } from "../core/Icon";
import { LoadingState } from "../feedback/LoadingState";
import { EmptyState } from "../feedback/EmptyState";
import { useTheme, useLocale } from "@/hooks";
import { useAuthStore } from "@/store";
import { spacing, radius, typography } from "@/theme";
import { formatRelativeTime } from "@/lib/formatters";
import {
  messagesReducer,
  initialMessagesState,
} from "@/store/reducers/messages";
import { fetchMessages, sendMessage } from "@/lib/api/messages";
import type { Message } from "@/types";

interface ChatSheetProps {
  conversationId: string;
}

export const ChatSheet = memo(function ChatSheet({
  conversationId,
}: ChatSheetProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const [state, dispatch] = useReducer(messagesReducer, initialMessagesState);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlashList<Message>>(null);

  const messages = state.messagesByConversation[conversationId] ?? [];

  useEffect(() => {
    let mounted = true;
    dispatch({ type: "SET_ACTIVE", payload: conversationId });

    fetchMessages(conversationId)
      .then((msgs) => {
        if (mounted) {
          dispatch({
            type: "SET_MESSAGES",
            payload: { conversationId, messages: msgs },
          });
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      dispatch({ type: "SET_ACTIVE", payload: null });
    };
  }, [conversationId]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || !user) return;
    const content = text.trim();
    setText("");

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      read: false,
      created_at: new Date().toISOString(),
    };
    dispatch({ type: "OPTIMISTIC_SEND", payload: optimistic });

    try {
      const real = await sendMessage({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
      });
      dispatch({ type: "CONFIRM_SEND", payload: { tempId, message: real } });
    } catch {
      // Keep optimistic message visible, mark as failed in future iteration
    }
  }, [text, user, conversationId]);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isMine = item.sender_id === user?.id;
      return (
        <View
          style={[
            chatStyles.bubble,
            isMine ? chatStyles.bubbleMine : chatStyles.bubbleTheirs,
            {
              backgroundColor: isMine ? colors.primary : colors.surfaceVariant,
            },
          ]}
        >
          <Text
            variant="bodyMedium"
            color={isMine ? colors.onPrimary : colors.text}
          >
            {item.content}
          </Text>
          <Text
            variant="caption"
            color={isMine ? colors.onPrimary + "AA" : colors.textTertiary}
            style={chatStyles.time}
          >
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>
      );
    },
    [user?.id, colors],
  );

  if (loading) return <LoadingState />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <View style={styles.listWrap}>
        {messages.length === 0 ? (
          <EmptyState icon="chatbubble-outline" message={t("empty_chat")} />
        ) : (
          <FlashList
            ref={listRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: spacing.md }}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
          />
        )}
      </View>

      {/* Input */}
      <View
        style={[
          styles.inputRow,
          { backgroundColor: colors.surface, borderTopColor: colors.divider },
        ]}
      >
        <RNTextInput
          style={[
            styles.input,
            typography.bodyMedium,
            { color: colors.text, backgroundColor: colors.inputBackground },
            Platform.OS === "web" ? styles.webInputReset : null,
          ]}
          placeholder={t("type_message")}
          placeholderTextColor={colors.placeholder}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <Pressable
          onPress={handleSend}
          disabled={!text.trim()}
          style={[
            styles.sendBtn,
            { backgroundColor: text.trim() ? colors.primary : colors.border },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("send")}
        >
          <Icon
            name="send"
            size={18}
            color={text.trim() ? colors.onPrimary : colors.textTertiary}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listWrap: {
    flex: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
  },
  webInputReset: {
    outlineStyle: "none",
    boxShadow: "none",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

const chatStyles = StyleSheet.create({
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    marginBottom: spacing.xs,
  },
  bubbleMine: {
    alignSelf: "flex-end",
    borderBottomRightRadius: radius.xs,
  },
  bubbleTheirs: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: radius.xs,
  },
  time: {
    alignSelf: "flex-end",
    marginTop: 2,
  },
});
