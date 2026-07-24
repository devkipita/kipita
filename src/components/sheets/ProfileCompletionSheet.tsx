import React, { memo, useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "../core/Text";
import { TextInput } from "../forms/TextInput";
import { Button } from "../core/Button";
import { useTheme } from "@/hooks";
import { updateProfile } from "@/lib/api/profile";
import { spacing } from "@/theme";
import type { User } from "@/types";

interface ProfileCompletionSheetProps {
  user: User;
  onComplete: (user: User) => void;
  onDismiss: () => void;
}

export const ProfileCompletionSheet = memo(function ProfileCompletionSheet({
  user,
  onComplete,
  onDismiss,
}: ProfileCompletionSheetProps) {
  const { colors } = useTheme();
  const [fullName, setFullName] = useState(user.full_name);
  const [city, setCity] = useState(user.city ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const save = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const profile = await updateProfile(user.id, {
        full_name: fullName.trim(),
        city: city.trim() || null,
      });
      onComplete(profile);
    } catch {
      setError("We could not save your details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [city, fullName, onComplete, user.id]);

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text variant="headlineSmall">Complete your profile</Text>
        <Text variant="bodyMedium" color={colors.textSecondary}>
          Add a name and city so riders can recognise you. You can update these
          later.
        </Text>
      </View>
      <TextInput
        label="Name"
        placeholder="Your name"
        icon="person-outline"
        autoCapitalize="words"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        label="City"
        placeholder="For example, Eldoret"
        icon="location-outline"
        autoCapitalize="words"
        value={city}
        onChangeText={setCity}
        error={error}
      />
      <Button
        label="Save details"
        onPress={save}
        size="lg"
        fullWidth
        loading={loading}
        disabled={fullName.trim().length < 2}
      />
      <Button label="Not now" onPress={onDismiss} variant="ghost" fullWidth />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  copy: {
    gap: spacing.xs,
  },
});
