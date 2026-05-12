// Eawlma mobile theme — matches the web Tajawal + #6C63A6 brand. Two palettes
// (light/dark) plus a shared size/shadow scale. Consumer pattern:
//   const colors = useColors();   // auto-picks based on color scheme
//   <View style={{ backgroundColor: colors.surface }} />
import { useColorScheme } from 'react-native';

export const LIGHT_COLORS = {
  primary: '#6C63A6',
  primaryDark: '#4A3F8F',
  primaryLight: '#8B84C4',
  secondary: '#D4A843',
  secondaryDark: '#B8902A',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F4F6',
  error: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#3B82F6',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  divider: '#F3F4F6',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
  shadow: '#000000',
} as const;

export const DARK_COLORS: typeof LIGHT_COLORS = {
  primary: '#8B84C4',
  primaryDark: '#6C63A6',
  primaryLight: '#A8A2D6',
  secondary: '#E5BE6B',
  secondaryDark: '#D4A843',
  background: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceMuted: '#232342',
  error: '#F87171',
  success: '#4ADE80',
  warning: '#FBBF24',
  info: '#60A5FA',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#2D2D48',
  divider: '#2D2D48',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.7)',
  shadow: '#000000',
};

export type ColorPalette = typeof LIGHT_COLORS;

// Legacy named export — most files just want the light palette constants.
export const COLORS = LIGHT_COLORS;

export const FONTS = {
  regular: 'Tajawal_400Regular',
  medium: 'Tajawal_500Medium',
  bold: 'Tajawal_700Bold',
  extraBold: 'Tajawal_800ExtraBold',
} as const;

export const SIZES = {
  // Spacing
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,

  // Font sizes
  caption: 11,
  small: 12,
  body: 14,
  bodyLg: 16,
  subtitle: 18,
  title: 20,
  h3: 22,
  h2: 26,
  h1: 30,

  // Radii
  borderRadius: 8,
  borderRadiusLg: 12,
  borderRadiusXl: 16,
  borderRadiusFull: 999,

  // Tab bar
  tabBarHeight: 60,

  // Card
  cardElevation: 2,
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#6C63A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

export function useColors(): ColorPalette {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}
