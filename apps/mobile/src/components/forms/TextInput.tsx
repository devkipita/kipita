import React, { memo, useState, useCallback } from "react";
import {
  View,
  TextInput as RNTextInput,
  StyleSheet,
  Pressable,
  Platform,
  TextInputProps as RNTextInputProps,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { Text } from "../core/Text";
import { Icon, IconName } from "../core/Icon";
import { useTheme } from "@/hooks";
import { spacing, radius, typography, shadows } from "@/theme";

interface TextInputProps extends Omit<RNTextInputProps, "style"> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
}

export const TextInput = memo(function TextInput({
  label,
  error,
  hint,
  icon,
  rightIcon,
  onRightIconPress,
  onFocus,
  onBlur,
  secureTextEntry,
  ...props
}: TextInputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  // Built-in password visibility toggle when secureTextEntry is used and no
  // custom rightIcon is supplied — a nicer default for sign-in forms.
  const isPassword = !!secureTextEntry;
  const [revealed, setRevealed] = useState(false);

  const focusProgress = useSharedValue(0);

  const handleFocus = useCallback(
    (e: any) => {
      setFocused(true);
      focusProgress.value = withTiming(1, { duration: 180 });
      onFocus?.(e);
    },
    [onFocus, focusProgress],
  );

  const handleBlur = useCallback(
    (e: any) => {
      setFocused(false);
      focusProgress.value = withTiming(0, { duration: 180 });
      onBlur?.(e);
    },
    [onBlur, focusProgress],
  );

  // Animated border + background — subtle lift on focus.
  const animatedRow = useAnimatedStyle(() => ({
    shadowOpacity: withTiming(focusProgress.value > 0 ? 0.16 : 0.1, {
      duration: 180,
    }),
    shadowRadius: withTiming(focusProgress.value > 0 ? 18 : 12, {
      duration: 180,
    }),
    borderColor: error
      ? colors.error
      : interpolateColor(
          focusProgress.value,
          [0, 1],
          [colors.inputBorder, colors.inputFocusBorder],
        ),
    borderWidth: error
      ? 1.5
      : withTiming(focusProgress.value > 0 ? 2 : 1.25, { duration: 150 }),
    backgroundColor: error
      ? colors.errorContainer
      : interpolateColor(
          focusProgress.value,
          [0, 1],
          [colors.inputBackground, colors.surfaceContainerLowest],
        ),
  }));

  // Soft focus glow ring (fades in behind the field).
  const glowStyle = useAnimatedStyle(() => ({
    opacity: withTiming(error ? 0 : focusProgress.value * 0.9, {
      duration: 180,
    }),
  }));

  const iconColor = error
    ? colors.error
    : focused
      ? colors.primary
      : colors.placeholder;

  const resolvedRightIcon: IconName | undefined = rightIcon
    ? rightIcon
    : isPassword
      ? revealed
        ? "eye-off-outline"
        : "eye-outline"
      : undefined;

  const handleRightPress = useCallback(() => {
    if (rightIcon) {
      onRightIconPress?.();
    } else if (isPassword) {
      setRevealed((r) => !r);
    }
  }, [rightIcon, onRightIconPress, isPassword]);

  return (
    <View style={styles.container}>
      {label && (
        <Text
          variant="labelMedium"
          color={
            error
              ? colors.error
              : focused
                ? colors.primary
                : colors.textSecondary
          }
          style={styles.label}
        >
          {label}
        </Text>
      )}

      <View style={styles.fieldWrap}>
        {/* Focus glow ring */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            {
              borderColor: colors.inputFocusBorder,
              shadowColor: colors.inputFocusBorder,
            },
            glowStyle,
          ]}
        />

        <Animated.View
          style={[
            styles.inputRow,
            shadows.lg,
            { shadowColor: colors.shadow },
            animatedRow,
          ]}
        >
          {icon && <Icon name={icon} size={20} color={iconColor} />}
          <RNTextInput
            style={[
              styles.input,
              // `typography.input`, not bodyMedium — a sub-16px field makes
              // iOS zoom the page on focus. See the note on the token.
              typography.input,
              { color: colors.text },
              Platform.OS === "web" ? styles.webInputReset : null,
            ]}
            placeholderTextColor={colors.placeholder}
            onFocus={handleFocus}
            onBlur={handleBlur}
            secureTextEntry={isPassword && !revealed}
            {...props}
          />
          {resolvedRightIcon && (
            <Pressable
              onPress={handleRightPress}
              hitSlop={12}
              accessibilityRole="button"
              style={styles.rightBtn}
            >
              <Icon name={resolvedRightIcon} size={20} color={iconColor} />
            </Pressable>
          )}
        </Animated.View>
      </View>

      {error ? (
        <View style={styles.helperRow}>
          <Icon name="alert-circle" size={13} color={colors.error} />
          <Text
            variant="caption"
            color={colors.error}
            style={styles.helperText}
          >
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="caption" color={colors.textTertiary} style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    marginLeft: 2,
  },
  fieldWrap: {
    position: "relative",
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.full,
    borderWidth: 3,
    // Soft outer glow on web/iOS; harmless on Android (no elevation set).
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.25,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    height: "100%",
    padding: 0,
  },
  webInputReset: {
    outlineStyle: "none",
    boxShadow: "none",
  },
  rightBtn: {
    padding: 2,
  },
  helperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 2,
  },
  helperText: {
    flex: 1,
  },
  hint: {
    marginLeft: 2,
  },
});
