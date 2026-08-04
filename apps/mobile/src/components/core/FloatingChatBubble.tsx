import React, { memo, useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  FadeInRight,
  FadeOutRight,
  LinearTransition,
} from 'react-native-reanimated';
import { useRouter, usePathname } from 'expo-router';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { Text } from './Text';
import { useTheme, useLocale } from '@/hooks';
import { useUIStore, useChatStore, useAuthStore } from '@/store';
import { radius, spacing } from '@/theme';
import type { Message } from '@/types';

// Stable empty reference so the selector never returns a fresh [] each render.
const EMPTY: Message[] = [];
// How long the preview card stays open after a new message before collapsing.
const PEEK_MS = 4200;

/** Short human label for a message that carries an attachment. */
function attachmentLabel(m: Message): string | null {
  switch (m.attachment_type) {
    case 'image':
      return '📷 Photo';
    case 'gif':
      return 'GIF';
    case 'audio':
      return '🎤 Voice message';
    default:
      return null;
  }
}

export const FloatingChatBubble = memo(function FloatingChatBubble() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const userId = useAuthStore((s) => s.user?.id);
  const activeChat = useUIStore((s) => s.activeChat);
  const clearActiveChat = useUIStore((s) => s.clearActiveChat);
  const messages = useChatStore(
    (s) => s.messagesByConv[activeChat?.conversationId ?? ''] ?? EMPTY,
  );
  const unread = useChatStore((s) =>
    activeChat ? s.unreadByConv[activeChat.conversationId] ?? 0 : 0,
  );

  const last = messages.length ? messages[messages.length - 1] : null;
  const lastId = last?.id ?? null;
  const incoming = !!last && last.sender_id !== userId;

  // Collapsed to a circle by default; peeks open only when a *new incoming*
  // message lands, then folds back on its own.
  const [expanded, setExpanded] = useState(false);
  const prevLastId = useRef<string | null | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // First render just establishes the baseline — don't pop open for history.
    if (prevLastId.current === undefined) {
      prevLastId.current = lastId;
      return;
    }
    if (lastId && lastId !== prevLastId.current && incoming) {
      setExpanded(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setExpanded(false), PEEK_MS);
    }
    prevLastId.current = lastId;
  }, [lastId, incoming]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Hide while already viewing a chat thread.
  if (!activeChat || pathname?.startsWith('/chat')) return null;

  const handleOpen = () => {
    if (timer.current) clearTimeout(timer.current);
    router.push(`/chat/${activeChat.conversationId}` as any);
  };

  const preview = last
    ? attachmentLabel(last) ?? (last.content ? last.content : t('tap_to_chat'))
    : t('tap_to_chat');
  const mine = last?.sender_id === userId;
  const firstName = activeChat.participantName.split(' ')[0];
  const accent = unread > 0 ? colors.primary : colors.borderLight;

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOut.duration(150)}
      style={styles.wrapper}
    >
      <Animated.View layout={LinearTransition.duration(260)}>
        <Pressable
          onPress={handleOpen}
          style={[
            styles.card,
            expanded ? styles.cardExpanded : styles.cardCollapsed,
            { backgroundColor: colors.surfaceContainerHigh, borderColor: accent },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Chat with ${activeChat.participantName}.${
            unread > 0 ? ` ${unread} unread messages.` : ''
          }`}
        >
          {/* Sliding preview — only mounted while expanded */}
          {expanded && (
            <Animated.View
              entering={FadeInRight.duration(200)}
              exiting={FadeOutRight.duration(140)}
              style={styles.body}
            >
              <Text
                variant="labelLarge"
                color={colors.text}
                numberOfLines={1}
                style={styles.name}
              >
                {firstName}
              </Text>
              <Text
                variant="caption"
                color={unread > 0 ? colors.text : colors.textSecondary}
                numberOfLines={1}
                style={unread > 0 ? styles.bold : undefined}
              >
                {mine ? `You: ${preview}` : preview}
              </Text>
            </Animated.View>
          )}

          {/* Avatar puck — the persistent "circle with name" (initials) */}
          <View style={styles.puck}>
            <Avatar
              uri={activeChat.participantAvatar}
              name={activeChat.participantName}
              size={44}
            />
            {/* Presence dot */}
            <View
              style={[
                styles.presence,
                { backgroundColor: colors.success, borderColor: colors.surfaceContainerHigh },
              ]}
            />
            {/* Unread pill sits on the puck when collapsed */}
            {unread > 0 && (
              <View style={[styles.countBadge, { backgroundColor: colors.error }]}>
                <Text variant="caption" color="#fff" style={styles.countText}>
                  {unread > 9 ? '9+' : unread}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </Animated.View>

      {/* Dismiss (×) — only while the card is open, keeps the circle clean */}
      {expanded && (
        <Animated.View
          entering={FadeInRight.duration(200)}
          exiting={FadeOut.duration(120)}
          style={styles.dismissWrap}
        >
          <Pressable
            onPress={clearActiveChat}
            style={[styles.dismissBtn, { backgroundColor: colors.inverseSurface }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Dismiss chat"
          >
            <Icon name="close" size={12} color={colors.inverseOnSurface} />
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 84, // above tab bar (tab bar is ~64px + safe area)
    right: spacing.lg,
    alignItems: 'flex-end',
    zIndex: 999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  // Collapsed = a clean circular puck.
  cardCollapsed: { padding: spacing.xs },
  // Expanded = a pill that grows left of the puck.
  cardExpanded: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    gap: spacing.sm,
  },
  body: { width: 158, gap: 1 },
  name: { fontWeight: '700' },
  bold: { fontWeight: '700' },
  puck: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presence: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 2,
  },
  countBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  countText: { fontWeight: '800' },
  dismissWrap: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 10,
  },
  dismissBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
