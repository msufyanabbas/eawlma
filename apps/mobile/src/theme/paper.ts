import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

import { DARK_COLORS, LIGHT_COLORS } from './index';

export const paperLightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: LIGHT_COLORS.primary,
    onPrimary: LIGHT_COLORS.white,
    primaryContainer: LIGHT_COLORS.primaryLight,
    onPrimaryContainer: LIGHT_COLORS.primaryDark,
    secondary: LIGHT_COLORS.secondary,
    onSecondary: LIGHT_COLORS.white,
    background: LIGHT_COLORS.background,
    onBackground: LIGHT_COLORS.text,
    surface: LIGHT_COLORS.surface,
    onSurface: LIGHT_COLORS.text,
    surfaceVariant: LIGHT_COLORS.surfaceMuted,
    onSurfaceVariant: LIGHT_COLORS.textSecondary,
    error: LIGHT_COLORS.error,
    outline: LIGHT_COLORS.border,
  },
};

export const paperDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: DARK_COLORS.primary,
    onPrimary: DARK_COLORS.white,
    primaryContainer: DARK_COLORS.primaryDark,
    onPrimaryContainer: DARK_COLORS.primaryLight,
    secondary: DARK_COLORS.secondary,
    onSecondary: DARK_COLORS.black,
    background: DARK_COLORS.background,
    onBackground: DARK_COLORS.text,
    surface: DARK_COLORS.surface,
    onSurface: DARK_COLORS.text,
    surfaceVariant: DARK_COLORS.surfaceMuted,
    onSurfaceVariant: DARK_COLORS.textSecondary,
    error: DARK_COLORS.error,
    outline: DARK_COLORS.border,
  },
};
