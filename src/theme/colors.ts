/** Kipita color palette — Material 3 inspired, Kenya-first */

export const palette = {
  // Greens
  green50: '#E8F5E9',
  green100: '#C8E6C9',
  green200: '#A5D6A7',
  green300: '#81C784',
  green400: '#66BB6A',
  green500: '#4CAF50',
  green600: '#43A047',
  green700: '#388E3C',
  green800: '#2E7D32',
  green900: '#1B5E20',

  // Charcoal / Neutrals
  charcoal50: '#F5F5F6',
  charcoal100: '#E8E8EA',
  charcoal200: '#D1D1D5',
  charcoal300: '#B0B0B7',
  charcoal400: '#8A8A94',
  charcoal500: '#6B6B77',
  charcoal600: '#55555F',
  charcoal700: '#3E3E47',
  charcoal800: '#2A2A31',
  charcoal900: '#1A1A1F',
  charcoal950: '#111114',

  // Accent
  amber400: '#FFCA28',
  amber500: '#FFC107',
  red400: '#EF5350',
  red500: '#F44336',
  blue400: '#42A5F5',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type LightDarkColors = typeof lightColors;

export const lightColors = {
  // Surfaces
  background: '#EFF6EF',
  surface: '#FFFFFF',
  surfaceVariant: '#E8F0E8',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',

  // Text
  text: palette.charcoal900,
  textSecondary: palette.charcoal500,
  textTertiary: palette.charcoal400,
  textInverse: palette.white,

  // Brand
  primary: palette.green800,
  primaryContainer: palette.green100,
  onPrimary: palette.white,
  onPrimaryContainer: palette.green900,

  // Secondary
  secondary: palette.charcoal700,
  secondaryContainer: palette.charcoal100,

  // Status
  error: palette.red500,
  errorContainer: '#FDECEA',
  success: palette.green600,
  successContainer: palette.green50,
  warning: palette.amber500,
  warningContainer: '#FFF8E1',
  info: palette.blue400,

  // UI
  border: palette.charcoal200,
  borderLight: palette.charcoal100,
  divider: palette.charcoal100,
  overlay: 'rgba(0,0,0,0.4)',
  shimmer: palette.charcoal100,

  // Interactive
  ripple: 'rgba(27,94,32,0.12)',
  inputBackground: palette.charcoal50,
  inputBorder: palette.charcoal200,
  inputFocusBorder: palette.green700,
  placeholder: palette.charcoal400,

  // Navigation
  tabActive: palette.green800,
  tabInactive: palette.charcoal400,
  headerBackground: '#EFF6EF',

  // Bottom sheet
  sheetBackground: '#FFFFFF',
  sheetHandle: palette.charcoal300,

  // Badges
  badge: palette.red500,
  badgeText: palette.white,

  // Shadows
  shadow: 'rgba(0,0,0,0.08)',

  // Glass
  glassBg: 'rgba(255,255,255,0.45)',
  glassBorder: 'rgba(255,255,255,0.7)',
  glassHighlight: 'rgba(255,255,255,0.9)',
} as const;

export const darkColors: LightDarkColors = {
  background: palette.charcoal950,
  surface: palette.charcoal900,
  surfaceVariant: palette.charcoal800,
  surfaceElevated: palette.charcoal800,
  card: palette.charcoal900,

  text: palette.charcoal50,
  textSecondary: palette.charcoal400,
  textTertiary: palette.charcoal500,
  textInverse: palette.charcoal900,

  primary: palette.green400,
  primaryContainer: '#1B3D1F',
  onPrimary: palette.charcoal900,
  onPrimaryContainer: palette.green200,

  secondary: palette.charcoal300,
  secondaryContainer: palette.charcoal700,

  error: palette.red400,
  errorContainer: '#3D1515',
  success: palette.green400,
  successContainer: '#1B3D1F',
  warning: palette.amber400,
  warningContainer: '#3D3515',
  info: palette.blue400,

  border: palette.charcoal700,
  borderLight: palette.charcoal800,
  divider: palette.charcoal800,
  overlay: 'rgba(0,0,0,0.6)',
  shimmer: palette.charcoal800,

  ripple: 'rgba(102,187,106,0.15)',
  inputBackground: palette.charcoal800,
  inputBorder: palette.charcoal700,
  inputFocusBorder: palette.green400,
  placeholder: palette.charcoal500,

  tabActive: palette.green400,
  tabInactive: palette.charcoal500,
  headerBackground: palette.charcoal950,

  sheetBackground: palette.charcoal900,
  sheetHandle: palette.charcoal600,

  badge: palette.red400,
  badgeText: palette.white,

  shadow: 'rgba(0,0,0,0.3)',

  // Glass
  glassBg: 'rgba(20,30,20,0.55)',
  glassBorder: 'rgba(255,255,255,0.12)',
  glassHighlight: 'rgba(255,255,255,0.08)',
} as const;
