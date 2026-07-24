import React, { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../core/Text';
import { Icon } from '../core/Icon';
import { Avatar } from '../core/Avatar';
import { useTheme, useLocale } from '@/hooks';
import { spacing, radius, shadows } from '@/theme';
import { formatShortRelativeTime, truncateWords } from '@/lib/formatters';
import type { Alert, AlertCategory } from '@/types';
import type { IconName } from '../core/Icon';

const CATEGORY_ICONS: Record<AlertCategory, IconName> = {
  traffic: 'car',
  accident: 'warning',
  road_closure: 'close-circle',
  weather: 'rainy',
  police: 'shield',
  general: 'megaphone',
};

const CATEGORY_COLORS: Record<AlertCategory, string> = {
  traffic: '#FF9F0A',
  accident: '#FF453A',
  road_closure: '#FF2D55',
  weather: '#3B9EFF',
  police: '#BF5AF2',
  general: '#64D2FF',
};

const CATEGORY_LABELS: Record<AlertCategory, string> = {
  traffic: 'Traffic',
  accident: 'Accident',
  road_closure: 'Road closed',
  weather: 'Weather',
  police: 'Police',
  general: 'Update',
};

const MAX_WORDS = 26;

interface AlertCardProps {
  alert: Alert;
  onPress: () => void;
}

/** Single, co-located engagement group — like + comment stacked in one place. */
function Engagement({
  alert,
  iconColor,
  countColor,
}: {
  alert: Alert;
  iconColor: string;
  countColor: string;
}) {
  const liked = !!alert.user_reaction;
  return (
    <View style={engagement.group}>
      <View style={engagement.item}>
        <Icon
          name={liked ? 'heart' : 'heart-outline'}
          size={22}
          color={liked ? '#FF375F' : iconColor}
        />
        <Text variant="caption" color={countColor}>
          {alert.reactions_count}
        </Text>
      </View>
      <View style={engagement.item}>
        <Icon name="chatbubble-outline" size={20} color={iconColor} />
        <Text variant="caption" color={countColor}>
          {alert.comments_count}
        </Text>
      </View>
    </View>
  );
}

export const AlertCard = memo(function AlertCard({ alert, onPress }: AlertCardProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const catIcon = CATEGORY_ICONS[alert.category];
  const catColor = CATEGORY_COLORS[alert.category];
  const catLabel = CATEGORY_LABELS[alert.category];

  const { text: body, truncated } = truncateWords(alert.content, MAX_WORDS);
  const authorName = alert.user?.full_name ?? catLabel;

  // ── Immersive media variant (image-backed) ──
  if (alert.image_url) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.media, shadows.md, { opacity: pressed ? 0.95 : 1 }]}
        accessibilityRole="button"
      >
        <Image
          source={{ uri: alert.image_url }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.88)']}
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
          <View style={styles.mediaContent}>
            <Text variant="titleSmall" color="#fff" numberOfLines={1}>
              {alert.location}
            </Text>
            <Text variant="bodySmall" color="rgba(255,255,255,0.92)" numberOfLines={2}>
              {body}
              {truncated ? ` ${t('read_more')}` : ''}
            </Text>
            <View style={styles.metaRow}>
              {alert.user && (
                <Avatar uri={alert.user.avatar_url} name={alert.user.full_name} size={18} />
              )}
              <Text variant="caption" color="rgba(255,255,255,0.7)">
                {authorName} · {formatShortRelativeTime(alert.created_at)}
              </Text>
            </View>
          </View>
          <Engagement alert={alert} iconColor="#fff" countColor="rgba(255,255,255,0.9)" />
        </View>
      </Pressable>
    );
  }

  // ── Clean, borderless feed row (comment-style) ──
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
      accessibilityRole="button"
    >
      <Avatar uri={alert.user?.avatar_url} name={authorName} size={40} />

      <View style={styles.body}>
        <View style={styles.authorLine}>
          <Text variant="labelLarge" color={colors.text} numberOfLines={1} style={styles.author}>
            {authorName}
          </Text>
          <View style={[styles.catDot, { backgroundColor: catColor }]} />
          <Text variant="labelSmall" color={catColor} numberOfLines={1}>
            {catLabel}
          </Text>
        </View>

        <Text variant="labelSmall" color={colors.textSecondary} style={styles.location} numberOfLines={1}>
          {alert.location}
        </Text>

        <Text variant="bodyMedium" color={colors.text} style={styles.content}>
          {body}
          {truncated && (
            <Text variant="bodyMedium" color={colors.primary}>
              {'  '}
              {t('read_more')}
            </Text>
          )}
        </Text>

        <Text variant="caption" color={colors.textTertiary} style={styles.time}>
          {formatShortRelativeTime(alert.created_at)}
        </Text>
      </View>

      <Engagement alert={alert} iconColor={colors.textSecondary} countColor={colors.textTertiary} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  // Clean feed row
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  authorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  author: {
    flexShrink: 1,
    fontWeight: '700',
  },
  catDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  location: {
    marginTop: -1,
  },
  content: {
    lineHeight: 20,
    marginTop: 2,
  },
  time: {
    marginTop: 2,
  },

  // Media variant
  media: {
    height: 200,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
    justifyContent: 'space-between',
  },
  mediaTop: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  mediaBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    gap: spacing.sm,
  },
  mediaContent: {
    flex: 1,
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  catChipText: {
    fontWeight: '700',
  },
});

const engagement = StyleSheet.create({
  group: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: 2,
    paddingLeft: spacing.xs,
  },
  item: {
    alignItems: 'center',
    gap: 2,
    minWidth: 28,
  },
});
