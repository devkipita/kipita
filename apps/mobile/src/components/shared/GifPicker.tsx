import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { useTheme } from "@/hooks";
import { useDebounce } from "@/hooks";
import { spacing, radius, typography } from "@/theme";
import { searchGifs, type GifResult } from "@/lib/api/giphy";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface GifPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (gif: GifResult) => void;
}

export function GifPicker({ visible, onClose, onSelect }: GifPickerProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 350);
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setLoading(true);
    searchGifs(debounced)
      .then((r) => active && setGifs(r))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [debounced, visible]);

  const handleSelect = useCallback(
    (gif: GifResult) => {
      onSelect(gif);
      onClose();
      setQuery("");
    },
    [onSelect, onClose],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.md },
        ]}
      >
        <View style={styles.header}>
          <Text variant="titleMedium" color={colors.text}>
            Pick a GIF
          </Text>
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
            <Icon name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View
          style={[styles.searchRow, { backgroundColor: colors.inputBackground }]}
        >
          <Icon name="search-outline" size={18} color={colors.placeholder} />
          <TextInput
            style={[styles.searchInput, typography.input, { color: colors.text }]}
            placeholder="Search GIFs"
            placeholderTextColor={colors.placeholder}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : gifs.length === 0 ? (
          <View style={styles.center}>
            <Text variant="bodySmall" color={colors.textTertiary}>
              No GIFs found
            </Text>
          </View>
        ) : (
          <FlatList
            data={gifs}
            keyExtractor={(g) => g.id}
            numColumns={3}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.grid}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={[styles.gifCell, { backgroundColor: colors.surfaceContainer }]}
                onPress={() => handleSelect(item)}
                accessibilityRole="button"
                accessibilityLabel="Select GIF"
              >
                <Image
                  source={{ uri: item.preview }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={120}
                />
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    height: "70%",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    paddingBottom: spacing.lg,
  },
  gridRow: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  gifCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: "hidden",
  },
});
