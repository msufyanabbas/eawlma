import { PaletteOptions } from '@mui/material/styles';

// Brand palette
//   primary   #1B4FD8  — confident blue
//   secondary #F59E0B  — warm amber
//   accent    #10B981  — emerald (used as `success` so MUI utilities pick it up)
//   hero bg   #0F172A  — slate-900 — used for dark hero sections
//   surface   #F8FAFC  — slate-50 — page background in light mode

export const lightPalette: PaletteOptions = {
  mode: 'light',
  primary: {
    main: '#1B4FD8',
    light: '#3B6CE0',
    dark: '#143CA8',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#F59E0B',
    light: '#FBBF24',
    dark: '#B45309',
    contrastText: '#0F172A',
  },
  success: {
    main: '#10B981',
    light: '#34D399',
    dark: '#047857',
    contrastText: '#FFFFFF',
  },
  error: {
    main: '#DC2626',
    light: '#EF4444',
    dark: '#991B1B',
  },
  warning: {
    main: '#F59E0B',
    light: '#FBBF24',
    dark: '#B45309',
  },
  info: {
    main: '#0EA5E9',
    light: '#38BDF8',
    dark: '#0369A1',
  },
  grey: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  background: {
    default: '#F8FAFC',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    disabled: '#94A3B8',
  },
  divider: '#E2E8F0',
};

export const darkPalette: PaletteOptions = {
  mode: 'dark',
  primary: {
    main: '#3B6CE0',
    light: '#7B9EF5',
    dark: '#1B4FD8',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#FBBF24',
    light: '#FCD34D',
    dark: '#B45309',
    contrastText: '#0F172A',
  },
  success: {
    main: '#34D399',
    light: '#6EE7B7',
    dark: '#10B981',
    contrastText: '#0F172A',
  },
  error: {
    main: '#F87171',
    light: '#FCA5A5',
    dark: '#DC2626',
  },
  warning: {
    main: '#FBBF24',
    light: '#FCD34D',
    dark: '#B45309',
  },
  info: {
    main: '#38BDF8',
    light: '#7DD3FC',
    dark: '#0369A1',
  },
  grey: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  background: {
    default: '#0F172A',
    paper: '#1E293B',
  },
  text: {
    primary: '#F8FAFC',
    secondary: '#CBD5E1',
    disabled: '#64748B',
  },
  divider: '#334155',
};

// Branded "hero" surface and accent — exposed via the theme so components can
// reach in via `theme.aqarat.hero` etc.
export const aqaratBrand = {
  hero: '#0F172A',
  surface: '#F8FAFC',
  accent: '#10B981',
} as const;
