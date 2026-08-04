import React, { memo, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";

type Variant = "success" | "error";

interface PaymentResultAnimationProps {
  variant: Variant;
  /** Fill colour of the badge circle. */
  color: string;
  /** Colour of the check/cross mark (defaults to white). */
  markColor?: string;
  size?: number;
}

const SPRING_IN = { damping: 11, stiffness: 150, mass: 0.7 };
const MARK_SPRING = { damping: 8, stiffness: 180, mass: 0.6 };

/**
 * Animated payment outcome badge — a spring-popping circle with a drawn
 * checkmark (success) or cross (failure/cancel). Success radiates a soft
 * ripple; failure gives a quick shake. Pure Reanimated so it runs the same on
 * native and web (no Lottie asset needed).
 */
export const PaymentResultAnimation = memo(function PaymentResultAnimation({
  variant,
  color,
  markColor = "#FFFFFF",
  size = 108,
}: PaymentResultAnimationProps) {
  const circle = useSharedValue(0);
  const mark = useSharedValue(0);
  const ripple = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => {
    circle.value = withDelay(60, withSpring(1, SPRING_IN));
    mark.value = withDelay(240, withSpring(1, MARK_SPRING));

    if (variant === "success") {
      ripple.value = withDelay(
        220,
        withRepeat(
          withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }),
          -1,
          false,
        ),
      );
    } else {
      shake.value = withDelay(
        300,
        withSequence(
          withTiming(1, { duration: 55 }),
          withTiming(-1, { duration: 55 }),
          withTiming(0.6, { duration: 55 }),
          withTiming(0, { duration: 55 }),
        ),
      );
    }
  }, [variant, circle, mark, ripple, shake]);

  const circleStyle = useAnimatedStyle(() => ({
    opacity: circle.value,
    transform: [
      { scale: circle.value },
      { translateX: shake.value * 9 },
    ],
  }));

  const markStyle = useAnimatedStyle(() => ({
    opacity: mark.value,
    transform: [{ scale: mark.value }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: (1 - ripple.value) * 0.35,
    transform: [{ scale: 0.75 + ripple.value * 1.35 }],
  }));

  const badge = size;
  const markColorStyle = { borderColor: markColor };

  return (
    <View style={[styles.stage, { width: badge * 2, height: badge * 1.6 }]}>
      {variant === "success" && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ripple,
            { width: badge, height: badge, borderRadius: badge / 2, backgroundColor: color },
            rippleStyle,
          ]}
        />
      )}

      <Animated.View
        style={[
          styles.circle,
          { width: badge, height: badge, borderRadius: badge / 2, backgroundColor: color },
          circleStyle,
        ]}
      >
        <Animated.View style={markStyle}>
          {variant === "success" ? (
            <View
              style={[
                styles.check,
                markColorStyle,
                { width: badge * 0.24, height: badge * 0.44 },
              ]}
            />
          ) : (
            <View style={styles.cross}>
              <View
                style={[
                  styles.crossBar,
                  { backgroundColor: markColor, width: badge * 0.46 },
                ]}
              />
              <View
                style={[
                  styles.crossBar,
                  styles.crossBarAlt,
                  { backgroundColor: markColor, width: badge * 0.46 },
                ]}
              />
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  stage: { alignItems: "center", justifyContent: "center" },
  ripple: { position: "absolute" },
  circle: { alignItems: "center", justifyContent: "center" },
  // Classic CSS checkmark: a box with two borders, rotated 45°.
  check: {
    borderRightWidth: 5,
    borderBottomWidth: 5,
    marginTop: -6,
    transform: [{ rotate: "45deg" }],
  },
  cross: { alignItems: "center", justifyContent: "center" },
  crossBar: {
    position: "absolute",
    height: 5,
    borderRadius: 3,
    transform: [{ rotate: "45deg" }],
  },
  crossBarAlt: { transform: [{ rotate: "-45deg" }] },
});
