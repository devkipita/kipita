import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  AccessibilityInfo,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Path,
  G,
  Rect,
  Polygon,
  Defs,
  RadialGradient,
  Stop,
  Circle,
} from 'react-native-svg';
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  interpolate,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/core/Text';
import { Icon } from '@/components/core/Icon';
import { useTheme } from '@/hooks';
import { useModeStore } from '@/store/slices/mode';
import { spacing, radius, shadows } from '@/theme';
import { APP_NAME } from '@/lib/constants';
import type { AppMode } from '@/types';

// Figma illustrations. Rendered as components via react-native-svg-transformer.
// If '@' is not mapped to /src in your tsconfig, use a relative path instead.
import PeopleLeft from '@/assets/PeopleLeft.svg';
import PeopleRight from '@/assets/PeopleRight.svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const REVEAL_DELAY = 1800;

// Fixed brand colours — the mark keeps the exact design colours in every theme,
// it is not tied to theme tokens.
const MARK_BODY = '#064e3b';
const MARK_LEAF = '#9ec5a2';

type Piece = { d: string; from: { x: number; y: number }; delay: number };

const BODY_PIECES: Piece[] = [
  {
    d: 'M125.35,26.53c38.88-4.44,70.3,25.14,72.86,63.3,4.26,63.33-49.67,189.9-103.5,225.83-9.08,6.06-21.56,12.39-25.8-2.02l.25-233.03c4.73-27.23,28.55-50.92,56.18-54.08Z',
    from: { x: -280, y: -280 },
    delay: 0,
  },
  {
    d: 'M317.89,243.48l-.78,3.17,3.91.76c-23.14,10.1-54.79,23.95-40.23,54.4,13.46,28.16,96.36,82.61,124.45,107.1,8.81,7.68,40.22,34.38,40.05,44.89-.19,11.78-24.78,15.05-33.91,16.3-31.79,4.34-75,5.07-106.88,1.75-10.46-1.09-18.49-4.3-26.01-11.8-19.45-19.39-57.82-76.91-65.72-102.82-21.55-70.68,48.97-100.85,105.11-113.74ZM253.28,282.85c-2.56-2.77-10.46,10.68-11.02,12.58,5.97,4.28,12.19-11.32,11.02-12.58ZM246.98,304.89l-6.4,2.64c.98,8.65,1.04,20.32,12.7,17.84l-6.31-20.47ZM257.4,339.69c-4.55,1.28.22,6.47,1.83,8.9,4.52,6.79,19.78,27.45,28.77,21.73l.77-4.01c-5.91-3.18-21.91-25.36-25.55-26.45-1.81-.54-4-.67-5.82-.16ZM358.83,437.19l-1.5-5.58-41.06-37.69c-2.84-1.47-13.44-1.76-14.14,1.57l36.97,40.19c6.51,3.72,12.78,3.27,19.73,1.52Z',
    from: { x: 280, y: 280 },
    delay: 160,
  },
  {
    d: 'M261.16,254.51l-32.94,18.23c-51.27,33.64-60.02,82.29-41.52,138.91,4.69,14.36,17.05,31.16,13.06,45.29-3.68,3.75-51.5,5.61-56.75,3.11-9.07-4.32-6.57-43.12-13.59-51-22.63-7.93-5.08,44.69-12.25,50.37-3.4,2.69-38.06,3.49-44.33,3.07-11.37-.77-18.32-.09-18.16-13.46.3-25.54,18.4-65.95,32.84-87,40.97-59.68,104.53-91.3,173.62-107.52ZM183.98,295.46c-3.68-.67-21.17,13.48-18.89,15.73,7.83-2.18,13.96-9.67,18.89-15.73ZM160.36,319.09c-6.09-4.52-19.89,18.06-20.47,23.6,6.14,5.53,17.38-19.78,20.47-23.6ZM139.87,353.73c-14.68-.46-14.59,23.45-18.83,33.99.13,5.86,9.57,4.14,11.72.62.92-1.51,8.38-33.39,7.11-34.62Z',
    from: { x: -280, y: 280 },
    delay: 80,
  },
];

const LEAF_PIECE: Piece = {
  d: 'M188.72,262.36l1.63-5.44c48.15-33.31,126.05-120.2,191.11-93.58,20.1,8.22,25.14,28.95,7.19,43-21.3,16.68-90.79,26.57-120.27,34.1-26.67,6.8-52.77,15.97-79.66,21.92Z',
  from: { x: 280, y: -280 },
  delay: 240,
};

function MarkPiece({
  piece,
  color,
  reduceMotion,
  float,
}: {
  piece: Piece;
  color: string;
  reduceMotion: boolean;
  float?: SharedValue<number>;
}) {
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    // backOut ease-in, staggered per piece — mirrors the web enterTransition.
    progress.value = withDelay(
      piece.delay,
      withTiming(1, { duration: 1200, easing: Easing.out(Easing.back(1.4)) }),
    );
  }, [reduceMotion]);

  const animatedProps = useAnimatedProps(() => {
    const floatY = float ? float.value * progress.value : 0;
    return {
      opacity: progress.value,
      transform: [
        { translateX: (1 - progress.value) * piece.from.x },
        { translateY: (1 - progress.value) * piece.from.y + floatY },
      ],
    };
  });

  return <AnimatedPath d={piece.d} fill={color} animatedProps={animatedProps} />;
}

function KipitaMark({ size, reduceMotion }: { size: number; reduceMotion: boolean }) {
  const leafFloat = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    leafFloat.value = withDelay(
      1500,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
    return () => {
      leafFloat.value = 0;
    };
  }, [reduceMotion]);

  return (
    <Svg width={size} height={size} viewBox="0 0 500 500">
      {BODY_PIECES.map((piece, i) => (
        <MarkPiece key={i} piece={piece} color={MARK_BODY} reduceMotion={reduceMotion} />
      ))}
      <MarkPiece piece={LEAF_PIECE} color={MARK_LEAF} reduceMotion={reduceMotion} float={leafFloat} />
    </Svg>
  );
}

/** Soft ambient glow behind the mark (approximates the web's blurred halo). */
function MarkGlow({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="markGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <Stop offset="55%" stopColor={color} stopOpacity={0.1} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#markGlow)" />
    </Svg>
  );
}

/** Ported "kipita" logotype. Tagline dropped — the badge already carries it. */
function KipitaWordmark({ width, fill }: { width: number; fill: string }) {
  return (
    <Svg width={width} height={(width * 120) / 500} viewBox="0 0 500 120">
      <G transform="translate(0, -180)">
        <Path
          fill={fill}
          d="M218.95,286.59v-23.37c7.86,3.68,16.37,4.45,23.37-1.53,7.03-6.01,8.05-16.47,2.15-23.69-11.15-13.63-31.36-5.23-32.31,11.36l-.1,64.46-19.86,18.88c-.05-2.72-.82-5.6-.94-8.27-1.07-22.55-1.45-53.29.03-75.65,3.66-55.25,79.45-48.25,78.11.64-.72,26.29-25.63,42.33-50.45,37.17Z"
        />
        <Path
          fill={fill}
          d="M430.47,210.96v76.25h-20.91v-39.66c0-2.61-3.1-7.82-4.91-9.85-8.23-9.25-24.72-7.63-29.84,4.01-7.56,17.19,13.74,31.64,27.98,20.91v23.98c-11.95,1.58-22.22,1.32-32.54-5.28-31.45-20.12-18.99-68.64,18.68-70.99,4.33-.27,7.89.87,11.71.91,9.9.09,19.91-.62,29.82-.27Z"
        />
        <Path
          fill={fill}
          d="M332.09,196.2v12.61c0,.33.95,1.37.61,2.15h15.37v20.91h-15.37c-1.27,13.25,1.1,28.18,15.37,32.59v22.75c-14.24-3.78-26.94-13.52-32.7-27.25-1.21-2.89-3.58-10.14-3.58-13.02v-50.73h20.29Z"
        />
        <Path
          fill={fill}
          d="M151.31,210.96c.28,1.19-.43,1.18-1.04,1.73-22.71,20.7-44.94,42.04-67.82,62.53-3.92,3.51-8.29,7.94-12.92,10.14v-27.36l51.96-47.04h29.82Z"
        />
        <Rect fill={fill} x="159.3" y="210.96" width="21.52" height="72.56" />
        <Rect fill={fill} x="279.21" y="210.96" width="21.52" height="72.56" />
        <Polygon fill={fill} points="90.43 167.3 90.43 231.55 69.53 250.31 69.53 167.3 90.43 167.3" />
        <Polygon fill={fill} points="151.31 283.51 122.72 283.51 103.36 264.14 118.41 250.32 151.31 283.51" />
        <Path
          fill={fill}
          d="M286.42,179.12c21.09-3.89,20.28,27.22,1.23,24.3-14.02-2.15-13.04-22.13-1.23-24.3Z"
        />
        <Path
          fill={fill}
          d="M179.38,199.67c-11.15,11.99-30.13-5.43-18.26-17.34,11.23-11.27,29.52,5.23,18.26,17.34Z"
        />
      </G>
    </Svg>
  );
}

/** Large ambient illustration anchored to a screen corner, bleeding off-edge. */
const CORNER_OPACITY = 0.5;

function CornerArt({
  Art,
  size,
  delay,
  reduceMotion,
  style,
}: {
  Art: React.FC<{ width?: number | string; height?: number | string }>;
  size: number;
  delay: number;
  reduceMotion: boolean;
  style: object;
}) {
  const float = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    float.value = withDelay(
      delay + 600,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, []);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value * -7 }] }));

  return (
    <Animated.View
      pointerEvents="none"
      entering={reduceMotion ? undefined : FadeIn.delay(delay).duration(900)}
      style={[styles.cornerArt, style, { width: size, height: size, opacity: CORNER_OPACITY }, floatStyle]}
    >
      <Art width="100%" height="100%" />
    </Animated.View>
  );
}

/** Splash → mode selection. Two phases: enter (logo flies in) → reveal (content). */
export default function SplashScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setMode = useModeStore(s => s.setMode);
  const { width, height } = useWindowDimensions();

  const [phase, setPhase] = useState<'enter' | 'reveal'>('enter');
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (cancelled) return;
      if (reduced) {
        setReduceMotion(true);
        setPhase('reveal');
      }
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const timer = setTimeout(() => setPhase('reveal'), REVEAL_DELAY);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      // @ts-expect-error older RN typings return void
      sub?.remove?.();
    };
  }, []);

  // Spring the logo from centre → top. Overshoot gives the engaging settle.
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value =
      phase === 'reveal'
        ? reduceMotion
          ? withTiming(1, { duration: 0 })
          : withSpring(1, { stiffness: 45, damping: 15, mass: 1.2 })
        : 0;
  }, [phase, reduceMotion]);

  const logoStyle = useAnimatedStyle(() => ({
    marginTop: interpolate(reveal.value, [0, 1], [height * 0.28, insets.top + spacing.lg]),
    transform: [{ scale: interpolate(reveal.value, [0, 1], [1.1, 1]) }],
  }));

  const handleSelect = useCallback(
    (mode: AppMode) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setMode(mode);
      router.replace('/(tabs)/home');
    },
    [setMode, router],
  );

  const markSize = Math.min(168, width * 0.42);
  const wordmarkWidth = markSize * 0.95;
  const cornerSize = Math.min(260, width * 0.5);
  const isReveal = phase === 'reveal';

  const enter = (delay: number, duration = 550) =>
    reduceMotion
      ? undefined
      : FadeInDown.delay(delay).duration(duration).easing(Easing.out(Easing.cubic));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isReveal && (
        <>
          <CornerArt
            Art={PeopleLeft}
            size={cornerSize}
            delay={300}
            reduceMotion={reduceMotion}
            style={{ top: insets.top - cornerSize * 0.18, left: -cornerSize * 0.32 }}
          />
          <CornerArt
            Art={PeopleRight}
            size={cornerSize}
            delay={420}
            reduceMotion={reduceMotion}
            style={{ bottom: insets.bottom - cornerSize * 0.18, right: -cornerSize * 0.32 }}
          />
        </>
      )}

      {isReveal && (
        <Animated.View
          entering={reduceMotion ? FadeIn.duration(200) : FadeIn.delay(150).duration(450)}
          style={[styles.userButton, { top: insets.top + spacing.sm }]}
        >
          <UserButton onPress={() => router.push('/profile')} />
        </Animated.View>
      )}

      <View style={[styles.content, { maxWidth: CONTENT_MAX_WIDTH }]}>
        <Animated.View style={[styles.logoBlock, logoStyle]}>
          <View style={{ width: markSize, height: markSize }}>
            <MarkGlow size={markSize} color={colors.primary} />
            <KipitaMark size={markSize} reduceMotion={reduceMotion} />
          </View>

          {isReveal && (
            <Animated.View entering={enter(200, 600)} style={styles.wordmarkWrap}>
              <KipitaWordmark width={wordmarkWidth} fill={colors.text} />
            </Animated.View>
          )}
        </Animated.View>

        <View style={styles.actionArea}>
          {isReveal && (
            <>
              <Animated.View entering={reduceMotion ? undefined : ZoomIn.delay(300).duration(400)}>
                <View style={[styles.badge, { backgroundColor: colors.primaryContainer }]}>
                  <Icon name="shield-checkmark-outline" size={13} color={colors.primary} />
                  <Text variant="labelSmall" color={colors.primary} style={styles.badgeText}>
                    Ride · Share · Connect
                  </Text>
                </View>
              </Animated.View>

              <Animated.View entering={enter(350, 650)}>
                <Text variant="displayLarge" style={styles.headline}>
                  Share the <Text variant="displayLarge" color={colors.primary}>ride</Text>.{'\n'}
                  Save <Text variant="displayLarge" color={colors.primary}>more</Text>.
                </Text>
              </Animated.View>

              <View style={styles.buttons}>
                <Animated.View entering={enter(400)}>
                  <ModeButton
                    icon="search-outline"
                    label="Find a ride"
                    description="Find a seat nearby"
                    onPress={() => handleSelect('passenger')}
                  />
                </Animated.View>
                <Animated.View entering={enter(500)}>
                  <ModeButton
                    icon="navigate-outline"
                    label="Offer a ride"
                    description="Share your empty seats"
                    onPress={() => handleSelect('driver')}
                  />
                </Animated.View>
              </View>

              <Animated.View entering={enter(700)}>
                <Text variant="bodySmall" color={colors.textSecondary} style={styles.footer}>
                  Connect with people heading your way and save on every trip.
                </Text>
              </Animated.View>
            </>
          )}
        </View>
      </View>

      {!isReveal && <LoadingDots bottom={insets.bottom + spacing['3xl']} color={colors.textSecondary} />}
    </View>
  );
}

function UserButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Go to profile"
      hitSlop={8}
      style={[
        userStyles.button,
        { backgroundColor: colors.card, borderColor: colors.borderLight },
        shadows.sm,
      ]}
    >
      <Icon name="person-outline" size={20} color={colors.primary} />
    </Pressable>
  );
}

function ModeButton({
  icon,
  label,
  description,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  description: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 16, stiffness: 220 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 200 });
      }}
      hitSlop={8}
      style={[
        modeStyles.button,
        { backgroundColor: colors.card, borderColor: colors.borderLight },
        shadows.sm,
        pressStyle,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
    >
      <View style={[modeStyles.iconWrap, { backgroundColor: colors.primaryContainer }]}>
        <Icon name={icon} size={24} color={colors.primary} />
      </View>
      <View style={modeStyles.copy}>
        <Text variant="headlineSmall">{label}</Text>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {description}
        </Text>
      </View>
      <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
    </AnimatedPressable>
  );
}

function LoadingDots({ bottom, color }: { bottom: number; color: string }) {
  return (
    <View style={[dotStyles.row, { bottom }]}>
      {[0, 1, 2].map(i => (
        <Dot key={i} index={i} color={color} />
      ))}
    </View>
  );
}

function Dot({ index, color }: { index: number; color: string }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      index * 200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: 0.3 + v.value * 0.5,
    transform: [{ scale: 1 + v.value * 0.5 }],
  }));
  return <Animated.View style={[dotStyles.dot, { backgroundColor: color }, style]} />;
}

const CONTENT_MAX_WIDTH = 480;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  userButton: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 20,
  },
  content: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    zIndex: 1,
  },
  cornerArt: {
    position: 'absolute',
    zIndex: 0,
  },
  logoBlock: {
    alignItems: 'center',
  },
  wordmarkWrap: {
    marginTop: spacing.md,
  },
  actionArea: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: spacing['2xl'],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  badgeText: {
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  headline: {
    marginTop: spacing.lg,
    textAlign: 'center',
    lineHeight: 44,
  },
  buttons: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing['2xl'],
  },
  footer: {
    marginTop: spacing.xl,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});

const userStyles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const modeStyles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
});

const dotStyles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});