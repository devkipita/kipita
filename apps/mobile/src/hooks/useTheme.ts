import { useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, LightDarkColors } from '@/theme';
import { usePreferencesStore } from '@/store/slices/preferences';

export type ThemeMode = 'light' | 'dark' | 'system';

export function useTheme() {
  const systemScheme = useColorScheme();
  const themeMode = usePreferencesStore(s => s.themeMode);
  const setThemeMode = usePreferencesStore(s => s.setThemeMode);

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  const colors: LightDarkColors = isDark ? darkColors : lightColors;

  const toggle = useCallback(() => {
    const next: ThemeMode = themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light';
    setThemeMode(next);
  }, [themeMode, setThemeMode]);

  return { colors, isDark, themeMode, setThemeMode, toggle };
}
