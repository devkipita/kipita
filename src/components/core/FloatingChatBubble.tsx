import React, { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { Text } from './Text';
import { useTheme } from '@/hooks';
import { useUIStore } from '@/store';
import { radius, spacing } from '@/theme';

export const FloatingChatBubble = memo(function FloatingChatBubble() {
  const { colors } = useTheme();
  const activeChat = useUIStore(s => s.activeChat);
  const activeSheet = useUIStore(s => s.activeSheet);
  const openSheet = useUIStore(s => s.openSheet);
  const clearActiveChat = useUIStore(s => s.clearActiveChat);

  if (!activeChat || activeSheet === 'chat') return null;

  const handleOpen = () => {
    openSheet('chat', { conversationId: activeChat.conversationId });
  };

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.wrapper}
    >
      {/* Dismiss (×) button top-right of bubble */}
      <Pressable
        onPress={clearActiveChat}
        style={[styles.dismissBtn, { backgroundColor: colors.textTertiary }]}
      >
        <Icon name="close" size={10} color="#fff" />
      </Pressable>

      {/* Main bubble */}
      <Pressable
        onPress={handleOpen}
        style={[styles.bubble, { backgroundColor: colors.primary }]}
        accessibilityRole="button"
        accessibilityLabel={`Chat with ${activeChat.participantName}`}
      >
        <Avatar uri={activeChat.participantAvatar} name={activeChat.participantName} size={44} />
        <View style={[styles.badge, { backgroundColor: colors.success }]} />
      </Pressable>

      {/* Name tooltip */}
      <View style={[styles.tooltip, { backgroundColor: colors.primary }]}>
        <Text variant="caption" color="#fff" numberOfLines={1}>
          {activeChat.participantName.split(' ')[0]}
        </Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 80,           // above tab bar (tab bar is ~64px + safe area)
    right: spacing.lg,
    alignItems: 'center',
    zIndex: 999,
  },
  bubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  dismissBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  tooltip: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
});
