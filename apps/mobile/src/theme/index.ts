import { StyleSheet, TextStyle } from 'react-native';

export const COLORS = {
  primary: '#6C63A6',
  primaryDark: '#4A3F8F',
  primaryLight: '#8B84C4',
  secondary: '#D4A843',
  secondaryDark: '#B8902A',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceVariant: '#F3F4F6',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  textWhite: '#FFFFFF',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  border: '#E5E7EB',
  divider: '#F3F4F6',
  whatsapp: '#25D366',
  darkBg: '#0F0F1A',
  darkSurface: '#1A1A2E',
};

export const SIZES = {
  xs: 4, sm: 8, md: 12, lg: 16,
  xl: 20, xxl: 24, xxxl: 32,
  caption: 11, small: 12, body: 14,
  bodyLg: 16, subtitle: 18, title: 20,
  h3: 22, h2: 26, h1: 30,
  borderRadius: 8, borderRadiusLg: 12,
  borderRadiusXl: 16, borderRadiusFull: 999,
  tabBarHeight: 64,
};

export const TYPOGRAPHY: Record<string, TextStyle> = {
  h1: { fontSize: 30, fontWeight: '900', fontFamily: 'Tajawal_800ExtraBold' },
  h2: { fontSize: 26, fontWeight: '800', fontFamily: 'Tajawal_800ExtraBold' },
  h3: { fontSize: 22, fontWeight: '700', fontFamily: 'Tajawal_700Bold' },
  h4: { fontSize: 20, fontWeight: '700', fontFamily: 'Tajawal_700Bold' },
  subtitle: { fontSize: 18, fontWeight: '600', fontFamily: 'Tajawal_500Medium' },
  body: { fontSize: 15, fontWeight: '400', fontFamily: 'Tajawal_400Regular' },
  bodyBold: { fontSize: 15, fontWeight: '700', fontFamily: 'Tajawal_700Bold' },
  small: { fontSize: 13, fontWeight: '400', fontFamily: 'Tajawal_400Regular' },
  caption: { fontSize: 11, fontWeight: '400', fontFamily: 'Tajawal_400Regular' },
};

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
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#6C63A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
};
