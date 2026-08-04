import React, { memo, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
  Easing,
} from "react-native-reanimated";
import CarIllustration from "@/assets/car.svg";
import { useTheme } from "@/hooks";

interface MovingCarProps {
  width?: number;
  height?: number;
}

/**
 * The static car SVG made to "drive": a looping suspension bob plus a fast
 * micro-vibration (engine idle), with speed lines streaming past behind it.
 * Pure reanimated — no Lottie asset required. (Lottie would need a purpose-made
 * Bodymovin JSON; it can't animate an existing SVG's paths.)
 */
export const MovingCar = memo(function MovingCar({
  width = 260,
  height = 114,
}: MovingCarProps) {
  const bob = useSharedValue(0);
  const vibrate = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 650, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    vibrate.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 80, easing: Easing.linear }),
        withTiming(-1, { duration: 80, easing: Easing.linear }),
      ),
      -1,
      true,
    );
  }, [bob, vibrate]);

  const carStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bob.value },
      { rotate: `${vibrate.value * 0.5}deg` },
    ],
  }));

  return (
    <View style={[styles.stage, { width, height: height + 8 }]}>
      {/* Speed lines stream past behind the car (it faces right → they exit left) */}
      <SpeedLine width={width} top={height * 0.42} delay={0} lineWidth={34} />
      <SpeedLine width={width} top={height * 0.58} delay={180} lineWidth={22} />
      <SpeedLine width={width} top={height * 0.72} delay={360} lineWidth={28} />

      <Animated.View style={carStyle}>
        <CarIllustration width={width} height={height} />
      </Animated.View>
    </View>
  );
});

/** A single motion streak that sweeps from behind the car and fades out left. */
const SpeedLine = memo(function SpeedLine({
  width,
  top,
  delay,
  lineWidth,
}: {
  width: number;
  top: number;
  delay: number;
  lineWidth: number;
}) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 900, easing: Easing.in(Easing.quad) }),
        -1,
        false,
      ),
    );
  }, [progress, delay]);

  const style = useAnimatedStyle(() => ({
    // Start just left of the car body, sweep further left as it fades.
    transform: [{ translateX: interpolate(progress.value, [0, 1], [width * 0.32, -20]) }],
    opacity: interpolate(progress.value, [0, 0.25, 0.85, 1], [0, 0.55, 0.4, 0]),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.line,
        { top, width: lineWidth, backgroundColor: colors.primary },
        style,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  stage: {
    alignItems: "center",
    justifyContent: "center",
  },
  line: {
    position: "absolute",
    left: 0,
    height: 3,
    borderRadius: 2,
  },
});
